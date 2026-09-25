import Phaser from 'phaser';
import type { Player } from '../entities/Player';
import type { Enemy } from '../entities/Enemy';
import { hitGap } from '../entities/hitbox';

/** 一次揮砍的結果。fired 為 false 代表還在冷卻中 */
export interface SwingResult {
  fired: boolean;
  hits: HitResult[];
}

export interface HitResult {
  enemy: Enemy;
  killed: boolean;
  damage: number;
}

const BASE_ARC_DEG = 118;
/** 扇形內緣佔外緣的比例，純視覺 */
const INNER_RATIO = 0.42;
/** 擊退基礎力道，會再乘上敵人的 knockResist */
const KNOCKBACK = 150;
/** 揮砍角度硬上限，不讓它超過一圈 */
const MAX_ARC_DEG = 300;

interface Candidate {
  enemy: Enemy;
  dist: number;
  angle: number;
}

/** 自動揮刀：冷卻到了就往鎖定方向掃一記扇形，扇形內的敵人全部吃傷害。 */
export class WeaponSystem {
  private nextFireAt = 0;

  constructor(private scene: Phaser.Scene, private player: Player) {}

  get cooldown() {
    const s = this.player.stats;
    return s.cooldown * s.cooldownMul;
  }

  get reach() {
    const s = this.player.stats;
    return s.range * s.rangeMul;
  }

  /** 揮砍張角（弧度），判定與特效共用同一個來源 */
  get arcRad() {
    const deg = Math.min(BASE_ARC_DEG + this.player.stats.arcBonus, MAX_ARC_DEG);
    return Phaser.Math.DegToRad(deg);
  }

  get progress() {
    const remain = this.nextFireAt - this.scene.time.now;
    return Phaser.Math.Clamp(1 - remain / this.cooldown, 0, 1);
  }

  update(now: number, enemies: Enemy[]): SwingResult {
    if (now < this.nextFireAt) return { fired: false, hits: [] };
    this.nextFireAt = now + this.cooldown;

    const s = this.player.stats;
    const damage = s.damage * s.damageMul;
    const results: HitResult[] = [];
    // 每一刀各自處理自己扇形內的目標。
    // 刀與刀的扇形重疊時，重疊區的敵人每一刀都吃，傷害疊加；
    // 只有已經被前一刀砍死的會跳過，避免重複結算擊殺。
    for (let i = 0; i < s.blades; i++) {
      const angle = this.player.aim + (i === 0 ? 0 : (Math.PI * 2 * i) / s.blades);
      this.spawnSlashVfx(angle);

      // 扇形內不設命中上限：被圍住的致命性由接觸傷害模型負責，
      // 不需要靠「砍不完」來製造壓力
      for (const c of this.collectInArc(enemies, angle)) {
        this.applyHit(c, damage, now, results);
      }
    }

    return { fired: true, hits: results };
  }

  private applyHit(
    c: Candidate,
    damage: number,
    now: number,
    out: HitResult[]
  ) {
    const s = this.player.stats;
    const power = KNOCKBACK * s.knockbackMul * (1 - c.enemy.def.knockResist);
    const killed = c.enemy.hurt(damage, c.angle, power, now);
    out.push({ enemy: c.enemy, killed, damage });
  }

  /** 扇形內、射程內的目標，依距離由近到遠 */
  private collectInArc(enemies: Enemy[], angle: number): Candidate[] {
    const half = this.arcRad / 2;
    const found: Candidate[] = [];
    for (const e of enemies) {
      // 被砍死的要等 GameScene 結算後才回收，這段期間仍是 active，用血量排除
      if (!e.active || e.hp <= 0) continue;
      // 距離量到碰撞圓邊緣（角色位置就是圓心）
      const dist = hitGap(e, this.player.x, this.player.y);
      if (dist > this.reach) continue;
      const toEnemy = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toEnemy - angle)) > half) continue;
      found.push({ enemy: e, dist, angle: toEnemy });
    }
    return found.sort((a, b) => a.dist - b.dist);
  }

  /**
   * 直接用實際的 reach / arcRad 畫扇形，圓心就是 Graphics 自己的原點，
   * 所以把 Graphics 放在玩家身上再旋轉 angle 就會剛好蓋住判定範圍。
   */
  private spawnSlashVfx(angle: number) {
    const outer = this.reach;
    const inner = outer * INNER_RATIO;
    const half = this.arcRad / 2;

    const g = this.scene.add.graphics({ x: this.player.x, y: this.player.y });
    g.setDepth(11);
    g.setRotation(angle);
    g.setBlendMode(Phaser.BlendModes.ADD);

    g.fillStyle(0xfff1c9, 0.85);
    g.beginPath();
    g.arc(0, 0, outer, -half, half, false);
    g.arc(0, 0, inner, half, -half, true);
    g.closePath();
    g.fillPath();

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      scale: 1.12,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }
}
