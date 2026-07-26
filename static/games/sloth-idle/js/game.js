/* ===========================================================
   Sloth Idle —《樹懶法師的放置修行》
   放置型魔力累積：10 種設施、升級、成就、頓悟轉生、離線收益
   =========================================================== */
'use strict';

const SAVE_KEY = 'slothIdle.v1';
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

/* ---------------- 數字格式 ---------------- */
const SUFFIX = ['', '萬', '億', '兆', '京', '垓', '秭', '穰', '溝', '澗', '正', '載', '極'];
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 1000) return (n < 10 && n % 1 !== 0) ? n.toFixed(1) : Math.floor(n).toLocaleString('en-US');
  // 以萬為進位（中文習慣），超過極大值改用科學記號
  let i = 0, v = n;
  while (v >= 10000 && i < SUFFIX.length - 1) { v /= 10000; i++; }
  if (i >= SUFFIX.length - 1 && v >= 10000) return n.toExponential(2).replace('e+', '×10^');
  const s = v >= 100 ? v.toFixed(0) : (v >= 10 ? v.toFixed(1) : v.toFixed(2));
  return s + SUFFIX[i];
}
function fmtTime(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return sec + ' 秒';
  if (sec < 3600) return Math.floor(sec / 60) + ' 分 ' + (sec % 60) + ' 秒';
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  if (h < 24) return h + ' 小時 ' + m + ' 分';
  return Math.floor(h / 24) + ' 天 ' + (h % 24) + ' 小時';
}

/* ---------------- 設施 ---------------- */
const GENS = [
  { id: 'cushion', name: '打坐蒲團', icon: '🪷', base: 15, rate: 0.15, desc: '一塊很舒服的蒲團。坐上去就會有一點點魔力。' },
  { id: 'circle', name: '冥想法陣', icon: '🔯', base: 120, rate: 1.1, desc: '畫在地上的法陣，會自己吸收空氣裡的魔力。' },
  { id: 'apprentice', name: '見習學徒', icon: '🧑‍🎓', base: 1300, rate: 8, desc: '幫你修行的學徒。他們以為這是實習。' },
  { id: 'runestone', name: '符文石碑', icon: '🗿', base: 14000, rate: 47, desc: '刻滿古老符文的石碑，二十四小時運轉。' },
  { id: 'statue', name: '懸浮樹懶像', icon: '🗽', base: 200000, rate: 260, desc: '一尊會漂浮的樹懶雕像。沒人知道原理。' },
  { id: 'observatory', name: '星辰觀測台', icon: '🔭', base: 3300000, rate: 1400, desc: '把星光轉換成魔力。天氣不好時效率一樣。' },
  { id: 'portal', name: '夢境傳送門', icon: '🌀', base: 51000000, rate: 7800, desc: '從夢境的另一側把魔力抽過來。' },
  { id: 'vortex', name: '時間漩渦', icon: '⏳', base: 750000000, rate: 44000, desc: '在漩渦裡，一秒鐘可以修行很久。' },
  { id: 'well', name: '深淵之井', icon: '🕳️', base: 1.1e10, rate: 260000, desc: '直接鑿穿到深淵取魔力。安全性未知。' },
  { id: 'godhood', name: '樹懶神格', icon: '✨', base: 1.7e11, rate: 1600000, desc: '你已經不需要修行了。你就是修行本身。' }
];

