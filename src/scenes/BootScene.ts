import Phaser from 'phaser';
import { AUDIO_ASSETS, IMAGE_ASSETS, UI_IMAGE_ASSETS } from '../data/assets';
import { SPRITES } from '../data/sprites';

/** 載入 public/ 底下的所有素材，清單集中在 data/assets.ts。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    for (const { key, path } of IMAGE_ASSETS) this.load.image(key, path);
    for (const { key, path } of UI_IMAGE_ASSETS) this.load.image(key, path);
    // 注意：load.audio 的陣列是「格式偏好」不是「失敗重試」。
    // Phaser 依瀏覽器支援度挑第一個能播的副檔名就不再回頭，
    // 所以清單裡的檔案必須全部存在，否則會 404 然後解碼失敗。
    for (const { key, path } of AUDIO_ASSETS) this.load.audio(key, path);
  }

  create() {
    // 開機就檢查，不要等到某種蔬菜第一次生成才在遊戲中途噴錯
    const missing = IMAGE_ASSETS.map((a) => a.key).filter((k) => !SPRITES[k]);
    if (missing.length) throw new Error(`sprites.jsonc 缺少：${missing.join(', ')}`);
    this.scene.start('Menu');
  }
}
