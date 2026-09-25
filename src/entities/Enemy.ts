import type { EnemyDef } from '../data/enemies';
import { ENEMY_BY_KEY } from '../data/enemies';
import { applySprite, setFacing } from './hitbox';

/** 受擊閃爍：時間與閃到多透明。刻意很細微，只是讓玩家確認「有砍到」 */
const HIT_FLASH_MS = 70;
const HIT_FLASH_ALPHA = 0.6;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  def!: EnemyDef;
  hp = 0;
  /** 實際移動速度（已套用時間成長倍率） */
  speed = 0;
  /** 被擊退期間不主動追擊，直到這個時間點 */
  stunUntil = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'carrot');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(5);
  }

  spawn(def: EnemyDef, x: number, y: number) {
    this.def = def;
    this.setTexture(def.key);
    this.enableBody(true, x, y, true, true);
    this.setFlipX(false);
    applySprite(this, def.key);
    this.setAlpha(1);
    this.setTint(0xffffff);
    this.hp = def.hp;
    this.speed = def.speed;
    this.stunUntil = 0;
    (this.body as Phaser.Physics.Arcade.Body).setBounce(0);
  }

  chase(tx: number, ty: number, now: number) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (now < this.stunUntil) return;
    const ang = Math.atan2(ty - this.y, tx - this.x);
    body.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
    setFacing(this, this.def.key, tx < this.x);
  }

  /** @returns true 代表這一擊打死了 */
  hurt(
    amount: number,
    knockAngle: number,
    knockPower: number,
    now: number,
    bonus = false
  ): boolean {
    this.hp -= amount;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(knockAngle) * knockPower, Math.sin(knockAngle) * knockPower);
    this.stunUntil = now + 130;
    this.flashHit(bonus);
    return this.hp <= 0;
  }

  /**
   * tint 是乘法，套在正式美術上幾乎看不出來，所以再加一下透明度閃爍，
   * 不管圖是什麼顏色都看得到；也不動 scale，碰撞圓不受影響。
   */
  protected flashHit(bonus: boolean) {
    this.setTint(bonus ? 0x9de4ff : 0xff9d9d);
    this.setAlpha(HIT_FLASH_ALPHA);
    this.scene.time.delayedCall(HIT_FLASH_MS, () => {
      if (!this.active) return;
      this.setTint(0xffffff);
      this.setAlpha(1);
    });
  }

  static defFor(key: string) {
    return ENEMY_BY_KEY.get(key)!;
  }
}

export class XpGem extends Phaser.Physics.Arcade.Sprite {
  value = 1;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 'gem');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(3);
  }

  spawnAt(x: number, y: number, value: number) {
    this.value = value;
    this.enableBody(true, x, y, true, true);
    // 大寶石只是看起來大，撿取半徑照 sprites.jsonc
    applySprite(this, 'gem', value >= 10 ? 1.6 : value >= 4 ? 1.25 : 1);
    this.setTint(value >= 10 ? 0xffd166 : value >= 4 ? 0x9ad0ff : 0x7ef2c1);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const a = Math.random() * Math.PI * 2;
    body.setVelocity(Math.cos(a) * 70, Math.sin(a) * 70);
    body.setDamping(true);
    body.setDrag(0.0015);
  }

  pullTo(px: number, py: number, magnet: number) {
    const d = Phaser.Math.Distance.Between(this.x, this.y, px, py);
    if (d > magnet) return;
    const ang = Math.atan2(py - this.y, px - this.x);
    const pull = Phaser.Math.Linear(520, 150, d / magnet);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * pull, Math.sin(ang) * pull);
  }
}