/* ---------------- 升級 ---------------- */
const UPGRADES = [];
// 設施升級：擁有 10/25/50/100/200 時解鎖，各讓該設施產能 x2
GENS.forEach((g, gi) => {
  [10, 25, 50, 100, 200].forEach((need, k) => {
    UPGRADES.push({
      id: `${g.id}_${need}`, icon: g.icon,
      name: `${g.name} ${['精修', '共鳴', '超載', '極致', '無我'][k]}`,
      desc: `${g.name} 的產能 ×2`,
      cost: g.base * Math.pow(12, k + 1) * 8,
      req: S => S.owned[gi] >= need,
      reqText: `需要 ${need} 個${g.name}`,
      apply: S => S.genMul[gi] *= 2
    });
  });
});
// 點擊升級
[
  { n: '靈感手指', d: '點擊魔力 ×3', c: 500, m: 3 },
  { n: '禪定之掌', d: '點擊魔力 ×3', c: 25000, m: 3 },
  { n: '虛空觸碰', d: '點擊魔力 ×5', c: 4000000, m: 5 },
  { n: '一指開天', d: '點擊魔力 ×8', c: 1.2e9, m: 8 }
].forEach((u, i) => UPGRADES.push({
  id: 'click' + i, icon: '👆', name: u.n, desc: u.d, cost: u.c,
  req: () => true, apply: S => S.clickMul *= u.m
}));
// 全域升級
[
  { n: '晨間微光', d: '所有設施產能 +25%', c: 30000, f: S => S.globalMul *= 1.25 },
  { n: '午後恍神', d: '所有設施產能 +30%', c: 2500000, f: S => S.globalMul *= 1.3 },
  { n: '深夜頓悟', d: '所有設施產能 +40%', c: 8e8, f: S => S.globalMul *= 1.4 },
  { n: '永恆午睡', d: '所有設施產能 +60%', c: 5e11, f: S => S.globalMul *= 1.6 },
  { n: '夢境延展 I', d: '離線收益上限提高到 12 小時', c: 200000, f: S => S.offlineCap = 12 },
  { n: '夢境延展 II', d: '離線收益上限提高到 24 小時', c: 1e8, f: S => S.offlineCap = 24 },
  { n: '睡眠效率', d: '離線收益效率 50% → 80%', c: 6e6, f: S => S.offlineEff = 0.8 },
  { n: '完全體眠', d: '離線收益效率 80% → 100%', c: 4e10, f: S => S.offlineEff = 1 },
  { n: '複利冥想', d: '每擁有 1 點悟性，額外 +0.5% 產能', c: 1e10, f: S => S.insightBonus += 0.005 }
].forEach((u, i) => UPGRADES.push({
  id: 'glob' + i, icon: '🌙', name: u.n, desc: u.d, cost: u.c,
  req: () => true, apply: u.f
}));

/* ---------------- 成就 ---------------- */
const ACHS = [
  { id: 'a1', name: '第一滴魔力', icon: '💧', cond: S => S.totalEarned >= 1, desc: '產出第一點魔力' },
  { id: 'a2', name: '有點東西', icon: '🪷', cond: S => S.owned[0] >= 10, desc: '10 個打坐蒲團' },
  { id: 'a3', name: '像樣的道場', icon: '🔯', cond: S => S.owned[1] >= 25, desc: '25 個冥想法陣' },
  { id: 'a4', name: '血汗學園', icon: '🧑‍🎓', cond: S => S.owned[2] >= 50, desc: '50 個見習學徒' },
  { id: 'a5', name: '百萬魔力', icon: '💫', cond: S => S.totalEarned >= 1e6, desc: '累積產出 100 萬魔力' },
  { id: 'a6', name: '手指抽筋', icon: '👆', cond: S => S.clicks >= 500, desc: '手動點擊 500 次' },
  { id: 'a7', name: '真正的樹懶', icon: '🦥', cond: S => S.idleTime >= 600, desc: '掛機 10 分鐘（不點任何東西）' },
  { id: 'a8', name: '第一次頓悟', icon: '✦', cond: S => S.prestiges >= 1, desc: '頓悟轉生一次' },
  { id: 'a9', name: '輪迴老手', icon: '♾', cond: S => S.prestiges >= 5, desc: '頓悟轉生 5 次' },
  { id: 'a10', name: '十億', icon: '🌌', cond: S => S.totalEarned >= 1e9, desc: '累積產出 10 億魔力' },
  { id: 'a11', name: '設施齊全', icon: '🏛', cond: S => S.owned.every(o => o > 0), desc: '每種設施都至少有 1 個' },
  { id: 'a12', name: '收藏家', icon: '📜', cond: S => S.bought.length >= 20, desc: '購買 20 個升級' },
  { id: 'a13', name: '神格降臨', icon: '✨', cond: S => S.owned[9] >= 1, desc: '擁有樹懶神格' },
  { id: 'a14', name: '兆級魔力', icon: '🪐', cond: S => S.totalEarned >= 1e12, desc: '累積產出 1 兆魔力' },
  { id: 'a15', name: '睡飽了', icon: '🛌', cond: S => S.offlineGained >= 1e6, desc: '離線收益累積 100 萬' },
  { id: 'a16', name: '悟性滿溢', icon: '🧠', cond: S => S.insight >= 100, desc: '悟性達到 100' }
];

