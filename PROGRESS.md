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
把手遊廣告的三種經典關卡做成合集，**目前共 58 關**（拔針 14 / 停車場 16 / 選道具 28）：
- 拔針（`pin.js`）：自寫圓形剛體物理（重力/球球分離/AABB/單向斜坡），14 關，
  每關存 `solution` 陣列。**新增「深淵」機制**：`dead: [[x,y,w,h]]`，金幣掉進去立刻失敗
  （岩漿掉進去反而是正解）。`snapshot()` / `restore()` 是給求解器用的測試鉤子。
- 停車場（`parking.js`）：16 關。**新增水泥柱 `blocks: [[x,y]]` 與可變格數 `n`（6→8）**，
  格子大小由 `setSize()` 依 n 自動算。內建 `solvable()` / `validate()` 供測試呼叫。
- 選道具（`save.js`）：28 幕選擇題喜劇，純 DOM，其中 2 幕是四選一
- 全破後有「假下載完整版」的結局梗（純畫面演出，不會下載任何東西）

### 關卡設計用的工具（都在 scratchpad）
- `pinsolve.js`：**拔針的窮舉求解器**。用 snapshot/restore 做樹狀搜尋，列出每關的
  所有勝利順序、失敗分支數、「安全首步」數，並檢查 `solution` 欄位是否真的會贏。
  設計新關卡的流程就是：寫幾何 → 跑它 → 看是無解還是太簡單 → 改 → 再跑。全 14 關約 6 秒。
- `parkgen3.js`：停車場產生器。**重要發現：這個玩法是單調的**（開走一台永遠不會擋到別人），
  所以順序不影響能否過關、也不可能把自己卡死；難度只來自「找出當下唯一開得動的那台」。
  因此指標用 forced（只有一台可動的回合數）與 avgOpt，而不是死路比例。
- `adtrap-full.js`：瀏覽器端全關卡整合測試（拔針照解答走＋倒序必敗、停車場貪心清空、
  選道具每幕先點錯再點對），加 `--mobile` 可跑 iPhone 13 視窗。

### 幾何設計要訣（踩過的坑）
- `collideSeg` 是**單向地板**：球在斜面下方 34px 以內會被「吸」上去，
  所以任何要從斜板底下穿過的通道，垂直淨空要留 ≥45px
- 斜坡太緩（斜率 < 0.3）最後一枚金幣會卡在半路 → 目標區收不齊而判失敗。
  已知可用的斜率約 0.32（例如 60/190）
- 井壁要在分流板上方結束；分流板的出口要閃開固定斜坡
- 想強迫玩家處理岩漿，唯一可靠的結構是**把岩漿疊在金幣下方共用同一條路**；
  只是「共用分流板」的話，玩家可以直接翻板子放金幣、完全不碰岩漿（第三、四關就是這樣）

## 手機瀏覽器適配盤點（2026-07-27）
使用者要求：盤點哪幾款適合手機瀏覽器、在清單上加標籤、做適當改寫。

### 標籤結論（寫在 content/games.md 與 content/projects.md）
| 遊戲 | 標籤 | 理由 |
|---|---|---|
| ad-trap | 📱 手機優先 | 三種關卡全是直式＋純點擊，本來就在模仿手機廣告 |
| sloth-idle | 📱 手機優先 | 純 DOM 清單、點一下買一個、有離線收益 |
| sloth-deck | 📱 手機優先 | 手牌在 ≤760px 變成可橫捲的一列，回合制不限時 |
| sloth-tactics | 📱 手機優先 | 棋盤自動縮放（ts = clamp(avail/N, 34, 92)），全程只有點 |
| sloth-runes | 📱 手機可玩 | 24×14 地圖塞不進手機，靠拖曳平移＋新增的 ⛶ 全覽切換 |
| sloth-factory | 📱 手機可玩 | 新增雙指縮放與 ＋／－ 鍵；大工廠仍是滑鼠舒服 |
| sloth-abyss | 📱 手機可玩 | 唯一的即時動作遊戲；已補觸控按鍵，但大螢幕仍有優勢 |

