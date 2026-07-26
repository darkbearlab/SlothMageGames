# 開發進度筆記 (給 Claude 自己看的 compact-safe 筆記)

> 這份檔案是「跨 context 的記憶」。每完成一個里程碑就更新它。
> 任何 compact 之後，請先讀這份檔案再繼續工作。

## 任務
使用者要求：在此 repo 做一個 HTML 遊戲，時限約 5 小時（2026-07-26 起算）。
第一款：Diablo-like roguelite。所有設計細節由 Claude 決定。
做完若還有時間/token → 再做下一款遊戲（形式隨意）。

## 環境事實
- Repo: darkbearlab/SlothMageGames，Hugo 靜態站（zh-tw），baseURL `https://darkbearlab.github.io/SlothMageGames/`
- 工作分支：`claude/diablo-roguelite-game-d7moi5`（必須推這個分支，完成後開 draft PR）
- `static/` 底下的東西會原樣輸出 → 遊戲放 `static/games/<slug>/`
- 內容頁在 `content/`，作品集頁 `content/projects.md`（可加遊戲連結）
- `layouts/shortcodes/rawhtml.html` 可在 md 內嵌 HTML
- 沒有 gh CLI，要用 mcp__github__* 工具開 PR

## 遊戲 1：《樹懶法師：深淵輪迴》Sloth Abyss
路徑：`static/games/sloth-abyss/`
- 單頁 HTML + 多個 classic script（非 module，才能直接用 file:// 開）
- 檔案分工：
  - `js/core.js`   工具、RNG、存檔
  - `js/data.js`   資料表（職業/敵人/詞綴/技能/天賦/meta 升級）
  - `js/gen.js`    地城生成
  - `js/loot.js`   掉寶與詞綴
  - `js/entity.js` 玩家/敵人/投射物 AI
  - `js/render.js` Canvas 繪圖、粒子、光照、小地圖
  - `js/ui.js`     HUD、背包、技能、Tooltip
  - `js/audio.js`  WebAudio 合成音效
  - `js/main.js`   主迴圈與狀態機

### 進度
- [x] 探勘 repo 結構
- [x] 建立 PROGRESS.md
- [x] MVP：移動/攻擊/敵人/換層/死亡
- [x] 掉寶 + 背包 + 裝備 + 屬性
- [x] 技能 + 升級選擇（天賦）
- [x] 精英/王/生態域
- [x] Meta 進度（靈魂點數、永久升級、小鎮）
- [x] 音效/粒子/小地圖/存檔
- [x] 接到 Hugo 網站（games.md + nav + projects.md + devlog）
- [x] commit & push & draft PR：https://github.com/darkbearlab/SlothMageGames/pull/2 （已訂閱 PR 活動；CI 只在 push main 觸發，此 PR 無 CI）

## 遊戲 2（進行中）：《樹懶法師的自動化工房》Sloth Factory
路徑：`static/games/sloth-factory/`（單一 HTML 檔，內嵌全部程式）
網格式自動化生產遊戲（Factorio-lite）：挖礦機→輸送帶→熔爐→組裝機→研究→販賣。
檔案：`static/games/sloth-factory/index.html` + `js/game.js`
注意：`content/games.md` 目前只放了深淵輪迴的卡片，工房與塔防的卡片要等遊戲做好再加回去
（卡片的 CSS class `.g-factory` / `.g-runes` 已經在該檔案的 style 裡了）。
- [ ] 完成並串進網站

## 遊戲 3：《樹懶法師：符文塔防》Sloth Runes（塔防 + 元素合成）
路徑：`static/games/sloth-runes/`（單一 HTML）
- [ ] 完成並串進網站

### 已完成的技術細節
- flow field 尋路（BFS 每 0.22s）+ 仇恨半徑 340/視線 620
- 鏡頭 zoom = 1.4（Render.zoom），滑鼠世界座標需除以 zoom
- 測試腳本在 scratchpad：`test-abyss.js`（全系統煙霧測試）、`play-abyss.js`（自動遊玩）
  用 `npx http-server -p 8099 static/games/sloth-abyss` + chromium 於 /opt/pw-browsers/chromium-1194/chrome-linux/chrome
- 已驗證：5 職業、21 層、全技能、全神龕、全 boss 招式、存讀檔、60fps、0 JS error

## 決策紀錄
- 用 Canvas 2D 純程式繪圖（無外部素材），像素/發光風格
- UI 語言：繁體中文
- 存檔用 localStorage key `slothAbyss.save.v1`
