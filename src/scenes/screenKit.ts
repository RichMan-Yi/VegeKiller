import Phaser from 'phaser';
import { artScale } from '../data/assets';
import { ENEMY_DEFS } from '../data/enemies';

/** 入口、結算這類全畫面頁面共用的背景與按鈕，讓各頁風格一致 */

export const FONT = 'system-ui, sans-serif';
const BTN_COLOR = 0x8ecf5a;
const BTN_HOVER = 0xa6e070;
/** 背景飄過的蔬菜數量 */
const DRIFTERS = 14;

/**
 * 地面貼圖 + 幾隻慢慢往上飄的蔬菜 + 暗色遮罩，和遊戲內的場景有連續感。
 * shadeColor 可以換掉遮罩色調（例如死亡頁面偏紅）。
 */
export function drawScreenBackground(scene: Phaser.Scene, w: number, h: number, shadeColor = 0x14100f) {
  const ground = scene.add.tileSprite(0, 0, w, h, 'ground').setOrigin(0);
  const s = artScale(scene, 'ground');
  ground.setTileScale(s, s);
  scene.tweens.add({
    targets: ground,
    tilePositionY: -ground.height / s,
    duration: 60000,
    repeat: -1,
  });

  for (let i = 0; i < DRIFTERS; i++) {
    const def = Phaser.Utils.Array.GetRandom(ENEMY_DEFS);
    const size = Phaser.Math.Between(28, 56);
    const img = scene.add
      .image(Phaser.Math.Between(0, w), Phaser.Math.Between(0, h), def.key)
      .setAlpha(0.35)
      .setAngle(Phaser.Math.Between(-15, 15));
    img.setScale(size / img.width);
    drift(scene, img, w, h);
  }

  // 中間亮、上下暗，讓主要內容跳出來
  const shade = scene.add.graphics();
  shade.fillStyle(shadeColor, 0.55).fillRect(0, 0, w, h);
  shade.fillStyle(shadeColor, 0.35);
  shade.fillRect(0, 0, w, h * 0.12).fillRect(0, h * 0.88, w, h * 0.12);
}

/** 從目前位置往上飄出畫面，再從底部重新出現 */
function drift(scene: Phaser.Scene, img: Phaser.GameObjects.Image, w: number, h: number) {
  const speed = Phaser.Math.Between(18, 40); // px / 秒
  const top = -img.displayHeight;
  scene.tweens.add({
    targets: img,
    y: top,
    angle: img.angle + Phaser.Math.Between(-20, 20),
    duration: ((img.y - top) / speed) * 1000,
    onComplete: () => {
      img.setPosition(Phaser.Math.Between(0, w), h + img.displayHeight);
      drift(scene, img, w, h);
    },
  });
}

/** 圓角大按鈕：深色外框、底部陰影、上緣亮光，會輕微呼吸縮放，滑鼠移上去變亮 */
export function makeScreenButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
  const bw = 220;
  const bh = 56;
  const root = scene.add.container(x, y).setDepth(3);

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.35).fillRoundedRect(-bw / 2, -bh / 2 + 5, bw, bh, 14);

  const face = scene.add.graphics();
  const paint = (color: number) => {
    face.clear();
    face.fillStyle(0x14100f, 1).fillRoundedRect(-bw / 2 - 3, -bh / 2 - 3, bw + 6, bh + 6, 16);
    face.fillStyle(color, 1).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 14);
    face.fillStyle(0xffffff, 0.22).fillRoundedRect(-bw / 2 + 6, -bh / 2 + 4, bw - 12, bh * 0.36, 9);
  };
  paint(BTN_COLOR);

  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '26px', color: '#14100f', fontStyle: 'bold' })
    .setOrigin(0.5);

  root.add([shadow, face, text]);
  root.setSize(bw, bh).setInteractive({ useHandCursor: true });

  scene.tweens.add({
    targets: root,
    scale: 1.04,
    duration: 900,
    ease: 'Sine.easeInOut',
    yoyo: true,
    repeat: -1,
  });

  root.on('pointerover', () => paint(BTN_HOVER));
  root.on('pointerout', () => paint(BTN_COLOR));
  root.on('pointerdown', onClick);
  return root;
}

/**
 * 主要輸入是不是觸控（手機、平板）。用 pointer: coarse 判斷，
 * 觸控筆電這類同時有滑鼠的裝置仍算桌面，照常顯示鍵盤提示。
 */
export function isTouchUI(): boolean {
  return window.matchMedia?.('(pointer: coarse)').matches ?? false;
}

/** RESIZE 模式下視窗大小改變時整頁重排 */
export function restartOnResize(scene: Phaser.Scene) {
  const relayout = () => scene.scene.restart();
  scene.scale.once('resize', relayout);
  scene.events.once('shutdown', () => scene.scale.off('resize', relayout));
}

const PANEL_BG = 0x1a1411;
const PANEL_LINE = 0xc9b48f;

/**
 * 結算數據面板：淺棕外框（與血條同款），stats 平均分欄，每欄上面小標、下面大字。
 * (cx, y) 是面板上緣中點。
 */
export function drawStatPanel(
  scene: Phaser.Scene,
  cx: number,
  y: number,
  pw: number,
  ph: number,
  stats: [label: string, value: string][],
  depth = 3
) {
  const x = cx - pw / 2;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(0x0d0a09, 1).fillRoundedRect(x - 3, y - 3, pw + 6, ph + 6, 16);
  g.fillStyle(PANEL_LINE, 1).fillRoundedRect(x - 2, y - 2, pw + 4, ph + 4, 15);
  g.fillStyle(PANEL_BG, 1).fillRoundedRect(x, y, pw, ph, 13);

  const colW = pw / stats.length;
  stats.forEach(([label, value], i) => {
    // 欄寬放不下時（手機、帶百分秒的時間）數字縮小，避免擠到隔壁欄。
    // 0.6 是粗體數字字寬相對字級的概略比例
    const valueSize = Math.min(30, Math.floor((colW * 0.86) / (value.length * 0.6)));
    const colX = x + colW * (i + 0.5);
    if (i > 0) g.fillStyle(PANEL_LINE, 0.25).fillRect(x + colW * i, y + 16, 1, ph - 32);
    scene.add
      .text(colX, y + 18, label, { fontFamily: FONT, fontSize: '14px', color: '#a89a88' })
      .setOrigin(0.5, 0)
      .setDepth(depth + 1);
    scene.add
      .text(colX, y + ph - 16, value, {
        fontFamily: FONT,
        fontSize: `${valueSize}px`,
        fontStyle: 'bold',
        color: '#ffe9b8',
      })
      .setOrigin(0.5, 1)
      .setDepth(depth + 1);
  });
}