/* ---------------- 狀態 ---------------- */
let S = null;
function newSave() {
  return {
    mana: 0, totalEarned: 0, clicks: 0, idleTime: 0, playTime: 0,
    owned: GENS.map(() => 0), genMul: GENS.map(() => 1),
    clickMul: 1, globalMul: 1, insight: 0, insightBonus: 0.02,
    prestiges: 0, bought: [], achs: [],
    offlineCap: 8, offlineEff: 0.5, offlineGained: 0,
    lastSave: Date.now(), started: Date.now()
  };
}

/* ---------------- 計算 ---------------- */
function insightMul() { return 1 + S.insight * S.insightBonus; }
function achMul() { return 1 + S.achs.length * 0.02; }
function genRate(i) { return GENS[i].rate * S.owned[i] * S.genMul[i] * S.globalMul * insightMul() * achMul(); }
function totalRate() { let t = 0; for (let i = 0; i < GENS.length; i++) t += genRate(i); return t; }
function clickValue() { return (1 + totalRate() * 0.03) * S.clickMul * insightMul() * achMul(); }
function genCost(i, n) {
  // 等比級數：base * 1.15^owned，買 n 個
  const g = GENS[i], o = S.owned[i], r = 1.15;
  return g.base * Math.pow(r, o) * (Math.pow(r, n) - 1) / (r - 1);
}
function maxAfford(i) {
  const g = GENS[i], o = S.owned[i], r = 1.15;
  // 解 base*r^o*(r^n-1)/(r-1) <= mana
  const v = S.mana * (r - 1) / (g.base * Math.pow(r, o)) + 1;
  if (v <= 1) return 0;
  return Math.max(0, Math.floor(Math.log(v) / Math.log(r)));
}
function genUnlocked(i) {
  if (i === 0) return true;
  return S.owned[i - 1] >= 1 || S.totalEarned >= GENS[i].base * 0.35;
}
function prestigeGain() {
  // 以累積產出換算悟性
  const g = Math.floor(Math.pow(S.totalEarned / 1e9, 0.4));
  return Math.max(0, g - S.insight);
}

/* ---------------- 動作 ---------------- */
let buyQty = 1;
function buyGen(i) {
  if (!genUnlocked(i)) return;
  let n = buyQty === 'max' ? maxAfford(i) : buyQty;
  if (n <= 0) return;
  const c = genCost(i, n);
  if (S.mana < c) {
    // 買不起就退而求其次買最多
    n = Math.min(n, maxAfford(i));
    if (n <= 0) return;
  }
  const cost = genCost(i, n);
  if (S.mana < cost) return;
  S.mana -= cost;
  S.owned[i] += n;
  UI.render();
  Sound.buy();
}
function buyUpgrade(id) {
  const u = UPGRADES.find(x => x.id === id);
  if (!u || S.bought.includes(id)) return;
  if (!u.req(S)) return;
  if (S.mana < u.cost) return;
  S.mana -= u.cost;
  S.bought.push(id);
  u.apply(S);
  UI.render();
  Sound.up();
  toast('升級：' + u.name);
}
function doClick(ev) {
  const v = clickValue();
  S.mana += v; S.totalEarned += v; S.clicks++;
  S.idleTime = 0;
  UI.floatText(ev, '+' + fmt(v));
  Sound.click();
  UI.renderTop();
}
function prestige() {
  const g = prestigeGain();
  if (g <= 0) return;
  if (!confirm(`頓悟轉生會清空魔力、設施與升級，但你會獲得 ${g} 點悟性（永久 +${(g * S.insightBonus * 100).toFixed(1)}% 產能）。確定嗎？`)) return;
  const keep = {
    insight: S.insight + g, prestiges: S.prestiges + 1, achs: S.achs,
    clicks: S.clicks, idleTime: 0, playTime: S.playTime,
    insightBonus: S.insightBonus, offlineCap: S.offlineCap, offlineEff: S.offlineEff,
    offlineGained: S.offlineGained, started: S.started,
    totalEarnedAll: (S.totalEarnedAll || 0) + S.totalEarned
  };
  S = Object.assign(newSave(), keep, { lastSave: Date.now() });
  save();
  UI.render();
  toast(`頓悟！獲得 ${g} 點悟性`);
  Sound.prestige();
}

