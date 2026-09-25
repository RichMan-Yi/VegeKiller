import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { setFacing } from './hitbox';
import { BOSS, BOSS_DEF } from '../data/boss';

export type BossAction = 'none' | 'summon' | 'aoe';

/**
 * 繼承 Enemy 是為了直接沿用武器系統的命中判定與傷害流程，
 * 但 BOSS 不進物件池、不會被回收，行為改由 think() 驅動。
 */
export class Boss extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene);
    this.spawn(BOSS_DEF, x, y, 1);
    this.setDepth(8);
  }

  /** @returns 這一幀要執行的動作，由 GameScene 負責實際生成 */
  think(now: number, px: number, py: number): BossAction {
    const body = this.body as Phaser.Physics.Arcade.Body;

    // 施法中定住不動，給玩家閃避的空間
    if (now < this.stunUntil) {
      body.setVelocity(0, 0);
      return 'none';
    }

    const ang = Math.atan2(py - this.y, px - this.x);
    body.setVelocity(Math.cos(ang) * BOSS.speed, Math.sin(ang) * BOSS.speed);
    setFacing(this, BOSS_DEF.key, px < this.x);

    if (now < this.nextActionAt) return 'none';
    this.nextActionAt = now + BOSS.actionInterval;
    this.stunUntil = now + BOSS.actionWindup;
    body.setVelocity(0, 0);

    return Math.random() < 0.45 ? 'summon' : 'aoe';
  }

  /** BOSS 不吃擊退，也不套用受擊時的位移 */
  override hurt(amount: number, _knockAngle: number, _knockPower: number, now: number, bonus = false) {
    this.hp -= amount;
    this.stunUntil = Math.max(this.stunUntil, 0);
    this.flashHit(bonus);
    void now;
    return this.hp <= 0;
  }

  get hpRatio() {
    return Phaser.Math.Clamp(this.hp / BOSS_DEF.hp, 0, 1);
  }

  private nextActionAt = 0;
}
