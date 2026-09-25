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
    this.spawn(BOSS_DEF, x, y);
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
    const speed = BOSS.speed * (this.enraged ? BOSS.enrageSpeedMul : 1);
    body.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    setFacing(this, BOSS_DEF.key, px < this.x);

    if (now < this.nextActionAt) return 'none';
    this.nextActionAt = now + BOSS.actionInterval;
    this.stunUntil = now + BOSS.actionWindup;
    body.setVelocity(0, 0);

    return Math.random() < 0.45 ? 'summon' : 'aoe';
  }

  /** BOSS 不吃擊退，也不套用受擊時的位移 */
  override hurt(amount: number, _knockAngle: number, _knockPower: number, now: number) {
    this.hp -= amount;
    this.stunUntil = Math.max(this.stunUntil, 0);
    this.flashHit();
    void now;
    if (!this.enraged && this.hp > 0 && this.hpRatio < BOSS.enrageBelow) this.enrage();
    return this.hp <= 0;
  }

  get hpRatio() {
    return Phaser.Math.Clamp(this.hp / BOSS_DEF.hp, 0, 1);
  }

  get aoeCount() {
    return Math.round(BOSS.aoeCount * (this.enraged ? BOSS.enrageAoeMul : 1));
  }

  /**
   * 紅色遮罩是另一張同貼圖的 tintFill 圖片疊在上面，不是直接 setTint：
   * tint 是乘法，套在紅色系的圖上看不出來，而且受擊閃爍會把 tint 重設掉。
   */
  private enrage() {
    this.enraged = true;
    this.enrageFx = this.scene.add
      .image(this.x, this.y, this.texture.key)
      .setTintFill(BOSS.enrageTint)
      .setDepth(this.depth + 0.5);
    this.syncEnrageFx();
    this.scene.cameras.main.shake(300, 0.01);
  }

  /** 每幀照 BOSS 本體的擺位、翻面、透明度（含受擊閃爍）同步遮罩 */
  private syncEnrageFx() {
    const fx = this.enrageFx;
    if (!fx) return;
    fx.setPosition(this.x, this.y)
      .setScale(this.scaleX, this.scaleY)
      .setOrigin(this.originX, this.originY)
      .setFlipX(this.flipX)
      .setAlpha(BOSS.enrageAlpha * this.alpha)
      .setVisible(this.visible);
  }

  override preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    this.syncEnrageFx();
  }

  /** 死亡時本體被收掉、preUpdate 不再跑，遮罩要一起藏起來 */
  override disableBody(disableGameObject?: boolean, hideGameObject?: boolean) {
    this.enrageFx?.setVisible(false);
    return super.disableBody(disableGameObject, hideGameObject);
  }

  private nextActionAt = 0;
  private enraged = false;
  private enrageFx: Phaser.GameObjects.Image | null = null;
}
