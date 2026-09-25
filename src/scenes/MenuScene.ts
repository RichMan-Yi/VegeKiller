import Phaser from 'phaser';
import { resetUpgrades } from './LevelUpScene';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.add.rectangle(0, 0, w, h, 0x14100f).setOrigin(0);

    this.add
      .text(w / 2, h * 0.32, 'VegeKiller', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '64px',
        color: '#8ecf5a',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.43, '蔬菜大軍來了，活下去', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#cfc3b4',
      })
      .setOrigin(0.5);

    this.add
      .text(w / 2, h * 0.58, 'WASD / 方向鍵 移動\n按住滑鼠也能走\n攻擊會自動觸發\nM 鍵靜音', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#8d7f70',
        align: 'center',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    const btn = this.add
      .text(w / 2, h * 0.76, '開始遊戲', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#14100f',
        backgroundColor: '#8ecf5a',
        padding: { x: 26, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => this.start());
    this.input.keyboard!.once('keydown-SPACE', () => this.start());
    this.input.keyboard!.once('keydown-ENTER', () => this.start());
  }

  private start() {
    resetUpgrades();
    this.scene.start('Game');
  }
}
