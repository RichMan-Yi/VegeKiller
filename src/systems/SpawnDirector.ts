import { ENEMY_DEFS, type EnemyDef } from '../data/enemies';

/**
 * 依存活時間決定生成速率與可出現的蔬菜種類。
 * 敵人速度固定用 enemies.ts 的 speed，不隨時間放大——
 * 不然快的種類（大蔥）會被乘到比跑鞋疊滿的玩家還快，完全甩不掉。
 */
export class SpawnDirector {
  private accumulator = 0;

  /**
   * 每秒生成幾隻，設上限避免後期無止境變密。
   *
   * 敵人血量與速度刻意不隨時間成長（每種蔬菜固定 enemies.ts 的 hp）：
   * 難度只靠「看得見」的東西推——數量變多、更硬的蔬菜解鎖。
   * 舊版的血量倍率跟生成速率相乘，湧入總血量是時間的平方，約 Lv10 就撐不住。
   */
  rateAt(elapsedSec: number) {
    return Math.min(40, 3.5 + elapsedSec * 0.08);
  }

  poolAt(elapsedSec: number): EnemyDef[] {
    return ENEMY_DEFS.filter((d) => elapsedSec >= d.unlockAt);
  }

  pick(elapsedSec: number): EnemyDef {
    const pool = this.poolAt(elapsedSec);
    const total = pool.reduce((sum, d) => sum + d.weight, 0);
    let roll = Math.random() * total;
    for (const d of pool) {
      roll -= d.weight;
      if (roll <= 0) return d;
    }
    return pool[0];
  }

  /** @returns 這一幀該生成幾隻 */
  update(dtMs: number, elapsedSec: number): number {
    this.accumulator += (this.rateAt(elapsedSec) * dtMs) / 1000;
    const n = Math.floor(this.accumulator);
    this.accumulator -= n;
    return n;
  }
}
