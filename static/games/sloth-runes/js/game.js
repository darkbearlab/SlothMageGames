/* ===========================================================
   Sloth Runes —《樹懶法師：符文塔防》
   火/冰/雷符文可疊加融合的網頁塔防
   =========================================================== */
'use strict';

const GW = 24, GH = 14, TS = 46;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

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
let rnd = mulberry((Math.random() * 1e9) | 0);

/* ---------------- 符文 ---------------- */
const RUNES = {
  fire: { id: 'fire', name: '火', icon: '🔥', color: '#ff7a3c', cls: 'f', cost: 70 },
  ice: { id: 'ice', name: '冰', icon: '❄', color: '#5fd0ff', cls: 'i', cost: 75 },
  bolt: { id: 'bolt', name: '雷', icon: '⚡', color: '#ffd84a', cls: 'b', cost: 85 }
};
const RUNE_ORDER = ['fire', 'ice', 'bolt'];

/* 組合定義：key 為排序後的元素字串 */
const COMBOS = {
  'fire': { name: '烈焰塔', color: '#ff7a3c', icon: '🔥', desc: '灼燒：命中後持續傷害' },
  'ice': { name: '寒霜塔', color: '#5fd0ff', icon: '❄', desc: '減速 40%' },
  'bolt': { name: '雷擊塔', color: '#ffd84a', icon: '⚡', desc: '連鎖 2 個目標' },
  'fire,ice': { name: '蒸汽塔', color: '#ffb0d0', icon: '☁', desc: '範圍爆擊 + 灼燒 + 減速' },
  'bolt,fire': { name: '熔雷塔', color: '#ff8a3c', icon: '🌋', desc: '爆炸 + 連鎖 + 灼燒' },
  'bolt,ice': { name: '霜雷塔', color: '#9ad8ff', icon: '🌨', desc: '凍結機率 + 連鎖 + 減速' },
  'bolt,fire,ice': { name: '混沌符文塔', color: '#d08cff', icon: '✦', desc: '全效果，傷害 +45%' }
};
function comboKey(elems) { return [...elems].sort().join(','); }
function comboOf(t) { return COMBOS[comboKey(t.elems)] || COMBOS.fire; }

/* ---------------- 敵人 ---------------- */
const ENEMY_TYPES = {
  slime: { name: '史萊姆', hp: 34, spd: 1.5, r: 13, color: '#7fc98a', reward: 8, from: 1 },
  runner: { name: '疾行鼠', hp: 26, spd: 2.9, r: 11, color: '#e0c060', reward: 9, from: 3 },
  armor: { name: '鐵殼獸', hp: 90, spd: 1.1, r: 16, color: '#8f9aa8', reward: 16, armor: 0.4, from: 5 },
  flyer: { name: '飛蝠', hp: 44, spd: 2.0, r: 12, color: '#b08ad0', reward: 14, flying: true, from: 7 },
  healer: { name: '祭祀者', hp: 70, spd: 1.3, r: 14, color: '#7fe0c0', reward: 18, heal: true, from: 10 },
  splitter: { name: '分裂泥', hp: 110, spd: 1.2, r: 17, color: '#c08ae0', reward: 20, split: true, from: 12 },
  brute: { name: '重甲巨獸', hp: 260, spd: 0.9, r: 19, color: '#c06a4a', reward: 34, armor: 0.25, from: 15 },
  boss: { name: '深淵魔將', hp: 1400, spd: 0.75, r: 26, color: '#ff5a7a', reward: 240, armor: 0.3, boss: true, from: 5 }
};

/* ---------------- 遊戲狀態 ---------------- */
const G = {
  grid: new Uint8Array(GW * GH),    // 0 空地 1 路徑 2 裝飾障礙
  path: [],
  towers: [],
  enemies: [],
  shots: [],
  fx: [],
  life: 20, gold: 260, wave: 0,
  spawnQueue: [], spawnTimer: 0,
  inWave: false, running: false, over: false,
  speed: 1, time: 0,
  sel: null, hover: null, buildRune: null,
  endless: false,
  stats: { killed: 0, leaked: 0, dmg: 0 },

  idx(x, y) { return y * GW + x; },
  inB(x, y) { return x >= 0 && y >= 0 && x < GW && y < GH; },
  towerAt(x, y) { return this.towers.find(t => t.x === x && t.y === y); }
};

