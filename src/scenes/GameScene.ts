import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy, XpGem } from '../entities/Enemy';
import { WeaponSystem } from '../systems/WeaponSystem';
import { SpawnDirector } from '../systems/SpawnDirector';
import { xpForLevel } from '../data/progression';
import { SfxBus } from '../systems/SfxBus';
import { Boss } from '../entities/Boss';
import { BOSS } from '../data/boss';
import { artScale } from '../data/assets';
import { autoPickUpgrade } from './LevelUpScene';

export const WORLD = { w: 2600, h: 2600 };

/** 按 B 測試 BOSS 戰時，把角色直接升到這個等級（每級隨機套一個強化） */
const TEST_BOSS_LEVEL = 20;

/** 單次接觸傷害最多累計幾隻敵人。取最高的幾隻相加，避免人數線性爆炸 */
const CONTACT_STACK = 3;
/** 累計後的整體縮放 */
const CONTACT_SCALE = 0.8;

export type Phase = 'normal' | 'boss' | 'done';

export interface RunState {
  level: number;
  xp: number;
  xpToNext: number;
  kills: number;
  elapsedMs: number;
}

export class GameScene extends Phaser.Scene {
  player!: Player;
  weapon!: WeaponSystem;
  private sfx!: SfxBus;
  private director = new SpawnDirector();
  private enemies!: Phaser.Physics.Arcade.Group;
  private gems!: Phaser.Physics.Arcade.Group;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private moveVec = new Phaser.Math.Vector2();
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  /** 一次拾取可能連升好幾級，每一級都要讓玩家選一次強化 */
  private pendingLevelUps = 0;
  /** 這一幀正在碰到玩家的敵人，由 overlap 回呼收集、在 update 統一結算 */
  private contacts: Enemy[] = [];
  private phase: Phase = 'normal';
  private bossRef: Boss | null = null;

  run: RunState = { level: 1, xp: 0, xpToNext: xpForLevel(1), kills: 0, elapsedMs: 0 };

  constructor() {
    super('Game');
  }

  create() {
    this.run = { level: 1, xp: 0, xpToNext: xpForLevel(1), kills: 0, elapsedMs: 0 };
    this.pendingLevelUps = 0;
    this.contacts = [];
    this.phase = 'normal';
    this.bossRef = null;
    this.director = new SpawnDirector();

    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);
    this.drawGround();

