/* ===========================================================
   Sloth Abyss - core.js
   工具函式、亂數、存檔
   =========================================================== */
'use strict';

const TILE = 32;

/* ---------- 亂數 (mulberry32) ---------- */
class Rng {
  constructor(seed) { this.s = (seed >>> 0) || 1; }
  next() {
    this.s = (this.s + 0x6D2B79F5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return Math.floor(a + this.next() * (b - a + 1)); }   // 含頭含尾
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // list: [{w: number, ...}]
  weighted(list) {
    let total = 0;
    for (const it of list) total += (it.w || 1);
    let r = this.next() * total;
    for (const it of list) { r -= (it.w || 1); if (r <= 0) return it; }
    return list[list.length - 1];
  }
  // 從 pool 取 n 個不重複
  sample(arr, n) { return this.shuffle(arr).slice(0, n); }
}

let rng = new Rng(Date.now() & 0xffffffff);      // 執行期全域亂數（每次進地城重設）
const urng = new Rng((Date.now() ^ 0x9e3779b9) >>> 0); // UI / 特效用，不影響地城 seed

/* ---------- 數學 ---------- */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const TAU = Math.PI * 2;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
function approach(cur, target, step) { return cur < target ? Math.min(cur + step, target) : Math.max(cur - step, target); }
function fmt(n) {
  n = Math.round(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return '' + n;
}
function roman(n) {
  const t = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [v, c] of t) while (n >= v) { s += c; n -= v; }
  return s || 'I';
}

/* ---------- 存檔 ---------- */
const SAVE_KEY = 'slothAbyss.save.v1';
const RUN_KEY = 'slothAbyss.run.v1';

const DEFAULT_META = {
  souls: 0,
  totalSouls: 0,
  runs: 0,
  bestFloor: 0,
  kills: 0,
  bossKills: 0,
  wins: 0,
  upgrades: {},          // id -> level
  unlockedClasses: ['berserker', 'sorceress'],
  seenItems: {},
  settings: { sfx: 0.7, music: 0.35, shake: 1, minimap: true, autoPickup: true },
  version: 1
};

const Save = {
  meta: null,
  loadMeta() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        this.meta = Object.assign({}, DEFAULT_META, d);
        this.meta.settings = Object.assign({}, DEFAULT_META.settings, d.settings || {});
        this.meta.upgrades = d.upgrades || {};
        if (!Array.isArray(this.meta.unlockedClasses) || !this.meta.unlockedClasses.length)
          this.meta.unlockedClasses = DEFAULT_META.unlockedClasses.slice();
      } else {
        this.meta = JSON.parse(JSON.stringify(DEFAULT_META));
      }
    } catch (e) {
      console.warn('存檔讀取失敗，重置', e);
      this.meta = JSON.parse(JSON.stringify(DEFAULT_META));
    }
    return this.meta;
  },
  saveMeta() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.meta)); } catch (e) { /* 隱私模式 */ }
  },
  wipe() {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(RUN_KEY); } catch (e) { }
    this.meta = JSON.parse(JSON.stringify(DEFAULT_META));
  },
  saveRun(obj) {
    try { localStorage.setItem(RUN_KEY, JSON.stringify(obj)); } catch (e) { }
  },
  loadRun() {
    try { const r = localStorage.getItem(RUN_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  },
  clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) { } },
  hasRun() { try { return !!localStorage.getItem(RUN_KEY); } catch (e) { return false; } }
};

/* ---------- 小型物件池 / 清單工具 ---------- */
function removeDead(arr) {
  let k = 0;
  for (let i = 0; i < arr.length; i++) if (!arr[i].dead) arr[k++] = arr[i];
  arr.length = k;
  return arr;
}

/* ---------- 顏色 ---------- */
function hsl(h, s, l, a) { return a === undefined ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`; }
function withAlpha(hex, a) {
  // #rrggbb -> rgba
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r + amt), 0, 255); g = clamp(Math.round(g + amt), 0, 255); b = clamp(Math.round(b + amt), 0, 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
