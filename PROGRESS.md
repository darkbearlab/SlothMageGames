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

## 遊戲 2（完成）：《樹懶法師的自動化工房》Sloth Factory
路徑：`static/games/sloth-factory/`（單一 HTML 檔，內嵌全部程式）
網格式自動化生產遊戲（Factorio-lite）：挖礦機→輸送帶→熔爐→組裝機→研究→販賣。
檔案：`static/games/sloth-factory/index.html` + `js/game.js`
注意：`content/games.md` 目前只放了深淵輪迴的卡片，工房與塔防的卡片要等遊戲做好再加回去
（卡片的 CSS class `.g-factory` / `.g-runes` 已經在該檔案的 style 裡了）。
- [x] 完成並串進網站（games.md / projects.md 卡片已加）
- 測試腳本：scratchpad/`test-factory.js`（系統）、`ui-factory.js`（滑鼠操作）
- 伺服器：`npx http-server -p 8100 static/games`

## 遊戲 3（完成）：《樹懶法師：符文塔防》Sloth Runes
路徑：`static/games/sloth-runes/`（index.html + js/game.js）
- [x] 完成並串進網站
- 測試：scratchpad/`test-runes.js`（系統）、`ui-runes.js`（滑鼠）、`balance-runes.js`（用 update(0.05) 快轉做平衡模擬）
- 平衡結論：最佳化打法可通關 30 波，無盡模式約 34 波陣亡

### 已完成的技術細節
- flow field 尋路（BFS 每 0.22s）+ 仇恨半徑 340/視線 620
- 鏡頭 zoom = 1.4（Render.zoom），滑鼠世界座標需除以 zoom
- 測試腳本在 scratchpad：`test-abyss.js`（全系統煙霧測試）、`play-abyss.js`（自動遊玩）
  用 `npx http-server -p 8099 static/games/sloth-abyss` + chromium 於 /opt/pw-browsers/chromium-1194/chrome-linux/chrome
- 已驗證：5 職業、21 層、全技能、全神龕、全 boss 招式、存讀檔、60fps、0 JS error

## 遊戲 4（完成）：《樹懶法師：睡前牌局》Sloth Deck
路徑：`static/games/sloth-deck/`（index.html + js/game.js，純 DOM 介面）
殺戮尖塔式卡牌 roguelike：40 張卡、16 遺物、6 事件、3 幕分支地圖、3 位守關者。
- [x] 完成並串進網站（games.md / projects.md / devlog）
- 測試：scratchpad/`test-deck.js`（全流程）、`bal-deck.js`（自動玩家平衡模擬）

## 遊戲 5（完成）：《樹懶法師：時空棋局》Sloth Tactics
路徑：`static/games/sloth-tactics/`（index.html + js/game.js，Canvas 棋盤 + DOM 側欄）
Into the Breach 式戰棋：敵人攻擊全預告，核心是推撞（撞牆雙方受傷、推進水裡即死）。
3 單位 / 6 種敵人 / 8 種強化 / 每任務 5 回合 / 電網歸零即結束。
- [x] 完成並串進網站
- 測試：scratchpad/`test-tactics.js`

## 遊戲 6（完成）：《樹懶法師的放置修行》Sloth Idle
路徑：`static/games/sloth-idle/`（index.html + js/game.js，純 DOM）
放置型：10 種設施（1.15 倍價格成長）、29 升級、16 成就、頓悟轉生（悟性永久加成）、
離線收益（上限 8→24 小時、效率 50%→100%，皆可升級）。
- [x] 完成並串進網站
- 測試：scratchpad/`test-idle.js`、`test-idle2.js`（離線收益與 max 購買）
- 注意：測離線收益時 beforeunload 會覆寫 lastSave，直接呼叫 applyOffline() 比較準

## 遊戲 7（完成）：《你在廣告裡看到的那個遊戲》Ad Trap
路徑：`static/games/ad-trap/`（index.html + js/{pin,parking,save,main}.js）
把手遊廣告的三種經典關卡做成合集：
- 拔針（`pin.js`）：自寫圓形剛體物理（重力/球球分離/AABB/單向斜坡），5 關，
  每關存 `solution` 陣列，測試腳本會照著拔一遍驗證可解，另有陷阱測試驗證錯誤順序會失敗
- 停車場（`parking.js`）：6 關，關卡用 `parkgen.js` 隨機生成 + BFS 求解器篩選，
  內建 `solvable()` / `validate()` 供測試呼叫
- 選道具（`save.js`）：10 幕選擇題喜劇，純 DOM
- 全破後有「假下載完整版」的結局梗（純畫面演出，不會下載任何東西）
- 測試：scratchpad/`pintest.js`（可解）、`pintrap.js`（陷阱）、`parktest.js`、`test-adtrap.js`（整合）

## 尚未做但可以做的（若還有時間）
- 遊戲 7：物理／解謎類（例如彈射、繩索、重力）
- 深淵輪迴：更多職業技能、詞綴、成就系統
- 工房：分流器、藍圖、統計圖表
- 塔防：更多符文（風/土）、地圖選擇
- 牌局：第二個職業（不同起始牌組）、每日挑戰種子

## 決策紀錄
- 用 Canvas 2D 純程式繪圖（無外部素材），像素/發光風格
- UI 語言：繁體中文
- 存檔用 localStorage key `slothAbyss.save.v1`
