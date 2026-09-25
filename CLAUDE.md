# VegeKiller

個人練習專案：2D 割草生存遊戲（survivor-like），玩家揮刀對抗成群的擬人化蔬菜。
靈感來自一支韓國動畫 MV 的「小孩大戰蔬菜」概念，角色與素材全部原創。

## 指令

```bash
npm run dev      # Vite dev server，http://localhost:5173
npm run build    # tsc --noEmit + vite build
npm run preview  # 預覽 production build
```

## 架構

```
src/
  main.ts                    Phaser.Game 設定，場景註冊順序即啟動順序
  data/assets.ts             素材清單：texture/audio key → public/ 路徑
  data/sprites.jsonc          每個角色的判定半徑 r + 圖片外觀（顯示寬度、相對角色位置的偏移）
  data/enemies.ts            蔬菜圖鑑：數值 + 配色 + 解鎖時間 + 出現權重
  data/upgrades.ts           升級池
  data/boss.ts               BOSS 數值（觸發等級、血量、技能節奏）
  data/progression.ts        升級所需經驗曲線
  data/palette.ts            參考配色（只有色值，造型一律原創）
  data/sprites.ts            讀取並解析 sprites.jsonc
  entities/Player.ts         玩家 + PlayerStats
  entities/Enemy.ts          敵人 + 經驗寶石，兩者都跑 Phaser Group 物件池
  entities/Boss.ts           BOSS，繼承 Enemy 但不進物件池
  entities/hitbox.ts         applySprite / setFacing / hitGap
  systems/WeaponSystem.ts    揮刀判定與扇形特效
  systems/SpawnDirector.ts   生成速率、移動速度倍率、種類解鎖曲線
  systems/SfxBus.ts          音效播放與節流
  scenes/                    Boot → Menu → Game（+ UI / LevelUp / GameOver / GameClear）
public/images/               所有貼圖（player / enemies/<key> / boss / gem / particle / ground）
public/audio/bgm.mp3         原創循環配樂（numpy 合成，A 小調 140BPM 8 小節）
public/audio/sfx/            音效（swing / hit / kill / hurt / pickup / levelup / gameover）
```

## 慣例

**數值一律用倍率制。** `PlayerStats` 裡每個屬性都有對應的 `*Mul`（`damageMul`、
`cooldownMul`、`rangeMul`…）。新增強化只要在 `upgrades.ts` 動倍率，不要改戰鬥邏輯。

**判定與特效共用同一個來源。** `WeaponSystem` 的 `reach` 和 `arcRad` 兩個 getter
同時餵給命中判定和 `spawnSlashVfx()`，特效是照實際參數即時畫的扇形，不是貼圖。
改判定範圍時特效會自動跟上——不要退回成固定貼圖，之前那版的 origin 對不上圓心。

**敵人／寶石必須走物件池。** 用 `group.get()` 取、`disableBody(true, true)` 還，
不要 `new` 或 `destroy()`。同屏可能上百隻。

**美術一律從 `public/images/` 載入。** 清單在 `data/assets.ts`，`BootScene` 照清單
`load.image`。目前的 PNG 是照舊版程式生成圖畫出來的 4 倍解析度佔位，換正式美術時直接覆蓋同名檔案。
顯示寬度寫在 `sprites.jsonc` 的 `image.width`，圖片解析度任意。
`gem`、`particle` 必須是白色（程式用 tint 上色）。

**數學資料是主體，圖片跟著擺。** 角色位置 (x, y) 就是碰撞圓圓心，半徑是 `sprites.jsonc` 的 `r`，
判定圓永遠不偏移；要調的是圖片——`image.x / image.y` 是圖片中心相對角色位置的偏移。
一律用 `entities/hitbox.ts` 的 `applySprite(sprite, key)` 設定縮放／origin／碰撞圓、`setFacing()` 翻面，
不要直接呼叫 `setScale` / `setOrigin` / `setCircle` / `setFlipX`——Arcade Body 會跟著 scale 縮放、
Phaser 翻面不會繞 origin，helper 都處理掉了。武器命中用 `hitGap()` 量到碰撞圓邊緣。
遊戲中按 H 顯示碰撞圓。斬擊扇形、BOSS AOE 提示、UI 血條是照判定即時畫的，不做成貼圖。

## 素材政策

所有美術與音訊都必須是原創、自製，或明確可商用的授權（CC0 / public domain）。
不從參考影片擷取畫面或音軌來做素材。

## 新增內容

- **新蔬菜**：在 `data/enemies.ts` 加一筆 `EnemyDef`、在 `data/sprites.jsonc` 加同名一行
  （r + image），再放一張 `public/images/enemies/<key>.png`，不需其他改動。
- **新強化**：在 `data/upgrades.ts` 加一筆 `Upgrade`。有上限的用 `maxStacks`。
- **難度調整**：`SpawnDirector` 的 `rateAt()`（生成速率）、`enemies.ts` 的 `hp` / `unlockAt`。
  敵人血量刻意不隨時間成長，難度只靠數量與新種類推進。

## 待辦

- [x] BOSS 戰
- [ ] 第二種武器，讓 build 有分歧
- [x] 打擊音效
- [ ] 正式美術（自己畫 / CC0 素材包 / AI 生圖，尚未決定）
