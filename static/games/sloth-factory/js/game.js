/* ===========================================================
   Sloth Factory —《樹懶法師的自動化工房》
   單檔自動化生產遊戲：挖礦 → 輸送帶 → 熔煉 → 組裝 → 研究 → 販賣
   =========================================================== */
'use strict';

/* ---------------- 基本常數 ---------------- */
const W = 72, H = 50, TS = 36;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // 0右 1下 2左 3上
const DIR_NAME = ['→', '↓', '←', '↑'];
const SAVE_KEY = 'slothFactory.v1';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

function mulberry(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- 資料表 ---------------- */
const TERRAIN = [
  { id: 'grass', name: '草地' },
  { id: 'iron', name: '鐵礦', item: 'ironOre', color: '#8d7f75', dot: '#c0b0a4' },
  { id: 'copper', name: '銅礦', item: 'copperOre', color: '#9a6a44', dot: '#d69a66' },
  { id: 'crystal', name: '魔晶礦', item: 'crystalRaw', color: '#6f4f96', dot: '#c99aff' },
  { id: 'forest', name: '樹林', item: 'wood', color: '#39603f', dot: '#5f9a63' },
  { id: 'rock', name: '巨岩', color: '#4a5158' }
];

const ITEMS = {
  ironOre: { name: '鐵礦石', color: '#b5a396', value: 2 },
  copperOre: { name: '銅礦石', color: '#c98a5c', value: 2 },
  crystalRaw: { name: '原魔晶', color: '#a878d8', value: 6 },
  wood: { name: '木材', color: '#7d5c38', value: 2 },
  ironPlate: { name: '鐵板', color: '#cdd6dd', value: 7 },
  copperPlate: { name: '銅板', color: '#eba064', value: 7 },
  crystalDust: { name: '魔晶粉', color: '#d9a8ff', value: 18 },
  plank: { name: '木板', color: '#c39a5e', value: 6 },
  gear: { name: '齒輪', color: '#93aab9', value: 20 },
  circuit: { name: '魔導迴路', color: '#5fd6a0', value: 55 },
  runeCore: { name: '符文核心', color: '#ffd45e', value: 180 },
  scroll: { name: '研究卷軸', color: '#8fb8ff', value: 40 },
  superRune: { name: '終極樹懶符文', color: '#ff9ae0', value: 3000 }
};

const BUILDINGS = {
  belt: { name: '輸送帶', icon: '⇢', cost: { ironPlate: 1 }, color: '#3d4c56', desc: '把物品往箭頭方向送。機器只會接收「指向它」的輸送帶。' },
  miner: { name: '挖礦機', icon: '⛏', cost: { ironPlate: 6 }, color: '#5d7280', desc: '放在礦脈或樹林上，自動產出原料到面向的那格。' },
  furnace: { name: '熔爐', icon: '🔥', cost: { ironPlate: 10 }, color: '#8a5236', desc: '自動熔煉：礦石→金屬板、木材→木板、原魔晶→魔晶粉。' },
  assembler: { name: '組裝機', icon: '⚙', cost: { ironPlate: 14, plank: 8 }, color: '#3f6285', desc: '點擊機器選擇配方，把材料組裝成產品。' },
  lab: { name: '研究站', icon: '🔬', cost: { ironPlate: 10, plank: 10 }, color: '#565a9c', desc: '消耗研究卷軸產生研究點數。' },
  warehouse: { name: '倉庫', icon: '📦', cost: { plank: 8 }, color: '#7a6440', desc: '收下送進來的東西，存進你的倉庫（蓋建築用的就是這些）。' },
  market: { name: '市場', icon: '💰', cost: { gold: 250 }, color: '#8a7a3c', desc: '把送進來的物品自動賣掉換金幣。' }
};
const BUILD_ORDER = ['belt', 'miner', 'furnace', 'warehouse', 'lab', 'assembler', 'market'];

const SMELT = {
  ironOre: { out: 'ironPlate', t: 2 },
  copperOre: { out: 'copperPlate', t: 2 },
  wood: { out: 'plank', t: 1.5 },
  crystalRaw: { out: 'crystalDust', t: 3, tech: 'crystal' }
};

const RECIPES = [
  { id: 'gear', out: 'gear', n: 1, in: { ironPlate: 2 }, t: 1.5 },
  { id: 'scroll', out: 'scroll', n: 1, in: { plank: 1, gear: 1 }, t: 3 },
  { id: 'circuit', out: 'circuit', n: 1, in: { copperPlate: 1, crystalDust: 1 }, t: 3, tech: 'crystal' },
  { id: 'runeCore', out: 'runeCore', n: 1, in: { gear: 2, circuit: 1 }, t: 5, tech: 'runecore' },
  { id: 'superRune', out: 'superRune', n: 1, in: { runeCore: 2, crystalDust: 4 }, t: 12, tech: 'superrune' }
];

const TECHS = [
  { id: 'belt2', name: '高速輸送帶', cost: 20, desc: '輸送帶速度 +70%' },
  { id: 'miner2', name: '鑽頭強化', cost: 40, desc: '挖礦速度 +70%' },
  { id: 'crystal', name: '魔晶加工', cost: 75, desc: '熔爐可煉魔晶粉、解鎖魔導迴路' },
  { id: 'furnace2', name: '熔爐強化', cost: 110, desc: '熔煉速度 +60%' },
  { id: 'market', name: '市場行情', cost: 140, desc: '所有售價 +60%' },
  { id: 'runecore', name: '符文核心', cost: 180, desc: '解鎖符文核心配方', req: ['crystal'] },
  { id: 'assembler2', name: '精密組裝', cost: 260, desc: '組裝速度 +60%' },
  { id: 'superrune', name: '終極符文', cost: 450, desc: '解鎖終極樹懶符文（通關目標）', req: ['runecore'] }
];

const QUESTS = [
  { id: 'q1', text: '手動點擊礦脈，挖到 10 個原料', check: g => g.stats.handMined >= 10, hint: '直接用左鍵點地圖上的礦' },
  { id: 'q2', text: '蓋一台挖礦機', check: g => g.count('miner') >= 1 },
  { id: 'q3', text: '蓋一座熔爐，並用輸送帶把礦送進去', check: g => g.stats.smelted >= 1 },
  { id: 'q4', text: '蓋一座倉庫，讓鐵板庫存達到 80', check: g => g.count('warehouse') >= 1 && (g.store.ironPlate || 0) >= 80, hint: '把熔爐的產物用輸送帶送進倉庫' },
  { id: 'q5', text: '蓋研究站，完成第一項研究', check: g => g.techs.size >= 1, hint: '研究卷軸＝木板＋齒輪，需要兩台組裝機' },
  { id: 'q6', text: '生產出第一個魔導迴路', check: g => g.stats.made.circuit >= 1 },
  { id: 'q7', text: '生產出符文核心', check: g => g.stats.made.runeCore >= 1 },
  { id: 'q8', text: '造出終極樹懶符文', check: g => g.stats.made.superRune >= 1 }
];

/* ---------------- 遊戲狀態 ---------------- */
const G = {
  terrain: new Uint8Array(W * H),
  build: new Array(W * H).fill(null),
  store: { ironPlate: 45, plank: 20, copperPlate: 8 },
  gold: 320, sci: 0,
  techs: new Set(),
  cam: { x: W * TS / 2, y: H * TS / 2, zoom: 1 },
  tool: null, dir: 0,
  time: 0, speed: 1, running: false,
  seed: 12345,
  stats: { handMined: 0, smelted: 0, sold: 0, made: {}, sciTotal: 0 },
  questDone: new Set(),
  selected: null,
  won: false,

  idx(x, y) { return y * W + x; },
  inB(x, y) { return x >= 0 && y >= 0 && x < W && y < H; },
  at(x, y) { return this.inB(x, y) ? this.build[y * W + x] : null; },
  count(type) { let n = 0; for (const b of this.build) if (b && b.type === type) n++; return n; },
  has(t) { return this.techs.has(t); },

  beltSpeed() { return this.has('belt2') ? 2.6 : 1.5; },
  minerTime() { return this.has('miner2') ? 1.0 : 1.7; },
  smeltMul() { return this.has('furnace2') ? 1 / 1.6 : 1; },
  asmMul() { return this.has('assembler2') ? 1 / 1.6 : 1; },
  priceMul() { return this.has('market') ? 1.6 : 1; }
};

/* ---------------- 地圖生成 ---------------- */
function genWorld(seed) {
  G.seed = seed;
  const rnd = mulberry(seed);
  G.terrain.fill(0);
  const blob = (t, cx, cy, r, density) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (!G.inB(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d < 1 && rnd() < (1 - d) * density + 0.04) G.terrain[y * W + x] = t;
      }
    }
  };
  // 中央保留空地
  const cx = W / 2, cy = H / 2;
  const place = (t, n, minR, maxR, minDist) => {
    for (let i = 0; i < n; i++) {
      let x, y, tries = 0;
      do {
        x = 4 + rnd() * (W - 8); y = 4 + rnd() * (H - 8); tries++;
      } while (Math.hypot(x - cx, y - cy) < minDist && tries < 40);
      blob(t, x, y, minR + rnd() * (maxR - minR), 0.85);
    }
  };
  place(1, 6, 3, 5, 8);      // 鐵
  place(2, 5, 2.5, 4.5, 9);  // 銅
  place(4, 6, 2.5, 4.5, 7);  // 樹林
  place(3, 3, 2, 3.5, 13);   // 魔晶
  // 裝飾巨岩
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(rnd() * H);
    if (G.terrain[y * W + x] === 0 && Math.hypot(x - cx, y - cy) > 6) G.terrain[y * W + x] = 5;
  }
  // 保證出生點附近有鐵、樹、銅
  blob(1, cx - 6, cy - 3, 3.2, 1);
  blob(4, cx + 6, cy + 3, 3, 1);
  blob(2, cx + 5, cy - 6, 2.6, 1);
  for (let y = cy - 2; y <= cy + 2; y++)
    for (let x = cx - 2; x <= cx + 2; x++)
      if (G.inB(x, y)) G.terrain[y * W + x] = 0;
}

