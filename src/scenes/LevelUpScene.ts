import Phaser from 'phaser';
import { UPGRADES, tierWeight, type Upgrade } from '../data/upgrades';
import type { PlayerStats } from '../entities/Player';
import type { GameScene } from './GameScene';

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

const BG_IDLE = 0x241d19;
const BG_ON = 0x3a2e22;
const LINE_IDLE = 0x6b5a4a;
const LINE_ON = 0x8ecf5a;

interface Card {
  up: Upgrade;
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

    this.add
      .text(w / 2, h * 0.27, this.titleText(), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#ffe9b8',
      })
      .setOrigin(0.5);

    const picks = this.rollChoices(3);
    // 所有強化都達上限時池子會是空的。絕對不能留一個沒有卡片的畫面，
    // 那會讓按鍵全部失效、遊戲永遠停在暫停狀態。
    if (picks.length === 0) {
      this.skip();
      return;
    }

    const cardW = Math.min(240, (w - 100) / 3);
    const cardH = 168;
    const gap = 20;
    const totalW = picks.length * cardW + (picks.length - 1) * gap;
    const startX = (w - totalW) / 2 + cardW / 2;

    picks.forEach((up, i) =>
      this.makeCard(up, startX + i * (cardW + gap), h * 0.5, cardW, cardH, i)
    );

    this.add
      .text(w / 2, h * 0.72, '← → 選擇　空白鍵 / Enter 確定\n也可以直接點擊，或按 1 / 2 / 3', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#8d7f70',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    this.bindKeys();
    this.refresh();
  }

  /** 連升多級時提示還有幾次可以選 */
  private titleText() {
    const pending = (this.scene.get('Game') as GameScene).pendingLevelUpCount;
    return pending > 1 ? `升級了！選一個　(還有 ${pending - 1} 次)` : '升級了！選一個';
  }

  private bindKeys() {
    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-SPACE', () => this.confirm());
    kb.on('keydown-ENTER', () => this.confirm());
    kb.on('keydown-ONE', () => this.pick(0));
    kb.on('keydown-TWO', () => this.pick(1));
    kb.on('keydown-THREE', () => this.pick(2));
  }

  private rollChoices(n: number): Upgrade[] {
    return weightedPicks(availableUpgrades(), n);
  }

  private makeCard(up: Upgrade, cx: number, cy: number, w: number, h: number, index: number) {
    const root = this.add.container(cx, cy);

    const box = this.add.rectangle(0, 0, w, h, BG_IDLE).setStrokeStyle(2, LINE_IDLE);
    box.setInteractive({ useHandCursor: true });

    const name = this.add
      .text(0, -h / 2 + 30, up.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffe9b8',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -h / 2 + 64, up.desc, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#cfc3b4',
        align: 'center',
        wordWrap: { width: w - 32 },
      })
      .setOrigin(0.5, 0);

    const num = this.add
      .text(0, h / 2 - 22, String(index + 1), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#8d7f70',
      })
      .setOrigin(0.5);

    root.add([box, name, desc, num]);

    if ((up.tier ?? 1) >= 2) {
      root.add(
        this.add
          .text(w / 2 - 10, -h / 2 + 8, '稀有', {
            fontFamily: 'system-ui, sans-serif',
            fontSize: '12px',
            color: '#ffd166',
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

    this.cards.push({ up, root, box, name, num });
  }

  private refresh() {
    this.cards.forEach((c, i) => {
      const on = i === this.selected;
      c.box.setFillStyle(on ? BG_ON : BG_IDLE);
      c.box.setStrokeStyle(on ? 3 : 2, on ? LINE_ON : LINE_IDLE);
      c.name.setColor(on ? '#ffffff' : '#ffe9b8');
      c.num.setColor(on ? '#8ecf5a' : '#8d7f70');
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
