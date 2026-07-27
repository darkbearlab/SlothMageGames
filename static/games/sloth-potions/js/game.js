/* ===========================================================
   樹懶法師的分裝魔藥 — 畫面、動畫、輸入、存檔
   邏輯與求解器都在 logic.js（SORT），這裡只負責「玩起來的部分」
   =========================================================== */
'use strict';

const KEY = 'slothPotions.v1';
const $ = id => document.getElementById(id);

/* ---------- 顏色 ---------- */
// 14 色，盡量拉開色相與明度；每色再配一個符號，色弱也分得出來
const PALETTE = [
  { c: '#ff5a5a', s: '●' }, { c: '#ff9b34', s: '▲' }, { c: '#ffe14a', s: '■' },
  { c: '#9ee23c', s: '◆' }, { c: '#2fc46b', s: '★' }, { c: '#35d6c4', s: '✚' },
  { c: '#43a6ff', s: '▼' }, { c: '#6a68ff', s: '⬢' }, { c: '#b263ff', s: '✦' },
  { c: '#ff62c6', s: '❤' }, { c: '#ff9d8f', s: '◗' }, { c: '#c2a02a', s: '✱' },
  { c: '#93a3bb', s: '◐' }, { c: '#8a6242', s: '❖' }
];
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, v + amt));
  return '#' + ((f((n >> 16) & 255) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0');
}

/* ---------- 音效（WebAudio 合成，沒有外部檔案） ---------- */
const Sound = {
  ctx: null, on: true,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } },
  blip(freq, dur, type, gain) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain || .08, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + .02);
  },
  pour(n) { this.blip(300 + n * 40, .18, 'triangle', .06); },
  bad() { this.blip(150, .12, 'square', .05); },
  done() { [660, 880, 1100].forEach((f, i) => setTimeout(() => this.blip(f, .22, 'sine', .07), i * 70)); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, .3, 'triangle', .07), i * 110)); },
  over() { [400, 320, 240].forEach((f, i) => setTimeout(() => this.blip(f, .3, 'sawtooth', .05), i * 130)); }
};

/* ---------- 存檔 ---------- */
const Save = {
  d: { stage: 1, cleared: 0, endlessBest: 0, endlessRuns: 0, symbols: true, sound: true, guard: true },
  load() {
    try { Object.assign(this.d, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
    Sound.on = this.d.sound;
  },
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch (e) { } }
};

/* ---------- 版面 ---------- */
const R = {
  cv: null, ctx: null, w: 0, h: 0, dpr: 1,
  bw: 60, bh: 200, unit: 30, cols: 5, slots: [],

  init() {
    this.cv = $('cv'); this.ctx = this.cv.getContext('2d');
    window.addEventListener('resize', () => { this.resize(); G.relayout(true); });
  },
  resize() {
    const b = $('board');
    this.w = b.clientWidth; this.h = b.clientHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.w * this.dpr);
    this.cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.plan();
  },
  // 選一個「瓶子最大」的行列配置：直式手機會自動變成多排
  // 注意：瓶距是瓶寬的 1.42 倍，所以換算可用寬度時要先除掉這個倍率，
  // 否則整排會比畫面寬、兩側的瓶子會被切掉。
  plan() {
    const n = Math.max(1, G.visibleCount());
    const cap = G.cap || 4;
    const PITCH = 1.42, VGAP = 0.3, SHAPE = cap * 0.52 + 0.62;
    let best = null;
    for (let cols = 3; cols <= 8; cols++) {
      const rows = Math.ceil(n / cols);
      const perCol = (this.w - 10) / cols;
      const perRow = (this.h - 10) / rows;
      const byW = perCol / PITCH;
      const byH = perRow / (SHAPE + VGAP);
      const bw = Math.min(byW, byH);
      if (!best || bw > best.bw) best = { cols, rows, bw };
    }
    this.cols = best.cols;
    this.rows = best.rows;
    this.bw = Math.max(20, Math.min(116, best.bw));
    // 保險：真的量一次最寬的那排與總高，超出畫面就再縮
    const inRow = Math.min(this.cols, n);
    const wNeed = inRow * this.bw * PITCH - (PITCH - 1) * this.bw;
    if (wNeed > this.w - 8) this.bw *= (this.w - 8) / wNeed;
    const hNeed = this.rows * this.bw * (SHAPE + VGAP) - VGAP * this.bw;
    if (hNeed > this.h - 8) this.bw *= (this.h - 8) / hNeed;
    this.unit = this.bw * 0.52;
    this.bh = cap * this.unit + this.bw * 0.62;
  },
  // 第 i 個「可見」瓶子的目標座標（瓶口中心）
  slotOf(i, total) {
    const cols = this.cols, rows = Math.ceil(total / cols);
    const r = Math.floor(i / cols);
    const inRow = Math.min(cols, total - r * cols);
    const cw = this.bw + this.bw * 0.42;
    const rowW = inRow * cw - (cw - this.bw);
    const x0 = (this.w - rowW) / 2;
    const totalH = rows * (this.bh + this.bw * 0.3) - this.bw * 0.3;
    // 選起來的瓶子會往上浮，所以上方要留出浮起來的空間，不然會頂到頂列
    const y0 = Math.max(this.bw * 0.42, (this.h - totalH) / 2);
    return {
      x: x0 + (i - r * cols) * cw + this.bw / 2,
      y: y0 + r * (this.bh + this.bw * 0.3)
    };
  }
};