/* ---------------- 建築 ---------------- */
function makeBuilding(type, x, y, dir) {
  const b = { type, x, y, dir, prog: 0 };
  if (type === 'belt') b.items = [];
  else { b.buf = {}; b.out = null; b.cur = null; }
  if (type === 'assembler') b.recipe = null;
  return b;
}

function canAfford(type) {
  const c = BUILDINGS[type].cost;
  for (const k in c) {
    if (k === 'gold') { if (G.gold < c[k]) return false; }
    else if ((G.store[k] || 0) < c[k]) return false;
  }
  return true;
}
function pay(type) {
  const c = BUILDINGS[type].cost;
  for (const k in c) {
    if (k === 'gold') G.gold -= c[k];
    else G.store[k] -= c[k];
  }
}
function refund(b) {
  const c = BUILDINGS[b.type].cost;
  for (const k in c) {
    const amt = Math.ceil(c[k] * 0.7);
    if (k === 'gold') G.gold += amt;
    else G.store[k] = (G.store[k] || 0) + amt;
  }
  // 帶裡的東西還你
  if (b.items) for (const it of b.items) addStore(it.it, 1);
  if (b.buf) for (const k in b.buf) addStore(k, b.buf[k]);
  if (b.out) addStore(b.out, 1);
}

function addStore(item, n) { G.store[item] = (G.store[item] || 0) + (n || 1); }

function canPlace(type, x, y) {
  if (!G.inB(x, y)) return false;
  if (G.terrain[G.idx(x, y)] === 5) return false;
  if (G.at(x, y)) return false;
  if (type === 'miner') {
    const t = G.terrain[G.idx(x, y)];
    if (!TERRAIN[t].item) return false;
  } else if (TERRAIN[G.terrain[G.idx(x, y)]].item && type !== 'belt') {
    return true; // 允許蓋在礦上（只是浪費）
  }
  return true;
}

function placeBuilding(type, x, y, dir) {
  if (!canPlace(type, x, y)) return false;
  if (!canAfford(type)) { toast('材料不足'); return false; }
  pay(type);
  G.build[G.idx(x, y)] = makeBuilding(type, x, y, dir);
  return true;
}

function removeBuilding(x, y) {
  const b = G.at(x, y);
  if (!b) return;
  refund(b);
  G.build[G.idx(x, y)] = null;
  if (G.selected === b) { G.selected = null; UI.hidePanel('panelMachine'); }
}

