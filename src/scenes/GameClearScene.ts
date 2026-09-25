import Phaser from 'phaser';
import type { RunState } from './GameScene';
import { t } from '../i18n';
import { FONT, drawScreenBackground, drawStatPanel, makeScreenButton, restartOnResize } from './screenKit';

const HEAD_COLOR = '#ffd166';
const HEART_COLOR = '#ff7fa8';
const PANEL_H = 92;
const BTN_H = 56;
/** 寬螢幕（左右兩欄）才用得到的最小寬度 */
const WIDE_MIN_W = 760;

export class GameClearScene extends Phaser.Scene {
  private result!: RunState;
  private leaving = false;

  constructor() {
    super('GameClear');
  }

  init(data: RunState) {
    this.result = data;
    this.leaving = false;
  }

  create() {
    const { width: w, height: h } = this.scale;
    drawScreenBackground(this, w, h, 0x0e1a10);
    this.confetti(w);

    // 寬螢幕：左邊角色、右邊文字與數據；窄螢幕：由上往下疊
    if (w >= WIDE_MIN_W && w > h * 1.1) this.layoutWide(w, h);
    else this.layoutStacked(w, h);

    this.input.keyboard!.once('keydown-SPACE', () => this.leave());
    this.input.keyboard!.once('keydown-ENTER', () => this.leave());
    restartOnResize(this);
  }

  private layoutWide(w: number, h: number) {
    const tex = this.textures.getFrame('victory');
    const imgH = Math.min(h * 0.84, 600);
    const imgW = (imgH * tex.width) / tex.height;
    const colW = Math.min(460, w - imgW - 120);
    const gap = 56;
    const left = (w - (imgW + gap + colW)) / 2;

    this.addHero(left + imgW / 2, h / 2, imgW, imgH);

    const headSize = Phaser.Math.Clamp(Math.round(colW / 8), 30, 52);
    const headH = headSize * 2 * 1.25;
    const colH = headH + 32 + PANEL_H + 40 + BTN_H + 14 + 16;
    const cx = left + imgW + gap + colW / 2;
    const top = (h - colH) / 2;

    this.addHeadline(cx, top, headSize, colW);
    this.addStatsAndButton(cx, top + headH + 32, colW);
  }

  private layoutStacked(w: number, h: number) {
    const headSize = Phaser.Math.Clamp(Math.round(w / 11), 26, 44);
    const headH = headSize * 2 * 1.25;
    const panelW = Math.min(460, w - 32);
    // 角色圖以外的固定高度（含上下各 12px 邊距），矮螢幕時角色圖縮小讓出空間
    const fixedH = headH + 12 + 16 + PANEL_H + 36 + BTN_H + 14 + 16 + 24;
    const tex = this.textures.getFrame('victory');
    const imgH = Math.max(80, Math.min(h * 0.46, 420, h - fixedH));
    const imgW = (imgH * tex.width) / tex.height;
    const top = Math.max(12, (h - (fixedH - 24 + imgH)) / 2);

    this.addHeadline(w / 2, top, headSize, w - 32);
    const imgTop = top + headH + 12;
    this.addHero(w / 2, imgTop + imgH / 2, imgW, imgH);
    this.addStatsAndButton(w / 2, imgTop + imgH + 16, panelW);
  }

  /**
   * 兩行標語（中文：打完收工／回家吃肉 ♥），愛心另外上色並跳動。
   * (cx, top) 是標語區塊上緣中點；超過 maxW 時縮小字級（韓文、英文比中文長）。
   */
  private addHeadline(cx: number, top: number, size: number, maxW: number) {
    const style = {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: HEAD_COLOR,
      stroke: '#14100f',
      strokeThickness: Math.round(size / 6),
    };
    const lineH = size * 1.25;

    const line1 = this.add.text(cx, top + lineH / 2, t('clear.line1'), style).setOrigin(0.5).setDepth(3);

    // 第二行「回家吃肉」+ 愛心當成一組置中
    const word = this.add.text(0, 0, `${t('clear.line2')} `, style).setOrigin(0, 0.5);
    const heart = this.add
      .text(0, 0, '♥', { ...style, color: HEART_COLOR })
      .setOrigin(0.5, 0.5);
    const widest = Math.max(line1.width, word.width + heart.width);
    if (widest > maxW) {
      const fitted = Math.floor((size * maxW) / widest);
      for (const obj of [line1, word, heart]) {
        obj.setFontSize(fitted).setStroke('#14100f', Math.round(fitted / 6));
      }
    }
    const lineW = word.width + heart.width;
    word.setPosition(cx - lineW / 2, top + lineH * 1.5).setDepth(3);
    heart.setPosition(cx - lineW / 2 + word.width + heart.width / 2, top + lineH * 1.5).setDepth(3);

    [line1, word, heart].forEach((obj, i) => {
      obj.setAlpha(0).setScale(1.3);
      this.tweens.add({ targets: obj, alpha: 1, scale: 1, duration: 360, delay: i * 140, ease: 'Back.easeOut' });
    });
    this.tweens.add({
      targets: heart,
      scale: 1.25,
      duration: 420,
      delay: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  /** 角色全身圖：從下方淡入，之後輕輕上下浮動 */
  private addHero(cx: number, cy: number, iw: number, ih: number) {
    const hero = this.add.image(cx, cy + 30, 'victory').setDisplaySize(iw, ih).setDepth(2).setAlpha(0);
    this.tweens.add({
      targets: hero,
      y: cy,
      alpha: 1,
      duration: 500,
      delay: 100,
      ease: 'Quad.easeOut',
      onComplete: () =>
        this.tweens.add({
          targets: hero,
          y: cy - 6,
          duration: 1500,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        }),
    });
  }

  /** 數據面板 + 按鈕 + 按鍵提示。(cx, top) 是面板上緣中點 */
  private addStatsAndButton(cx: number, top: number, panelW: number) {
    const ms = this.result.elapsedMs;
    const mm = String(Math.floor(ms / 60000)).padStart(2, '0');
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');
    drawStatPanel(this, cx, top, panelW, PANEL_H, [
      [t('stat.clearTime'), `${mm}:${ss}.${cs}`],
      [t('stat.level'), String(this.result.level)],
      [t('stat.kills'), String(this.result.kills)],
    ]);

    const btnY = top + PANEL_H + 40 + BTN_H / 2;
    makeScreenButton(this, cx, btnY, t('clear.again'), () => this.leave());
    this.add
      .text(cx, btnY + BTN_H / 2 + 14, t('result.backHint'), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#8d7f70',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);
  }

  /** 從畫面上緣飄落的彩色紙片（particle 是白圖，用 tint 上色） */
  private confetti(w: number) {
    this.add
      .particles(0, -10, 'particle', {
        x: { min: 0, max: w },
        lifespan: 6000,
        speedY: { min: 40, max: 90 },
        speedX: { min: -20, max: 20 },
        rotate: { min: 0, max: 360 },
        scale: { min: 0.18, max: 0.32 },
        alpha: { start: 0.9, end: 0 },
        tint: [0xffd166, 0xff7fa8, 0x8ecf5a, 0x6fd3ff],
        frequency: 140,
      })
      .setDepth(1);
  }

  private leave() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Menu');
  }
}
