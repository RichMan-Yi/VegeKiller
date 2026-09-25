import Phaser from 'phaser';
import type { RunState } from './GameScene';
import { t } from '../i18n';
import { FONT, drawScreenBackground, drawStatPanel, makeScreenButton, restartOnResize } from './screenKit';

export class GameOverScene extends Phaser.Scene {
  private result!: RunState;
  private leaving = false;

  constructor() {
    super('GameOver');
  }

  init(data: RunState) {
    this.result = data;
    this.leaving = false;
  }

  create() {
    const { width: w, height: h } = this.scale;
    drawScreenBackground(this, w, h, 0x1c0e0c);

    // ── 標語：先建出來量高度，語系不同長度差很多，窄螢幕會換行 ──
    const headSize = Phaser.Math.Clamp(Math.round(w / 14), 24, 46);
    const head = this.add
      .text(w / 2, 0, t('gameOver.headline'), {
        fontFamily: FONT,
        fontSize: `${headSize}px`,
        fontStyle: 'bold',
        color: '#ff7a5c',
        stroke: '#14100f',
        strokeThickness: 7,
        align: 'center',
        wordWrap: { width: Math.min(w - 32, 720), useAdvancedWrap: true },
      })
      .setOrigin(0.5)
      .setDepth(3);
    const headH = head.height;

    // ── 尺寸：以高度為主算出整組的大小，再整組垂直置中 ──
    const panelW = Math.min(460, w - 32);
    const panelH = 92;
    const BTN_H = 56;
    // 角色圖以外的固定高度（含上下各 12px 邊距），矮螢幕時角色圖縮小讓出空間
    const fixedH = headH + 18 + panelH + 40 + BTN_H + 14 + 16 + 24;
    const tex = this.textures.getFrame('defeated');
    const imgH = Math.min(h * 0.4, 340, h - fixedH, ((w - 32) * tex.height) / tex.width);
    const imgW = (imgH * tex.width) / tex.height;
    const groupH = fixedH - 24 + imgH;
    const top = Math.max(12, (h - groupH) / 2);

    head.setY(top + headH / 2);
    head.setScale(1.3).setAlpha(0);
    this.tweens.add({ targets: head, scale: 1, alpha: 1, duration: 380, ease: 'Back.easeOut' });

    // ── 角色圖：下緣塞進數據面板後面 12px，左右晃動時圖片的裁切邊也不會露出來 ──
    const panelTop = top + headH + 18 + imgH;
    const face = this.add
      .image(w / 2, panelTop + 12, 'defeated')
      .setOrigin(0.5, 1)
      .setDisplaySize(imgW, imgH)
      .setDepth(2)
      .setAlpha(0);
    face.y += 24;
    this.tweens.add({
      targets: face,
      y: panelTop + 12,
      alpha: 1,
      duration: 420,
      delay: 120,
      ease: 'Quad.easeOut',
      onComplete: () =>
        // 不甘願地左右晃
        this.tweens.add({
          targets: face,
          angle: { from: -2, to: 2 },
          duration: 1400,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        }),
    });

    // ── 數據面板 ──
    this.drawStats(w / 2, panelTop, panelW, panelH);

    // ── 按鈕 ──
    const btnY = panelTop + panelH + 40 + BTN_H / 2;
    makeScreenButton(this, w / 2, btnY, t('gameOver.retry'), () => this.leave());
    this.add
      .text(w / 2, btnY + BTN_H / 2 + 14, t('result.backHint'), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#8d7f70',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    this.input.keyboard!.once('keydown-SPACE', () => this.leave());
    this.input.keyboard!.once('keydown-ENTER', () => this.leave());
    restartOnResize(this);
  }

  /** 撐了多久 / 等級 / 擊殺，三欄並排 */
  private drawStats(cx: number, y: number, pw: number, ph: number) {
    const sec = Math.floor(this.result.elapsedMs / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    drawStatPanel(this, cx, y, pw, ph, [
      [t('stat.survived'), `${mm}:${ss}`],
      [t('stat.level'), String(this.result.level)],
      [t('stat.kills'), String(this.result.kills)],
    ]);
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Menu');
  }
}
