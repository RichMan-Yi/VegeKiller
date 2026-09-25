import type { EnemyDef } from './enemies';

export const BOSS = {
  /** 存活滿這麼多秒就清場進入 BOSS 戰（升級暫停的時間不算） */
  triggerAtSec: 150,
  hp: 2000,
  /** 仍比玩家基礎速度（175）慢，壓力主要來自「絕對不能碰到」 */
  speed: 92,
  /** 兩次技能之間的間隔 */
  actionInterval: 3400,
  /** 施放技能時定住不動的時間 */
  actionWindup: 900,
  /** 召喚一次放幾隻 */
  summonCount: 7,
  /** AOE 一次落幾發 */
  aoeCount: 8,
  aoeRadius: 115,
  /** 地板提示持續多久才引爆 */
  aoeWindup: 1150,
  aoeDamage: 38,
  /** 血量比例低於這個值就進入狂暴 */
  enrageBelow: 0.25,
  /** 狂暴時移動速度、AOE 數量的倍率 */
  enrageSpeedMul: 1.5,
  enrageAoeMul: 1.5,
  /** 狂暴時蓋在 BOSS 身上的紅色遮罩 */
  enrageTint: 0xff2a2a,
  enrageAlpha: 0.3,
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
  color: 0xf1dcb0,
  shade: 0xc9a46a,
  hp: BOSS.hp,
  speed: BOSS.speed,
  damage: 9999,
  xp: 0,
  unlockAt: 0,
  weight: 0,
  knockResist: 1,
};
