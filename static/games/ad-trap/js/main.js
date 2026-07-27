/* ===========================================================
   你在廣告裡看到的那個遊戲 — 主控
   =========================================================== */
'use strict';

const KEY = 'adTrap.v1';
const $ = id => document.getElementById(id);

const GAMES = [
  {
    id: 'pin', icon: '🪝', name: '拔針救法師', tag: 'PULL THE PIN',
    desc: '拔掉針，讓金幣掉到法師身上——但別讓岩漿也掉下去。順序錯了就是一具焦屍。',
    count: () => PIN.LEVELS.length
  },
  {
    id: 'park', icon: '🚗', name: '停車場大逃殺', tag: 'PARKING JAM',
    desc: '點一台車，它就往車頭方向開出去。被擋住就開不動。把整個停車場清空。',
    count: () => PARK.LEVELS.length
  },
  {
    id: 'save', icon: '🤔', name: '選對道具救法師', tag: 'SAVE THE MAGE',
    desc: '三個道具選一個。選對了法師得救，選錯了……你會知道為什麼廣告都放這種畫面。',
    count: () => SAVE.SCENES.length
  }
];

const HUB = {
  prog: { pin: [], park: [], save: [] },
  cur: null, lastT: 0,

  init() {
    this.load();
    $('btnMenu').onclick = () => this.showMenu();
    $('btnHelp').onclick = () => this.help();
    $('btnRestart').onclick = () => this.restart();
    PIN.init($('pinCv'), (st, reason, extra) => this.pinEnd(st, reason, extra));
    PARK.init($('parkCv'), (st, moves) => this.parkEnd(st, moves));
    SAVE.init((st, wrongs) => this.saveEnd(st, wrongs));
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal') this.closeModal(); });
    this.showMenu();
    requestAnimationFrame(t => this.loop(t));
  },

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || '{}');
      for (const k of ['pin', 'park', 'save']) if (Array.isArray(d[k])) this.prog[k] = d[k];
      this.seenEnding = !!d.seenEnding;
    } catch (e) { }
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify({ ...this.prog, seenEnding: this.seenEnding })); } catch (e) { }
  },
  mark(game, lvl) {
    if (!this.prog[game].includes(lvl)) { this.prog[game].push(lvl); this.save(); }
  },
  allDone() {
    return GAMES.every(g => this.prog[g.id].length >= g.count());
  },

  /* ---------- 畫面切換 ---------- */
  showMenu() {
    this.cur = null;
    $('menu').classList.remove('hidden');
    ['pinStage', 'parkStage', 'saveStage'].forEach(s => $(s).classList.add('hidden'));
    $('btnMenu').classList.add('hidden');
    $('btnRestart').classList.add('hidden');
    $('lvlName').textContent = '';
    this.closeModal();
    $('gameCards').innerHTML = GAMES.map(g => {
      const done = this.prog[g.id].length, total = g.count();
      return `<div class="gcard" data-g="${g.id}">
        <div class="tagline">${g.tag}</div>
        <div class="big">${g.icon}</div>
        <h3>${g.name}</h3>
        <p>${g.desc}</p>
        <div class="prog">${done >= total ? '★ 全部完成' : `進度 ${done} / ${total}`}</div>
      </div>`;
    }).join('');
    $('gameCards').querySelectorAll('.gcard').forEach(c =>
      c.onclick = () => this.openGame(c.dataset.g));
    if (this.allDone() && !this.seenEnding) setTimeout(() => this.ending(), 400);
  },

  openGame(id) {
    this.cur = id;
    $('menu').classList.add('hidden');
    $('btnMenu').classList.remove('hidden');
    $('btnRestart').classList.toggle('hidden', id === 'save');
    ['pinStage', 'parkStage', 'saveStage'].forEach(s => $(s).classList.add('hidden'));
    $(id === 'pin' ? 'pinStage' : id === 'park' ? 'parkStage' : 'saveStage').classList.remove('hidden');
    // 從第一個沒過的關卡開始
    const g = GAMES.find(x => x.id === id);
    let start = 0;
    for (let i = 0; i < g.count(); i++) if (!this.prog[id].includes(i)) { start = i; break; }
    this.loadLevel(start);
    setTimeout(() => { if (id === 'pin') PIN.fit(); if (id === 'park') PARK.fit(); }, 0);
  },

  loadLevel(n) {
    const id = this.cur;
    this.closeModal();
    if (id === 'pin') {
      PIN.load(n); PIN.fit();
      $('hint').textContent = PIN.level.hint;
      $('lvlName').textContent = PIN.level.name;
    } else if (id === 'park') {
      PARK.load(n); PARK.fit();
      $('hint2').textContent = '把所有車開出停車場。紅框＝這台被擋住了。';
      $('lvlName').textContent = PARK.LEVELS[n].name;
    } else {
      SAVE.load(n);
      $('lvlName').textContent = `第 ${n + 1} 幕 / ${SAVE.SCENES.length}`;
    }
    this.renderLevels();
  },

  renderLevels() {
    const id = this.cur;
    const g = GAMES.find(x => x.id === id);
    const box = $(id === 'pin' ? 'lvls' : id === 'park' ? 'lvls2' : 'lvls3');
    const cur = id === 'pin' ? PIN.index : id === 'park' ? PARK.index : SAVE.index;
    let h = '';
    for (let i = 0; i < g.count(); i++) {
      const done = this.prog[id].includes(i);
      h += `<div class="lv ${i === cur ? 'on' : ''} ${done ? 'done' : ''}" data-i="${i}">${i + 1}</div>`;
    }
    box.innerHTML = h;
    box.querySelectorAll('.lv').forEach(el => el.onclick = () => this.loadLevel(+el.dataset.i));
  },

  restart() {
    if (this.cur === 'pin') this.loadLevel(PIN.index);
    else if (this.cur === 'park') this.loadLevel(PARK.index);
  },

  /* ---------- 結算 ---------- */
  pinEnd(st, reason) {
    if (st === 'win') {
      this.mark('pin', PIN.index);
      this.win(PIN.index, PIN.LEVELS.length, '金幣全數送達，法師依然沒有醒。');
    } else {
      this.fail(
        reason === 'lava' ? '岩漿把寶藏（和法師的眉毛）燒掉了。'
          : reason === 'lost' ? '有金幣掉進了深淵。它不會再回來了。'
            : '金幣沒有全部送到法師那裡，針也拔完了。');
    }
  },
  parkEnd(st, moves) {
    if (st !== 'win') return;
    this.mark('park', PARK.index);
    this.win(PARK.index, PARK.LEVELS.length, `停車場清空，共 ${moves} 步。`);
  },
  saveEnd(st, wrongs) {
    this.mark('save', SAVE.index);
    this.win(SAVE.index, SAVE.SCENES.length,
      wrongs === 0 ? '一次就選對。你有當救難隊的天分。' : `試了 ${wrongs + 1} 次才選對。法師原諒你了（他不知道）。`);
  },

  win(i, total, msg) {
    const last = i >= total - 1;
    this.modal(`
      <h1>過關</h1>
      <div class="sub">L E V E L &nbsp; C L E A R</div>
      <p style="text-align:center">${msg}</p>
      ${last ? '<p style="text-align:center;color:var(--gold)">這個模式全部完成了。</p>' : ''}
      <button class="bigbtn" id="mNext">${last ? '回選單' : '下一關 ▶'}</button>
      <button class="subbtn" id="mMenu">回選單</button>`);
    $('mNext').onclick = () => { last ? this.showMenu() : this.loadLevel(i + 1); };
    $('mMenu').onclick = () => this.showMenu();
  },
  fail(msg) {
    this.modal(`
      <h1 style="color:var(--bad)">失敗</h1>
      <div class="sub">T R Y &nbsp; A G A I N</div>
      <p style="text-align:center">${msg}</p>
      <button class="bigbtn" id="mRetry">再來一次</button>
      <button class="subbtn" id="mMenu">回選單</button>`);
    $('mRetry').onclick = () => this.restart();
    $('mMenu').onclick = () => this.showMenu();
  },

  help() {
    this.modal(`
      <h1>這是什麼？</h1>
      <div class="sub">A B O U T</div>
      <p>手遊廣告最愛演的那三種關卡，這裡是真的可以玩的版本：</p>
      <ul>
        <li><b>拔針</b>：點針把它抽掉。金幣要全部落進虛線框；岩漿碰到法師或掉進框裡就失敗。
          斜的那塊也是針，拔掉會改變東西流向。<b>暗紅色的洞是深淵</b>——岩漿倒進去正好，金幣掉進去就沒了。</li>
        <li><b>停車場</b>：點車，它就往車頭箭頭方向開出去；紅框代表前面被擋住。
          灰色的 ▧ 是水泥柱，永遠不會動。後面的關卡場地會變大。</li>
        <li><b>選道具</b>：三選一（偶爾四選一）。選錯會有很好的下場（對觀眾而言）。</li>
      </ul>
      <p class="dim" style="font-size:12px">沒有廣告、沒有內購、沒有登入、沒有三消。進度存在你自己的瀏覽器裡。</p>
      <button class="bigbtn" id="mClose">知道了</button>`);
    $('mClose').onclick = () => this.closeModal();
  },

  /* ---------- 全破後的梗 ---------- */
  ending() {
    this.seenEnding = true; this.save();
    this.modal(`
      <h1>三種模式全部通關</h1>
      <div class="sub">Y O U &nbsp; W I N</div>
      <p>你完成了廣告裡演的所有關卡。<b>而且它們真的存在。</b></p>
      <p>作為獎勵，這裡有一個你在廣告最後一定會看到的東西：</p>
      <div class="storecard">
        <div class="icon">🦥</div>
        <div>
          <div class="t">廣告裡的那個遊戲 · 完整版</div>
          <div class="d">4.9★ · 內含 500 關 · 完全免費*</div>
        </div>
      </div>
      <div id="dlBar"><div id="dlFill"></div></div>
      <div id="dlText"></div>
      <button class="bigbtn" id="mDL">立即下載</button>
      <button class="subbtn" id="mMenu">不用了謝謝</button>`, 'fakeStore');
    $('mMenu').onclick = () => this.showMenu();
    $('mDL').onclick = () => this.fakeDownload();
  },

  fakeDownload() {
    const btn = $('mDL');
    btn.disabled = true;
    btn.textContent = '下載中…';
    let p = 0;
    const texts = ['連線中…', '下載資源包 (480 MB)…', '解壓縮…', '安裝中…', '正在開啟…'];
    const timer = setInterval(() => {
      p += 4 + Math.random() * 9;
      if (p > 100) p = 100;
      $('dlFill').style.width = p + '%';
      $('dlText').textContent = texts[Math.min(texts.length - 1, Math.floor(p / 21))] + ' ' + Math.floor(p) + '%';
      if (p >= 100) {
        clearInterval(timer);
        setTimeout(() => this.punchline(), 700);
      }
    }, 130);
  },

  punchline() {
    this.modal(`
      <h1 style="color:var(--gold)">安裝完成</h1>
      <div class="sub">…</div>
      <p style="text-align:center;font-size:28px;margin:10px 0">🍬🍭🍬<br>🍭🍬🍭<br>🍬🍭🍬</p>
      <p style="text-align:center"><b>咦？這是三消遊戲。</b><br>廣告裡那三關呢？</p>
      <p style="text-align:center;color:var(--dim);font-size:12px;line-height:2">
        （開玩笑的，什麼都沒有下載。<br>
        你剛剛玩的就是完整版：3 種模式、58 個關卡、0 個廣告、0 元。）</p>
      <button class="bigbtn" id="mBack">回選單</button>`);
    $('mBack').onclick = () => this.showMenu();
  },

  /* ---------- 彈窗 ---------- */
  modal(html, cls) {
    const m = $('modal');
    $('mbox').className = 'mbox' + (cls ? ' ' + cls : '');
    $('mbox').id = 'mbox';
    $('mbox').innerHTML = html;
    m.classList.remove('hidden');
  },
  closeModal() { $('modal').classList.add('hidden'); },

  toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    $('toasts').appendChild(d);
    setTimeout(() => { d.style.transition = '.4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 2000);
  },

  /* ---------- 主迴圈 ---------- */
  loop(t) {
    requestAnimationFrame(x => this.loop(x));
    const dt = Math.min(0.05, (t - this.lastT) / 1000 || 0);
    this.lastT = t;
    if (this.cur === 'pin') { PIN.step(dt); PIN.draw(); }
    else if (this.cur === 'park') { PARK.step(dt); PARK.draw(); }
  }
};

window.addEventListener('load', () => HUB.init());