    this.player = new Player(this, WORLD.w / 2, WORLD.h / 2);
    this.weapon = new WeaponSystem(this, this.player);
    this.sfx = new SfxBus(this);

    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: false, maxSize: 500 });
    this.gems = this.physics.add.group({ classType: XpGem, maxSize: 600 });

    // 敵人之間互推，避免全部疊成一點
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.player, this.enemies, this.onTouch, undefined, this);
    this.physics.add.overlap(this.player, this.gems, this.onPickup, undefined, this);

    this.cameras.main.setBounds(0, 0, WORLD.w, WORLD.h);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.15);

    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,LEFT,DOWN,RIGHT'
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    // 觸控／滑鼠：朝指標方向移動
    this.input.on('pointerdown', this.trackPointer, this);
    this.input.on('pointermove', this.trackPointer, this);
    this.input.on('pointerup', () => { this.pointerTarget = null; });

    this.startBgm();
    this.input.keyboard!.on('keydown-M', () => {
      this.sound.mute = !this.sound.mute;
    });
    // 測試用：直接升到 TEST_BOSS_LEVEL 並跳到 BOSS 戰。正式版把這段刪掉
    this.input.keyboard!.on('keydown-B', () => {
      if (this.phase !== 'normal') return;
      while (this.run.level < TEST_BOSS_LEVEL) {
        this.run.level++;
        autoPickUpgrade(this.player.stats);
      }
      this.run.xp = 0;
      this.run.xpToNext = xpForLevel(this.run.level);
      this.player.stats.hp = this.player.stats.maxHp;
      this.startBossFight();
    });
    // 調整 sprites.jsonc 用：顯示／隱藏所有碰撞框
    this.input.keyboard!.on('keydown-H', () => {
      const world = this.physics.world;
      // createDebugGraphic() 會順便把 drawDebug 設成 true，所以第一次只建立不切換
      if (!world.debugGraphic) world.createDebugGraphic();
      else world.drawDebug = !world.drawDebug;
      world.debugGraphic.setVisible(world.drawDebug).setDepth(100).clear();
    });

    this.scene.launch('UI');
    this.scene.bringToTop('UI');
  }

  /** BGM 跨場景共用一個實例，重開一局不會疊加播放 */
  private startBgm() {
    const existing = this.sound.get('bgm');
    if (existing) {
      if (!existing.isPlaying) existing.play();
      return;
    }
    this.sound.add('bgm', { loop: true, volume: 0.4 }).play();
  }

  private trackPointer(p: Phaser.Input.Pointer) {
    if (!p.isDown) return;
    this.pointerTarget = new Phaser.Math.Vector2(p.worldX, p.worldY);
  }

  private drawGround() {
    const ground = this.add.tileSprite(0, 0, WORLD.w, WORLD.h, 'ground').setOrigin(0).setDepth(-10);
    const s = artScale(this, 'ground');
    ground.setTileScale(s, s);
    const g = this.add.graphics();
    g.lineStyle(4, 0x53331f, 1).strokeRect(0, 0, WORLD.w, WORLD.h);
    g.setDepth(-9);
  }

  /**
   * 固定四階段，順序不可調換：
   *   1. 移動     —— 所有物件先就定位
   *   2. 傷害登記 —— 只累加傷害，不直接改血量
   *   3. 生命結算 —— 扣傷害 → 回復，一次算完
   *   4. 死亡判定 —— 依結算後的血量決定生死
   *
   * 把扣血和回血分散在不同階段做，回血會把已經歸零的血量頂回正數，
   * 死亡判定就永遠不成立。之前「瀕死時變成無敵」就是這樣來的。
   */
  override update(_time: number, delta: number) {
    const now = this.time.now;
    this.run.elapsedMs += delta;
    const elapsedSec = this.run.elapsedMs / 1000;

    // ===== 1. 移動 =====
    this.handleMovement();

    // 追擊與「找最近目標」併在同一個迴圈，避免多掃一次上百隻敵人
    const alive = this.enemies.getChildren() as Enemy[];
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of alive) {
      if (!e.active) continue;
      e.chase(this.player.x, this.player.y, now);
      const d = Phaser.Math.Distance.Squared(this.player.x, this.player.y, e.x, e.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }

    // BOSS 也要能被自動瞄準與揮砍命中。注意 getChildren() 回傳的是
    // 群組內部的陣列，不能直接 push，否則會汙染物件池。
    let targets = alive;
    if (this.bossRef?.active) {
      const d = Phaser.Math.Distance.Squared(
        this.player.x, this.player.y, this.bossRef.x, this.bossRef.y
      );
      if (d < nearestDist) nearest = this.bossRef;
      targets = [...alive, this.bossRef];
      this.runBossTurn(now);
    }
    this.player.setAim(nearest);

    // ===== 2. 傷害登記 =====
    // 玩家承受的傷害只登記不結算；敵人沒有回復機制，可以即時扣血
    this.collectContactDamage(now);

    const swing = this.weapon.update(now, targets);
    let killCount = 0;
    for (const hit of swing.hits) {
      this.showDamage(hit.enemy.x, hit.enemy.y, hit.damage, hit.bonus);
      if (!hit.killed) continue;
      if (hit.enemy === this.bossRef) {
        this.onBossDefeated();
      } else {
        this.killEnemy(hit.enemy);
        killCount++;
      }
    }
    if (swing.fired) this.sfx.play('swing');
    if (swing.hits.length > 0) this.sfx.play('hit');
    if (killCount > 0) this.sfx.play('kill', Math.min(killCount - 1, 6) * 70);

    // ===== 3. 生命結算 =====
    this.player.resolveHealth(delta);

    // ===== 4. 死亡判定 =====
    if (this.phase !== 'done' && this.player.isDead) {
      this.endRun();
      return;
    }

    // ===== 其餘：生成與拾取 =====
    if (this.phase === 'normal') {
      if (elapsedSec >= BOSS.triggerAtSec) {
        this.startBossFight();
      } else {
        const spawnCount = this.director.update(delta, elapsedSec);
        for (let i = 0; i < spawnCount; i++) this.spawnEnemy(elapsedSec);
      }
    }

    const magnet = this.player.stats.magnet * this.player.stats.magnetMul;
    for (const gem of this.gems.getChildren() as XpGem[]) {
      if (gem.active) gem.pullTo(this.player.x, this.player.y, magnet);
    }
  }

  private handleMovement() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.A.isDown || k.LEFT.isDown) x -= 1;
    if (k.D.isDown || k.RIGHT.isDown) x += 1;
    if (k.W.isDown || k.UP.isDown) y -= 1;
    if (k.S.isDown || k.DOWN.isDown) y += 1;

    if (x === 0 && y === 0 && this.pointerTarget) {
      const d = Phaser.Math.Distance.Between(
        this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y
      );
      if (d > 14) {
        x = this.pointerTarget.x - this.player.x;
        y = this.pointerTarget.y - this.player.y;
      }
    }
    this.player.handleInput(this.moveVec.set(x, y));
  }

  private spawnEnemy(elapsedSec: number) {
    const def = this.director.pick(elapsedSec);
    const cam = this.cameras.main;
    // 在鏡頭外圍一圈隨機取點，讓敵人從畫面外走進來
    const margin = 90;
    // 六成生成在前進方向的半圓，避免一直往同一邊跑就能開出安全走廊
    const a = Math.random() < 0.6
      ? this.player.facing + Phaser.Math.FloatBetween(-Math.PI / 2, Math.PI / 2)
      : Math.random() * Math.PI * 2;
    const rx = cam.worldView.width / 2 + margin;
    const ry = cam.worldView.height / 2 + margin;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(a) * rx, 20, WORLD.w - 20);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(a) * ry, 20, WORLD.h - 20);

    const e = this.enemies.get() as Enemy | null;
    if (!e) return;
    e.spawn(def, x, y);
  }

  private killEnemy(e: Enemy) {
    this.run.kills++;
    this.spawnSplat(e.x, e.y, e.def.color);

    const gem = this.gems.get() as XpGem | null;
    if (gem) gem.spawnAt(e.x, e.y, e.def.xp);

    e.disableBody(true, true);
  }

  private spawnSplat(x: number, y: number, color: number) {
    const emitter = this.add.particles(x, y, 'particle', {
      speed: { min: 40, max: 190 },
      lifespan: 380,
      quantity: 9,
      scale: { start: 0.9 * artScale(this, 'particle'), end: 0 },
      tint: color,
      blendMode: Phaser.BlendModes.NORMAL,
      emitting: false,
    });
    emitter.setDepth(4);
    emitter.explode(9);
    this.time.delayedCall(420, () => emitter.destroy());
  }

  private showDamage(x: number, y: number, amount: number, bonus = false) {
    const t = this.add.text(x, y - 12, String(Math.round(amount)), {
      fontFamily: 'system-ui, sans-serif',
      fontSize: bonus ? '17px' : '15px',
      color: bonus ? '#6fd3ff' : '#fff3c4',
      stroke: '#2b1a10',
      strokeThickness: 3,
    });
    t.setOrigin(0.5).setDepth(20);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 480,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  /**
   * overlap 回呼只登記接觸者，傷害交給 collectContactDamage 逐幀統一登記。
   * 舊版讓每隻敵人各自扣冷卻再打，無敵中的那些會白白消耗自己的冷卻，
   * 導致被 20 隻圍住跟被 1 隻碰到的掉血速度一模一樣。
   */
  private onTouch: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, obj) => {
    const e = obj as Enemy;
    if (e.active) this.contacts.push(e);
  };

  private collectContactDamage(now: number) {
    if (this.contacts.length > 0 && now >= this.player.invulnUntil) {
      // 取傷害最高的前幾隻相加：人數和敵人種類都會影響結果
      const sorted = this.contacts.map((e) => e.def.damage).sort((a, b) => b - a);
      const amount =
        sorted.slice(0, CONTACT_STACK).reduce((sum, d) => sum + d, 0) * CONTACT_SCALE;

      if (this.player.queueDamage(amount, now)) {
        this.cameras.main.shake(140, 0.007);
        this.sfx.play('hurt');
      }
    }
    this.contacts.length = 0;
  }

  private onPickup: Phaser.Types.Physics.Arcade.ArcadePhysicsCallback = (_p, obj) => {
    const gem = obj as XpGem;
    if (!gem.active) return;
    gem.disableBody(true, true);
    this.sfx.play('pickup');
    this.run.xp += gem.value;

    let leveled = 0;
    while (this.run.xp >= this.run.xpToNext) {
      this.run.xp -= this.run.xpToNext;
      this.run.level++;
      this.run.xpToNext = xpForLevel(this.run.level);
      leveled++;
    }
    if (leveled > 0) {
      this.pendingLevelUps += leveled;
      this.openLevelUp();
    }
  };

  get pendingLevelUpCount() {
    return this.pendingLevelUps;
  }

  /** LevelUpScene 選完一次後回報，回傳還剩幾次要選 */
  consumeLevelUp() {
    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
    return this.pendingLevelUps;
  }

  private openLevelUp() {
    if (this.phase === 'done' || this.scene.isActive('LevelUp')) return;
    this.sfx.play('levelup');
    this.scene.pause();
    this.scene.launch('LevelUp', { stats: this.player.stats });
    this.scene.bringToTop('LevelUp');
  }

  get boss() {
    return this.bossRef;
  }

  get currentPhase() {
    return this.phase;
  }

  private startBossFight() {
    this.phase = 'boss';

    // 清場：現存敵人全部原地爆開，寶石留著讓玩家還能撿
    for (const e of this.enemies.getChildren() as Enemy[]) {
      if (!e.active) continue;
      this.spawnSplat(e.x, e.y, e.def.color);
      e.disableBody(true, true);
    }
    this.cameras.main.shake(500, 0.012);
    this.cameras.main.flash(320, 120, 40, 40);

    const ang = Math.random() * Math.PI * 2;
    const bx = Phaser.Math.Clamp(this.player.x + Math.cos(ang) * BOSS.spawnDistance, 80, WORLD.w - 80);
    const by = Phaser.Math.Clamp(this.player.y + Math.sin(ang) * BOSS.spawnDistance, 80, WORLD.h - 80);

    this.bossRef = new Boss(this, bx, by);
    this.physics.add.overlap(this.player, this.bossRef, this.onBossTouch, undefined, this);
  }

  private runBossTurn(now: number) {
    const action = this.bossRef!.think(now, this.player.x, this.player.y);
    if (action === 'summon') this.bossSummon();
    else if (action === 'aoe') this.castAoe();
  }

  private bossSummon() {
    const elapsedSec = this.run.elapsedMs / 1000;
    for (let i = 0; i < BOSS.summonCount; i++) this.spawnEnemy(elapsedSec);
  }

  /** 第一發鎖定玩家當下位置，其餘散佈在周圍逼玩家持續移動 */
  private castAoe() {
    const count = this.bossRef!.aoeCount;
    for (let i = 0; i < count; i++) {
      const x = i === 0 ? this.player.x : this.player.x + Phaser.Math.Between(-280, 280);
      const y = i === 0 ? this.player.y : this.player.y + Phaser.Math.Between(-280, 280);
      this.telegraphAoe(
        Phaser.Math.Clamp(x, 40, WORLD.w - 40),
        Phaser.Math.Clamp(y, 40, WORLD.h - 40)
      );
    }
  }

  /** 地板提示：外圈固定、內圈隨時間填滿，填滿即引爆 */
  private telegraphAoe(x: number, y: number) {
    const r = BOSS.aoeRadius;
    const ring = this.add.graphics({ x, y }).setDepth(1);
    ring.lineStyle(3, 0xff6b4a, 0.9).strokeCircle(0, 0, r);
    ring.fillStyle(0xff6b4a, 0.16).fillCircle(0, 0, r);

    const fill = this.add.graphics({ x, y }).setDepth(2);
    const progress = { t: 0 };

    this.tweens.add({
      targets: progress,
      t: 1,
      duration: BOSS.aoeWindup,
      ease: 'Linear',
      onUpdate: () => {
        fill.clear();
        fill.fillStyle(0xff6b4a, 0.42).fillCircle(0, 0, r * progress.t);
      },
      onComplete: () => {
        ring.destroy();
        fill.destroy();
        this.detonateAoe(x, y, r);
      },
    });
  }

  private detonateAoe(x: number, y: number, r: number) {
    const blast = this.add.graphics({ x, y }).setDepth(13);
    blast.setBlendMode(Phaser.BlendModes.ADD);
    blast.fillStyle(0xffd08a, 0.8).fillCircle(0, 0, r);
    this.tweens.add({
      targets: blast,
      alpha: 0,
      scale: 1.25,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => blast.destroy(),
    });
    this.cameras.main.shake(200, 0.009);

    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= r) {
      if (this.player.queueDamage(BOSS.aoeDamage, this.time.now)) this.sfx.play('hurt');
    }
  }

  /** 碰到 BOSS 直接死，無視無敵時間 */
  private onBossTouch = () => {
    if (this.phase !== 'boss') return;
    this.player.queueLethal();
  };

  private onBossDefeated() {
    if (this.phase !== 'boss') return;
    this.phase = 'done';

    const b = this.bossRef!;
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 90, () => {
        this.spawnSplat(
          b.x + Phaser.Math.Between(-50, 50),
          b.y + Phaser.Math.Between(-50, 50),
          0x7a4bb5
        );
      });
    }
    this.cameras.main.shake(600, 0.014);
    this.sfx.play('levelup');
    b.disableBody(true, true);

    this.time.delayedCall(900, () => {
      this.scene.stop('UI');
      this.scene.start('GameClear', { ...this.run });
    });
  }

  private endRun() {
    this.phase = 'done';
    this.sfx.play('gameover');
    this.scene.stop('UI');
    this.scene.start('GameOver', { ...this.run });
  }
}