/* ---------------- 地圖與路徑 ---------------- */
function genMap() {
  G.grid.fill(0);
  const pts = [];
  let x = 0, y = Math.floor(GH / 2) + (rnd() < .5 ? -1 : 1);
  pts.push({ x, y });
  const cols = [];
  let cx = 2 + Math.floor(rnd() * 2);
  while (cx < GW - 3) { cols.push(cx); cx += 3 + Math.floor(rnd() * 2); }
  cols.push(GW - 2);
  let cur = y;
  // 蛇行：上下交替，讓路徑夠長、佈滿整張地圖
  let top = y > GH / 2;
  for (const c of cols) {
    top = !top;
    const ny = top
      ? 1 + Math.floor(rnd() * 3)
      : GH - 4 + Math.floor(rnd() * 3);
    // 垂直
    const step = ny > cur ? 1 : -1;
    for (let yy = cur; yy !== ny; yy += step) pts.push({ x: pts[pts.length - 1].x, y: yy + step });
    cur = ny;
    // 水平
    const fromX = pts[pts.length - 1].x;
    for (let xx = fromX + 1; xx <= c; xx++) pts.push({ x: xx, y: cur });
  }
  // 去重並寫入格子
  G.path = [];
  const seen = new Set();
  for (const p of pts) {
    if (!G.inB(p.x, p.y)) continue;
    const k = p.y * GW + p.x;
    G.path.push(p);
    if (!seen.has(k)) { seen.add(k); G.grid[k] = 1; }
  }
  // 裝飾障礙
  for (let i = 0; i < 26; i++) {
    const px = Math.floor(rnd() * GW), py = Math.floor(rnd() * GH);
    if (G.grid[py * GW + px] === 0) {
      // 不要擋住路徑旁太多
      let near = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
        if (G.inB(px + dx, py + dy) && G.grid[(py + dy) * GW + px + dx] === 1) near++;
      if (near === 0) G.grid[py * GW + px] = 2;
    }
  }
}
function pathPos(d) {
  // d 以格為單位沿路徑前進
  const i = Math.floor(d);
  if (i >= G.path.length - 1) {
    const p = G.path[G.path.length - 1];
    return { x: (p.x + 0.5) * TS, y: (p.y + 0.5) * TS, end: true };
  }
  const a = G.path[Math.max(0, i)], b = G.path[i + 1];
  const t = d - i;
  return { x: (lerp(a.x, b.x, t) + 0.5) * TS, y: (lerp(a.y, b.y, t) + 0.5) * TS, end: false };
}

/* ---------------- 塔 ---------------- */
function towerStats(t) {
  const n = t.elems.size;
  const lv = t.lvl;
  const chaos = n === 3 ? 1.45 : 1;
  return {
    dmg: (10 + lv * 4) * Math.pow(1.15, lv - 1) * (1 + (n - 1) * 0.55) * chaos,
    range: (2.5 + n * 0.35 + lv * 0.16) * TS,
    rate: 1 / (0.85 - Math.min(0.42, lv * 0.045)) * (n === 3 ? 1.15 : 1),
    splash: (t.elems.has('fire') && t.elems.has('ice')) || (t.elems.has('fire') && t.elems.has('bolt')) ? 44 + lv * 3 : 0,
    chain: t.elems.has('bolt') ? 2 + Math.floor(lv / 3) : 0,
    slow: t.elems.has('ice') ? 0.4 + Math.min(0.2, lv * 0.02) : 0,
    burn: t.elems.has('fire') ? (4 + lv * 2.4) : 0,
    freeze: (t.elems.has('bolt') && t.elems.has('ice')) ? 0.14 : 0
  };
}
function towerCost(t) { return 50 * t.lvl * t.lvl + 40 * (t.elems.size - 1); }
function addRuneCost(t) { return 90 + 70 * (t.elems.size - 1) + 30 * (t.lvl - 1); }
function sellValue(t) {
  let v = RUNES[[...t.elems][0]].cost;
  for (let i = 1; i < t.elems.size; i++) v += 90 + 70 * (i - 1);
  for (let l = 2; l <= t.lvl; l++) v += 50 * l * l;
  return Math.floor(v * 0.65);
}
function upgradeCost(t) { return Math.floor(60 * Math.pow(1.55, t.lvl - 1) * (1 + (t.elems.size - 1) * 0.35)); }

function buildTower(x, y, rune) {
  const cost = RUNES[rune].cost;
  if (G.gold < cost) { toast('金幣不足'); return false; }
  if (G.grid[G.idx(x, y)] !== 0 || G.towerAt(x, y)) return false;
  G.gold -= cost;
  const t = {
    x, y, cx: (x + 0.5) * TS, cy: (y + 0.5) * TS,
    elems: new Set([rune]), lvl: 1, cd: 0, angle: -Math.PI / 2, kills: 0, dealt: 0
  };
  G.towers.push(t);
  Sound.build();
  return true;
}

/* ---------------- 敵人生成 ---------------- */
function waveComp(n) {
  const list = [];
  const hpScale = Math.pow(1.185, n - 1) * (1 + Math.max(0, n - 30) * 0.22);
  const pool = Object.keys(ENEMY_TYPES).filter(k => k !== 'boss' && ENEMY_TYPES[k].from <= n);
  const count = Math.round(5 + n * 1.75);
  for (let i = 0; i < count; i++) {
    const k = pool[Math.floor(rnd() * pool.length)];
    list.push({ type: k, hpScale });
  }
  if (n % 5 === 0) {
    const bosses = 1 + Math.floor(n / 15);
    for (let i = 0; i < bosses; i++) list.push({ type: 'boss', hpScale: hpScale * 0.9, boss: true });
  }
  // 洗牌，王放最後
  const normal = list.filter(e => !e.boss);
  for (let i = normal.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [normal[i], normal[j]] = [normal[j], normal[i]];
  }
  return normal.concat(list.filter(e => e.boss));
}

function startWave() {
  if (G.inWave || G.over) return;
  G.wave++;
  if (G.wave > 30) G.endless = true;
  const bonus = Math.round(18 + G.wave * 4);
  G.gold += bonus;
  G.spawnQueue = waveComp(G.wave);
  G.spawnTimer = 0;
  G.inWave = true;
  toast(`第 ${G.wave} 波 · 提前召喚獎勵 +${bonus} 金幣`);
  Sound.wave();
  UI.update();
}

