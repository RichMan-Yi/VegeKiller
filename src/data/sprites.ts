import { parse, printParseErrorCode, type ParseError } from 'jsonc-parser';
import raw from './sprites.jsonc?raw';

/** 圖片外觀，單位是遊戲 px；x / y 是圖片中心相對角色位置的偏移 */
export interface ImageDef {
  width: number;
  x?: number;
  y?: number;
}

export interface SpriteDef {
  /** 戰鬥判定圓半徑，圓心固定在角色位置；沒有碰撞的圖不填 */
  r?: number;
  image: ImageDef;
}

/** sprites.jsonc（可寫註解、允許結尾逗號）；格式錯誤直接擋在開機 */
export const SPRITES: Record<string, SpriteDef> = (() => {
  const errors: ParseError[] = [];
  const data = parse(raw, errors, { allowTrailingComma: true });
  if (errors.length) {
    const msg = errors.map((e) => `${printParseErrorCode(e.error)} @ offset ${e.offset}`).join('; ');
    throw new Error(`sprites.jsonc 格式錯誤：${msg}`);
  }
  return data;
})();

export function spriteDef(key: string): SpriteDef {
  const def = SPRITES[key];
  if (!def) throw new Error(`sprites.jsonc 缺少 "${key}"`);
  return def;
}