### 這次做的改寫
- **sloth-abyss**
  - `index.html`：新增 `#touchbtns`（⏸暫停／🎒背包／✋互動 三顆圓鈕），`body.touch` 才顯示
  - `main.js`：`enterTouchMode()`（加 body.touch class）、`nearestEnemy(range)`、`nearestProp()`；
    `useSkillSlot()` 在觸控時自動瞄準最近敵人；touchcancel 補上
  - `ui.js`：`bindTouchButtons()`、`tipBind(el, htmlFn, onActivate)`＝滑鼠 hover ＋
    觸控「第一下看說明、第二下才動作」；`updateHud()` 會依 `nearestProp()` 把互動鍵點亮並改字
    （PROP_LABEL / PROP_ICON）；skillbar 加了法力藥水鍵 `#manaBtn`；背包標題加「✕ 關閉」
  - `render.js`：`fkey()` — 提示文字在觸控時顯示 `[✋]` 而非 `[F]`
- **sloth-factory**：`#zoomBtns`（＋／－）＋雙指 pinch zoom；`Input.markTouch()`；
  手機上排列改精簡（隱藏 logo 與 #rate，否則會擠成直書）；「方向」卡片在觸控顯示「點我旋轉」
- **sloth-runes**：`R.fitMode` ＋ `#btnFit`（⛶ 全覽／放大）切換整張地圖塞進畫面
- **sloth-deck / sloth-idle / ad-trap**：把 26～29px 的小按鈕拉到 min-height 34px
- **layouts/_default/baseof.html**：`img,iframe,video,embed{max-width:100%}`
  （作品集頁的 itch.io iframe 原本在手機上撐出 182px 橫向捲動）

### 驗證
- `scratchpad/mobile-audit.js`：7 款用 iPhone 13 視窗跑，橫向溢出全 0、無 JS error、無 <32px 可點元素
- `scratchpad/mobile-abyss.js`：觸控鍵→開背包→點物品看 tooltip→互動下樓→暫停，全數通過
- `scratchpad/mobile-factory.js`：＋／－ 與雙指縮放都會改 `G.cam.zoom`，點格子仍能蓋
- `scratchpad/m-runes.js`：全覽 scale 0.332 / 放大 0.620，切換後 canPan=false
- `scratchpad/m-site.js`：Hugo 建置後 games 頁 7 個 .mnote ＋ 9 個 .mtag（2 圖例＋7 卡片），溢出 0
- 桌機回歸：test-abyss / factory / runes / deck / tactics / idle / adtrap 全 ERRORS 0
- 注意：node 要用 `NODE_PATH=/opt/node22/lib/node_modules`；hugo 執行檔在 `/tmp/hugo`

## 遊戲 8（完成）：《樹懶法師的分裝魔藥》Sloth Potions
路徑：`static/games/sloth-potions/`（index.html + js/logic.js + js/game.js）
水排序（water sort）解謎。**關卡全部程序生成**，兩種模式：
- 關卡模式：難度曲線 3 色 → 14 色、瓶深 4 → 6，無限復原＋提示
- 無盡挑戰：每關 3 次復原、沒有提示、倒到真的解不開就結束，記錄最高關數

### 架構
- `js/logic.js`：**純邏輯，沒有任何 DOM，可以直接 `require()` 進 Node 測**
  （topRun / canPour / pour / isDone / key / solve / hint / isDeadEnd / generate / difficulty）
- `js/game.js`：Canvas 繪圖、倒藥動畫、收瓶子動畫、輸入、存檔、音效
- 存檔 key `slothPotions.v1`

### 求解器（整個遊戲的核心，一個東西幹三件事）
DFS ＋ 狀態記憶（瓶子內容排序後當 key，空瓶與同內容瓶可互換）＋ 走法排序。
`solve()` 一律回傳 `{ path, nodes, hitLimit }`——**要分清楚「真的無解」與「想太久放棄」**，
否則會把算不動的盤面誤判成死路、直接把玩家的無盡挑戰砍掉。
1. 產生關卡：先隨機灌再驗證，驗不過就重抽（nodeLimit 壓在 40000，太扭曲的盤面重抽比較快）
2. 提示：**要記住整條解答路徑**。只取「當下重算的第一步」會鬼打牆——
   求解器可能從 A 建議走去 B、從 B 又建議走回 A，連按提示就在兩個狀態間來回。
3. 死路判定：只有 `!path && !hitLimit` 才算真的解不開