function spawnEnemy(spec) {
  const d = ENEMY_TYPES[spec.type];
  const e = {
    type: spec.type, def: d,
    maxHp: d.hp * spec.hpScale, hp: d.hp * spec.hpScale,
    spd: d.spd, r: d.r, d: 0, x: 0, y: 0,
    slow: 0, slowT: 0, burn: 0, burnT: 0, freezeT: 0,
    reward: Math.round(d.reward * (1 + G.wave * 0.05)),
    flying: !!d.flying, armor: d.armor || 0, boss: !!d.boss,
    wob: rnd() * TAU
  };
  if (e.flying) {
    const s = G.path[0], t = G.path[G.path.length - 1];
    e.fx0 = (s.x + 0.5) * TS; e.fy0 = (s.y + 0.5) * TS;
    e.fx1 = (t.x + 0.5) * TS; e.fy1 = (t.y + 0.5) * TS;
    e.flyLen = Math.hypot(e.fx1 - e.fx0, e.fy1 - e.fy0) / TS;
  }
  const p = e.flying ? { x: e.fx0, y: e.fy0 } : pathPos(0);
  e.x = p.x; e.y = p.y;
  G.enemies.push(e);
}

/* ---------------- 傷害 ---------------- */
function damage(e, dmg, opts) {
  opts = opts || {};
  if (e.dead) return;
  let d = dmg * (1 - (e.armor || 0));
  e.hp -= d;
  G.stats.dmg += d;
  if (opts.slow) { e.slow = Math.max(e.slow, opts.slow); e.slowT = 1.6; }
  if (opts.burn) { e.burn = Math.max(e.burn, opts.burn); e.burnT = 3; }
  if (opts.freeze && rnd() < opts.freeze) e.freezeT = Math.max(e.freezeT, 0.9);
  if (e.hp <= 0) killEnemy(e, opts.tower);
}

function killEnemy(e, tower) {
  if (e.dead) return;
  e.dead = true;
  G.gold += e.reward;
  G.stats.killed++;
  if (tower) tower.kills++;
  G.fx.push({ kind: 'pop', x: e.x, y: e.y, t: 0.4, max: 0.4, color: e.def.color, r: e.r });
  G.fx.push({ kind: 'text', x: e.x, y: e.y - 12, t: 0.9, max: 0.9, text: '+' + e.reward, color: '#ffd45e' });
  if (e.def.split && !e.isSplit) {
    for (let i = 0; i < 2; i++) {
      const c = {
        type: 'slime', def: ENEMY_TYPES.slime, maxHp: e.maxHp * 0.28, hp: e.maxHp * 0.28,
        spd: 1.9, r: 11, d: e.d - i * 0.2, x: e.x, y: e.y, slow: 0, slowT: 0, burn: 0, burnT: 0, freezeT: 0,
        reward: Math.round(e.reward * 0.3), armor: 0, isSplit: true, wob: rnd() * TAU
      };
      G.enemies.push(c);
    }
  }
  Sound.kill();
}

/* ---------------- 模擬 ---------------- */
function update(dt) {
  G.time += dt;

  // 生成
  if (G.inWave && G.spawnQueue.length) {
    G.spawnTimer -= dt;
    if (G.spawnTimer <= 0) {
      G.spawnTimer = Math.max(0.28, 0.75 - G.wave * 0.012);
      spawnEnemy(G.spawnQueue.shift());
    }
  }

  // 敵人
  for (const e of G.enemies) {
    if (e.dead) continue;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 0; }
    if (e.freezeT > 0) e.freezeT -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt;
      e.hp -= e.burn * dt;
      if (G.time % 0.2 < dt) G.fx.push({ kind: 'spark', x: e.x + (rnd() - .5) * 12, y: e.y - 6, t: 0.3, max: 0.3, color: '#ff9a3c' });
      if (e.hp <= 0) { killEnemy(e); continue; }
    }
    if (e.def.heal) {
      e.healT = (e.healT || 0) - dt;
      if (e.healT <= 0) {
        e.healT = 1.2;
        for (const o of G.enemies) {
          if (o !== e && !o.dead && dist2(e.x, e.y, o.x, o.y) < 110 * 110) {
            o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.045);
          }
        }
        G.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.5, max: 0.5, color: '#7fe0c0', r: 110 });
      }
    }
    const sp = e.spd * (1 - e.slow) * (e.freezeT > 0 ? 0 : 1);
    e.d += sp * dt;
    if (e.flying) {
      const t = clamp(e.d / e.flyLen, 0, 1);
      e.x = lerp(e.fx0, e.fx1, t) + Math.sin(G.time * 3 + e.wob) * 8;
      e.y = lerp(e.fy0, e.fy1, t) + Math.cos(G.time * 2.4 + e.wob) * 8;
      if (t >= 1) leak(e);
    } else {
      const p = pathPos(e.d);
      e.x = p.x; e.y = p.y;
      if (p.end) leak(e);
    }
  }

  // 塔
  for (const t of G.towers) {
    const s = towerStats(t);
    t.cd -= dt;
    if (t.cd > 0) continue;
    // 選最前面的敵人
    let best = null, bd = -1;
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (dist2(t.cx, t.cy, e.x, e.y) > s.range * s.range) continue;
      const prog = e.flying ? e.d / e.flyLen * G.path.length : e.d;
      if (prog > bd) { bd = prog; best = e; }
    }
    if (!best) continue;
    t.cd = 1 / s.rate;
    t.angle = Math.atan2(best.y - t.cy, best.x - t.cx);
    fire(t, s, best);
  }

  // 特效
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.t -= dt;
    if (f.kind === 'text') f.y -= 26 * dt;
    if (f.t <= 0) G.fx.splice(i, 1);
  }
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].dead) G.enemies.splice(i, 1);

  // 波次結束
  if (G.inWave && !G.spawnQueue.length && !G.enemies.length) {
    G.inWave = false;
    const bonus = 34 + G.wave * 9;
    G.gold += bonus;
    toast(`第 ${G.wave} 波清空！獎勵 +${bonus} 金幣`);
    if (G.wave === 30) victory();
    UI.update();
  }
}

