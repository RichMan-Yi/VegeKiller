import Phaser from 'phaser';
import type { RunState } from './GameScene';

export class GameClearScene extends Phaser.Scene {
  private result!: RunState;

  constructor() {
    super('GameClear');
  }

  init(data: RunState) {
    this.result = data;
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.add.rectangle(0, 0, w, h, 0x101a12, 0.96).setOrigin(0);

    const ms = this.result.elapsedMs;
    const mm = String(Math.floor(ms / 60000)).padStart(2, '0');
    const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0');

    this.add
      .text(w / 2, h * 0.24, '菜王倒下了', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        color: '#8ecf5a',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.38, '破關時間', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8d7f70',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.47, `${mm}:${ss}.${cs}`, {
        fontFamily: 'ui-monospace, monospace',
        fontSize: '58px',
        color: '#ffe9b8',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.6, `等級 ${this.result.level}　　擊殺 ${this.result.kills}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#f6efe4',
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(w / 2, h * 0.75, '再玩一次', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        color: '#14100f',
        backgroundColor: '#8ecf5a',
        padding: { x: 24, y: 11 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.scene.start('Menu'));
    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('Menu'));
  }
}
