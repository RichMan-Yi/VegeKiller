/**
 * 升級所需經驗：幾何成長。
 *
 * 收入端大致是平方級成長（生成密度線性上升 × 單隻經驗隨強敵解鎖變大
 * × 玩家傷害靠倍率強化指數成長），所以需求端必須是指數的，
 * 否則後期會每兩三秒跳一次升級畫面，把遊戲節奏打斷。
 *
 * 實際曲線：
 *   Lv1   8      Lv15  129
 *   Lv5   18     Lv20  350
 *   Lv10  48     Lv25  946
 *
 * 調整手感時動這兩個常數就好：
 *   BASE   決定開場節奏（越小越快看到第一次升級）
 *   GROWTH 決定後期煞車力道（1.15 偏寬鬆，1.30 會很快卡死）
 */
const BASE = 8;
const GROWTH = 1.22;

export function xpForLevel(level: number): number {
  return Math.round(BASE * Math.pow(GROWTH, level - 1));
}