/* ---------------- 模擬 ---------------- */
function accept(b, item, fromDir) {
  if (!b) return false;
  switch (b.type) {
    case 'belt': {
      // 尾端要有空間
      for (const it of b.items) if (it.pos < 0.3) return false;
      if (b.items.length >= 4) return false;
      b.items.push({ it: item, pos: 0 });
      b.items.sort((a, c) => c.pos - a.pos);
      return true;
    }
    case 'furnace': {
      const r = SMELT[item];
      if (!r) return false;
      if (r.tech && !G.has(r.tech)) return false;
      const total = bufTotal(b);
      if (total >= 6) return false;
      b.buf[item] = (b.buf[item] || 0) + 1;
      return true;
    }
    case 'assembler': {
      if (!b.recipe) return false;
      const rc = RECIPES.find(r => r.id === b.recipe);
      if (!rc || !rc.in[item]) return false;
      if ((b.buf[item] || 0) >= rc.in[item] * 3) return false;
      b.buf[item] = (b.buf[item] || 0) + 1;
      return true;
    }
    case 'lab': {
      if (item !== 'scroll') return false;
      if ((b.buf.scroll || 0) >= 5) return false;
      b.buf.scroll = (b.buf.scroll || 0) + 1;
      return true;
    }
    case 'warehouse':
      addStore(item, 1);
      return true;
    case 'market': {
      const v = Math.round(ITEMS[item].value * G.priceMul());
      G.gold += v;
      G.stats.sold += v;
      FX.push({ x: b.x * TS + TS / 2, y: b.y * TS, t: 1, text: '+' + v, color: '#ffcf5e' });
      return true;
    }
    default: return false;
  }
}
function bufTotal(b) { let n = 0; for (const k in b.buf) n += b.buf[k]; return n; }

function targetOf(b) {
  const [dx, dy] = DIRS[b.dir];
  return G.at(b.x + dx, b.y + dy);
}

function tryOutput(b) {
  if (!b.out) return;
  const t = targetOf(b);
  if (t && accept(t, b.out, (b.dir + 2) % 4)) b.out = null;
}

function simulate(dt) {
  const bs = G.beltSpeed();
  // 1) 輸送帶（先移動，再交接）
  for (const b of G.build) {
    if (!b || b.type !== 'belt' || !b.items.length) continue;
    b.items.sort((a, c) => c.pos - a.pos);
    for (let i = 0; i < b.items.length; i++) {
      const it = b.items[i];
      const cap = i === 0 ? 1 : b.items[i - 1].pos - 0.3;
      it.pos = Math.min(it.pos + bs * dt, cap);
      if (it.pos < 0) it.pos = 0;
    }
    const head = b.items[0];
    if (head && head.pos >= 1) {
      const t = targetOf(b);
      if (t && accept(t, head.it, (b.dir + 2) % 4)) b.items.shift();
    }
  }
  // 2) 機器
  for (const b of G.build) {
    if (!b || b.type === 'belt') continue;
    switch (b.type) {
      case 'miner': {
        const t = TERRAIN[G.terrain[G.idx(b.x, b.y)]];
        if (!t.item) break;
        if (b.out) { tryOutput(b); break; }
        b.prog += dt / G.minerTime();
        if (b.prog >= 1) { b.prog = 0; b.out = t.item; tryOutput(b); }
        break;
      }
      case 'furnace': {
        if (b.out) { tryOutput(b); if (b.out) break; }
        if (b.cur) {
          b.prog += dt / (SMELT[b.cur].t * G.smeltMul());
          if (b.prog >= 1) {
            b.prog = 0;
            b.out = SMELT[b.cur].out;
            countMade(b.out, 1);
            G.stats.smelted++;
            b.cur = null;
            tryOutput(b);
          }
        } else {
          for (const k in b.buf) {
            if (b.buf[k] > 0 && SMELT[k]) {
              b.buf[k]--; if (!b.buf[k]) delete b.buf[k];
              b.cur = k; b.prog = 0; break;
            }
          }
        }
        break;
      }
      case 'assembler': {
        if (b.out) { tryOutput(b); if (b.out) break; }
        const rc = b.recipe && RECIPES.find(r => r.id === b.recipe);
        if (!rc) break;
        if (b.cur) {
          b.prog += dt / (rc.t * G.asmMul());
          if (b.prog >= 1) {
            b.prog = 0; b.cur = null;
            b.out = rc.out;
            countMade(rc.out, rc.n);
            if (rc.out === 'superRune' && !G.won) win();
            tryOutput(b);
          }
        } else {
          let ok = true;
          for (const k in rc.in) if ((b.buf[k] || 0) < rc.in[k]) ok = false;
          if (ok) {
            for (const k in rc.in) { b.buf[k] -= rc.in[k]; if (!b.buf[k]) delete b.buf[k]; }
            b.cur = rc.id; b.prog = 0;
          }
        }
        break;
      }
      case 'lab': {
        if (b.cur) {
          b.prog += dt / 2.5;
          if (b.prog >= 1) { b.prog = 0; b.cur = null; G.sci += 1; G.stats.sciTotal++; }
        } else if (b.buf.scroll > 0) {
          b.buf.scroll--; if (!b.buf.scroll) delete b.buf.scroll;
          b.cur = 'scroll'; b.prog = 0;
        }
        break;
      }
    }
  }
}

function countMade(item, n) { G.stats.made[item] = (G.stats.made[item] || 0) + n; }

function win() {
  G.won = true;
  toast('★ 終極樹懶符文完成！工房達成最終目標 ★', 8);
  UI.victory();
}

/* ---------------- 特效文字 ---------------- */
const FX = [];
FX.push = function (o) { Array.prototype.push.call(this, o); };

