---
title: "遊戲區"
date: 2026-07-26T06:00:00+08:00
layout: "single"
description: "可以直接在瀏覽器裡玩的小遊戲。免安裝、免註冊，開了就玩。"
---

這裡的每一款都是純網頁遊戲：不用安裝、不用註冊，點下去就能玩。
手機也可以，但用電腦鍵鼠會順手很多。

{{< rawhtml >}}
<style>
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
</style>

<a class="gcard g-abyss" href="/SlothMageGames/games/sloth-abyss/">
  <div class="tagline">ACTION RPG · ROGUELITE</div>
  <h3>樹懶法師：深淵輪迴</h3>
  <div class="meta"><span>Diablo-like</span><span>程序生成</span><span>隨機掉寶</span><span>5 職業</span><span>20+ 層</span></div>
  <p>暗黑破壞神式的俯視角砍殺。每一次下潛的地城都不一樣，裝備隨機生成、升級時三選一堆疊天賦，
     每五層有一位王等著你。死了就把靈魂帶回祭壇換永久強化，然後再下去一次。</p>
  <span class="play">▶ 進入深淵</span>
</a>

<a class="gcard g-factory" href="/SlothMageGames/games/sloth-factory/">
  <div class="tagline">AUTOMATION · SANDBOX</div>
  <h3>樹懶法師的自動化工房</h3>
  <div class="meta"><span>生產線</span><span>輸送帶</span><span>研究樹</span><span>無壓力</span></div>
  <p>樹懶的信條是：能讓機器做的事，絕不自己動手。從一台挖礦機開始，
     鋪輸送帶、蓋熔爐、組裝魔導元件，把整座工房變成會自己賺錢的機器，
     最後造出「終極樹懶符文」——然後你就可以躺著看它運轉了。</p>
  <span class="play">▶ 開始生產</span>
</a>

<a class="gcard g-runes" href="/SlothMageGames/games/sloth-runes/">
  <div class="tagline">TOWER DEFENSE · ALCHEMY</div>
  <h3>樹懶法師：符文塔防</h3>
  <div class="meta"><span>塔防</span><span>符文融合</span><span>30 波</span><span>無盡模式</span></div>
  <p>火、冰、雷三種符文可以疊在同一座塔上：火＋冰是蒸汽、火＋雷是熔雷、三種一起就是混沌。
     在魔物走到法師的午睡房之前，設計出你的元素連鎖。</p>
  <span class="play">▶ 佈防</span>
</a>

<a class="gcard g-deck" href="/SlothMageGames/games/sloth-deck/">
  <div class="tagline">DECKBUILDER · ROGUELIKE</div>
  <h3>樹懶法師：睡前牌局</h3>
  <div class="meta"><span>卡牌構築</span><span>回合制</span><span>分支地圖</span><span>3 幕</span></div>
  <p>殺戮尖塔式的卡牌 roguelike。40 張卡、16 件遺物、隨機事件與商店，
     三幕地圖各有一位守關者。牌組不是越厚越好——這是這款遊戲教你的第一件事。</p>
  <span class="play">▶ 開始牌局</span>
</a>

<a class="gcard g-tactics" href="/SlothMageGames/games/sloth-tactics/">
  <div class="tagline">TACTICS · PUZZLE</div>
  <h3>樹懶法師：時空棋局</h3>
  <div class="meta"><span>戰棋</span><span>攻擊全預告</span><span>推撞</span><span>8×8</span></div>
  <p>怪物下一步要打哪裡，全部先亮給你看。所以這不是「怎麼躲」的遊戲，
     而是「怎麼把牠們推到會互相打到的位置」的遊戲——推進水裡還會直接淹死。</p>
  <span class="play">▶ 開始佈局</span>
</a>

<a class="gcard g-idle" href="/SlothMageGames/games/sloth-idle/">
  <div class="tagline">IDLE · INCREMENTAL</div>
  <h3>樹懶法師的放置修行</h3>
  <div class="meta"><span>放置</span><span>離線收益</span><span>轉生</span><span>成就</span></div>
  <p>樹懶法師的修行方式是：什麼都不做。買下蒲團、法陣、學徒、星辰觀測台，
     它們會替你累積魔力——連你關掉分頁的時候也會。累積夠了就頓悟轉生，換永久加成再來一輪。</p>
  <span class="play">▶ 開始（不）修行</span>
</a>

{{< /rawhtml >}}
