import Phaser from 'phaser';

/** 音效總音量，相對於 BGM 的平衡就調這個 */
const MASTER = 0.8;

interface SfxDef {
  /** 同一個音效的最小間隔（ms）。同幀或短時間內的重複觸發會被丟棄 */
  minInterval: number;
  volume: number;
  /** 每次播放隨機微調音高的範圍（cents），避免連續重複聽起來像機器 */
  jitter: number;
}

/**
 * 割草遊戲的音效會在瞬間大量觸發，疊在一起就是爆音。
 * 這裡用兩道防線：
 *   1. 呼叫端聚合 —— 一次揮砍不管打中幾隻，都只觸發一次（見 GameScene）
 *   2. 這裡的節流 —— 擋掉漏網的高頻重複
 * 重要性高的音效（受傷、升級、死亡）間隔設長，確保不會被雜音蓋掉。
 */
const DEFS: Record<string, SfxDef> = {
  swing:    { minInterval: 90,  volume: 0.16, jitter: 130 },
  hit:      { minInterval: 70,  volume: 0.28, jitter: 180 },
  kill:     { minInterval: 70,  volume: 0.32, jitter: 200 },
  hurt:     { minInterval: 220, volume: 0.50, jitter: 70 },
  pickup:   { minInterval: 60,  volume: 0.13, jitter: 260 },
  levelup:  { minInterval: 400, volume: 0.42, jitter: 0 },
  gameover: { minInterval: 900, volume: 0.55, jitter: 0 },
};

export type SfxKey = keyof typeof DEFS;
export const SFX_KEYS = Object.keys(DEFS) as SfxKey[];

export class SfxBus {
  private lastAt = new Map<string, number>();

  constructor(private scene: Phaser.Scene) {}

  /** @param detune 額外的音高偏移（cents），用來表現強度差異 */
  play(key: SfxKey, detune = 0) {
    const def = DEFS[key];
    const now = this.scene.time.now;
    if (now - (this.lastAt.get(key) ?? -Infinity) < def.minInterval) return;
    this.lastAt.set(key, now);

    this.scene.sound.play(key, {
      volume: def.volume * MASTER,
      detune: detune + Phaser.Math.Between(-def.jitter, def.jitter),
    });
  }
}