function leak(e) {
  e.dead = true;
  G.life -= e.boss ? 5 : 1;
  G.stats.leaked++;
  G.fx.push({ kind: 'ring', x: e.x, y: e.y, t: 0.5, max: 0.5, color: '#ff5a7a', r: 60 });
  Sound.leak();
  if (G.life <= 0 && !G.over) gameOver();
  UI.update();
}

function fire(t, s, target) {
  const col = comboOf(t).color;
  G.shots.push({ x1: t.cx, y1: t.cy, x2: target.x, y2: target.y, t: 0.12, max: 0.12, color: col, w: 2 + t.lvl * 0.35 });
  const opts = { slow: s.slow, burn: s.burn, freeze: s.freeze, tower: t };
  damage(target, s.dmg, opts);
  t.dealt += s.dmg;
  if (s.splash > 0) {
    G.fx.push({ kind: 'ring', x: target.x, y: target.y, t: 0.3, max: 0.3, color: col, r: s.splash });
    for (const e of G.enemies) {
      if (e === target || e.dead) continue;
      if (dist2(target.x, target.y, e.x, e.y) < s.splash * s.splash) damage(e, s.dmg * 0.55, opts);
    }
  }
  if (s.chain > 0) {
    let cur = target;
    const hit = new Set([target]);
    for (let i = 0; i < s.chain; i++) {
      let nb = null, nd = 150 * 150;
      for (const e of G.enemies) {
        if (e.dead || hit.has(e)) continue;
        const d = dist2(cur.x, cur.y, e.x, e.y);
        if (d < nd) { nd = d; nb = e; }
      }
      if (!nb) break;
      hit.add(nb);
      G.shots.push({ x1: cur.x, y1: cur.y, x2: nb.x, y2: nb.y, t: 0.12, max: 0.12, color: '#ffe066', w: 2, bolt: true });
      damage(nb, s.dmg * 0.6, opts);
      cur = nb;
    }
  }
  Sound.shoot(t.elems.size);
}

function gameOver() {
  G.over = true; G.running = false;
  UI.modal(`<h1 style="color:#ff5a7a">午睡被打斷了</h1>
    <div class="sub">G A M E &nbsp; O V E R</div>
    <p>魔物衝進了法師的房間。他醒了，而且非常不高興。</p>
    <div style="font-size:13px;line-height:2;color:#c3badb">
      撐過波次：<b>${G.wave - 1}</b><br>
      擊殺魔物：<b>${G.stats.killed}</b><br>
      總傷害：<b>${Math.round(G.stats.dmg).toLocaleString()}</b><br>
      建造塔數：<b>${G.towers.length}</b>
    </div>
    <button class="bigbtn" id="btnStart">再挑戰一次</button>`, () => location.reload());
  Sound.over();
}
function victory() {
  G.running = false;
  UI.modal(`<h1>防禦成功</h1>
    <div class="sub">V I C T O R Y</div>
    <p>30 波全數擋下，法師睡得很好，完全不知道發生過什麼事。</p>
    <div style="font-size:13px;line-height:2;color:#c3badb">
      擊殺魔物：<b>${G.stats.killed}</b><br>
      漏掉：<b>${G.stats.leaked}</b><br>
      剩餘生命：<b>${G.life}</b><br>
      總傷害：<b>${Math.round(G.stats.dmg).toLocaleString()}</b>
    </div>
    <p class="dim">按下按鈕可以繼續進入無盡模式，看看你的符文組合能撐到第幾波。</p>
    <button class="bigbtn" id="btnStart">進入無盡模式</button>`, () => { G.running = true; });
  Sound.win();
}