/* ---------------- 音效 ---------------- */
const Sound = {
  ctx: null,
  init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
  t(f, d, ty, v, sl) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = ty || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (sl) o.frequency.exponentialRampToValueAtTime(sl, t0 + d);
    g.gain.setValueAtTime(v || .04, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + d + .02);
  },
  click() { this.t(520 + Math.random() * 90, .07, 'sine', .025, 760); },
  buy() { this.t(340, .12, 'triangle', .04, 560); },
  up() { [520, 700, 900].forEach((f, i) => setTimeout(() => this.t(f, .18, 'triangle', .04), i * 70)); },
  prestige() { [400, 520, 660, 880, 1100].forEach((f, i) => setTimeout(() => this.t(f, .4, 'sine', .05), i * 130)); }
};

/* ---------------- UI ---------------- */
let tab = 'gen';
const UI = {
  init() {
    document.getElementById('sloth').addEventListener('click', e => { if (!Sound.ctx) Sound.init(); doClick(e); });
    document.getElementById('btnStart').onclick = () => {
      document.getElementById('modal').classList.add('hidden');
      if (!Sound.ctx) Sound.init();
    };
    document.getElementById('btnHelp').onclick = () => document.getElementById('modal').classList.remove('hidden');
    document.getElementById('btnReset').onclick = () => {
      if (confirm('確定要清除所有進度嗎？這無法復原。')) {
        localStorage.removeItem(SAVE_KEY);
        S = newSave(); this.render();
      }
    };
    document.getElementById('pBtn').onclick = () => prestige();
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
      tab = t.dataset.t;
      document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
      this.renderPane();
    });
  },

  renderTop() {
    document.getElementById('mana').textContent = fmt(S.mana);
    document.getElementById('rate').textContent = '+' + fmt(totalRate()) + ' /秒';
    document.getElementById('hIns').textContent = fmt(S.insight);
    document.getElementById('hMul').textContent =
      `產能 ×${(insightMul() * achMul() * S.globalMul).toFixed(2)}`;
    document.getElementById('clickInfo').innerHTML =
      `點我修行：<b style="color:var(--mana)">+${fmt(clickValue())}</b> 魔力`;
    const g = prestigeGain();
    document.getElementById('pDesc').innerHTML = g > 0
      ? `現在轉生可獲得 <b style="color:var(--insight)">${fmt(g)}</b> 點悟性<br>（永久 +${(g * S.insightBonus * 100).toFixed(1)}% 產能）`
      : `累積產出 <b>${fmt(1e9 * Math.pow(S.insight + 1, 2.5))}</b> 魔力後可再次頓悟`;
    document.getElementById('pBtn').disabled = g <= 0;
    document.getElementById('stats').innerHTML = `
      <div class="srow"><span>累積產出</span><b>${fmt(S.totalEarned)}</b></div>
      <div class="srow"><span>手動點擊</span><b>${S.clicks}</b></div>
      <div class="srow"><span>頓悟次數</span><b>${S.prestiges}</b></div>
      <div class="srow"><span>成就</span><b>${S.achs.length}/${ACHS.length}</b></div>
      <div class="srow"><span>遊玩時間</span><b>${fmtTime(S.playTime)}</b></div>`;
  },

  renderPane() {
    const p = document.getElementById('panes');
    if (tab === 'gen') {
      let html = `<div id="buyrow"><span>購買數量</span>
        ${[1, 10, 100, 'max'].map(q => `<button class="bq ${buyQty === q ? 'on' : ''}" data-q="${q}">${q === 'max' ? '最大' : '×' + q}</button>`).join('')}</div>`;
      html += GENS.map((g, i) => {
        if (!genUnlocked(i)) return '';
        const n = buyQty === 'max' ? Math.max(1, maxAfford(i)) : buyQty;
        const cost = genCost(i, n);
        const afford = S.mana >= cost && (buyQty !== 'max' || maxAfford(i) > 0);
        const each = GENS[i].rate * S.genMul[i] * S.globalMul * insightMul() * achMul();
        return `<div class="gen ${afford ? '' : 'poor'}" data-g="${i}">
          <div class="ic">${g.icon}</div>
          <div class="info">
            <div class="gn">${g.name} <small>每個 +${fmt(each)}/秒</small></div>
            <div class="gd">${g.desc}</div>
            <div class="gd" style="color:var(--ok)">目前提供 ${fmt(genRate(i))} /秒</div>
          </div>
          <div class="buy">
            <div class="own">${S.owned[i]}</div>
            <div class="ownl">持有</div>
            <div class="cost">${fmt(cost)}${buyQty === 'max' ? ` (×${maxAfford(i)})` : (n > 1 ? ` (×${n})` : '')}</div>
          </div>
        </div>`;
      }).join('');
      p.innerHTML = html;
      this.bindDelegate();
    } else if (tab === 'up') {
      const avail = UPGRADES.filter(u => !S.bought.includes(u.id) && u.req(S));
      const locked = UPGRADES.filter(u => !S.bought.includes(u.id) && !u.req(S) && u.reqText)
        .slice(0, 6);
      let html = avail.map(u => `<div class="up ${S.mana >= u.cost ? '' : 'poor'}" data-u="${u.id}">
          <div class="ic">${u.icon}</div>
          <div><div class="un">${u.name}</div><div class="ud">${u.desc}</div></div>
          <div class="uc">${fmt(u.cost)}</div>
        </div>`).join('');
      if (locked.length) {
        html += `<div style="margin:14px 0 6px;font-size:11px;letter-spacing:2px;color:var(--dim)">尚未解鎖</div>`;
        html += locked.map(u => `<div class="up poor" style="cursor:default">
          <div class="ic">🔒</div>
          <div><div class="un">${u.name}</div><div class="ud">${u.reqText}</div></div>
          <div class="uc">${fmt(u.cost)}</div></div>`).join('');
      }
      if (S.bought.length) {
        html += `<div style="margin:14px 0 6px;font-size:11px;letter-spacing:2px;color:var(--dim)">已購買 ${S.bought.length}</div>`;
        html += S.bought.map(id => {
          const u = UPGRADES.find(x => x.id === id);
          return u ? `<div class="up done"><div class="ic">${u.icon}</div>
            <div><div class="un">${u.name}</div><div class="ud">${u.desc}</div></div>
            <div class="uc" style="color:var(--ok)">✔</div></div>` : '';
        }).join('');
      }
      if (!html) html = '<div class="emptynote">還沒有可以買的升級，先蓋幾個設施吧。</div>';
      p.innerHTML = html;
      this.bindDelegate();
    } else {
      p.innerHTML = `<div style="font-size:12px;color:var(--dim);margin-bottom:10px">
        每個成就永久提供 +2% 產能。目前 ${S.achs.length}/${ACHS.length}（+${S.achs.length * 2}%）</div>` +
        ACHS.map(a => `<span class="ach ${S.achs.includes(a.id) ? 'on' : ''}" title="${a.desc}">
          ${a.icon} ${S.achs.includes(a.id) ? a.name : '？？？'}
          <span style="color:var(--dim);font-size:11px">${a.desc}</span></span>`).join('');
    }
  },

  bindDelegate() {
    const p = document.getElementById('panes');
    if (p._bound) return;
    p._bound = true;
    p.addEventListener('click', e => {
      const bq = e.target.closest('.bq');
      if (bq) { buyQty = bq.dataset.q === 'max' ? 'max' : +bq.dataset.q; this.renderPane(); return; }
      const gen = e.target.closest('.gen[data-g]');
      if (gen) { buyGen(+gen.dataset.g); return; }
      const up = e.target.closest('.up[data-u]');
      if (up) { buyUpgrade(up.dataset.u); return; }
    });
  },

  render() { this.renderTop(); this.renderPane(); },

  floatText(ev, text) {
    const d = document.createElement('div');
    d.className = 'fx';
    d.textContent = text;
    d.style.left = (ev.clientX - 20 + (Math.random() * 30 - 15)) + 'px';
    d.style.top = (ev.clientY - 20) + 'px';
    document.getElementById('float').appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }
};