/* ---------------- 繪圖 ---------------- */
const R = {
  cv: null, ctx: null, w: 0, h: 0, dpr: 1,
  init() {
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = this.w * this.dpr; this.cv.height = this.h * this.dpr;
    this.cv.style.width = this.w + 'px'; this.cv.style.height = this.h + 'px';
  },
  s2w(sx, sy) {
    const z = G.cam.zoom;
    return { x: (sx - this.w / 2) / z + G.cam.x, y: (sy - this.h / 2) / z + G.cam.y };
  },
  draw() {
    const ctx = this.ctx, z = G.cam.zoom;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0b1013';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.translate(this.w / 2, this.h / 2);
    ctx.scale(z, z);
    ctx.translate(-G.cam.x, -G.cam.y);

    const hw = this.w / (2 * z), hh = this.h / (2 * z);
    const x0 = clamp(Math.floor((G.cam.x - hw) / TS), 0, W - 1);
    const x1 = clamp(Math.ceil((G.cam.x + hw) / TS), 0, W - 1);
    const y0 = clamp(Math.floor((G.cam.y - hh) / TS), 0, H - 1);
    const y1 = clamp(Math.ceil((G.cam.y + hh) / TS), 0, H - 1);

    // 地形
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = G.terrain[y * W + x];
        const px = x * TS, py = y * TS;
        ctx.fillStyle = ((x + y) & 1) ? '#16211f' : '#182421';
        ctx.fillRect(px, py, TS, TS);
        if (t === 0) continue;
        const d = TERRAIN[t];
        if (t === 5) {
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.moveTo(px + 6, py + TS - 5); ctx.lineTo(px + TS / 2, py + 5);
          ctx.lineTo(px + TS - 6, py + TS - 5); ctx.closePath(); ctx.fill();
          continue;
        }
        const seedv = (x * 7919 + y * 104729) % 97;
        if (t === 4) { // 樹林
          ctx.fillStyle = '#1d2b20';
          ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
          for (let i = 0; i < 3; i++) {
            const ox = ((seedv * (i + 3)) % 16) + 8, oy = ((seedv * (i + 5)) % 16) + 8;
            ctx.fillStyle = '#2f4f34';
            ctx.beginPath(); ctx.arc(px + ox, py + oy, 6.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5f9a63';
            ctx.beginPath(); ctx.arc(px + ox - 1.6, py + oy - 2, 4, 0, Math.PI * 2); ctx.fill();
          }
        } else if (t === 3) { // 魔晶
          ctx.fillStyle = '#241a33';
          ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
          for (let i = 0; i < 2; i++) {
            const ox = ((seedv * (i + 2)) % 16) + 9, oy = ((seedv * (i + 6)) % 16) + 9;
            const r2 = 6 - i;
            ctx.fillStyle = i ? '#9a6ad0' : '#c99aff';
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - r2); ctx.lineTo(px + ox + r2 * 0.7, py + oy);
            ctx.lineTo(px + ox, py + oy + r2); ctx.lineTo(px + ox - r2 * 0.7, py + oy);
            ctx.closePath(); ctx.fill();
          }
        } else { // 金屬礦
          ctx.fillStyle = d.color;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
          ctx.globalAlpha = 1;
          ctx.fillStyle = d.dot;
          for (let i = 0; i < 5; i++) {
            const ox = ((seedv * (i + 3)) % 24) + 5, oy = ((seedv * (i + 7)) % 24) + 5;
            const sz = 3 + (seedv + i) % 3;
            ctx.beginPath();
            ctx.moveTo(px + ox, py + oy - sz);
            ctx.lineTo(px + ox + sz, py + oy);
            ctx.lineTo(px + ox, py + oy + sz);
            ctx.lineTo(px + ox - sz, py + oy);
            ctx.closePath(); ctx.fill();
          }
        }
      }
    }
    // 網格
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0; x <= x1 + 1; x++) { ctx.moveTo(x * TS, y0 * TS); ctx.lineTo(x * TS, (y1 + 1) * TS); }
    for (let y = y0; y <= y1 + 1; y++) { ctx.moveTo(x0 * TS, y * TS); ctx.lineTo((x1 + 1) * TS, y * TS); }
    ctx.stroke();

    // 建築
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const b = G.build[y * W + x];
        if (b) this.drawBuilding(ctx, b);
      }

    // 選取框
    if (G.selected) {
      ctx.strokeStyle = '#4fd6a8'; ctx.lineWidth = 2;
      ctx.strokeRect(G.selected.x * TS + 1, G.selected.y * TS + 1, TS - 2, TS - 2);
    }

    // 游標預覽
    if (Input.hover && G.tool) {
      const { x, y } = Input.hover;
      const ok = canPlace(G.tool, x, y) && canAfford(G.tool);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = ok ? '#4fd6a8' : '#ff6b6b';
      ctx.fillRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ok ? '#4fd6a8' : '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.strokeRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
      // 方向指示
      const [dx, dy] = DIRS[G.dir];
      ctx.fillStyle = '#0b1013';
      ctx.beginPath();
      const cx = x * TS + TS / 2 + dx * 11, cy = y * TS + TS / 2 + dy * 11;
      ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    } else if (Input.hover && !G.tool) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
      ctx.strokeRect(Input.hover.x * TS + 1, Input.hover.y * TS + 1, TS - 2, TS - 2);
    }

    // 浮動文字
    ctx.textAlign = 'center';
    for (const f of FX) {
      ctx.globalAlpha = clamp(f.t, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 13px "Noto Sans TC",sans-serif';
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.restore();
  },

  drawBuilding(ctx, b) {
    const px = b.x * TS, py = b.y * TS;
    const def = BUILDINGS[b.type];
    if (b.type === 'belt') {
      ctx.fillStyle = '#2b363d';
      ctx.fillRect(px + 1, py + 1, TS - 2, TS - 2);
      // 動態箭紋
      const [dx, dy] = DIRS[b.dir];
      ctx.strokeStyle = '#54707d';
      ctx.lineWidth = 2;
      const t = (G.time * G.beltSpeed()) % 1;
      for (let i = 0; i < 3; i++) {
        const f = ((i / 3) + t) % 1;
        const cx = px + TS / 2 + dx * (f - 0.5) * TS;
        const cy = py + TS / 2 + dy * (f - 0.5) * TS;
        ctx.beginPath();
        ctx.moveTo(cx - dy * 6 - dx * 4, cy - dx * -6 - dy * 4);
        ctx.lineTo(cx + dx * 5, cy + dy * 5);
        ctx.lineTo(cx + dy * 6 - dx * 4, cy - dx * 6 - dy * 4);
        ctx.stroke();
      }
      // 物品
      for (const it of b.items) {
        const cx = px + TS / 2 + dx * (it.pos - 0.5) * TS;
        const cy = py + TS / 2 + dy * (it.pos - 0.5) * TS;
        const c = ITEMS[it.it].color;
        ctx.fillStyle = 'rgba(0,0,0,.45)';
        ctx.fillRect(cx - 6, cy - 5, 12, 12);
        ctx.fillStyle = c;
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(cx - 6, cy - 6, 12, 3);
      }
      return;
    }
    // 一般機器
    ctx.fillStyle = def.color;
    roundRect(ctx, px + 2, py + 2, TS - 4, TS - 4, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(px + 2, py + TS - 9, TS - 4, 7);
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
    roundRect(ctx, px + 2.5, py + 2.5, TS - 5, TS - 5, 5); ctx.stroke();
    // 圖示
    ctx.font = '16px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(def.icon, px + TS / 2, py + TS / 2 - 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    // 輸出方向
    if (b.type !== 'warehouse' && b.type !== 'market' && b.type !== 'lab') {
      const [dx, dy] = DIRS[b.dir];
      ctx.fillStyle = '#ffd45e';
      ctx.beginPath();
      const cx = px + TS / 2 + dx * (TS / 2 - 4), cy = py + TS / 2 + dy * (TS / 2 - 4);
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill();
    }
    // 進度
    const p = b.prog || 0;
    if (p > 0) {
      ctx.fillStyle = '#4fd6a8';
      ctx.fillRect(px + 3, py + TS - 7, (TS - 6) * clamp(p, 0, 1), 3);
    }
    // 緩衝內容
    if (b.buf) {
      let i = 0;
      for (const k in b.buf) {
        if (b.buf[k] <= 0) continue;
        ctx.fillStyle = ITEMS[k].color;
        ctx.fillRect(px + 4 + i * 6, py + 4, 4, 4);
        i++; if (i > 4) break;
      }
    }
    if (b.out) {
      ctx.fillStyle = ITEMS[b.out].color;
      ctx.fillRect(px + TS - 9, py + 4, 5, 5);
    }
    if (b.type === 'assembler' && !b.recipe) {
      ctx.fillStyle = '#ff9a5a';
      ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', px + TS / 2, py + TS - 10);
      ctx.textAlign = 'left';
    }
  }
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------------- 輸入 ---------------- */
const Input = {
  hover: null, dragging: false, dragged: false, lastX: 0, lastY: 0, keys: {},
  handTimer: 0, touchUi: false,

  markTouch() {
    if (this.touchUi) return;
    this.touchUi = true;
    document.body.classList.add('touch');
    if (typeof UI !== 'undefined' && UI.updateBuildBar) UI.updateBuildBar();
  },

  init() {
    const cv = R.cv;
    cv.addEventListener('mousemove', e => {
      const w = R.s2w(e.clientX, e.clientY);
      const x = Math.floor(w.x / TS), y = Math.floor(w.y / TS);
      this.hover = G.inB(x, y) ? { x, y } : null;
      if (this.dragging) {
        const dx = (e.clientX - this.lastX) / G.cam.zoom, dy = (e.clientY - this.lastY) / G.cam.zoom;
        if (Math.abs(dx) + Math.abs(dy) > 1) this.dragged = true;
        G.cam.x -= dx; G.cam.y -= dy;
        this.lastX = e.clientX; this.lastY = e.clientY;
        clampCam();
      } else if (this.painting && this.hover && G.tool) {
        this.tryPlaceAt(this.hover.x, this.hover.y);
      } else if (this.erasing && this.hover) {
        removeBuilding(this.hover.x, this.hover.y);
      }
      UI.hoverTip(e.clientX, e.clientY);
    });
    cv.addEventListener('mousedown', e => {
      if (!Sound.ctx) Sound.init();
      this.lastX = e.clientX; this.lastY = e.clientY;
      if (e.button === 1 || (e.button === 0 && this.keys[' '])) { this.dragging = true; this.dragged = false; e.preventDefault(); return; }
      if (e.button === 2) { this.erasing = true; if (this.hover) removeBuilding(this.hover.x, this.hover.y); return; }
      if (e.button === 0) {
        if (!this.hover) return;
        if (G.tool) { this.painting = true; this.tryPlaceAt(this.hover.x, this.hover.y); }
        else this.clickTile(this.hover.x, this.hover.y);
      }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; this.painting = false; this.erasing = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      const before = R.s2w(e.clientX, e.clientY);
      G.cam.zoom = clamp(G.cam.zoom * (e.deltaY > 0 ? 0.88 : 1.14), 0.45, 2.4);
      const after = R.s2w(e.clientX, e.clientY);
      G.cam.x += before.x - after.x; G.cam.y += before.y - after.y;
      clampCam();
    }, { passive: false });

    // 觸控：拖曳平移 + 點擊放置 + 雙指縮放
    let touchStart = null, moved = false, pinch = null;
    const pinchInfo = ts => {
      const a = ts[0], b = ts[1];
      return {
        d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2
      };
    };
    cv.addEventListener('touchstart', e => {
      if (!Sound.ctx) Sound.init();
      this.markTouch();
      if (e.touches.length >= 2) { pinch = pinchInfo(e.touches); moved = true; e.preventDefault(); return; }
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY }; moved = false;
      this.lastX = t.clientX; this.lastY = t.clientY;
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      if (e.touches.length >= 2) {
        const p = pinchInfo(e.touches);
        if (pinch && pinch.d > 0) {
          const before = R.s2w(p.cx, p.cy);
          G.cam.zoom = clamp(G.cam.zoom * (p.d / pinch.d), 0.45, 2.4);
          const after = R.s2w(p.cx, p.cy);
          G.cam.x += before.x - after.x; G.cam.y += before.y - after.y;
          clampCam();
        }
        pinch = p; moved = true; e.preventDefault();
        return;
      }
      const t = e.touches[0];
      const dx = (t.clientX - this.lastX) / G.cam.zoom, dy = (t.clientY - this.lastY) / G.cam.zoom;
      if (Math.abs(t.clientX - touchStart.x) + Math.abs(t.clientY - touchStart.y) > 8) moved = true;
      G.cam.x -= dx; G.cam.y -= dy;
      this.lastX = t.clientX; this.lastY = t.clientY;
      clampCam(); e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', e => {
      if (e.touches.length === 0) pinch = null;
      if (!moved && touchStart) {
        const w = R.s2w(touchStart.x, touchStart.y);
        const x = Math.floor(w.x / TS), y = Math.floor(w.y / TS);
        if (G.inB(x, y)) { if (G.tool) this.tryPlaceAt(x, y); else this.clickTile(x, y); }
      }
      e.preventDefault();
    }, { passive: false });

    // 縮放按鈕（觸控裝置才顯示）
    const zoomBy = f => {
      const cx = innerWidth / 2, cy = innerHeight / 2;
      const before = R.s2w(cx, cy);
      G.cam.zoom = clamp(G.cam.zoom * f, 0.45, 2.4);
      const after = R.s2w(cx, cy);
      G.cam.x += before.x - after.x; G.cam.y += before.y - after.y;
      clampCam();
    };
    const zb = (id, f) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('click', () => zoomBy(f));
      el.addEventListener('touchstart', e => { e.preventDefault(); this.markTouch(); zoomBy(f); }, { passive: false });
    };
    zb('zIn', 1.25); zb('zOut', 0.8);
    window.addEventListener('touchstart', () => this.markTouch(), { passive: true });

    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === 'r') { G.dir = (G.dir + 1) % 4; UI.updateBuildBar(); }
      if (k === 'escape') { G.tool = null; G.selected = null; UI.hidePanel('panelMachine'); UI.updateBuildBar(); }
      if (k === 'x') { if (this.hover) removeBuilding(this.hover.x, this.hover.y); }
      if (k >= '1' && k <= '9') {
        const t = BUILD_ORDER[+k - 1];
        if (t) UI.selectTool(t);
      }
      if (k === ' ') e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
  },

  tryPlaceAt(x, y) {
    const b = G.at(x, y);
    if (b && b.type === G.tool && b.type === 'belt' && b.dir !== G.dir) { b.dir = G.dir; return; }
    if (b) return;
    if (placeBuilding(G.tool, x, y, G.dir)) {
      Sound.place();
      UI.updateBuildBar();
    }
  },

  clickTile(x, y) {
    const b = G.at(x, y);
    if (b) {
      G.selected = b;
      UI.showMachine(b);
      return;
    }
    // 手動挖礦
    const t = TERRAIN[G.terrain[G.idx(x, y)]];
    if (t.item && this.handTimer <= 0) {
      this.handTimer = 0.25;
      addStore(t.item, 1);
      G.stats.handMined++;
      FX.push({ x: x * TS + TS / 2, y: y * TS + 10, t: 1, text: '+1 ' + ITEMS[t.item].name, color: '#9fe8c8' });
      Sound.mine();
    }
  }
};

