import Phaser from 'phaser';
import type { GameScene } from './GameScene';

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private bossLabel!: Phaser.GameObjects.Text;
  private game_!: GameScene;

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    this.xpBar = this.add.graphics().setDepth(2);
    this.hpBar = this.add.graphics().setDepth(2);
    this.bossBar = this.add.graphics().setDepth(2);
    this.bossLabel = this.add
      .text(0, 0, '菜王', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#ffd166',
        stroke: '#1a1210',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setVisible(false);

    this.label = this.add
      .text(12, 22, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#f6efe4',
        stroke: '#1a1210',
        strokeThickness: 4,
      })
      .setDepth(3);
  }

  override update() {
    const g = this.game_;
    if (!g || !g.player) return;
    const w = this.scale.width;
    const s = g.player.stats;

    // 經驗條（畫面最上方整條）
    this.xpBar.clear();
    this.xpBar.fillStyle(0x241c18, 1).fillRect(0, 0, w, 14);
    this.xpBar.fillStyle(0x6fd3a2, 1).fillRect(0, 0, w * (g.run.xp / g.run.xpToNext), 14);

    // 血條
    const bw = 190;
    this.hpBar.clear();
    this.hpBar.fillStyle(0x241c18, 1).fillRect(12, 46, bw, 13);
    const pct = Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1);
    this.hpBar.fillStyle(pct > 0.3 ? 0xe4533a : 0xffb020, 1).fillRect(12, 46, bw * pct, 13);

    // BOSS 血條：只在 BOSS 存活時顯示，置於畫面上緣中央
    const boss = g.boss;
    this.bossBar.clear();
    if (boss?.active) {
      const bwid = Math.min(520, w - 80);
      const bx = (w - bwid) / 2;
      const by = 74;
      this.bossBar.fillStyle(0x241c18, 1).fillRect(bx - 2, by - 2, bwid + 4, 18);
      this.bossBar.fillStyle(0x8b3fd6, 1).fillRect(bx, by, bwid * boss.hpRatio, 14);
      this.bossLabel.setPosition(w / 2, by - 14).setVisible(true);
    } else {
      this.bossLabel.setVisible(false);
    }

    const sec = Math.floor(g.run.elapsedMs / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.label.setText(
      `Lv.${g.run.level}   ${mm}:${ss}   擊殺 ${g.run.kills}   HP ${Math.max(0, Math.ceil(s.hp))}/${s.maxHp}`
    );
  }
}