/* ---------------- 繪圖 ---------------- */
const R = {
  cv: null, ctx: null, w: 0, h: 0, dpr: 1, ox: 0, oy: 0, scale: 1,
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
    const availW = this.w - 24, availH = this.h - 140;
    this.scale = Math.min(availW / (GW * TS), availH / (GH * TS), 1.25);
    this.ox = (this.w - GW * TS * this.scale) / 2;
    this.oy = 58 + (availH - GH * TS * this.scale) / 2;
  },
  s2g(sx, sy) {
    return {
      x: Math.floor((sx - this.ox) / this.scale / TS),
      y: Math.floor((sy - this.oy) / this.scale / TS)
    };
  },
  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);
    // 外框
    ctx.strokeStyle = 'rgba(185,140,255,.18)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-2, -2, GW * TS + 4, GH * TS + 4);
    ctx.beginPath();
    ctx.rect(0, 0, GW * TS, GH * TS);
    ctx.clip();

    // 地面
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      const t = G.grid[y * GW + x], px = x * TS, py = y * TS;
      if (t === 1) {
        ctx.fillStyle = '#6a5f45';
        ctx.fillRect(px, py, TS, TS);
        ctx.fillStyle = '#82755a';
        ctx.fillRect(px + 2, py + 2, TS - 4, TS - 4);
        // 石板紋
        ctx.fillStyle = 'rgba(0,0,0,.16)';
        const sv = (x * 7 + y * 13) % 4;
        ctx.fillRect(px + 4, py + 10 + sv * 4, TS - 8, 2);
        ctx.fillRect(px + 10 + sv * 5, py + 4, 2, TS - 8);
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(px + 5, py + 5, TS - 10, 2);
        // 邊緣：與非路徑相鄰處畫暗邊
        ctx.fillStyle = 'rgba(20,14,10,.45)';
        if (G.grid[y * GW + x - 1] !== 1 || x === 0) ctx.fillRect(px, py, 3, TS);
        if (x === GW - 1 || G.grid[y * GW + x + 1] !== 1) ctx.fillRect(px + TS - 3, py, 3, TS);
        if (y === 0 || G.grid[(y - 1) * GW + x] !== 1) ctx.fillRect(px, py, TS, 3);
        if (y === GH - 1 || G.grid[(y + 1) * GW + x] !== 1) ctx.fillRect(px, py + TS - 3, TS, 3);
      } else {
        ctx.fillStyle = ((x + y) & 1) ? '#161227' : '#191430';
        ctx.fillRect(px, py, TS, TS);
        if (t === 2) {
          ctx.fillStyle = '#2a2440';
          ctx.beginPath();
          ctx.moveTo(px + 8, py + TS - 7); ctx.lineTo(px + TS / 2, py + 8);
          ctx.lineTo(px + TS - 8, py + TS - 7); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#3a3358';
          ctx.beginPath();
          ctx.moveTo(px + 13, py + TS - 7); ctx.lineTo(px + TS / 2 - 1, py + 13);
          ctx.lineTo(px + TS / 2 + 4, py + TS - 7); ctx.closePath(); ctx.fill();
        }
      }
      ctx.strokeStyle = 'rgba(255,255,255,.028)';
      ctx.strokeRect(px + .5, py + .5, TS - 1, TS - 1);
    }

    // 起點與終點
    const s = G.path[0], en = G.path[G.path.length - 1];
    ctx.fillStyle = 'rgba(255,90,122,.25)';
    ctx.fillRect(s.x * TS, s.y * TS, TS, TS);
    ctx.font = 'bold 11px "Noto Sans TC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8aa0';
    ctx.fillText('入口', (s.x + .5) * TS, (s.y + .5) * TS + 4);
    // 午睡房
    const ex = (en.x + .5) * TS, ey = (en.y + .5) * TS;
    const g = ctx.createRadialGradient(ex, ey, 4, ex, ey, TS * 1.3);
    g.addColorStop(0, 'rgba(185,140,255,.45)'); g.addColorStop(1, 'rgba(185,140,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ex - TS * 1.3, ey - TS * 1.3, TS * 2.6, TS * 2.6);
    ctx.fillStyle = '#2a2140';
    ctx.fillRect(ex - 19, ey - 14, 38, 28);
    ctx.fillStyle = '#8a7660';
    ctx.beginPath(); ctx.ellipse(ex, ey - 2 + Math.sin(G.time * 1.5) * 1.5, 13, 10, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(ex - 6, ey - 5, 4, 1.6); ctx.fillRect(ex + 3, ey - 5, 4, 1.6);
    ctx.fillStyle = '#c9a0ff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('z z Z', ex + 2, ey - 18 + Math.sin(G.time * 2) * 2);
    ctx.textAlign = 'left';

    // 建造預覽 / 選取
    if (G.hover) {
      const { x, y } = G.hover;
      if (G.inB(x, y)) {
        const occupied = G.grid[G.idx(x, y)] !== 0 || G.towerAt(x, y);
        if (G.buildRune && !occupied) {
          const c = RUNES[G.buildRune];
          const st = { elems: new Set([G.buildRune]), lvl: 1 };
          ctx.globalAlpha = .18;
          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc((x + .5) * TS, (y + .5) * TS, towerStats(st).range, 0, TAU); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = c.color; ctx.lineWidth = 2;
          ctx.strokeRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4);
        } else if (!G.buildRune && !occupied) {
          ctx.strokeStyle = 'rgba(255,255,255,.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4);
        }
      }
    }
    if (G.sel) {
      const st = towerStats(G.sel);
      ctx.strokeStyle = comboOf(G.sel).color; ctx.lineWidth = 1.5;
      ctx.globalAlpha = .5;
      ctx.beginPath(); ctx.arc(G.sel.cx, G.sel.cy, st.range, 0, TAU); ctx.stroke();
      ctx.globalAlpha = .1;
      ctx.fillStyle = comboOf(G.sel).color;
      ctx.beginPath(); ctx.arc(G.sel.cx, G.sel.cy, st.range, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // 塔
    for (const t of G.towers) this.drawTower(ctx, t);

    // 敵人
    for (const e of G.enemies) this.drawEnemy(ctx, e);

    // 射線
    for (const sh of G.shots) {
      const k = sh.t / sh.max;
      ctx.strokeStyle = sh.color;
      ctx.globalAlpha = k;
      ctx.lineWidth = sh.w;
      ctx.beginPath();
      if (sh.bolt) {
        ctx.moveTo(sh.x1, sh.y1);
        for (let i = 1; i <= 4; i++) {
          const tt = i / 5;
          ctx.lineTo(lerp(sh.x1, sh.x2, tt) + (Math.sin(i * 9.3 + sh.x1) * 9),
            lerp(sh.y1, sh.y2, tt) + (Math.cos(i * 7.1 + sh.y1) * 9));
        }
        ctx.lineTo(sh.x2, sh.y2);
      } else {
        ctx.moveTo(sh.x1, sh.y1); ctx.lineTo(sh.x2, sh.y2);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // 特效
    ctx.textAlign = 'center';
    for (const f of G.fx) {
      const k = f.t / f.max;
      if (f.kind === 'ring') {
        ctx.strokeStyle = f.color; ctx.globalAlpha = k * .8; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.15 - k * .4), 0, TAU); ctx.stroke();
      } else if (f.kind === 'pop') {
        ctx.fillStyle = f.color; ctx.globalAlpha = k * .8;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + (1 - k) * 1.1), 0, TAU); ctx.fill();
      } else if (f.kind === 'spark') {
        ctx.fillStyle = f.color; ctx.globalAlpha = k;
        ctx.fillRect(f.x - 2, f.y - 2, 4, 4);
      } else if (f.kind === 'text') {
        ctx.globalAlpha = k; ctx.fillStyle = f.color;
        ctx.font = 'bold 13px "Noto Sans TC",sans-serif';
        ctx.fillText(f.text, f.x, f.y);
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.restore();
  },

  drawTower(ctx, t) {
    const c = comboOf(t);
    const cx = t.cx, cy = t.cy;
    // 底座
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 12, 17, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2c2545';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6 - Math.PI / 2;
      const px = cx + Math.cos(a) * 16, py = cy + Math.sin(a) * 16 * .8 + 4;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.color; ctx.globalAlpha = .55; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1;
    // 柱
    ctx.fillStyle = '#3c3358';
    ctx.fillRect(cx - 7, cy - 12, 14, 18);
    // 符文寶石
    const pulse = .82 + Math.sin(G.time * 3 + t.x) * .18;
    ctx.fillStyle = c.color;
    ctx.globalAlpha = .3 * pulse;
    ctx.beginPath(); ctx.arc(cx, cy - 14, 15 * pulse, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 24); ctx.lineTo(cx + 8, cy - 14);
    ctx.lineTo(cx, cy - 4); ctx.lineTo(cx - 8, cy - 14);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 21); ctx.lineTo(cx + 4, cy - 15);
    ctx.lineTo(cx, cy - 9); ctx.lineTo(cx - 4, cy - 15);
    ctx.closePath(); ctx.fill();
    // 元素小點
    const el = [...t.elems];
    el.forEach((e, i) => {
      const a = -Math.PI / 2 + i * TAU / Math.max(1, el.length) + G.time * .8;
      ctx.fillStyle = RUNES[e].color;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * 19, cy - 12 + Math.sin(a) * 9, 3.2, 0, TAU); ctx.fill();
    });
    // 等級
    if (t.lvl > 1) {
      ctx.fillStyle = '#ffd45e';
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Lv' + t.lvl, cx, cy + 18);
      ctx.textAlign = 'left';
    }
  },

  drawEnemy(ctx, e) {
    const d = e.def;
    const bob = Math.sin(G.time * 7 + e.wob) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * .75, e.r * .8, e.r * .3, 0, 0, TAU); ctx.fill();
    let col = d.color;
    if (e.freezeT > 0) col = '#9adfff';
    else if (e.slow > 0) col = '#8fc0e0';
    if (e.flying) {
      ctx.fillStyle = col;
      const fl = Math.sin(G.time * 18 + e.wob) * 7;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - e.r * 1.7, e.y - fl); ctx.lineTo(e.x - e.r * .6, e.y + 3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + e.r * 1.7, e.y - fl); ctx.lineTo(e.x + e.r * .6, e.y + 3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .68, 0, TAU); ctx.fill();
    } else if (e.boss) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob * .4, e.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath(); ctx.arc(e.x, e.y + e.r * .3, e.r * .55, 0, Math.PI); ctx.fill();
      ctx.fillStyle = '#301020';
      ctx.beginPath();
      ctx.moveTo(e.x - e.r * .8, e.y - e.r * .55); ctx.lineTo(e.x - e.r * 1.15, e.y - e.r * 1.4);
      ctx.lineTo(e.x - e.r * .25, e.y - e.r * .85); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(e.x + e.r * .8, e.y - e.r * .55); ctx.lineTo(e.x + e.r * 1.15, e.y - e.r * 1.4);
      ctx.lineTo(e.x + e.r * .25, e.y - e.r * .85); ctx.fill();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(e.x - e.r * .32, e.y - e.r * .12, e.r * .14, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + e.r * .32, e.y - e.r * .12, e.r * .14, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + bob * .3, e.r, e.r * (d.armor ? .95 : 1.05), 0, 0, TAU); ctx.fill();
      if (d.armor) {
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * .72, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      ctx.fillStyle = '#221a2a';
      ctx.beginPath(); ctx.arc(e.x - e.r * .3, e.y - e.r * .12, 2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(e.x + e.r * .3, e.y - e.r * .12, 2, 0, TAU); ctx.fill();
      if (d.heal) {
        ctx.strokeStyle = 'rgba(127,224,192,.8)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 5 + Math.sin(G.time * 4) * 2, 0, TAU); ctx.stroke();
      }
    }
    if (e.burnT > 0) {
      ctx.fillStyle = 'rgba(255,140,60,.5)';
      ctx.beginPath(); ctx.arc(e.x, e.y - e.r * .6 + Math.sin(G.time * 12) * 2, 4, 0, TAU); ctx.fill();
    }
    // 血條
    if (e.hp < e.maxHp) {
      const w = Math.max(20, e.r * 2.1), h = e.boss ? 5 : 3;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(e.x - w / 2 - 1, e.y - e.r - 10, w + 2, h + 2);
      ctx.fillStyle = e.boss ? '#ff5a7a' : '#7fe07f';
      ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * clamp(e.hp / e.maxHp, 0, 1), h);
    }
  }
};