function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(() => { d.style.transition = '.4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 2200);
}

/* ---------------- 成就檢查 ---------------- */
function checkAchs() {
  for (const a of ACHS) {
    if (S.achs.includes(a.id)) continue;
    if (a.cond(S)) {
      S.achs.push(a.id);
      toast('🏆 成就達成：' + a.name);
      Sound.up();
    }
  }
}

/* ---------------- 存讀檔 ---------------- */
function save() {
  S.lastSave = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S = Object.assign(newSave(), d);
    S.owned = (d.owned || []).slice(0, GENS.length);
    while (S.owned.length < GENS.length) S.owned.push(0);
    S.genMul = (d.genMul || []).slice(0, GENS.length);
    while (S.genMul.length < GENS.length) S.genMul.push(1);
    return true;
  } catch (e) { return false; }
}

function applyOffline() {
  const now = Date.now();
  const dt = Math.max(0, (now - (S.lastSave || now)) / 1000);
  if (dt < 60) return;
  const capped = Math.min(dt, S.offlineCap * 3600);
  const gain = totalRate() * capped * S.offlineEff;
  if (gain <= 0) return;
  S.mana += gain; S.totalEarned += gain; S.offlineGained += gain;
  const box = document.getElementById('mbox');
  box.innerHTML = `<h1>你睡著的時候…</h1><div class="sub">O F F L I N E &nbsp; P R O G R E S S</div>
    <p>樹懶法師持續修行了 <b>${fmtTime(dt)}</b>${dt > S.offlineCap * 3600 ? `（計算上限 ${S.offlineCap} 小時）` : ''}。</p>
    <p style="font-size:20px;color:var(--mana);font-weight:900">+${fmt(gain)} 魔力</p>
    <p style="font-size:12px;color:var(--dim)">離線效率 ${Math.round(S.offlineEff * 100)}%，可透過升級提高。</p>
    <button class="bigbtn" id="btnStart">收下</button>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('btnStart').onclick = () => {
    document.getElementById('modal').classList.add('hidden');
    if (!Sound.ctx) Sound.init();
  };
}

/* ---------------- 主迴圈 ---------------- */
let last = performance.now(), saveT = 0, renderT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  const inc = totalRate() * dt;
  S.mana += inc; S.totalEarned += inc;
  S.playTime += dt; S.idleTime += dt;
  checkAchs();

  renderT -= dt;
  if (renderT <= 0) { renderT = 0.35; UI.renderTop(); if (tab !== 'ach') UI.renderPane(); }
  saveT -= dt;
  if (saveT <= 0) { saveT = 15; save(); }
}

/* ---------------- 啟動 ---------------- */
const hadSave = load();
if (!hadSave) S = newSave();
UI.init();
UI.render();
if (hadSave) applyOffline();
window.addEventListener('beforeunload', save);
requestAnimationFrame(loop);