### 兩種產生法，並用（`scratchpad/sort-compare.js`、`sort-compare2.js` 的實測結果）
1. **正向**：隨機灌滿 → 求解器驗證 → 驗不過重抽（`generateForward`）
2. **反向**：從已解狀態往回隨機倒 N 步，可解由建構保證（`generateReverse` / `generateBestReverse`）

| 13 色 2 空 深 6 | 交界密度 | 死路率 | 空瓶數 | 滿瓶數 | ms |
|---|---|---|---|---|---|
| 正向 | 0.785 | 86% | 2.00 | 13.00 | 56 |
| 反向 | 0.372 | 30% | 0.65 | 10.05 | 3 |

| 12 色 **1 空** 深 4 | 成功率 | ms | 交界密度 | 死路率 |
|---|---|---|---|---|
| 正向 | **16%** | 505 | 0.704 | 98% |
| 反向（最亂的 1/30） | **100%** | 17 | 0.481 | 76% |

結論：
- 反向快很多、而且**一定可解**，但盤面明顯比較不亂（交界密度只有正向的一半），
  瓶子還會參差不齊（4,4,1,4,0,3,4,4）、空瓶數也不等於設定值 → 直接換掉會讓每一關都變簡單
- **「倒到一定亂度」這個旋鈕會飽和**：亂倒 40 步之後，再倒到 800 步，par 一直卡在 27~28。
  隨機反向走法會在已解狀態附近繞，不會愈走愈亂
- 試過「加權反向」（偏好會製造更多交界的走法）→ **反而更糟**（0.357 < 0.425），
  貪心把多樣性壓掉了。改成「抽 30 張挑最亂的」才有效（0.40→0.48、死路率 47%→76%）
- 所以：**正向當預設**（盤面最亂、長得像經典水排序），
  **空瓶 ≤1 的設定直接走反向**（正向做不到的難度軸，靠它補回來）

### 難度曲線
- n ≤ 22：深 4，3 → 13 色
- n 23~34：深 5；n 35~44：深 6
- n ≥ 45：在最高難度附近循環
- **每 10 關（n ≥ 20）一次「只有 1 個空瓶」的狠關**，死路率 80~100%，畫面上會標示
- 全曲線單關產生最久 35ms
- 這個玩法**可以把自己倒進死路**（亂走 8 步後有 8 成救不回來），所以復原是必要的，
  關卡模式預設會在走進死路時出言警告（設定裡可關）

### 版面
`R.plan()` 會在 3~8 欄之間挑「瓶子最大」的排法，所以直式手機自動變多排。
**踩過的坑**：瓶距是瓶寬的 1.42 倍，換算可用寬度時要先除掉這個倍率，
否則整排會比畫面寬、兩側瓶子被切掉。現在額外再量一次實際寬高，超出就再縮。

### 測試
- `scratchpad/sort-bench.js`：產生器與求解器的壓力測試（各難度層級 + 連續 200 關）
- `scratchpad/sort-feas2.js`：掃描 (顏色, 空瓶, 瓶深) 組合的隨機可解率與產生成功率
- `scratchpad/potions-ui.js`：瀏覽器端測試——版面、求解器自動玩完 6 關（走真的 tapTube）、
  連按提示不會鬼打牆、無盡模式的復原上限與死路結束；加 `--mobile` 跑 iPhone 13
- 注意：測試用的 http-server 要加 `-c-1`，否則瀏覽器會拿到快取的舊檔案（debug 白花時間）

## 尚未做但可以做的（若還有時間）
- 遊戲 7：物理／解謎類（例如彈射、繩索、重力）
- 深淵輪迴：更多職業技能、詞綴、成就系統
- 工房：分流器、藍圖、統計圖表
- 塔防：更多符文（風/土）、地圖選擇
- 牌局：第二個職業（不同起始牌組）、每日挑戰種子

## 使用者給的長期授權（2026-07-27）
- **「以後都直接部署」**：做完一個段落之後，不用再問，直接
  推分支 → 開 PR → 標成 ready → squash 合併進 main → 確認 Pages 部署成功。
  合併前該做的驗證照舊（測試全過、0 JS 錯誤、hugo build 過）。

## 決策紀錄
- 用 Canvas 2D 純程式繪圖（無外部素材），像素/發光風格
- UI 語言：繁體中文
- 存檔用 localStorage key `slothAbyss.save.v1`
