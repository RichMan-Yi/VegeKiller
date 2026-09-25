import type { EnemyDef } from './enemies';

export const BOSS = {
  /** 玩家到達這個等級就清場進入 BOSS 戰 */
  triggerLevel: 30,
  hp: 8000,
  /** 刻意走得很慢，壓力來自「絕對不能碰到」而不是速度 */
  speed: 46,
  /** 兩次技能之間的間隔 */
  actionInterval: 3400,
  /** 施放技能時定住不動的時間 */
  actionWindup: 900,
  /** 召喚一次放幾隻 */
  summonCount: 7,
  /** AOE 一次落幾發 */
  aoeCount: 4,
  aoeRadius: 115,
  /** 地板提示持續多久才引爆 */
  aoeWindup: 1150,
  aoeDamage: 38,
  /** BOSS 出現時與玩家的距離 */
  spawnDistance: 420,
} as const;

/**
 * BOSS 借用 EnemyDef 的形狀，這樣武器系統的扇形判定、擊退、
 * 命中特效全部可以直接套用，不用為它另外寫一套。
 * knockResist 給 1 代表完全推不動。
 */
export const BOSS_DEF: EnemyDef = {
  key: 'boss',
  name: '菜王',
  color: 0x7a4bb5,
  shade: 0x4a2a75,
  hp: BOSS.hp,
  speed: BOSS.speed,
  damage: 9999,
  xp: 0,
  unlockAt: 0,
  weight: 0,
  knockResist: 1,
};
