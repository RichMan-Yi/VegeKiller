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

// ── 斬擊特效（純視覺，判定在揮刀當下就結算完了） ──
/** 刀鋒從扇形一側掃到另一側的時間 */
const SWEEP_MS = 90;
/** 掃完後整個扇形淡出的時間 */
const FADE_MS = 170;
/** 刀鋒後方拖尾的角度長度，切成幾片由亮到淡 */
const TRAIL_DEG = 40;
const TRAIL_SLICES = 12;
/** 刀鋒殘影：落後刀鋒幾度、透明度 */
const GHOSTS = [
  { lagDeg: 10, alpha: 0.55 },
  { lagDeg: 20, alpha: 0.28 },
];
const SLASH_BODY = 0xfff1c9;
const SLASH_RIM = 0xffe6a8;
const SLASH_EDGE = 0xffffff;

interface Candidate {
  enemy: Enemy;
  dist: number;
  angle: number;
}

/** 自動揮刀：冷卻到了就往鎖定方向掃一記扇形，扇形內的敵人全部吃傷害。 */
export class WeaponSystem {
  private nextFireAt = 0;
  /** 揮刀方向，每次揮砍左右交替：1 = 逆時針掃，-1 = 順時針掃 */
  private swingDir = 1;

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
    this.swingDir = -this.swingDir;

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
   *
   * 分兩段：先用 SWEEP_MS 讓刀鋒從一側掃到另一側（帶拖尾與殘影），
   * 掃完時畫面上剩下的正好是完整的判定扇形，再整個淡出。
   * 特效期間跟著玩家移動，不然走動時刀光會被留在原地。
   */
  private spawnSlashVfx(angle: number) {
    const outer = this.reach;
    const inner = outer * INNER_RATIO;
    const arc = this.arcRad;
    const dir = this.swingDir;
    const from = (-arc / 2) * dir;
    const trail = Phaser.Math.DegToRad(TRAIL_DEG);

    const g = this.scene.add.graphics({ x: this.player.x, y: this.player.y });
    g.setDepth(11);
    g.setRotation(angle);
    g.setBlendMode(Phaser.BlendModes.ADD);
    const follow = () => g.setPosition(this.player.x, this.player.y);

    /** 角度不能退到起始邊之前（拖尾、殘影在剛開始揮時會超出已掃過的範圍） */
    const clampToSwept = (a: number) => (dir > 0 ? Math.max(a, from) : Math.min(a, from));

    const state = { t: 0 };
    const draw = () => {
      g.clear();
      const lead = from + dir * arc * state.t;

      // 已掃過的範圍：淡淡的主體 + 外緣較濃的一圈 + 外緣亮線
      fillBand(g, from, lead, inner, outer, SLASH_BODY, 0.2);
      fillBand(g, from, lead, outer * 0.8, outer, SLASH_BODY, 0.3);
      g.lineStyle(2, SLASH_RIM, 0.85);
      g.beginPath();
      g.arc(0, 0, outer, Math.min(from, lead), Math.max(from, lead), false);
      g.strokePath();

      // 拖尾：刀鋒後方一段，越靠近刀鋒越亮
      for (let i = 0; i < TRAIL_SLICES; i++) {
        const a0 = clampToSwept(lead - (dir * trail * i) / TRAIL_SLICES);
        const a1 = clampToSwept(lead - (dir * trail * (i + 1)) / TRAIL_SLICES);
        fillBand(g, a1, a0, inner, outer, SLASH_BODY, 0.45 * (1 - i / TRAIL_SLICES));
      }

      // 殘影：刀鋒後面幾道越來越淡的刀光
      for (const { lagDeg, alpha } of GHOSTS) {
        const a = lead - dir * Phaser.Math.DegToRad(lagDeg);
        if (clampToSwept(a) !== a) continue;
        radialLine(g, a, inner, outer, 2, SLASH_EDGE, alpha);
      }

      // 刀鋒：一道外暈 + 一道實線
      radialLine(g, lead, inner, outer, 8, SLASH_RIM, 0.25);
      radialLine(g, lead, inner, outer, 3, SLASH_EDGE, 1);
    };

    draw();
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: SWEEP_MS,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        follow();
        draw();
      },
      onComplete: () =>
        this.scene.tweens.add({
          targets: g,
          alpha: 0,
          scale: 1.06,
          duration: FADE_MS,
          ease: 'Quad.easeOut',
          onUpdate: follow,
          onComplete: () => g.destroy(),
        }),
    });
  }
}

/** 填一段扇環（a0、a1 順序不拘） */
function fillBand(
  g: Phaser.GameObjects.Graphics,
  a0: number,
  a1: number,
  r0: number,
  r1: number,
  color: number,
  alpha: number
) {
  if (a0 === a1) return;
  const lo = Math.min(a0, a1);
  const hi = Math.max(a0, a1);
  g.fillStyle(color, alpha);
  g.beginPath();
  g.arc(0, 0, r1, lo, hi, false);
  g.arc(0, 0, r0, hi, lo, true);
  g.closePath();
  g.fillPath();
}

/** 沿角度 a 從半徑 r0 畫到 r1 的一條線 */
function radialLine(
  g: Phaser.GameObjects.Graphics,
  a: number,
  r0: number,
  r1: number,
  width: number,
  color: number,
  alpha: number
) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  g.lineStyle(width, color, alpha);
  g.lineBetween(c * r0, s * r0, c * r1, s * r1);
}
