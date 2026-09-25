/** 蔬菜敵人圖鑑。造型一律原創，這裡只定義數值與配色。 */
export interface EnemyDef {
  key: string;
  name: string;
  /** 主體顏色 */
  color: number;
  /** 深色描邊／陰影 */
  shade: number;
  hp: number;
  speed: number;
  damage: number;
  xp: number;
  /** 最早在第幾秒開始出現 */
  unlockAt: number;
  /** 出現權重，越大越常見 */
  weight: number;
  /** 擊退抗性 0~1，越高越推不動 */
  knockResist: number;
}

export const ENEMY_DEFS: EnemyDef[] = [
  { key: 'carrot',   name: '胡蘿蔔', color: 0xf07a2e, shade: 0xb8541a, hp: 10,  speed: 105, damage: 6,  xp: 1, unlockAt: 0,   weight: 10, knockResist: 0 },
  { key: 'onion',    name: '洋蔥',   color: 0xf3e2c7, shade: 0xc9ae87, hp: 18,  speed: 95, damage: 8,  xp: 2, unlockAt: 15,  weight: 9, knockResist: 0.1 },
  { key: 'chili',    name: '辣椒',   color: 0xe4533a, shade: 0xa8331f, hp: 14,  speed: 150, damage: 10, xp: 2, unlockAt: 35,  weight: 7, knockResist: 0.05 },
  { key: 'cabbage',  name: '高麗菜', color: 0xb7e08a, shade: 0x7aa855, hp: 48,  speed: 75, damage: 12, xp: 4, unlockAt: 60,  weight: 6, knockResist: 0.45 },
  { key: 'eggplant', name: '茄子',   color: 0x8b5cc4, shade: 0x5c3789, hp: 34,  speed: 118, damage: 11, xp: 3, unlockAt: 85,  weight: 6, knockResist: 0.25 },
  { key: 'broccoli', name: '青花菜', color: 0x4f9e52, shade: 0x2f6b33, hp: 60,  speed: 100, damage: 14, xp: 5, unlockAt: 120, weight: 5, knockResist: 0.5 },
  { key: 'scallion', name: '大蔥',   color: 0xd8ea9a, shade: 0x93ad4e, hp: 26,  speed: 215, damage: 9, xp: 3, unlockAt: 85, weight: 5, knockResist: 0.1 },
  { key: 'pumpkin',  name: '南瓜',   color: 0xe8912f, shade: 0xa85c14, hp: 150, speed: 68, damage: 20, xp: 12, unlockAt: 180, weight: 3, knockResist: 0.75 },
];

export const ENEMY_BY_KEY = new Map(ENEMY_DEFS.map((d) => [d.key, d]));
