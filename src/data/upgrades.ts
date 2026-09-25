import type { PlayerStats } from '../entities/Player';

export interface Upgrade {
  /** 也是 i18n 的 key：upgrade.<id>.name / upgrade.<id>.desc */
  id: string;
  /** 最多可選幾次，undefined = 無上限 */
  maxStacks?: number;
  /** 稀有度，決定出現在選項裡的機率，undefined = 1 */
  tier?: UpgradeTier;
  apply: (s: PlayerStats) => void;
}

export type UpgradeTier = 1 | 2;

/** 各 tier 的抽選權重，相對於 tier 1。tier 2 出現機率是一般強化的 1/3 */
export const TIER_WEIGHT: Record<UpgradeTier, number> = { 1: 1, 2: 1 / 3 };

export function tierWeight(u: Upgrade) {
  return TIER_WEIGHT[u.tier ?? 1];
}

/**
 * 乘法類強化一律設上限。沒有上限的話 0.88^n、1.12^n 這種會指數失控——
 * 快手疊 20 次攻擊間隔只剩 53ms，跑鞋疊幾次就又能甩開所有敵人，
 * 那正是當初「怎麼樣都不會死」的成因之一。
 * 加法且不破壞平衡的（傷害、生命）才留白。
 */
export const UPGRADES: Upgrade[] = [
  { id: 'dmg',    apply: (s) => { s.damageMul *= 1.25; } },
  { id: 'hp',     apply: (s) => { s.maxHp += 25; s.hp = s.maxHp; } },
  { id: 'rate',   maxStacks: 8, apply: (s) => { s.cooldownMul *= 0.88; } },
  { id: 'range',  maxStacks: 6, apply: (s) => { s.rangeMul *= 1.2; } },
  { id: 'arc',    maxStacks: 7, apply: (s) => { s.arcBonus += 25; } },
  { id: 'speed',  maxStacks: 3, apply: (s) => { s.speedMul *= 1.12; } },
  { id: 'magnet', maxStacks: 4, apply: (s) => { s.magnetMul *= 1.45; } },
  { id: 'blade',  maxStacks: 3, tier: 2, apply: (s) => { s.blades += 1; } },
  { id: 'knock',  maxStacks: 4, apply: (s) => { s.knockbackMul *= 1.6; } },
  { id: 'regen',  maxStacks: 5, apply: (s) => { s.regen += 0.6; } },
  // 無上限，純回血不灌數值。確保後期選項池至少有三個，畫面不會只剩兩張卡
  { id: 'heal',   apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.4); } },
];
