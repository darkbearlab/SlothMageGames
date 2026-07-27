---
title: "遊戲區"
date: 2026-07-26T06:00:00+08:00
layout: "single"
description: "可以直接在瀏覽器裡玩的小遊戲。免安裝、免註冊，開了就玩。"
---

這裡的每一款都是純網頁遊戲：不用安裝、不用註冊，點下去就能玩。

每張卡片上都標了**手機適配標籤**——我把七款全部在手機視窗裡實測過一輪，
該補的觸控操作都補上了（深淵輪迴的互動／背包／暫停鍵、工房的雙指縮放、塔防的全覽切換……），
所以現在沒有哪一款是「手機打不開」的，差別只在螢幕大一點會不會更舒服。

{{< rawhtml >}}
<style>
.mlegend{display:flex;gap:1rem;flex-wrap:wrap;margin:1.2rem 0 .4rem;font-size:.82rem;opacity:.85;align-items:center}
.mtag,.gcard .meta span.mtag{font-size:.72rem;font-weight:700;border-radius:20px;
  padding:.15rem .7rem;white-space:nowrap;opacity:1}
.m-best,.gcard .meta span.m-best{background:rgba(80,220,140,.16);border:1px solid rgba(80,220,140,.6);color:#7fe6ac}
.m-ok,.gcard .meta span.m-ok{background:rgba(255,190,80,.14);border:1px solid rgba(255,190,80,.55);color:#ffcd7a}
.gcard .mnote{font-size:.8rem;line-height:1.7;opacity:.72;margin:-.5rem 0 1rem;
  border-left:2px solid rgba(255,255,255,.2);padding-left:.7rem}
.gcard{display:block;margin:1.4rem 0;padding:1.4rem 1.5rem;border:2px solid #333;border-radius:14px;
  color:#e8e4f0;text-decoration:none;transition:.15s;box-shadow:0 6px 20px rgba(0,0,0,.15)}
.gcard:hover{transform:translateY(-4px);box-shadow:0 14px 34px rgba(0,0,0,.3)}
.gcard .tagline{font-size:.72rem;letter-spacing:4px;opacity:.65}
.gcard h3{margin:.35rem 0 .5rem;font-size:1.6rem;font-weight:900}
.gcard p{margin:0 0 1rem;font-size:.92rem;line-height:1.75;opacity:.85}
.gcard .meta{display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:1rem}
.gcard .meta span{font-size:.72rem;border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:.15rem .7rem;opacity:.8}
.gcard .play{display:inline-block;padding:.6rem 1.5rem;border-radius:8px;font-weight:700;letter-spacing:1px;font-size:.9rem}
.g-abyss{background:linear-gradient(150deg,#1c1926,#14121c 60%,#241a12)}
.g-abyss h3{color:#ffb066}
.g-abyss .play{background:linear-gradient(180deg,#4a2c1c,#2c1a12);border:2px solid #8a5a2c;color:#ffd9a0}
.g-factory{background:linear-gradient(150deg,#121a1e,#0f1418 60%,#132420)}
.g-factory h3{color:#6fe3c0}
.g-factory .play{background:linear-gradient(180deg,#1a3a34,#0f2420);border:2px solid #2c8a72;color:#a0ffe0}
.g-runes{background:linear-gradient(150deg,#1a1424,#120f1a 60%,#241432)}
.g-runes h3{color:#c99aff}
.g-runes .play{background:linear-gradient(180deg,#38224a,#1f142c);border:2px solid #6a3c9a;color:#e0c0ff}
.g-deck{background:linear-gradient(150deg,#191423,#100d16 60%,#241a2e)}
.g-deck h3{color:#c48cff}
.g-deck .play{background:linear-gradient(180deg,#3d2a5e,#241839);border:2px solid #6a4a9c;color:#e0c0ff}
.g-tactics{background:linear-gradient(150deg,#161d25,#0d1116 60%,#12242c)}
.g-tactics h3{color:#5fd6ff}
.g-tactics .play{background:linear-gradient(180deg,#1e4a5c,#123240);border:2px solid #2f7a96;color:#bfe8ff}
.g-idle{background:linear-gradient(150deg,#191527,#0f0d18 60%,#1e1830)}
.g-idle h3{color:#8ab6ff}
.g-idle .play{background:linear-gradient(180deg,#2a3560,#161c34);border:2px solid #4a5a9c;color:#c0d4ff}
.g-adtrap{background:linear-gradient(150deg,#182430,#101820 60%,#2a2012)}
.g-adtrap h3{color:#ffb03c}
.g-adtrap .play{background:linear-gradient(180deg,#4a3410,#2c1f08);border:2px solid #8a6a2c;color:#ffd9a0}
.g-potion{background:linear-gradient(150deg,#181c33,#0e1020 60%,#241a3a)}
.g-potion h3{color:#8ab4ff}
.g-potion .play{background:linear-gradient(180deg,#2f3a66,#1c2240);border:2px solid #4a5a9c;color:#dce6ff}
</style>

<div class="mlegend">
  <span><span class="mtag m-best">📱 手機優先</span> 直式單手就能玩，用手機比用電腦還順</span>
  <span><span class="mtag m-ok">📱 手機可玩</span> 觸控操作齊全，但螢幕大一點會更舒服</span>
</div>

<a class="gcard g-abyss" href="/SlothMageGames/games/sloth-abyss/">
  <div class="tagline">ACTION RPG · ROGUELITE</div>
  <h3>樹懶法師：深淵輪迴</h3>
  <div class="meta"><span class="mtag m-ok">📱 手機可玩</span><span>Diablo-like</span><span>程序生成</span><span>隨機掉寶</span><span>5 職業</span><span>20+ 層</span></div>
  <p>暗黑破壞神式的俯視角砍殺。每一次下潛的地城都不一樣，裝備隨機生成、升級時三選一堆疊天賦，
     每五層有一位王等著你。死了就把靈魂帶回祭壇換永久強化，然後再下去一次。</p>
  <div class="mnote">手機：手指按住畫面往哪拖就往哪走，靠近敵人會自動攻擊；右下角有<b>互動／背包／暫停</b>三顆鍵，
     踩到樓梯或寶箱時互動鍵會亮起來。背包裡的裝備<b>點一下看數值、再點一下才動作</b>。
     這是唯一一款即時動作遊戲，所以大螢幕還是有優勢。</div>
  <span class="play">▶ 進入深淵</span>
</a>

<a class="gcard g-factory" href="/SlothMageGames/games/sloth-factory/">
  <div class="tagline">AUTOMATION · SANDBOX</div>
  <h3>樹懶法師的自動化工房</h3>
  <div class="meta"><span class="mtag m-ok">📱 手機可玩</span><span>生產線</span><span>輸送帶</span><span>研究樹</span><span>無壓力</span></div>
  <p>樹懶的信條是：能讓機器做的事，絕不自己動手。從一台挖礦機開始，
     鋪輸送帶、蓋熔爐、組裝魔導元件，把整座工房變成會自己賺錢的機器，
     最後造出「終極樹懶符文」——然後你就可以躺著看它運轉了。</p>
  <div class="mnote">手機：點格子蓋、拖曳平移、<b>雙指縮放</b>，右側還有一組 ＋／－ 縮放鍵；
     工具列的「方向」卡片點一下就轉向，點既有機器可以旋轉或拆除。
     工廠鋪大之後格子會很多，平板或電腦鋪起來比較過癮。</div>
  <span class="play">▶ 開始生產</span>
</a>

<a class="gcard g-runes" href="/SlothMageGames/games/sloth-runes/">
  <div class="tagline">TOWER DEFENSE · ALCHEMY</div>
  <h3>樹懶法師：符文塔防</h3>
  <div class="meta"><span class="mtag m-ok">📱 手機可玩</span><span>塔防</span><span>符文融合</span><span>30 波</span><span>無盡模式</span></div>
  <p>火、冰、雷三種符文可以疊在同一座塔上：火＋冰是蒸汽、火＋雷是熔雷、三種一起就是混沌。
     在魔物走到法師的午睡房之前，設計出你的元素連鎖。</p>
  <div class="mnote">手機：地圖是 24×14 格，預設放大到手指點得到、可以拖曳平移；
     想看整條路線就按上排的 <b>⛶ 全覽</b> 切成整張塞進畫面，選好位置再按 ⛶ 放大回去蓋塔。
     開波之間可以慢慢想，所以不太吃反應速度。</div>
  <span class="play">▶ 佈防</span>
</a>

<a class="gcard g-deck" href="/SlothMageGames/games/sloth-deck/">
  <div class="tagline">DECKBUILDER · ROGUELIKE</div>
  <h3>樹懶法師：睡前牌局</h3>
  <div class="meta"><span class="mtag m-best">📱 手機優先</span><span>卡牌構築</span><span>回合制</span><span>分支地圖</span><span>3 幕</span></div>
  <p>殺戮尖塔式的卡牌 roguelike。40 張卡、16 件遺物、隨機事件與商店，
     三幕地圖各有一位守關者。牌組不是越厚越好——這是這款遊戲教你的第一件事。</p>
  <div class="mnote">手機：手牌在窄螢幕會排成<b>可左右滑動的一列</b>，點卡選取、再點目標出牌，
     能量球與結束回合鍵排在下方。回合制、不限時，通勤時一手就能打完一場。</div>
  <span class="play">▶ 開始牌局</span>
</a>

<a class="gcard g-tactics" href="/SlothMageGames/games/sloth-tactics/">
  <div class="tagline">TACTICS · PUZZLE</div>
  <h3>樹懶法師：時空棋局</h3>
  <div class="meta"><span class="mtag m-best">📱 手機優先</span><span>戰棋</span><span>攻擊全預告</span><span>推撞</span><span>8×8</span></div>
  <p>怪物下一步要打哪裡，全部先亮給你看。所以這不是「怎麼躲」的遊戲，
     而是「怎麼把牠們推到會互相打到的位置」的遊戲——推進水裡還會直接淹死。</p>
  <div class="mnote">手機：8×8 的棋盤會自動縮放到剛好塞滿螢幕寬度，單位卡片改排在棋盤下方；
     點單位→點格子移動→點技能→點目標，全程只有「點」這一個動作。回合制不限時，最適合躺著玩。</div>
  <span class="play">▶ 開始佈局</span>
</a>

<a class="gcard g-idle" href="/SlothMageGames/games/sloth-idle/">
  <div class="tagline">IDLE · INCREMENTAL</div>
  <h3>樹懶法師的放置修行</h3>
  <div class="meta"><span class="mtag m-best">📱 手機優先</span><span>放置</span><span>離線收益</span><span>轉生</span><span>成就</span></div>
  <p>樹懶法師的修行方式是：什麼都不做。買下蒲團、法陣、學徒、星辰觀測台，
     它們會替你累積魔力——連你關掉分頁的時候也會。累積夠了就頓悟轉生，換永久加成再來一輪。</p>
  <div class="mnote">手機：整個介面就是一串可以往下滑的清單，點一下買一個，也可以切成 ×10／×100／最大量一次買到底。
     離線收益會照關掉分頁的時間補給你，本來就是為了「有空才看一眼」設計的——這款最像手機遊戲。</div>
  <span class="play">▶ 開始（不）修行</span>
</a>

<a class="gcard g-adtrap" href="/SlothMageGames/games/ad-trap/">
  <div class="tagline">PUZZLE · PARODY</div>
  <h3>你在廣告裡看到的那個遊戲</h3>
  <div class="meta"><span class="mtag m-best">📱 手機優先</span><span>拔針</span><span>停車場</span><span>選道具</span><span>58 關</span></div>
  <p>手遊廣告裡演的那些關卡——拔錯針被岩漿淹死、停車場永遠喬不出來、選錯道具讓主角當場去世——
     下載後往往根本找不到。所以這裡直接把它們做出來了：沒有廣告、沒有內購、沒有三消。</p>
  <div class="mnote">手機：三種關卡都是直式版面、全部用點的（點針拔出來、點車開走、點道具救人）。
     本來就是模仿手機廣告，當然要在手機上玩才對味——<b>這款最推薦用手機開</b>。</div>
  <span class="play">▶ 開始玩（真的）</span>
</a>

<a class="gcard g-potion" href="/SlothMageGames/games/sloth-potions/">
  <div class="tagline">PUZZLE · SORTING</div>
  <h3>樹懶法師的分裝魔藥</h3>
  <div class="meta"><span class="mtag m-best">📱 手機優先</span><span>水排序</span><span>程序生成</span><span>保證有解</span><span>無盡模式</span></div>
  <p>法師熬了一整年的魔藥，然後把它們全倒進同一批瓶子裡就睡著了。
     把每種顏色倒回自己的瓶子——一瓶湊齊同色就會被收走，收到桌上一瓶不剩為止。
     從三色開始，一路加到十四色、瓶子加深到六格；另有一個永遠打不完的無盡挑戰。</p>
  <div class="mnote">手機：點一瓶選起來、再點另一瓶就倒過去，瓶子會自動排成剛好塞滿螢幕的格狀。
     每一關都是<b>現場隨機生成、再用內建求解器驗證過</b>才端出來的，所以不會遇到無解的關卡；
     提示和「這一步之後就解不開了」的警告也是同一個求解器算的。</div>
  <span class="play">▶ 開始分裝</span>
</a>

{{< /rawhtml >}}
