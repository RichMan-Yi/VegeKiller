import Phaser from 'phaser';
import type { GameScene } from './GameScene';
import { t } from '../i18n';

/** 條狀 UI 的共用配色 */
const BAR_BG = 0x1a1411;
const FRAME_OUTER = 0x0d0a09;
const FRAME_INNER = 0xc9b48f;

/** 血條顏色：滿血綠 → 半血黃 → 瀕死紅，中間連續漸變 */
const HP_FULL = Phaser.Display.Color.ValueToColor(0x5cc85a);
const HP_MID = Phaser.Display.Color.ValueToColor(0xf2c14e);
const HP_LOW = Phaser.Display.Color.ValueToColor(0xe4533a);

const XP_COLOR = 0x6fd3a2;
const BOSS_COLOR = 0x8b3fd6;

/** 經驗條刻度：每 10% 一根長刻度，中間每 2% 一根短刻度 */
const XP_MAJOR_STEPS = 10;
const XP_MINOR_PER_MAJOR = 5;

export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private xpBar!: Phaser.GameObjects.Graphics;
  private label!: Phaser.GameObjects.Text;
  private bossBar!: Phaser.GameObjects.Graphics;
  private game_!: GameScene;

  constructor() {
    super('UI');
  }

  create() {
    this.game_ = this.scene.get('Game') as GameScene;
    this.xpBar = this.add.graphics().setDepth(2);
    this.hpBar = this.add.graphics().setDepth(2);
    this.bossBar = this.add.graphics().setDepth(2);

    this.label = this.add
      .text(12, 28, '', {
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

    // 經驗條（畫面最上方整條，帶尺規刻度）
    const xpX = 8;
    const xpY = 6;
    const xpW = w - 16;
    const xpH = 14;
    this.xpBar.clear();
    drawFramedBar(this.xpBar, xpX, xpY, xpW, xpH, g.run.xp / g.run.xpToNext, XP_COLOR);
    drawRuler(this.xpBar, xpX, xpY, xpW, xpH);

    // 血條
    const pct = Phaser.Math.Clamp(s.hp / s.maxHp, 0, 1);
    this.hpBar.clear();
    drawFramedBar(this.hpBar, 12, 54, 190, 13, pct, hpColor(pct));

    // BOSS 血條：只在 BOSS 存活時顯示，置於畫面上緣中央
    const boss = g.boss;
    this.bossBar.clear();
    if (boss?.active) {
      const bwid = Math.min(520, w - 80);
      drawFramedBar(this.bossBar, (w - bwid) / 2, 78, bwid, 14, boss.hpRatio, BOSS_COLOR);
    }

    const sec = Math.floor(g.run.elapsedMs / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    this.label.setText(
      t('hud.status', {
        level: g.run.level,
        time: `${mm}:${ss}`,
        kills: g.run.kills,
        hp: Math.max(0, Math.ceil(s.hp)),
        maxHp: s.maxHp,
      })
    );
  }
}

function hpColor(pct: number): number {
  const [from, to, t] = pct >= 0.5 ? [HP_MID, HP_FULL, (pct - 0.5) * 2] : [HP_LOW, HP_MID, pct * 2];
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

/**
 * 帶外框的條：深色外線 + 淺色內框 + 底色 + 填充。
 * 填充上緣加一道半透明亮邊，讓條看起來有厚度。
 * (x, y, w, h) 是填充區域，外框往外長 3px。
 */
function drawFramedBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  color: number
) {
  const fillW = w * Phaser.Math.Clamp(pct, 0, 1);

  g.fillStyle(FRAME_OUTER, 1).fillRoundedRect(x - 3, y - 3, w + 6, h + 6, 4);
  g.fillStyle(FRAME_INNER, 1).fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 3);
  g.fillStyle(BAR_BG, 1).fillRect(x, y, w, h);

  if (fillW <= 0) return;
  g.fillStyle(color, 1).fillRect(x, y, fillW, h);
  g.fillStyle(0xffffff, 0.28).fillRect(x, y, fillW, Math.max(2, Math.round(h * 0.3)));
  g.fillStyle(0x000000, 0.18).fillRect(x, y + h - 2, fillW, 2);
}

/**
 * 經驗條上的尺規刻度：從下緣往上長，長刻度約七成高、短刻度約三分之一。
 * 用外框的淺色，空條（深底）和填滿的部分都看得到。
 */
function drawRuler(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
  const steps = XP_MAJOR_STEPS * XP_MINOR_PER_MAJOR;
  for (let i = 1; i < steps; i++) {
    const major = i % XP_MINOR_PER_MAJOR === 0;
    const tx = Math.round(x + (w * i) / steps);
    const len = Math.ceil(h * (major ? 0.7 : 0.35));
    g.fillStyle(FRAME_INNER, major ? 0.85 : 0.5).fillRect(tx, y + h - len, major ? 2 : 1, len);
  }
}
