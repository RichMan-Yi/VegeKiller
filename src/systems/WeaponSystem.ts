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
  /** true 代表這是「橫掃」打到的扇形外目標 */
  bonus: boolean;
}

const BASE_ARC_DEG = 118;
/** 扇形內緣佔外緣的比例，純視覺 */
const INNER_RATIO = 0.42;
/** 擊退基礎力道，會再乘上敵人的 knockResist */
const KNOCKBACK = 150;
/** 連鎖第一跳從玩家起算的距離，相對於正常射程的倍率 */
const CHAIN_FIRST_MUL = 1.9;
/** 之後每一跳從「上一個目標」起算的距離 */
const CHAIN_HOP_MUL = 1.5;
/** 每跳威力衰減 */
const CHAIN_FALLOFF = 0.85;
/** 連鎖命中的專屬顏色，傷害數字與特效共用 */
export const BONUS_COLOR = 0x6fd3ff;
/** 揮砍角度硬上限，不讓它超過一圈 */
const MAX_ARC_DEG = 300;

interface ChainLink {
  enemy: Enemy;
  fromX: number;
  fromY: number;
  angle: number;
  damageMul: number;
}

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
    const alreadyHit = new Set<Enemy>();

    // 第一輪：每一刀各自處理自己扇形內的目標
    for (let i = 0; i < s.blades; i++) {
      const angle = this.player.aim + (i === 0 ? 0 : (Math.PI * 2 * i) / s.blades);
      this.spawnSlashVfx(angle);

      // 扇形內不設命中上限：被圍住的致命性由接觸傷害模型負責，
      // 不需要靠「砍不完」來製造壓力
      for (const c of this.collectInArc(enemies, angle, alreadyHit)) {
        this.applyHit(c, damage, now, false, alreadyHit, results);
      }
    }

    // 第二輪：連鎖電擊。從玩家出發，之後每一跳都從上一個目標往外找，
    // 所以實際能跳多遠取決於敵人的分佈，穿過密集處可以串很長。
    // 每次揮砍算一次（不是每刀一次），避免多刀流時倍增。
    if (s.bonusTargets > 0) {
      for (const link of this.collectChain(enemies, alreadyHit, s.bonusTargets)) {
        this.spawnChainVfx(link.fromX, link.fromY, link.enemy);
        this.applyHit(
          { enemy: link.enemy, dist: 0, angle: link.angle },
          damage * link.damageMul,
          now,
          true,
          alreadyHit,
          results
        );
      }
    }

    return { fired: true, hits: results };
  }

  private applyHit(
    c: Candidate,
    damage: number,
    now: number,
    bonus: boolean,
    seen: Set<Enemy>,
    out: HitResult[]
  ) {
    seen.add(c.enemy);
    const s = this.player.stats;
    const power = KNOCKBACK * s.knockbackMul * (1 - c.enemy.def.knockResist);
    const killed = c.enemy.hurt(damage, c.angle, power, now, bonus);
    out.push({ enemy: c.enemy, killed, damage, bonus });
  }

  /** 扇形內、射程內的目標，依距離由近到遠 */
  private collectInArc(enemies: Enemy[], angle: number, seen: Set<Enemy>): Candidate[] {
    const half = this.arcRad / 2;
    const found: Candidate[] = [];
    for (const e of enemies) {
      if (!e.active || seen.has(e)) continue;
      // 距離量到碰撞圓邊緣（角色位置就是圓心）
      const dist = hitGap(e, this.player.x, this.player.y);
      if (dist > this.reach) continue;
      const toEnemy = Math.atan2(e.y - this.player.y, e.x - this.player.x);
      if (Math.abs(Phaser.Math.Angle.Wrap(toEnemy - angle)) > half) continue;
      found.push({ enemy: e, dist, angle: toEnemy });
    }
    return found.sort((a, b) => a.dist - b.dist);
  }

  /** 從玩家出發逐跳尋找最近的未命中目標，回傳整條連鎖路徑 */
  private collectChain(enemies: Enemy[], seen: Set<Enemy>, hops: number): ChainLink[] {
    const chain: ChainLink[] = [];
    let fromX = this.player.x;
    let fromY = this.player.y;
    let range = this.reach * CHAIN_FIRST_MUL;
    let mul = 1;

    for (let i = 0; i < hops; i++) {
      let best: Enemy | null = null;
      let bestDist = Infinity;
      for (const e of enemies) {
        if (!e.active || seen.has(e)) continue;
        const d = hitGap(e, fromX, fromY);
        if (d > range || d >= bestDist) continue;
        bestDist = d;
        best = e;
      }
      if (!best) break;

      seen.add(best);
      mul *= CHAIN_FALLOFF;
      chain.push({
        enemy: best,
        fromX,
        fromY,
        // 擊退方向沿著連鎖前進，看起來像被電流帶著走
        angle: Math.atan2(best.y - fromY, best.x - fromX),
        damageMul: mul,
      });

      fromX = best.x;
      fromY = best.y;
      range = this.reach * CHAIN_HOP_MUL;
    }
    return chain;
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

  /** 連鎖電擊回饋：兩層鋸齒閃電 + 目標身上的光圈 */
  private spawnChainVfx(fromX: number, fromY: number, e: Enemy) {
    const body = e.body as Phaser.Physics.Arcade.Body;
    const pts = this.boltPoints(fromX, fromY, e.x, e.y);
    const g = this.scene.add.graphics();
    g.setDepth(12);
    g.setBlendMode(Phaser.BlendModes.ADD);

    g.lineStyle(4, 0xffffff, 0.3);
    this.strokePoints(g, pts);
    g.lineStyle(1.5, BONUS_COLOR, 1);
    this.strokePoints(g, pts);
    g.strokeCircle(e.x, e.y, body.halfWidth + 6);

    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy(),
    });
  }

  /** 沿著兩點連線做隨機側偏，頭尾用 sin 收窄才不會從敵人身上歪出去 */
  private boltPoints(x1: number, y1: number, x2: number, y2: number): number[][] {
    const segments = 6;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const jag = Math.min(13, len * 0.16);

    const pts: number[][] = [[x1, y1]];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const off = Phaser.Math.FloatBetween(-jag, jag) * Math.sin(Math.PI * t);
      pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]);
    }
    pts.push([x2, y2]);
    return pts;
  }

  private strokePoints(g: Phaser.GameObjects.Graphics, pts: number[][]) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.strokePath();
  }
}