/* ---------------- 音效 ---------------- */
const Sound = {
  ctx: null, last: {},
  init() { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } },
  t(f, d, ty, v, sl) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = ty || 'square'; o.frequency.setValueAtTime(f, t0);
    if (sl) o.frequency.exponentialRampToValueAtTime(Math.max(30, sl), t0 + d);
    g.gain.setValueAtTime(v || .04, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + d + .01);
  },
  shoot(n) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.last.s && now - this.last.s < .05) return;
    this.last.s = now;
    this.t(500 + n * 140, .07, 'triangle', .028, 300);
  },
  kill() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.last.k && now - this.last.k < .05) return;
    this.last.k = now;
    this.t(180, .1, 'square', .035, 90);
  },
  build() { this.t(320, .1, 'square', .05, 620); },
  wave() { [330, 440, 550].forEach((f, i) => setTimeout(() => this.t(f, .22, 'triangle', .05), i * 100)); },
  leak() { this.t(160, .3, 'sawtooth', .07, 60); },
  over() { [400, 300, 220, 150].forEach((f, i) => setTimeout(() => this.t(f, .4, 'sawtooth', .07), i * 180)); },
  win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.t(f, .35, 'triangle', .06), i * 130)); }
};

/* ---------------- UI ---------------- */
const UI = {
  init() {
    document.getElementById('btnStart').onclick = () => this.start();
    document.getElementById('btnWave').onclick = () => startWave();
    document.getElementById('btnHelp').onclick = () => document.getElementById('modal').classList.remove('hidden');
    document.getElementById('btnSpeed').onclick = () => {
      G.speed = G.speed === 1 ? 2 : (G.speed === 2 ? 3 : 1);
      document.getElementById('btnSpeed').textContent = G.speed + 'x';
    };
    this.buildBar();
    this.update();
  },
  start() {
    document.getElementById('modal').classList.add('hidden');
    Sound.init();
    G.running = true;
  },
  modal(html, onBtn) {
    const m = document.getElementById('modal');
    document.getElementById('mbox').innerHTML = html;
    m.classList.remove('hidden');
    const b = document.getElementById('btnStart');
    if (b) b.onclick = () => { m.classList.add('hidden'); onBtn && onBtn(); };
  },
  buildBar() {
    const el = document.getElementById('bottom');
    el.innerHTML = RUNE_ORDER.map((r, i) => {
      const d = RUNES[r];
      return `<div class="rune ${d.cls} ${G.buildRune === r ? 'sel' : ''} ${G.gold < d.cost ? 'poor' : ''}" data-r="${r}">
        <div class="kk">${i + 1}</div><div class="ic">${d.icon}</div>
        <div class="nm">${d.name}符文塔</div><div class="ct">💰 ${d.cost}</div></div>`;
    }).join('') + `<div class="rune" id="hintCard" style="width:auto;padding:8px 14px;color:var(--dim);cursor:default">
        <div style="font-size:11px;line-height:1.6">在已有的塔上再加不同符文<br>可以融合出更強的塔</div></div>`;
    el.querySelectorAll('.rune[data-r]').forEach(c => c.onclick = () => this.selectRune(c.dataset.r));
  },
  selectRune(r) {
    G.buildRune = G.buildRune === r ? null : r;
    G.sel = null;
    this.hideSide();
    this.buildBar();
  },
  update() {
    document.getElementById('life').textContent = Math.max(0, G.life);
    document.getElementById('gold').textContent = Math.floor(G.gold);
    document.getElementById('wave').textContent = G.wave + (G.endless ? ' (無盡)' : ' / 30');
    document.getElementById('enemyCount').textContent =
      G.inWave ? `場上魔物 ${G.enemies.length}` : '';
    const bw = document.getElementById('btnWave');
    bw.textContent = G.inWave ? '⏩ 提前召喚' : '▶ 下一波';
    bw.classList.toggle('ready', !G.inWave);
    // 下一波預告
    const next = G.wave + 1;
    const types = Object.keys(ENEMY_TYPES).filter(k => k !== 'boss' && ENEMY_TYPES[k].from <= next);
    document.getElementById('waveinfo').innerHTML =
      `<b>下一波：第 ${next} 波</b><br>
       數量約 ${Math.round(5 + next * 1.75)} 隻<br>
       ${next % 5 === 0 ? '<span style="color:#ff5a7a">⚠ 王級：深淵魔將</span><br>' : ''}
       <span class="dim">出現種類：</span><br>${types.map(t => ENEMY_TYPES[t].name).join('、')}
       <br><br><span class="dim">已擊殺 ${G.stats.killed} · 漏掉 ${G.stats.leaked}</span>`;
    const sig = RUNE_ORDER.map(r => G.gold >= RUNES[r].cost ? 1 : 0).join('') + (G.buildRune || '');
    if (sig !== this._barSig) { this._barSig = sig; this.buildBar(); }
  },
  showSide(t) {
    const el = document.getElementById('side');
    const c = comboOf(t), s = towerStats(t);
    const up = upgradeCost(t), ar = addRuneCost(t), sv = sellValue(t);
    let html = `<h3 style="color:${c.color}">${c.icon} ${c.name} Lv.${t.lvl}</h3>
      <div class="sub">${c.desc}</div>
      <div class="srow"><span>傷害</span><b>${s.dmg.toFixed(1)}</b></div>
      <div class="srow"><span>射速</span><b>${s.rate.toFixed(2)} /秒</b></div>
      <div class="srow"><span>射程</span><b>${(s.range / TS).toFixed(1)} 格</b></div>
      ${s.slow ? `<div class="srow"><span>減速</span><b>${Math.round(s.slow * 100)}%</b></div>` : ''}
      ${s.burn ? `<div class="srow"><span>灼燒</span><b>${s.burn.toFixed(1)} /秒</b></div>` : ''}
      ${s.chain ? `<div class="srow"><span>連鎖</span><b>${s.chain} 個</b></div>` : ''}
      ${s.splash ? `<div class="srow"><span>範圍</span><b>${Math.round(s.splash)}</b></div>` : ''}
      ${s.freeze ? `<div class="srow"><span>凍結機率</span><b>${Math.round(s.freeze * 100)}%</b></div>` : ''}
      <div class="srow"><span>累計擊殺</span><b>${t.kills}</b></div>`;
    if (t.elems.size < 3) {
      html += `<div class="dim" style="font-size:11px;margin-top:10px">加入符文（融合）：💰 ${ar}</div><div class="elems">`;
      for (const r of RUNE_ORDER) {
        const on = t.elems.has(r);
        html += `<div class="eb ${RUNES[r].cls} ${on ? 'on' : ''}" data-add="${r}">${RUNES[r].icon} ${RUNES[r].name}</div>`;
      }
      html += `</div>`;
    }
    html += `<button class="act ${G.gold < up ? 'poor' : ''}" data-a="up">升級到 Lv.${t.lvl + 1} — 💰 ${up}</button>
      <button class="act sell" data-a="sell">拆除回收 — 💰 ${sv}</button>`;
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
      const r = b.dataset.add;
      if (t.elems.has(r)) return;
      const cost = addRuneCost(t);
      if (G.gold < cost) { toast('金幣不足'); return; }
      G.gold -= cost;
      t.elems.add(r);
      Sound.build();
      toast('融合成功：' + comboOf(t).name);
      this.showSide(t); this.update();
    });
    el.querySelector('[data-a=up]').onclick = () => {
      if (G.gold < up) { toast('金幣不足'); return; }
      G.gold -= up; t.lvl++;
      Sound.build();
      this.showSide(t); this.update();
    };
    el.querySelector('[data-a=sell]').onclick = () => {
      G.gold += sv;
      G.towers.splice(G.towers.indexOf(t), 1);
      G.sel = null;
      this.hideSide(); this.update();
    };
  },
  hideSide() { document.getElementById('side').classList.add('hidden'); }
};

