import { ENEMY_DEFS } from './enemies';
import { BOSS_DEF } from './boss';
import { SFX_KEYS } from '../systems/SfxBus';
import { spriteDef } from './sprites';

/**
 * 素材清單：所有外部檔案都放在 public/，路徑相對於 public/。
 * 換美術時直接覆蓋同名檔案即可，程式碼不用動。
 *
 * 每張圖的顯示寬度、圖片偏移與碰撞半徑在 sprites.jsonc 設定，圖片解析度任意。
 * gem / particle 必須是「白色」——程式會用 tint 上色。
 * 高解析度建議用 2~4 倍；邊長是 2 的次方（128、256…）時縮小會更平滑（有 mipmap）。
 */
export const IMAGE_ASSETS: { key: string; path: string }[] = [
  { key: 'player', path: 'images/player.png' },
  ...ENEMY_DEFS.map((d) => ({ key: d.key, path: `images/enemies/${d.key}.png` })),
  { key: BOSS_DEF.key, path: 'images/boss.png' },
  { key: 'gem', path: 'images/gem.png' },
  { key: 'particle', path: 'images/particle.png' },
  { key: 'ground', path: 'images/ground.png' },
];

/**
 * 介面用的圖（標題等）。不是場上角色，所以不需要在 sprites.jsonc 登記，
 * 顯示大小由各場景自己排版決定。
 */
export const UI_IMAGE_ASSETS: { key: string; path: string }[] = [
  { key: 'title', path: 'images/title.png' },
  { key: 'defeated', path: 'images/defeated.png' },
  { key: 'victory', path: 'images/victory.png' },
];

/** 把這張圖縮放到 sprites.jsonc 指定的顯示寬度（image.width）所需的倍率 */
export function artScale(scene: Phaser.Scene, key: string): number {
  return spriteDef(key).image.width / scene.textures.getFrame(key).width;
}

export const AUDIO_ASSETS: { key: string; path: string }[] = [
  { key: 'bgm', path: 'audio/bgm.mp3' },
  ...SFX_KEYS.map((k) => ({ key: k, path: `audio/sfx/${k}.mp3` })),
];