function clampCam() {
  G.cam.x = clamp(G.cam.x, -200, W * TS + 200);
  G.cam.y = clamp(G.cam.y, -200, H * TS + 200);
}

/* ---------------- 音效 ---------------- */
const Sound = {
  ctx: null,
  init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
  beep(f, d, type, vol, slide) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
    g.gain.setValueAtTime(vol || 0.05, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + d + 0.01);
  },
  place() { this.beep(320, 0.07, 'square', 0.05, 480); },
  mine() { this.beep(200, 0.06, 'triangle', 0.05, 140); },
  tech() { [523, 659, 880].forEach((f, i) => setTimeout(() => this.beep(f, 0.2, 'triangle', 0.06), i * 90)); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.beep(f, 0.35, 'triangle', 0.07), i * 130)); }
};

/* ---------------- UI ---------------- */
const UI = {
  init() {
    document.getElementById('btnStart').onclick = () => {
      document.getElementById('intro').classList.add('hidden');
      Sound.init();
      G.running = true;
      save();
    };
    document.getElementById('btnStore').onclick = () => this.toggle('panelStore', () => this.renderStore());
    document.getElementById('btnTech').onclick = () => this.toggle('panelTech', () => this.renderTech());
    document.getElementById('btnHelp').onclick = () => document.getElementById('intro').classList.remove('hidden');
    document.getElementById('btnSpeed').onclick = () => {
      G.speed = G.speed === 1 ? 2 : (G.speed === 2 ? 4 : 1);
      document.getElementById('btnSpeed').textContent = (G.speed === 1 ? '▶' : '▶▶') + ' ' + G.speed + 'x';
    };
    document.querySelectorAll('.close').forEach(c => c.onclick = () => this.hidePanel(c.dataset.c));
    this.updateBuildBar();
    this.renderQuests();
  },
  toggle(id, render) {
    const el = document.getElementById(id);
    const wasHidden = el.classList.contains('hidden');
    ['panelStore', 'panelTech', 'panelMachine'].forEach(p => document.getElementById(p).classList.add('hidden'));
    if (wasHidden) { render && render(); el.classList.remove('hidden'); }
  },
  hidePanel(id) {
    document.getElementById(id).classList.add('hidden');
    if (id === 'panelMachine') G.selected = null;
  },
  selectTool(t) {
    if (BUILDINGS[t].tech && !G.has(BUILDINGS[t].tech)) { toast('尚未研究：' + BUILDINGS[t].name); return; }
    G.tool = (G.tool === t) ? null : t;
    G.selected = null;
    this.hidePanel('panelMachine');
    this.updateBuildBar();
  },
  updateBuildBar() {
    const el = document.getElementById('build');
    el.innerHTML = BUILD_ORDER.map((t, i) => {
      const d = BUILDINGS[t];
      const locked = d.tech && !G.has(d.tech);
      const afford = canAfford(t);
      const cost = Object.keys(d.cost).map(k =>
        `${k === 'gold' ? '💰' : ITEMS[k].name} ${d.cost[k]}`).join('<br>');
      return `<div class="bcard ${G.tool === t ? 'sel' : ''} ${locked ? 'locked' : ''}" data-t="${t}">
        <div class="key">${i + 1}</div>
        <div class="ic">${d.icon}</div>
        <div class="nm">${d.name}</div>
        <div class="cost ${afford ? '' : 'no'}">${locked ? '需研究' : cost}</div>
      </div>`;
    }).join('') + `<div class="bcard" id="rotBtn"><div class="ic">${DIR_NAME[G.dir]}</div>
        <div class="nm">方向</div><div class="cost">${Input.touchUi ? '點我旋轉' : '按 R 旋轉'}</div></div>`;
    el.querySelectorAll('.bcard[data-t]').forEach(c => {
      c.onclick = () => this.selectTool(c.dataset.t);
      c.onmouseenter = e => this.showTip(e, `<b>${BUILDINGS[c.dataset.t].name}</b><br>${BUILDINGS[c.dataset.t].desc}`);
      c.onmouseleave = () => this.hideTip();
    });
    const rb = document.getElementById('rotBtn');
    if (rb) rb.onclick = () => { G.dir = (G.dir + 1) % 4; this.updateBuildBar(); };
  },
  updateTop() {
    document.getElementById('gold').textContent = Math.floor(G.gold);
    document.getElementById('sci').textContent = Math.floor(G.sci);
    const machines = G.build.reduce((n, b) => n + (b && b.type !== 'belt' ? 1 : 0), 0);
    const belts = G.count('belt');
    document.getElementById('rate').textContent =
      `機器 ${machines} · 輸送帶 ${belts} · 總產值 💰${Math.floor(G.stats.sold)}`;
  },
  renderStore() {
    const keys = Object.keys(ITEMS).filter(k => (G.store[k] || 0) > 0);
    document.getElementById('storeList').innerHTML = keys.length
      ? keys.map(k => `<div class="itemrow"><span class="sw" style="background:${ITEMS[k].color}"></span>
          <span style="flex:1">${ITEMS[k].name}</span><b>${Math.floor(G.store[k])}</b></div>`).join('')
        + `<div class="row" style="margin-top:10px;border-top:1px solid var(--line);padding-top:8px">
            <span class="n">建築會直接從這裡扣材料</span></div>`
      : '<div class="dim">倉庫是空的。用倉庫建築把東西收進來，或直接點礦手挖。</div>';
  },
  renderTech() {
    document.getElementById('techList').innerHTML = TECHS.map(t => {
      const done = G.has(t.id);
      const locked = t.req && t.req.some(r => !G.has(r));
      return `<div class="tech ${done ? 'done' : ''} ${locked ? 'locked' : ''}" data-t="${t.id}">
        <div class="tn">${t.name} ${done ? '✔' : ''}</div>
        <div class="td">${t.desc}</div>
        <div class="tc">${done ? '已完成' : (locked ? '需先完成：' + t.req.map(r => TECHS.find(x => x.id === r).name).join('、') : '🔬 ' + t.cost)}</div>
      </div>`;
    }).join('');
    document.querySelectorAll('.tech').forEach(el => el.onclick = () => {
      const t = TECHS.find(x => x.id === el.dataset.t);
      if (G.has(t.id)) return;
      if (t.req && t.req.some(r => !G.has(r))) { toast('前置研究未完成'); return; }
      if (G.sci < t.cost) { toast('研究點數不足'); return; }
      G.sci -= t.cost;
      G.techs.add(t.id);
      Sound.tech();
      toast('研究完成：' + t.name);
      this.renderTech(); this.updateBuildBar();
      save();
    });
  },
  showMachine(b) {
    const el = document.getElementById('panelMachine');
    document.getElementById('machTitle').textContent = BUILDINGS[b.type].name;
    let html = `<div class="dim" style="font-size:12px;line-height:1.6;margin-bottom:10px">${BUILDINGS[b.type].desc}</div>`;
    html += `<div class="row"><span class="n">座標</span><span>${b.x}, ${b.y}</span></div>`;
    if (b.type !== 'warehouse' && b.type !== 'market' && b.type !== 'lab')
      html += `<div class="row"><span class="n">輸出方向</span><span>${DIR_NAME[b.dir]}　<button class="mini" id="rotM">旋轉</button></span></div>`;
    if (b.type === 'miner') {
      const t = TERRAIN[G.terrain[G.idx(b.x, b.y)]];
      html += `<div class="row"><span class="n">礦脈</span><span>${t.item ? TERRAIN[G.terrain[G.idx(b.x, b.y)]].name : '無（不會產出）'}</span></div>`;
    }
    if (b.buf) {
      const ks = Object.keys(b.buf).filter(k => b.buf[k] > 0);
      html += `<div class="row"><span class="n">內部材料</span><span>${ks.length ? ks.map(k => ITEMS[k].name + '×' + b.buf[k]).join('、') : '空'}</span></div>`;
    }
    if (b.type === 'assembler') {
      html += `<h3 style="margin-top:14px">配方</h3>`;
      html += RECIPES.map(r => {
        const locked = r.tech && !G.has(r.tech);
        if (locked) return '';
        const ins = Object.keys(r.in).map(k => `${ITEMS[k].name}×${r.in[k]}`).join(' + ');
        return `<div class="recipe ${b.recipe === r.id ? 'sel' : ''}" data-r="${r.id}">
          <span class="sw" style="background:${ITEMS[r.out].color}"></span>
          <span style="flex:1"><span class="out">${ITEMS[r.out].name}</span><br><span class="in">${ins} · ${r.t}秒</span></span>
        </div>`;
      }).join('');
    }
    html += `<div class="row" style="margin-top:14px"><button class="mini" id="delM" style="width:100%;padding:8px;background:#3a1e1e;border:1px solid #6a3030;color:#ffb0b0;border-radius:6px;cursor:pointer">拆除（退回 70% 材料）</button></div>`;
    document.getElementById('machBody').innerHTML = html;
    ['panelStore', 'panelTech'].forEach(p => document.getElementById(p).classList.add('hidden'));
    el.classList.remove('hidden');
    const rot = document.getElementById('rotM');
    if (rot) rot.onclick = () => { b.dir = (b.dir + 1) % 4; this.showMachine(b); };
    document.getElementById('delM').onclick = () => { removeBuilding(b.x, b.y); this.hidePanel('panelMachine'); this.updateBuildBar(); };
    document.querySelectorAll('.recipe').forEach(r => r.onclick = () => {
      // 換配方時把舊材料退回倉庫
      for (const k in b.buf) { addStore(k, b.buf[k]); }
      b.buf = {}; b.cur = null; b.prog = 0;
      b.recipe = r.dataset.r;
      this.showMachine(b);
      save();
    });
  },
  renderQuests() {
    const list = document.getElementById('questList');
    let shown = 0;
    list.innerHTML = QUESTS.map(q => {
      const done = G.questDone.has(q.id);
      if (!done && shown >= 2) return '';
      if (!done) shown++;
      return `<div class="q ${done ? 'done' : ''}">${done ? '✔' : '▸'} <span>${q.text}${q.hint && !done ? `<br><b>${q.hint}</b>` : ''}</span></div>`;
    }).join('');
  },
  hoverTip(mx, my) {
    if (!Input.hover) { this.hideTip(); return; }
    const b = G.at(Input.hover.x, Input.hover.y);
    const t = TERRAIN[G.terrain[G.idx(Input.hover.x, Input.hover.y)]];
    if (G.tool) { this.hideTip(); return; }
    let html = '';
    if (b) {
      html = `<b>${BUILDINGS[b.type].name}</b>`;
      if (b.type === 'assembler') html += `<br>配方：${b.recipe ? ITEMS[RECIPES.find(r => r.id === b.recipe).out].name : '尚未設定（點擊設定）'}`;
      if (b.type === 'belt') html += `<br>方向 ${DIR_NAME[b.dir]}　物品 ${b.items.length}`;
      if (b.out) html += `<br>待輸出：${ITEMS[b.out].name}`;
    } else if (t.item) {
      html = `<b>${t.name}</b><br>點擊可手動採集 ${ITEMS[t.item].name}`;
    } else if (t.id === 'rock') html = `<b>巨岩</b><br>不能建造`;
    else { this.hideTip(); return; }
    const tip = document.getElementById('tip');
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    tip.style.left = Math.min(mx + 16, window.innerWidth - tip.offsetWidth - 10) + 'px';
    tip.style.top = Math.min(my + 16, window.innerHeight - tip.offsetHeight - 10) + 'px';
  },
  showTip(e, html) {
    const tip = document.getElementById('tip');
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const r = e.currentTarget.getBoundingClientRect();
    tip.style.left = clamp(r.left, 8, window.innerWidth - tip.offsetWidth - 8) + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 8) + 'px';
  },
  hideTip() { document.getElementById('tip').classList.add('hidden'); },
  victory() {
    Sound.win();
    const box = document.getElementById('intro');
    box.querySelector('.introbox').innerHTML = `
      <h1>工房達成完全自動化</h1>
      <div class="sub">S L O T H &nbsp; F A C T O R Y</div>
      <p>終極樹懶符文誕生了。從此樹懶法師再也不用起床——
        機器會挖礦、會熔煉、會組裝，甚至會替他賺錢。</p>
      <div style="font-size:13px;line-height:2;color:#b6c8cc">
        總產值：💰 ${Math.floor(G.stats.sold)}<br>
        研究點數累計：🔬 ${G.stats.sciTotal}<br>
        手動挖礦次數：${G.stats.handMined} 次（辛苦了）<br>
        建築總數：${G.build.filter(Boolean).length}
      </div>
      <button class="bigbtn" id="btnStart2">繼續擴建工房</button>`;
    box.classList.remove('hidden');
    document.getElementById('btnStart2').onclick = () => box.classList.add('hidden');
  }
};

