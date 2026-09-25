import { applySprite, setFacing } from './hitbox';

/**
 * 翻面死區：目標方向的水平分量小於這個值時維持原本朝向。
 * 沒有死區的話，左右兩側距離相近的敵人會讓最近目標逐幀交替，
 * 角色就會快速左右鏡像閃爍。
 */
const FLIP_DEADZONE = 0.2;

/** 受擊後的無敵時間 */
const INVULN_MS = 400;

export interface PlayerStats {
  hp: number;
  maxHp: number;
  speed: number;
  speedMul: number;
  damage: number;
  damageMul: number;
  cooldown: number;
  cooldownMul: number;
  range: number;
  rangeMul: number;
  arcBonus: number;
  magnet: number;
  magnetMul: number;
  blades: number;
  /** 「橫掃」額外構到的扇形外目標數 */
  bonusTargets: number;
  knockbackMul: number;
  regen: number;
}

export function createStats(): PlayerStats {
  return {
    hp: 100,
    maxHp: 100,
    speed: 175,
    speedMul: 1,
    damage: 12,
    damageMul: 1,
    cooldown: 680,
    cooldownMul: 1,
    range: 108,
    rangeMul: 1,
    arcBonus: 0,
    magnet: 70,
    magnetMul: 1,
    blades: 1,
    bonusTargets: 0,
    knockbackMul: 1,
    regen: 0,
  };
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  stats = createStats();
  /** 移動方向（弧度）。敵人生成方位偏向會用到，不要拿來當揮刀方向 */
  facing = 0;
  /** 揮刀方向（弧度）：鎖定最近的敵人，沒有目標時沿用移動方向 */
  aim = 0;
  /** 目前是否有鎖定目標 */
  hasTarget = false;
  invulnUntil = 0;

  /** 這個 tick 累積的傷害，統一在 resolveHealth 結算 */
  private pendingDamage = 0;
  /** 無視無敵時間與血量的立即死亡（碰到 BOSS） */
  private lethal = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    applySprite(this, 'player');
    this.setDepth(10);
    this.setCollideWorldBounds(true);
  }

  get moveSpeed() {
    return this.stats.speed * this.stats.speedMul;
  }

  handleInput(dir: Phaser.Math.Vector2) {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (dir.lengthSq() > 0) {
      dir.normalize().scale(this.moveSpeed);
      body.setVelocity(dir.x, dir.y);
      this.facing = Math.atan2(dir.y, dir.x);
    } else {
      body.setVelocity(0, 0);
    }
  }

  /** 每幀由 GameScene 餵入最近的敵人；傳 null 代表場上沒有目標 */
  setAim(target: { x: number; y: number } | null) {
    if (target) {
      this.aim = Math.atan2(target.y - this.y, target.x - this.x);
      this.hasTarget = true;
    } else {
      this.aim = this.facing;
      this.hasTarget = false;
    }
    const horizontal = Math.cos(this.aim);
    if (Math.abs(horizontal) > FLIP_DEADZONE) setFacing(this, 'player', horizontal < 0);
  }

  /**
   * 只登記傷害，不直接改血量。實際結算集中在 resolveHealth，
   * 這樣同一 tick 內的多個傷害來源與回血才有固定的先後順序。
   * @returns true 代表傷害有登記（沒被無敵時間擋掉）
   */
  queueDamage(amount: number, now: number): boolean {
    if (this.lethal || now < this.invulnUntil) return false;
    this.invulnUntil = now + INVULN_MS;
    this.pendingDamage += amount;
    this.scene.tweens.add({
      targets: this,
      alpha: { from: 0.25, to: 1 },
      duration: INVULN_MS,
      ease: 'Quad.easeIn',
    });
    return true;
  }

  /** 立即死亡，繞過無敵時間與血量 */
  queueLethal() {
    this.lethal = true;
  }

  /**
   * 固定順序：先扣傷害，再回復，而且血量歸零後就不再回復。
   *
   * 舊版是「扣血時 clamp 到 0，之後另一個階段才回血」，
   * 結果血量會在 0 與 0.0096 之間來回震盪，死亡判定永遠不成立。
   * 這裡也不再 clamp 下限，讓溢傷如實反映，死亡判定才可靠。
   */
  resolveHealth(dtMs: number) {
    if (this.lethal) {
      this.stats.hp = 0;
      return;
    }
    if (this.pendingDamage > 0) {
      this.stats.hp -= this.pendingDamage;
      this.pendingDamage = 0;
    }
    if (this.stats.hp > 0 && this.stats.regen > 0) {
      this.stats.hp = Math.min(
        this.stats.maxHp,
        this.stats.hp + (this.stats.regen * dtMs) / 1000
      );
    }
  }

  get isDead() {
    return this.lethal || this.stats.hp <= 0;
  }
}
