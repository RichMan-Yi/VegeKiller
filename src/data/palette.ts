/**
 * 參考配色：從參考影片的 106 張取樣畫面做 k-means 得到的主色分佈。
 * 顏色本身不是受保護的表達，這裡只留數值，用來讓自製美術的
 * 色調與參考素材一致。造型一律原創。
 */
export const PALETTE = [
  { hex: '#6b63e1', value: 0x6b63e1, share: 0.1426 },
  { hex: '#e3886a', value: 0xe3886a, share: 0.1078 },
  { hex: '#040303', value: 0x040303, share: 0.0944 },
  { hex: '#ead2c0', value: 0xead2c0, share: 0.0862 },
  { hex: '#bfaba3', value: 0xbfaba3, share: 0.0860 },
  { hex: '#996b61', value: 0x996b61, share: 0.0792 },
  { hex: '#afb460', value: 0xafb460, share: 0.0789 },
  { hex: '#f6f2e5', value: 0xf6f2e5, share: 0.0779 },
  { hex: '#fefefd', value: 0xfefefd, share: 0.0763 },
  { hex: '#b32f30', value: 0xb32f30, share: 0.0642 },
  { hex: '#9274c6', value: 0x9274c6, share: 0.0537 },
  { hex: '#473944', value: 0x473944, share: 0.0529 },
] as const;
