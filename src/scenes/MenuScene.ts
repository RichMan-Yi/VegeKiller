import Phaser from 'phaser';
import { resetUpgrades } from './LevelUpScene';
import { FONT, drawScreenBackground, makeScreenButton, restartOnResize } from './screenKit';
import { LANGS, LANG_LABELS, getLang, setLang, t, type Lang } from '../i18n';

const LANG_PILL_W = 92;
const LANG_PILL_H = 32;
const LANG_PILL_GAP = 10;

export class MenuScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super('Menu');
  }

  create() {
    this.started = false;
    const { width: w, height: h } = this.scale;

    drawScreenBackground(this, w, h);

    // ── 標題圖 ──
    // 寬度跟著畫面走，但矮螢幕時改以高度為準，避免把按鈕擠出畫面
    const tex = this.textures.getFrame('title');
    const titleW = Math.min(w * 0.86, 720, (h * 0.34 * tex.width) / tex.height);
    const titleH = (titleW * tex.height) / tex.width;

    // 標題、副標、按鈕、提示、語言選單視為一組，整組在畫面上略偏上置中
    const SUB_H = 26;
    const BTN_H = 56;
    const HINT_H = 16;
    const groupH = titleH + SUB_H + 44 + BTN_H + 14 + HINT_H + 24 + LANG_PILL_H;
    const top = Math.max(16, (h - groupH) / 2 - h * 0.05);

    const titleY = top + titleH / 2;
    const title = this.add
      .image(w / 2, titleY, 'title')
      .setDisplaySize(titleW, titleH)
      .setDepth(2);
    this.tweens.add({
      targets: title,
      y: titleY - 8,
      duration: 1600,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    // 標題圖下緣有一圈陰影留白，副標往上貼一點
    const subY = top + titleH * 0.94;
    this.add
      .text(w / 2, subY, t('menu.subtitle'), {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#e8dccb',
        stroke: '#14100f',
        strokeThickness: 5,
        align: 'center',
        wordWrap: { width: w - 32, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    // ── 開始按鈕 ──
    const btnY = subY + SUB_H + 44 + BTN_H / 2;
    makeScreenButton(this, w / 2, btnY, t('menu.start'), () => this.start());

    const hintY = btnY + BTN_H / 2 + 14;
    this.add
      .text(w / 2, hintY, t('menu.startHint'), {
        fontFamily: FONT,
        fontSize: '13px',
        color: '#8d7f70',
      })
      .setOrigin(0.5, 0)
      .setDepth(2);

    // ── 語言選單 ──
    this.drawLangPicker(w / 2, hintY + HINT_H + 24 + LANG_PILL_H / 2);

    // ── 操作說明：畫面底部，放得下就排一列，放不下每項一行 ──
    const tips = [t('menu.tip.move'), t('menu.tip.mouse'), t('menu.tip.attack'), t('menu.tip.mute')];
    const tipText = this.add
      .text(w / 2, h - 24, tips.join('　·　'), {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#a89a88',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 1)
      .setDepth(2);
    if (tipText.width > w - 32) tipText.setText(tips.join('\n'));

    this.input.keyboard!.once('keydown-SPACE', () => this.start());
    this.input.keyboard!.once('keydown-ENTER', () => this.start());

    restartOnResize(this);
  }

  /** 三顆膠囊按鈕，目前語言填滿、其他只有外框；切換後整頁重畫 */
  private drawLangPicker(cx: number, cy: number) {
    const totalW = LANGS.length * LANG_PILL_W + (LANGS.length - 1) * LANG_PILL_GAP;
    LANGS.forEach((lang: Lang, i) => {
      const x = cx - totalW / 2 + LANG_PILL_W / 2 + i * (LANG_PILL_W + LANG_PILL_GAP);
      const on = lang === getLang();
      const root = this.add.container(x, cy).setDepth(3);
      const g = this.add.graphics();
      const paint = (hover: boolean) => {
        g.clear();
        if (on) g.fillStyle(0x8ecf5a, 1);
        else g.fillStyle(0x14100f, hover ? 0.85 : 0.6);
        g.fillRoundedRect(-LANG_PILL_W / 2, -LANG_PILL_H / 2, LANG_PILL_W, LANG_PILL_H, LANG_PILL_H / 2);
        g.lineStyle(2, on ? 0x14100f : hover ? 0xe8dccb : 0xa89a88, 1);
        g.strokeRoundedRect(-LANG_PILL_W / 2, -LANG_PILL_H / 2, LANG_PILL_W, LANG_PILL_H, LANG_PILL_H / 2);
      };
      paint(false);
      const label = this.add
        .text(0, 0, LANG_LABELS[lang], {
          fontFamily: FONT,
          fontSize: '15px',
          fontStyle: on ? 'bold' : 'normal',
          color: on ? '#14100f' : '#e8dccb',
        })
        .setOrigin(0.5);
      root.add([g, label]);
      if (on) return;
      root.setSize(LANG_PILL_W, LANG_PILL_H).setInteractive({ useHandCursor: true });
      root.on('pointerover', () => paint(true));
      root.on('pointerout', () => paint(false));
      root.on('pointerdown', () => {
        setLang(lang);
        this.scene.restart();
      });
    });
  }

  private start() {
    if (this.started) return;
    this.started = true;
    resetUpgrades();
    this.scene.start('Game');
  }
}