function toast(msg, dur) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg;
  document.getElementById('toasts').appendChild(d);
  setTimeout(() => { d.style.transition = '.4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, (dur || 2.4) * 1000);
}

/* ---------------- 輸入 ---------------- */
function bindInput() {
  const cv = R.cv;
  cv.addEventListener('mousemove', e => {
    G.hover = R.s2g(e.clientX, e.clientY);
  });
  cv.addEventListener('mouseleave', () => G.hover = null);
  cv.addEventListener('click', e => {
    if (!Sound.ctx) Sound.init();
    const g = R.s2g(e.clientX, e.clientY);
    handleClick(g.x, g.y);
  });
  cv.addEventListener('touchstart', e => {
    if (!Sound.ctx) Sound.init();
    const t = e.touches[0];
    const g = R.s2g(t.clientX, t.clientY);
    G.hover = g;
    handleClick(g.x, g.y);
    e.preventDefault();
  }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k >= '1' && k <= '3') UI.selectRune(RUNE_ORDER[+k - 1]);
    if (k === 'escape') { G.buildRune = null; G.sel = null; UI.hideSide(); UI.buildBar(); }
    if (k === ' ') { e.preventDefault(); startWave(); }
    if (k === 'p') G.running = !G.running;
  });
}

function handleClick(x, y) {
  if (!G.inB(x, y)) return;
  const t = G.towerAt(x, y);
  if (t) {
    G.sel = t; G.buildRune = null;
    UI.showSide(t); UI.buildBar();
    return;
  }
  if (G.buildRune) {
    if (buildTower(x, y, G.buildRune)) UI.update();
    return;
  }
  G.sel = null; UI.hideSide();
}

/* ---------------- 主迴圈 ---------------- */
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.08) dt = 0.08;
  if (G.running && !G.over) {
    for (let i = 0; i < G.speed; i++) update(dt);
    for (let i = G.shots.length - 1; i >= 0; i--) {
      G.shots[i].t -= dt * G.speed;
      if (G.shots[i].t <= 0) G.shots.splice(i, 1);
    }
    if (Math.floor(G.time * 4) !== UI._last) { UI._last = Math.floor(G.time * 4); UI.update(); }
  }
  R.draw();
}

/* ---------------- 啟動 ---------------- */
R.init();
genMap();
for (const t of G.towers) { t.cx = (t.x + .5) * TS; t.cy = (t.y + .5) * TS; }
bindInput();
UI.init();
requestAnimationFrame(frame);