/* ---------- 遊戲 ---------- */
const G = {
  mode: 'stage', level: 1, tubes: [], cap: 4, par: 0, moves: 0,
  history: [], sel: -1, anim: null, fx: [], msgT: 0,
  removed: [],          // 已完成收走的瓶子索引
  ready: false, loadSeq: 0,
  view: [],             // 每個瓶子的顯示狀態 {x,y,tx,ty,shake,out}
  undosLeft: Infinity, hintsUsed: 0, over: false, busy: false,
  hintMove: null, sol: null, lastT: 0,

  /* ===== 生命週期 ===== */
  boot() {
    Save.load();
    R.init();
    this.bindUI();
    this.showMenu();
    requestAnimationFrame(t => this.loop(t));
  },

  showMenu() {
    this.mode = null;
    $('menu').classList.remove('hidden');
    $('stage').classList.add('hidden');
    ['btnUndo', 'btnHint', 'btnRestart'].forEach(i => $(i).classList.add('hidden'));
    $('cLevel').classList.add('hidden'); $('cMoves').classList.add('hidden');
    $('btnMenu').innerHTML = '?<span class="lbl"> 說明</span>';   // 在選單上這顆是說明
    this.closeModal();
    $('modeCards').innerHTML = `
      <div class="mcard" data-m="stage">
        <div class="tagline">S T A G E</div>
        <div class="big">🧪</div>
        <h3>關卡模式</h3>
        <p>從三種顏色開始，一路加到十四種、瓶子加深到六格。
           每一關都是程式現場生成的，而且保證解得開。可以無限復原，卡住還能要提示。</p>
        <div class="prog">目前進度：第 ${Save.d.stage} 關　已通關 ${Save.d.cleared} 關</div>
      </div>
      <div class="mcard" data-m="endless">
        <div class="tagline">E N D L E S S</div>
        <div class="big">♾️</div>
        <h3>無盡挑戰</h3>
        <p>一關接一關，難度只會往上，永遠不會結束。<b style="color:var(--gold)">每關只有 3 次復原、沒有提示</b>，
           而且倒到再也解不開就當場結束——所以每一步都要想清楚。</p>
        <div class="prog">最佳紀錄：第 ${Save.d.endlessBest} 關　挑戰過 ${Save.d.endlessRuns} 次</div>
      </div>`;
    $('modeCards').querySelectorAll('.mcard').forEach(c =>
      c.onclick = () => this.start(c.dataset.m));
    $('menuNote').innerHTML =
      `每一關都是先隨機灌好、再用內建的求解器驗證過才端出來的，所以<b>不會出現無解的關卡</b>。
       提示與「還救不救得回來」的判斷也是同一個求解器算的。<br>
       進度存在你自己的瀏覽器裡，換裝置不會同步。`;
  },

  start(mode) {
    this.mode = mode;
    $('menu').classList.add('hidden');
    $('stage').classList.remove('hidden');
    $('btnUndo').classList.remove('hidden');
    $('btnRestart').classList.remove('hidden');
    $('btnHint').classList.toggle('hidden', mode === 'endless');
    $('cLevel').classList.remove('hidden'); $('cMoves').classList.remove('hidden');
    $('btnMenu').innerHTML = '☰<span class="lbl"> 選單</span>';
    if (mode === 'endless') { Save.d.endlessRuns++; Save.save(); }
    this.level = mode === 'stage' ? Save.d.stage : 1;
    Sound.init();
    this.loadLevel(this.level);
  },

  loadLevel(n) {
    this.level = n;
    this.ready = false;          // 產生關卡是同步的，這面旗子讓外部（與測試）知道何時可以動
    this.closeModal();
    const cfg = SORT.difficulty(n);
    const salt = this.mode === 'endless' ? (Save.d.endlessRuns * 7919) : 0;
    const seed = SORT.levelSeed(this.mode, n, salt);
    this.toast('配藥中…', 0);
    // 產生器偶爾要重抽好幾次，先讓畫面有機會更新
    setTimeout(() => {
      let g = SORT.generate(cfg, seed);
      if (!g) g = SORT.generate({ ...cfg, empties: cfg.empties + 1 }, seed ^ 0x9e3779b9);
      this.tubes = g.tubes; this.cap = g.cap; this.par = g.par;
      this.moves = 0; this.history = []; this.sel = -1; this.anim = null; this.fx = [];
      this.removed = []; this.over = false; this.busy = false; this.hintMove = null; this.sol = null;
      this.undosLeft = this.mode === 'endless' ? 3 : Infinity;
      this.hintsUsed = 0;
      R.resize();
      this.view = this.tubes.map((_, i) => {
        const s = R.slotOf(i, this.tubes.length);
        return { x: s.x, y: s.y, tx: s.x, ty: s.y, shake: 0, out: 0, lift: 0 };
      });
      this.clearToasts();
      this.syncHud();
      this.setMsg(this.mode === 'endless'
        ? `第 ${n} 關 · ${cfg.colors} 色 · 瓶深 ${g.cap} · 復原還有 ${this.undosLeft} 次`
        : `第 ${n} 關 · ${cfg.colors} 色 · 瓶深 ${g.cap} · 參考步數 ${g.par}`);
      this.ready = true;
      this.loadSeq = (this.loadSeq || 0) + 1;
    }, 20);
  },

  /* ===== 顯示用的瓶子清單（收走的不算） ===== */
  visibleCount() { return this.tubes.length - this.removed.length; },
  visibleList() {
    const out = [];
    for (let i = 0; i < this.tubes.length; i++) if (!this.removed.includes(i)) out.push(i);
    return out;
  },
  relayout(instant) {
    const vis = this.visibleList();
    R.plan();
    vis.forEach((idx, k) => {
      const s = R.slotOf(k, vis.length);
      const v = this.view[idx];
      if (!v) return;
      v.tx = s.x; v.ty = s.y;
      if (instant) { v.x = s.x; v.y = s.y; }
    });
  },

  /* ===== 操作 ===== */
  tapTube(i) {
    if (!this.ready || this.busy || this.over || i < 0 || this.removed.includes(i)) return;
    this.hintMove = null;
    if (this.sel === -1) {
      if (!this.tubes[i].length) { this.bump(i); return; }
      if (SORT.isComplete(this.tubes[i], this.cap)) { this.bump(i); return; }
      this.sel = i;
      Sound.blip(520, .07, 'sine', .05);
      return;
    }
    if (this.sel === i) { this.sel = -1; return; }
    if (!SORT.canPour(this.tubes, this.cap, this.sel, i)) {
      this.bump(i);
      Sound.bad();
      const A = this.tubes[this.sel], B = this.tubes[i];
      if (B.length >= this.cap) this.setMsg('那瓶已經滿了。');
      else if (B.length && B[B.length - 1] !== A[A.length - 1]) this.setMsg('顏色對不上——只能倒在同色上面，或倒進空瓶。');
      else if (!B.length && SORT.isMono(A)) this.setMsg('整瓶都同色了，換一個空瓶沒有任何意義。');
      return;
    }
    this.doPour(this.sel, i);
    this.sel = -1;
  },

  doPour(a, b) {
    const r = SORT.pour(this.tubes, this.cap, a, b);
    this.history.push({ tubes: SORT.clone(this.tubes), removed: this.removed.slice(), moves: this.moves });
    const pre = SORT.clone(this.tubes);
    this.tubes = r.tubes;
    this.moves++;
    this.busy = true;
    this.anim = { kind: 'pour', a, b, n: r.moved, color: r.color, pre, t: 0, dur: .42 };
    // 照著提示走就往下推進，走偏了就把記住的路徑丟掉
    const nx = this.sol && this.sol.path[this.sol.i];
    if (nx && nx[0] === a && nx[1] === b) { this.sol.i++; this.sol.key = SORT.key(this.tubes); }
    else this.sol = null;
    Sound.pour(r.moved);
    this.syncHud();
  },

  // 倒完之後：收走完成的瓶子、判斷過關 / 死路
  afterPour() {
    this.anim = null;
    let completed = [];
    this.tubes.forEach((t, i) => {
      if (!this.removed.includes(i) && SORT.isComplete(t, this.cap)) completed.push(i);
    });
    if (completed.length) {
      Sound.done();
      completed.forEach(i => {
        this.view[i].out = 0.001;
        const v = this.view[i];
        for (let k = 0; k < 14; k++) {
          this.fx.push({
            x: v.x, y: v.y + R.bh * .5,
            vx: (Math.random() - .5) * 150, vy: -Math.random() * 190 - 40,
            t: 0, life: .7 + Math.random() * .4, c: PALETTE[this.tubes[i][0] % PALETTE.length].c
          });
        }
      });
      this.pendingRemove = completed;
      this.busy = true;
      return;
    }
    this.settle();
  },

  settle() {
    this.busy = false;
    if (SORT.isDone(this.tubes, this.cap)) { this.levelClear(); return; }
    if (Save.d.guard || this.mode === 'endless') {
      if (SORT.isDeadEnd(this.tubes, this.cap)) {
        if (this.mode === 'endless') { this.gameOver(); return; }
        this.setMsg('⚠ 這一步之後就解不開了——按「復原」退回去。', true);
        this.toast('走進死路了', 2200, true);
        return;
      }
    }
    this.setMsg('');
  },

  undo() {
    if (this.busy || !this.history.length) return;
    if (this.undosLeft <= 0) { this.toast('這一關的復原次數用完了', 1800, true); return; }
    const h = this.history.pop();
    this.tubes = h.tubes; this.removed = h.removed; this.moves = h.moves;
    this.sel = -1; this.over = false; this.hintMove = null; this.sol = null;
    if (this.undosLeft !== Infinity) this.undosLeft--;
    this.view.forEach((v, i) => { v.out = this.removed.includes(i) ? 1 : 0; });
    this.relayout(false);
    this.syncHud();
    this.setMsg(this.undosLeft === Infinity ? '' : `復原還有 ${this.undosLeft} 次`);
    Sound.blip(380, .1, 'sine', .05);
  },

  hint() {
    if (this.busy || this.over) return;
    // 只取「當下重算的第一步」會出問題：求解器可能從 A 建議走去 B、從 B 又建議走回 A，
    // 連按提示就會鬼打牆。所以整條路徑記下來，玩家照走就往下發，走偏了才重算。
    if (!this.sol || this.sol.key !== SORT.key(this.tubes) || this.sol.i >= this.sol.path.length) {
      const s = SORT.solve(this.tubes, this.cap, { nodeLimit: 150000 });
      if (!s.path || !s.path.length) {
        this.toast(s.hitLimit ? '這盤太複雜，算不出提示' : '這盤已經解不開了，先復原幾步', 2400, true);
        return;
      }
      this.sol = { path: s.path, i: 0, key: SORT.key(this.tubes) };
    }
    const m = this.sol.path[this.sol.i];
    this.hintsUsed++;
    this.hintMove = { a: m[0], b: m[1], t: 0 };
    this.sel = -1;
    this.setMsg(`提示：把亮起來的那瓶倒進另一瓶。（剩 ${this.sol.path.length - this.sol.i} 步可解）`);
  },

  restart() {
    if (this.mode === 'endless') {
      this.confirmBox('重來這一關？', '無盡挑戰重來會從<b>第 1 關</b>開始，目前的進度會歸零。', () => {
        Save.d.endlessRuns++; Save.save();
        this.loadLevel(1);
      });
      return;
    }
    this.loadLevel(this.level);
  },

  /* ===== 結算 ===== */
  levelClear() {
    Sound.win();
    this.over = true;
    const stars = this.moves <= this.par ? 3 : this.moves <= Math.ceil(this.par * 1.35) ? 2 : 1;
    if (this.mode === 'stage') {
      Save.d.cleared++;
      if (this.level >= Save.d.stage) Save.d.stage = this.level + 1;
      Save.save();
    } else {
      if (this.level > Save.d.endlessBest) { Save.d.endlessBest = this.level; Save.save(); }
    }
    const next = this.level + 1;
    setTimeout(() => {
      this.modal(`
        <h1>桌上清空了</h1>
        <div class="sub">L E V E L &nbsp; ${this.level} &nbsp; C L E A R</div>
        <div class="stats">
          <div class="stat"><div class="v">${this.moves}</div><div class="k">你的步數</div></div>
          <div class="stat"><div class="v">${this.par}</div><div class="k">參考步數</div></div>
          <div class="stat"><div class="v">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div><div class="k">評價</div></div>
        </div>
        ${this.mode === 'endless' && this.level >= Save.d.endlessBest
          ? '<p style="text-align:center;color:var(--gold)">新紀錄！</p>' : ''}
        <button class="bigbtn" id="mNext">下一關 ▶</button>
        <button class="subbtn" id="mMenu">回選單</button>`);
      $('mNext').onclick = () => this.loadLevel(next);
      $('mMenu').onclick = () => this.showMenu();
    }, 620);
  },

  gameOver() {
    Sound.over();
    this.over = true;
    const best = Save.d.endlessBest;
    setTimeout(() => {
      this.modal(`
        <h1 style="color:var(--bad)">解不開了</h1>
        <div class="sub">R U N &nbsp; O V E R</div>
        <p>剩下的瓶子已經湊不出任何一種顏色了——無盡挑戰到此為止。</p>
        <div class="stats">
          <div class="stat"><div class="v">${this.level}</div><div class="k">走到第幾關</div></div>
          <div class="stat"><div class="v">${best}</div><div class="k">最佳紀錄</div></div>
        </div>
        ${this.history.length ? '<p style="text-align:center;font-size:12px">還有復原次數的話，也可以退一步再試。</p>' : ''}
        ${this.history.length && this.undosLeft > 0 ? '<button class="bigbtn" id="mUndo">↩ 退回上一步</button>' : ''}
        <button class="${this.history.length && this.undosLeft > 0 ? 'subbtn' : 'bigbtn'}" id="mAgain">再挑戰一次</button>
        <button class="subbtn" id="mMenu">回選單</button>`);
      const u = $('mUndo');
      if (u) u.onclick = () => { this.closeModal(); this.over = false; this.undo(); };
      $('mAgain').onclick = () => { Save.d.endlessRuns++; Save.save(); this.loadLevel(1); };
      $('mMenu').onclick = () => this.showMenu();
    }, 500);
  },

  /* ===== HUD / 彈窗 ===== */
  syncHud() {
    $('cLevel').textContent = (this.mode === 'endless' ? '無盡 第 ' : '第 ') + this.level + ' 關';
    $('cMoves').innerHTML = `步數 <b>${this.moves}</b>` +
      (this.mode === 'stage' && this.par ? ` <span style="opacity:.6">/ ${this.par}</span>` : '');
    $('btnUndo').innerHTML = this.undosLeft === Infinity
      ? '↩<span class="lbl"> 復原</span>'
      : `↩<span class="lbl"> 復原</span> <b>${this.undosLeft}</b>`;
    $('btnUndo').disabled = !this.history.length || this.undosLeft <= 0;
  },
  setMsg(t, warn) {
    const m = $('msg');
    m.textContent = t;
    m.classList.toggle('warn', !!warn);
  },
  toast(msg, dur, bad) {
    const d = document.createElement('div');
    d.className = 'toast' + (bad ? ' bad' : '');
    d.textContent = msg;
    $('toasts').appendChild(d);
    if (dur !== 0) setTimeout(() => { d.style.transition = '.35s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 350); }, dur || 1600);
    return d;
  },
  clearToasts() { $('toasts').innerHTML = ''; },
  modal(html) {
    $('mbox').innerHTML = html;
    $('modal').classList.remove('hidden');
  },
  closeModal() { $('modal').classList.add('hidden'); },
  confirmBox(title, body, onYes) {
    this.modal(`<h1>${title}</h1><div class="sub">C O N F I R M</div><p>${body}</p>
      <button class="bigbtn" id="mYes">確定</button><button class="subbtn" id="mNo">取消</button>`);
    $('mYes').onclick = () => { this.closeModal(); onYes(); };
    $('mNo').onclick = () => this.closeModal();
  },
  help() {
    this.modal(`
      <h1>怎麼玩</h1>
      <div class="sub">H O W &nbsp; T O</div>
      <ul>
        <li>點一瓶選起來，再點另一瓶就會倒過去。</li>
        <li>一次倒的是<b>最上層連續同色的一整段</b>，倒到目標裝滿為止。</li>
        <li>只能倒在<b>同色上面</b>或<b>空瓶</b>裡。</li>
        <li>一瓶湊滿同色就會被收走，桌上清空就過關。</li>
      </ul>
      <p style="font-size:12px">每一關都由程式生成並用求解器驗證過，<b>保證有解</b>。
         但你還是可能把自己倒進死路——所以有復原。</p>
      <div class="togrow"><span>顏色符號（色弱輔助）</span><button class="tog" id="tgSym"></button></div>
      <div class="togrow"><span>死路提醒</span><button class="tog" id="tgGuard"></button></div>
      <div class="togrow"><span>音效</span><button class="tog" id="tgSnd"></button></div>
      <button class="bigbtn" id="mClose">知道了</button>`);
    const wire = (id, k, after) => {
      const b = $(id);
      const sync = () => { b.textContent = Save.d[k] ? '開' : '關'; b.classList.toggle('on', !!Save.d[k]); };
      b.onclick = () => { Save.d[k] = !Save.d[k]; Save.save(); sync(); if (after) after(); };
      sync();
    };
    wire('tgSym', 'symbols');
    wire('tgGuard', 'guard');
    wire('tgSnd', 'sound', () => { Sound.on = Save.d.sound; if (Save.d.sound) { Sound.init(); Sound.blip(700, .1); } });
    $('mClose').onclick = () => this.closeModal();
  },

  bindUI() {
    $('btnMenu').onclick = () => {
      if (!this.mode) { this.help(); return; }
      this.showMenu();
    };
    $('btnUndo').onclick = () => this.undo();
    $('btnHint').onclick = () => this.hint();
    $('btnRestart').onclick = () => this.restart();
    $('modal').addEventListener('click', e => {
      if (e.target.id === 'modal' && !this.over) this.closeModal();
    });
    const cv = $('cv');
    const hit = (cx, cy) => {
      const r = cv.getBoundingClientRect();
      const x = cx - r.left, y = cy - r.top;
      const vis = this.visibleList();
      for (const i of vis) {
        const v = this.view[i];
        if (!v) continue;
        if (x > v.x - R.bw / 2 - 6 && x < v.x + R.bw / 2 + 6 && y > v.y - 18 && y < v.y + R.bh + 8) return i;
      }
      return -1;
    };
    cv.addEventListener('click', e => { Sound.init(); this.tapTube(hit(e.clientX, e.clientY)); });
    cv.addEventListener('touchstart', e => {
      Sound.init();
      const t = e.touches[0];
      this.tapTube(hit(t.clientX, t.clientY));
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') { e.preventDefault(); this.undo(); }
      if (e.key === 'h' || e.key === 'H') this.hint();
      if (e.key === 'r' || e.key === 'R') this.restart();
      if (e.key === 'Escape') { if (!$('modal').classList.contains('hidden')) this.closeModal(); }
    });
  },

  bump(i) { if (this.view[i]) this.view[i].shake = .4; },

  /* ===== 主迴圈 ===== */
  loop(t) {
    requestAnimationFrame(x => this.loop(x));
    const dt = Math.min(.05, (t - this.lastT) / 1000 || 0);
    this.lastT = t;
    if (!this.mode || !this.ready) return;
    this.update(dt);
    this.draw();
  },

  update(dt) {
    // 倒藥動畫
    if (this.anim) {
      this.anim.t += dt;
      if (this.anim.t >= this.anim.dur) this.afterPour();
    }
    // 收瓶子
    if (this.pendingRemove) {
      let allOut = true;
      for (const i of this.pendingRemove) {
        const v = this.view[i];
        v.out = Math.min(1, v.out + dt * 2.2);
        if (v.out < 1) allOut = false;
      }
      if (allOut) {
        this.removed = this.removed.concat(this.pendingRemove);
        this.pendingRemove = null;
        this.relayout(false);
        this.settle();
      }
    }
    // 位置補間 / 抖動 / 選取上浮
    const vis = this.visibleList();
    for (let k = 0; k < this.view.length; k++) {
      const v = this.view[k];
      if (!v) continue;
      v.x += (v.tx - v.x) * Math.min(1, dt * 11);
      v.y += (v.ty - v.y) * Math.min(1, dt * 11);
      if (v.shake > 0) v.shake = Math.max(0, v.shake - dt * 1.6);
      const want = (this.sel === k) ? 1 : 0;
      v.lift += (want - v.lift) * Math.min(1, dt * 14);
    }
    // 粒子
    for (const p of this.fx) {
      p.t += dt; p.vy += 620 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    this.fx = this.fx.filter(p => p.t < p.life);
    if (this.hintMove) this.hintMove.t += dt;
    void vis;
  },

  /* ===== 繪圖 ===== */
  draw() {
    const ctx = R.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, R.w, R.h);

    // 背景：淡淡的煉金光暈
    const g = ctx.createRadialGradient(R.w / 2, R.h * .3, 10, R.w / 2, R.h * .5, Math.max(R.w, R.h) * .8);
    g.addColorStop(0, 'rgba(60,70,140,.28)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, R.w, R.h);

    const vis = this.visibleList();
    for (const i of vis) this.drawTube(i);
    if (this.pendingRemove) for (const i of this.pendingRemove) this.drawTube(i);

    // 倒藥的水流畫在最上層
    if (this.anim) this.drawStream();

    // 粒子
    for (const p of this.fx) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2 * a + 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },

  // 這一瓶「現在畫面上」有幾格（動畫中可能是小數）
  visualCount(i) {
    const a = this.anim;
    if (!a) return this.tubes[i].length;
    const p = Math.max(0, Math.min(1, (a.t - a.dur * .3) / (a.dur * .55)));
    if (i === a.a) return a.pre[a.a].length - a.n * p;
    if (i === a.b) return a.pre[a.b].length + a.n * p;
    return this.tubes[i].length;
  },
  // 動畫中要用倒之前的內容來畫
  contentOf(i) {
    const a = this.anim;
    if (a && (i === a.a || i === a.b)) {
      return i === a.a ? a.pre[a.a] : a.pre[a.b].concat(new Array(a.n).fill(a.color));
    }
    return this.tubes[i];
  },

  drawTube(i) {
    const ctx = R.ctx, v = this.view[i];
    if (!v) return;
    const bw = R.bw, bh = R.bh, unit = R.unit;
    const lift = v.lift * (bw * .34);
    const shakeX = v.shake > 0 ? Math.sin(v.shake * 60) * bw * .12 : 0;
    let x = v.x + shakeX, y = v.y - lift;

    const a = this.anim;
    let tilt = 0;
    if (a && i === a.a) {
      const p = a.t / a.dur;
      const e = p < .3 ? p / .3 : p > .85 ? (1 - (p - .85) / .15) : 1;
      tilt = e * (a.b > a.a ? .42 : -.42);
      y -= e * bw * .55;
    }

    ctx.save();
    ctx.globalAlpha = 1 - v.out;
    if (v.out > 0) {
      ctx.translate(x, y + bh / 2);
      ctx.scale(1 - v.out * .5, 1 - v.out * .5);
      ctx.rotate(v.out * .5);
      ctx.translate(-x, -(y + bh / 2));
      y -= v.out * bh * .45;
    }
    if (tilt) {
      ctx.translate(x, y);
      ctx.rotate(tilt);
      ctx.translate(-x, -y);
    }

    const left = x - bw / 2, right = x + bw / 2;
    const neck = bw * .26;
    const innerTop = y + neck;
    const innerBot = y + bh - bw * .12;

    // 瓶身路徑（下圓上直）
    const rr = bw * .34;
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(left, innerTop - neck * .55);
      ctx.lineTo(left, innerBot - rr);
      ctx.quadraticCurveTo(left, innerBot, left + rr, innerBot);
      ctx.lineTo(right - rr, innerBot);
      ctx.quadraticCurveTo(right, innerBot, right, innerBot - rr);
      ctx.lineTo(right, innerTop - neck * .55);
    };

    // 玻璃底
    body();
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,215,255,.07)';
    ctx.fill();

    // 液體（由下往上）
    const content = this.contentOf(i);
    const vc = this.visualCount(i);
    ctx.save();
    body(); ctx.closePath(); ctx.clip();
    for (let k = 0; k < content.length; k++) {
      const shown = Math.max(0, Math.min(1, vc - k));
      if (shown <= 0) break;
      const col = PALETTE[content[k] % PALETTE.length];
      const segBot = innerBot - k * unit;
      const segTop = segBot - unit * shown;
      const lg = ctx.createLinearGradient(left, segTop, right, segBot);
      lg.addColorStop(0, shade(col.c, 18));
      lg.addColorStop(.5, col.c);
      lg.addColorStop(1, shade(col.c, -42));
      ctx.fillStyle = lg;
      ctx.fillRect(left, segTop, bw, segBot - segTop);
      // 分層線
      ctx.fillStyle = 'rgba(0,0,0,.16)';
      ctx.fillRect(left, segBot - 1.5, bw, 1.5);
      // 符號
      if (Save.d.symbols && shown > .6 && unit > 15) {
        ctx.globalAlpha = .34;
        ctx.fillStyle = '#08121f';
        ctx.font = `700 ${Math.round(unit * .56)}px system-ui,sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(col.s, x, segBot - unit * .5);
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();

    // 玻璃反光與外框
    ctx.save();
    body(); ctx.closePath(); ctx.clip();
    const gl = ctx.createLinearGradient(left, 0, right, 0);
    gl.addColorStop(0, 'rgba(255,255,255,.22)');
    gl.addColorStop(.18, 'rgba(255,255,255,.05)');
    gl.addColorStop(.75, 'rgba(255,255,255,0)');
    gl.addColorStop(1, 'rgba(255,255,255,.13)');
    ctx.fillStyle = gl;
    ctx.fillRect(left, y, bw, bh);
    ctx.restore();

    const isSel = this.sel === i;
    const isHint = this.hintMove && (this.hintMove.a === i || this.hintMove.b === i);
    body();
    ctx.lineWidth = Math.max(1.6, bw * .045);
    ctx.strokeStyle = isSel ? '#ffd45e'
      : isHint ? (Math.sin(this.hintMove.t * 7) > 0 ? '#8ae0ff' : '#4a7aa0')
        : 'rgba(190,205,255,.42)';
    ctx.stroke();

    // 瓶口
    ctx.beginPath();
    ctx.moveTo(left - bw * .07, innerTop - neck * .55);
    ctx.lineTo(right + bw * .07, innerTop - neck * .55);
    ctx.lineWidth = Math.max(2, bw * .07);
    ctx.strokeStyle = isSel ? '#ffd45e' : 'rgba(190,205,255,.55)';
    ctx.stroke();

    ctx.restore();
  },

  drawStream() {
    const a = this.anim, ctx = R.ctx;
    const p = a.t / a.dur;
    if (p < .28 || p > .9) return;
    const va = this.view[a.a], vb = this.view[a.b];
    if (!va || !vb) return;
    const bw = R.bw;
    const sx = va.x + (vb.x > va.x ? bw * .42 : -bw * .42);
    const sy = va.y - va.lift * bw * .34 - bw * .2;
    const ex = vb.x;
    const ey = vb.y + R.bh - R.unit * this.visualCount(a.b) - 2;
    const col = PALETTE[a.color % PALETTE.length].c;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(3, bw * .13);
    ctx.lineCap = 'round';
    ctx.globalAlpha = .92;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo((sx + ex) / 2, Math.min(sy, ey) - bw * .35, ex, ey);
    ctx.stroke();
    ctx.globalAlpha = .35;
    ctx.lineWidth = Math.max(1, bw * .05);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }
};

window.addEventListener('load', () => G.boot());
