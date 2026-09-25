import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameClearScene } from './scenes/GameClearScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#14100f',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  // 高解析度美術會被大幅縮小，開 mipmap 避免鋸齒閃爍（只對 2 的次方尺寸的貼圖生效）
  render: { pixelArt: false, antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
  scene: [BootScene, MenuScene, GameScene, UIScene, LevelUpScene, GameOverScene, GameClearScene],
});
