import Phaser from 'phaser';
import type { RunState } from './GameScene';

export class GameOverScene extends Phaser.Scene {
  private result!: RunState;

  constructor() {
    super('GameOver');
  }

  init(data: RunState) {
    this.result = data;
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.add.rectangle(0, 0, w, h, 0x14100f, 0.95).setOrigin(0);

    const sec = Math.floor(this.result.elapsedMs / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');

    this.add
      .text(w / 2, h * 0.3, '你被吃掉了', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '52px',
        color: '#e4533a',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.47, `撐了 ${mm}:${ss}\n等級 ${this.result.level}\n擊殺 ${this.result.kills}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#f6efe4',
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(w / 2, h * 0.72, '再來一次', {
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