function toast(msg, dur) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; d.style.transition = '.4s'; setTimeout(() => d.remove(), 400); }, (dur || 2.6) * 1000);
}

/* ---------------- 存檔 ---------------- */
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      seed: G.seed, store: G.store, gold: G.gold, sci: G.sci,
      techs: [...G.techs], stats: G.stats, quests: [...G.questDone], won: G.won,
      cam: G.cam,
      builds: G.build.filter(Boolean).map(b => ({
        t: b.type, x: b.x, y: b.y, d: b.dir, r: b.recipe || null,
        i: b.items ? b.items.map(o => [o.it, +o.pos.toFixed(2)]) : null,
        bf: b.buf || null, o: b.out || null
      }))
    }));
  } catch (e) { }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    genWorld(d.seed);
    G.store = d.store || {}; G.gold = d.gold; G.sci = d.sci;
    G.techs = new Set(d.techs || []);
    G.stats = Object.assign({ handMined: 0, smelted: 0, sold: 0, made: {}, sciTotal: 0 }, d.stats || {});
    if (!G.stats.made) G.stats.made = {};
    G.questDone = new Set(d.quests || []);
    G.won = !!d.won;
    if (d.cam) G.cam = d.cam;
    G.build = new Array(W * H).fill(null);
    for (const s of (d.builds || [])) {
      const b = makeBuilding(s.t, s.x, s.y, s.d);
      if (s.r) b.recipe = s.r;
      if (s.i && b.items) b.items = s.i.map(o => ({ it: o[0], pos: o[1] }));
      if (s.bf) b.buf = s.bf;
      if (s.o) b.out = s.o;
      G.build[s.y * W + s.x] = b;
    }
    return true;
  } catch (e) { console.warn(e); return false; }
}

