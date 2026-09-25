import Phaser from 'phaser';
import { UPGRADES, tierWeight, type Upgrade } from '../data/upgrades';
import type { PlayerStats } from '../entities/Player';
import type { GameScene } from './GameScene';
import { t, upgradeText } from '../i18n';
import { isTouchUI } from './screenKit';

const taken = new Map<string, number>();
export function resetUpgrades() {
  taken.clear();
}

/** 還沒達到 maxStacks 的強化 */
function availableUpgrades(): Upgrade[] {
  return UPGRADES.filter((u) => {
    if (u.maxStacks === undefined) return true;
    return (taken.get(u.id) ?? 0) < u.maxStacks;
  });
}

/**
 * 測試用：不開選卡畫面，直接隨機套用一個強化並計入疊加次數。
 * 跳過純回血的 heal，免得浪費一級。
 */
export function autoPickUpgrade(stats: PlayerStats) {
  const [up] = weightedPicks(availableUpgrades().filter((u) => u.id !== 'heal'), 1);
  if (!up) return;
  up.apply(stats);
  taken.set(up.id, (taken.get(up.id) ?? 0) + 1);
}

/** 依 tier 權重抽 n 個不重複的強化：每抽一張就從池子拿掉，再從剩下的按權重抽 */
function weightedPicks(pool: Upgrade[], n: number): Upgrade[] {
  const rest = pool.slice();
  const out: Upgrade[] = [];
  while (out.length < n && rest.length > 0) {
    const total = rest.reduce((sum, u) => sum + tierWeight(u), 0);
    let roll = Math.random() * total;
    let i = 0;
    for (; i < rest.length - 1; i++) {
      roll -= tierWeight(rest[i]);
      if (roll <= 0) break;
    }
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** 比這個寬才把三張卡橫排；手機直向等窄螢幕改成由上往下排的長條卡 */
const ROW_MIN_W = 640;

/** 卡片配色；稀有強化整張卡換成金色系，一眼就跟一般卡分得出來 */
interface CardTheme {
  bgIdle: number;
  bgOn: number;
  lineIdle: number;
  lineOn: number;
  name: string;
  desc: string;
  num: string;
  numOn: string;
}

const NORMAL_THEME: CardTheme = {
  bgIdle: 0x241d19,
  bgOn: 0x3a2e22,
  lineIdle: 0x6b5a4a,
  lineOn: 0x8ecf5a,
  name: '#ffe9b8',
  desc: '#cfc3b4',
  num: '#8d7f70',
  numOn: '#8ecf5a',
};

const RARE_THEME: CardTheme = {
  bgIdle: 0x3b2a0e,
  bgOn: 0x5a4115,
  lineIdle: 0xc9962f,
  lineOn: 0xffd166,
  name: '#ffd166',
  desc: '#f0dcae',
  num: '#c9962f',
  numOn: '#ffd166',
};

function themeOf(up: Upgrade): CardTheme {
  return (up.tier ?? 1) >= 2 ? RARE_THEME : NORMAL_THEME;
}

interface Card {
  up: Upgrade;
  theme: CardTheme;
  root: Phaser.GameObjects.Container;
  box: Phaser.GameObjects.Rectangle;
  name: Phaser.GameObjects.Text;
  num: Phaser.GameObjects.Text;
}

export class LevelUpScene extends Phaser.Scene {
  private stats!: PlayerStats;
  private cards: Card[] = [];
  private selected = 0;
  /** 防止同一次升級被重複套用（例如按住空白鍵觸發按鍵重複） */
  private done = false;

  constructor() {
    super('LevelUp');
  }

  init(data: { stats: PlayerStats }) {
    this.stats = data.stats;
    this.cards = [];
    this.selected = 0;
    this.done = false;
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.add.rectangle(0, 0, w, h, 0x0d0a09, 0.78).setOrigin(0);

    const picks = this.rollChoices(3);
    // 所有強化都達上限時池子會是空的。絕對不能留一個沒有卡片的畫面，
    // 那會讓按鍵全部失效、遊戲永遠停在暫停狀態。
    if (picks.length === 0) {
      this.skip();
      return;
    }

    const title = this.add
      .text(w / 2, 0, this.titleText(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#ffe9b8',
        align: 'center',
        wordWrap: { width: w - 32, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    const column = w < ROW_MIN_W;
    const hint = this.add
      .text(w / 2, 0, t(column || isTouchUI() ? 'levelUp.hintTouch' : 'levelUp.hint'), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8d7f70',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: w - 32, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    // 卡片尺寸：橫排是三張直立卡，直排是三張橫長條
    const cardW = column ? Math.min(w - 32, 440) : Math.min(240, (w - 100) / 3);
    const cardH = column ? 92 : 168;
    const gap = column ? 14 : 20;
    const cardsH = column ? picks.length * cardH + (picks.length - 1) * gap : cardH;

    // 標題、卡片、提示整組垂直置中
    const groupH = title.height + 32 + cardsH + 28 + hint.height;
    const top = Math.max(12, (h - groupH) / 2);
    title.setY(top);
    const cardsTop = top + title.height + 32;
    hint.setY(cardsTop + cardsH + 28);

    picks.forEach((up, i) => {
      if (column) {
        this.makeCard(up, w / 2, cardsTop + cardH / 2 + i * (cardH + gap), cardW, cardH, i, true);
      } else {
        const totalW = picks.length * cardW + (picks.length - 1) * gap;
        const x = (w - totalW) / 2 + cardW / 2 + i * (cardW + gap);
        this.makeCard(up, x, cardsTop + cardH / 2, cardW, cardH, i, false);
      }
    });

    this.bindKeys();
    this.refresh();
  }

  /** 連升多級時提示還有幾次可以選 */
  private titleText() {
    const pending = (this.scene.get('Game') as GameScene).pendingLevelUpCount;
    return pending > 1 ? t('levelUp.titleMore', { count: pending - 1 }) : t('levelUp.title');
  }

  private bindKeys() {
    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    // 直排時上下選比較直覺，橫排時按上下也不會壞
    kb.on('keydown-UP', () => this.move(-1));
    kb.on('keydown-W', () => this.move(-1));
    kb.on('keydown-DOWN', () => this.move(1));
    kb.on('keydown-S', () => this.move(1));
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ONE', () => this.pick(0));
    kb.on('keydown-TWO', () => this.pick(1));
    kb.on('keydown-THREE', () => this.pick(2));
  }

  private rollChoices(n: number): Upgrade[] {
    return weightedPicks(availableUpgrades(), n);
  }

  /**
   * wide = true 是直排用的橫長條卡：名稱與說明靠左、編號在右；
   * false 是橫排用的直立卡：全部置中。
   */
  private makeCard(
    up: Upgrade,
    cx: number,
    cy: number,
    w: number,
    h: number,
    index: number,
    wide: boolean
  ) {
    const root = this.add.container(cx, cy);
    const text = upgradeText(up.id);
    const theme = themeOf(up);

    const box = this.add.rectangle(0, 0, w, h, theme.bgIdle).setStrokeStyle(2, theme.lineIdle);
    box.setInteractive({ useHandCursor: true });

    const padX = 18;
    const numW = 36;
    const name = this.add
      .text(wide ? -w / 2 + padX : 0, wide ? -h / 2 + 14 : -h / 2 + 30, text.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: wide ? '20px' : '22px',
        color: theme.name,
      })
      .setOrigin(wide ? 0 : 0.5, wide ? 0 : 0.5);
    // 卡片窄時英文／韓文名稱比中文長，放不下就縮小字級
    const nameMaxW = wide ? w - padX * 2 - numW - 40 : w - 12;
    const baseSize = wide ? 20 : 22;
    if (name.width > nameMaxW) {
      name.setFontSize(Math.max(12, Math.floor((baseSize * nameMaxW) / name.width)));
    }

    const desc = this.add
      .text(wide ? -w / 2 + padX : 0, wide ? -h / 2 + 44 : -h / 2 + 64, text.desc, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: theme.desc,
        align: wide ? 'left' : 'center',
        wordWrap: { width: wide ? w - padX * 2 - numW : w - 32, useAdvancedWrap: true },
      })
      .setOrigin(wide ? 0 : 0.5, 0);

    const num = this.add
      .text(wide ? w / 2 - padX - numW / 2 : 0, wide ? 4 : h / 2 - 22, String(index + 1), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: wide ? '18px' : '13px',
        color: theme.num,
      })
      .setOrigin(0.5);

    root.add([box, name, desc, num]);

    if (theme === RARE_THEME) {
      root.add(
        this.add
          .text(w / 2 - 10, -h / 2 + 8, t('levelUp.rare'), {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: RARE_THEME.numOn,
          })
          .setOrigin(1, 0)
      );
    }

    // 滑鼠移過去等同於把選取移到這張，鍵盤與滑鼠共用同一個選取狀態
    box.on('pointerover', () => {
      this.selected = index;
      this.refresh();
    });
    box.on('pointerdown', () => this.pick(index));

    this.cards.push({ up, theme, root, box, name, num });
  }

  private refresh() {
    this.cards.forEach((c, i) => {
      const on = i === this.selected;
      const th = c.theme;
      c.box.setFillStyle(on ? th.bgOn : th.bgIdle);
      c.box.setStrokeStyle(on ? 3 : 2, on ? th.lineOn : th.lineIdle);
      c.name.setColor(on ? '#ffffff' : th.name);
      c.num.setColor(on ? th.numOn : th.num);
      c.root.setScale(on ? 1.05 : 1);
    });
  }

  private move(delta: number) {
    if (this.done || this.cards.length === 0) return;
    this.selected = Phaser.Math.Wrap(this.selected + delta, 0, this.cards.length);
    this.refresh();
  }

  private confirm() {
    if (this.done) return;
    const card = this.cards[this.selected];
    if (card) this.choose(card.up);
  }

  /** 直接指定第幾張（數字鍵／滑鼠點擊） */
  private pick(index: number) {
    if (this.done) return;
    const card = this.cards[index];
    if (!card) return;
    this.selected = index;
    this.refresh();
    this.choose(card.up);
  }

  /** 無可選項時的逃生路徑：把待選次數一次清空並恢復遊戲 */
  private skip() {
    this.done = true;
    const game = this.scene.get('Game') as GameScene;
    while (game.consumeLevelUp() > 0) {
      /* 反覆重開空畫面沒有意義，直接排空 */
    }
    this.scene.stop();
    this.scene.resume('Game');
  }

  private choose(up: Upgrade) {
    if (this.done) return;
    this.done = true;
    up.apply(this.stats);
    taken.set(up.id, (taken.get(up.id) ?? 0) + 1);

    // 還有沒選完的等級就重開一輪，全部選完才把遊戲解除暫停
    if ((this.scene.get('Game') as GameScene).consumeLevelUp() > 0) {
      this.scene.restart({ stats: this.stats });
      return;
    }
    this.scene.stop();
    this.scene.resume('Game');
  }
}
