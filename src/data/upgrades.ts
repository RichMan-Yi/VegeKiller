import type { PlayerStats } from '../entities/Player';

export interface Upgrade {
  id: string;
  name: string;
  desc: string;
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
  { id: 'dmg',    name: '磨刀',       desc: '攻擊傷害 +25%',                       apply: (s) => { s.damageMul *= 1.25; } },
  { id: 'hp',     name: '吃飽了',     desc: '最大生命 +25 並回滿',                  apply: (s) => { s.maxHp += 25; s.hp = s.maxHp; } },
  { id: 'rate',   name: '快手',       desc: '攻擊間隔 -12%',                       maxStacks: 8, apply: (s) => { s.cooldownMul *= 0.88; } },
  { id: 'range',  name: '長柄',       desc: '攻擊範圍 +20%',                       maxStacks: 6, apply: (s) => { s.rangeMul *= 1.2; } },
  { id: 'arc',    name: '大開大闔',   desc: '揮砍角度 +25°（上限 300°）',           maxStacks: 7, apply: (s) => { s.arcBonus += 25; } },
  { id: 'speed',  name: '跑鞋',       desc: '移動速度 +12%',                       maxStacks: 3, apply: (s) => { s.speedMul *= 1.12; } },
  { id: 'magnet', name: '飢渴',       desc: '經驗吸取範圍 +45%',                    maxStacks: 4, apply: (s) => { s.magnetMul *= 1.45; } },
  { id: 'blade',  name: '雙刀流',     desc: '額外多揮一刀',                         maxStacks: 3, tier: 2, apply: (s) => { s.blades += 1; } },
  { id: 'knock',  name: '震退',       desc: '擊退力道 +60%，把貼身的敵人推開',        maxStacks: 4, apply: (s) => { s.knockbackMul *= 1.6; } },
  { id: 'regen',  name: '自癒',       desc: '每秒回復 0.6 點生命',                  maxStacks: 5, apply: (s) => { s.regen += 0.6; } },
  // 無上限，純回血不灌數值。確保後期選項池至少有三個，畫面不會只剩兩張卡
  { id: 'heal',   name: '回神',       desc: '立刻回復 40% 最大生命',                apply: (s) => { s.hp = Math.min(s.maxHp, s.hp + s.maxHp * 0.4); } },
];