/* ---------------- 主迴圈 ---------------- */
let last = performance.now(), saveTimer = 0, questTimer = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;

  if (G.running) {
    const steps = G.speed;
    for (let i = 0; i < steps; i++) simulate(dt);
    G.time += dt * G.speed;
    Input.handTimer -= dt;

    // 鍵盤平移
    const sp = 520 * dt / G.cam.zoom;
    if (Input.keys['w'] || Input.keys['arrowup']) G.cam.y -= sp;
    if (Input.keys['s'] || Input.keys['arrowdown']) G.cam.y += sp;
    if (Input.keys['a'] || Input.keys['arrowleft']) G.cam.x -= sp;
    if (Input.keys['d'] || Input.keys['arrowright']) G.cam.x += sp;
    clampCam();

    // 浮動文字
    for (let i = FX.length - 1; i >= 0; i--) {
      FX[i].t -= dt; FX[i].y -= 24 * dt;
      if (FX[i].t <= 0) FX.splice(i, 1);
    }

    // 任務
    questTimer -= dt;
    if (questTimer <= 0) {
      questTimer = 0.5;
      let changed = false;
      for (const q of QUESTS) {
        if (!G.questDone.has(q.id) && q.check(G)) {
          G.questDone.add(q.id); changed = true;
          toast('目標達成：' + q.text);
          G.gold += 120;
          Sound.tech();
        }
      }
      if (changed) UI.renderQuests();
      const sig = BUILD_ORDER.map(t => canAfford(t) ? 1 : 0).join('') + G.techs.size + G.dir + (G.tool || '');
      if (sig !== UI._barSig) { UI._barSig = sig; UI.updateBuildBar(); }
    }

    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = 10; save(); }
  }

  R.draw();
  UI.updateTop();
}

/* ---------------- 啟動 ---------------- */
R.init();
if (!load()) {
  genWorld((Math.random() * 0xffffff) | 0);
  G.cam.x = W * TS / 2; G.cam.y = H * TS / 2;
} else {
  document.getElementById('intro').classList.add('hidden');
  G.running = true;
}
Input.init();
UI.init();
requestAnimationFrame(frame);
window.addEventListener('beforeunload', save);
