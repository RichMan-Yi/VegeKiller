import { spriteDef } from '../data/sprites';
import { artScale } from '../data/assets';

/**
 * 依 sprites.jsonc 設定一個 sprite：數學資料是主體，圖片跟著它擺。
 *
 * - 角色位置 (x, y) = 碰撞圓圓心，半徑 r，永遠不偏移。
 * - 圖片縮放到 image.width，再用 origin 把圖片中心挪到 (x + image.x, y + image.y)。
 *
 * extraScale 是額外的視覺放大（例如大寶石），只影響圖片，不影響判定半徑。
 * 呼叫時機：setTexture 之後；翻面請用 setFacing。
 */
export function applySprite(sprite: Phaser.Physics.Arcade.Sprite, key: string, extraScale = 1) {
  sprite.setScale(artScale(sprite.scene, key) * extraScale);
  layout(sprite, key);
}

/** 翻面；方向改變時重擺圖片（image.x 要鏡像）與碰撞圓 */
export function setFacing(sprite: Phaser.Physics.Arcade.Sprite, key: string, left: boolean) {
  if (sprite.flipX === left) return;
  sprite.setFlipX(left);
  layout(sprite, key);
}

/** 點 (px, py) 到碰撞圓邊緣的距離，在圓內為 0 */
export function hitGap(sprite: Phaser.Physics.Arcade.Sprite, px: number, py: number): number {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  return Math.max(0, Phaser.Math.Distance.Between(px, py, sprite.x, sprite.y) - body.halfWidth);
}

function layout(sprite: Phaser.Physics.Arcade.Sprite, key: string) {
  const { r, image } = spriteDef(key);

  // Phaser 翻面是原地鏡像、不會繞 origin 翻，所以 x 偏移要自己反向
  const w = image.width;
  const h = (w * sprite.frame.height) / sprite.frame.width;
  const dir = sprite.flipX ? -1 : 1;
  sprite.setOrigin(0.5 - (dir * (image.x ?? 0)) / w, 0.5 - (image.y ?? 0) / h);

  if (r === undefined) return;
  // Arcade Body 的半徑與 offset 都是貼圖座標，之後會乘上 scale，這裡先除掉；
  // offset 以 origin（= 角色位置）為圓心
  const tr = r / sprite.scaleX;
  sprite.setCircle(tr, sprite.displayOriginX - tr, sprite.displayOriginY - tr);
}
