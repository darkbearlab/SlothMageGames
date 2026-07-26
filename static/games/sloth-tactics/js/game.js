/* ===========================================================
   Sloth Tactics —《樹懶法師：時空棋局》
   敵人攻擊全預告的戰棋：核心樂趣是「把敵人推到會互相打到的位置」
   =========================================================== */
'use strict';

const N = 8, TS = 62;
const T_GROUND = 0, T_WATER = 1, T_MOUNTAIN = 2, T_TOWER = 3;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const SAVE_KEY = 'slothTactics.v1';

/* ---------------- 單位定義 ---------------- */
const UNIT_DEFS = [
  {
    id: 'colossus', name: '石巨像', emoji: '🗿', hp: 3, move: 3,
    weapon: { name: '揮擊', kind: 'melee', dmg: 2, push: 1, desc: '攻擊相鄰一格：2 傷害並推開 1 格' }
  },
  {
    id: 'arbalest', name: '符文弩手', emoji: '🏹', hp: 2, move: 3,
    weapon: { name: '穿刺弩', kind: 'line', dmg: 1, push: 1, desc: '朝一個方向射擊，命中該方向第一個目標：1 傷害並推開 1 格' }
  },
  {
    id: 'warp', name: '震波術士', emoji: '🧙', hp: 2, move: 4,
    weapon: { name: '震盪波', kind: 'nova', dmg: 1, push: 1, desc: '對自己四周四格：1 傷害並把上面的東西往外推 1 格' }
  }
];

/* ---------------- 敵人定義 ---------------- */
const ENEMY_DEFS = {
  beetle: {
    name: '甲蟲', emoji: '🪲', hp: 2, dmg: 1, from: 1, w: 10,
    plan: (e) => ({ kind: 'adjacent' })
  },
  scorpion: {
    name: '刺尾蠍', emoji: '🦂', hp: 3, dmg: 2, from: 2, w: 7,
    plan: (e) => ({ kind: 'adjacent' })
  },
  flyer: {
    name: '振翅蟲', emoji: '🦟', hp: 2, dmg: 1, from: 3, w: 7, fly: true,
    plan: (e) => ({ kind: 'adjacent' })
  },
  spitter: {
    name: '噴吐者', emoji: '🐛', hp: 2, dmg: 1, from: 2, w: 6,
    plan: (e) => ({ kind: 'line', range: 3 })
  },
  bomber: {
    name: '爆裂蟲', emoji: '🦠', hp: 1, dmg: 1, from: 4, w: 6,
    plan: (e) => ({ kind: 'nova' })
  },
  alpha: {
    name: '深淵巨獸', emoji: '🦎', hp: 5, dmg: 2, from: 6, w: 4,
    plan: (e) => ({ kind: 'adjacent' })
  }
};

/* ---------------- 強化 ---------------- */
const UPGRADES = [
  { id: 'u_dmg1', name: '強化揮擊', desc: '石巨像的傷害 +1', apply: G => G.units.find(u => u.id === 'colossus').weapon.dmg++ },
  { id: 'u_push', name: '衝擊彈頭', desc: '符文弩手的推力 +1', apply: G => G.units.find(u => u.id === 'arbalest').weapon.push++ },
  { id: 'u_nova', name: '共振強化', desc: '震盪波的傷害 +1', apply: G => G.units.find(u => u.id === 'warp').weapon.dmg++ },
  { id: 'u_move', name: '輕量化框架', desc: '所有單位的移動力 +1', apply: G => G.units.forEach(u => u.move++) },
  { id: 'u_hp', name: '裝甲板', desc: '所有單位的最大生命 +1（並回復）', apply: G => G.units.forEach(u => { u.maxHp++; u.hp = u.maxHp; }) },
  { id: 'u_power', name: '備援電池', desc: '電網上限 +2 並補滿 2 點', apply: G => { G.maxPower += 2; G.power = Math.min(G.maxPower, G.power + 2); } },
  { id: 'u_arb', name: '穿甲箭', desc: '符文弩手的傷害 +1', apply: G => G.units.find(u => u.id === 'arbalest').weapon.dmg++ },
  { id: 'u_shield', name: '相位護盾', desc: '每個任務中，每個單位可免疫一次傷害', apply: G => G.shields = true }
];

/* ---------------- 狀態 ---------------- */
const G = {
  grid: new Uint8Array(N * N),
  towers: [],
  units: [], enemies: [],
  power: 4, maxPower: 4,
  turn: 1, maxTurn: 5, mission: 1,
  sel: null, mode: null, targets: [], hover: null,
  over: false, busy: false, shields: false,
  log: [], spawnPts: []
};
const idx = (x, y) => y * N + x;
const inB = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
function unitAt(x, y) { return G.units.find(u => !u.dead && u.x === x && u.y === y); }
function enemyAt(x, y) { return G.enemies.find(e => !e.dead && e.x === x && e.y === y); }
function occupant(x, y) { return unitAt(x, y) || enemyAt(x, y); }
function isTower(x, y) { return G.grid[idx(x, y)] === T_TOWER; }
function blocked(x, y, fly) {
  if (!inB(x, y)) return true;
  const t = G.grid[idx(x, y)];
  if (t === T_MOUNTAIN || t === T_TOWER) return true;
  if (t === T_WATER && !fly) return true;
  return false;
}

/* ---------------- 地圖 ---------------- */
function genMap() {
  G.grid.fill(T_GROUND);
  G.towers = [];
  // 水池
  const pools = ri(1, 3);
  for (let p = 0; p < pools; p++) {
    const cx = ri(1, N - 2), cy = ri(1, N - 2), r = ri(1, 2);
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++)
        if (inB(x, y) && Math.abs(x - cx) + Math.abs(y - cy) <= r && Math.random() < 0.8)
          G.grid[idx(x, y)] = T_WATER;
  }
  // 山
  for (let i = 0; i < ri(2, 5); i++) {
    const x = ri(0, N - 1), y = ri(0, N - 1);
    if (G.grid[idx(x, y)] === T_GROUND) G.grid[idx(x, y)] = T_MOUNTAIN;
  }
  // 能量塔（3 座，分散）
  let guard = 0;
  while (G.towers.length < 3 && guard++ < 300) {
    const x = ri(1, N - 2), y = ri(1, N - 2);
    if (G.grid[idx(x, y)] !== T_GROUND) continue;
    if (G.towers.some(t => Math.abs(t.x - x) + Math.abs(t.y - y) < 3)) continue;
    G.grid[idx(x, y)] = T_TOWER;
    G.towers.push({ x, y });
  }
}

/* ---------------- 任務 ---------------- */
function newGame() {
  G.units = UNIT_DEFS.map(d => ({
    id: d.id, name: d.name, emoji: d.emoji, maxHp: d.hp, hp: d.hp,
    move: d.move, weapon: Object.assign({}, d.weapon), x: 0, y: 0,
    moved: false, acted: false, dead: false, isUnit: true
  }));
  G.power = 4; G.maxPower = 4; G.mission = 1; G.over = false; G.shields = false;
  startMission();
  save();
}

function startMission() {
  genMap();
  G.turn = 1;
  G.enemies = [];
  G.log = [];
  G.sel = null; G.mode = null; G.targets = [];
  G.busy = false;
  // 我方單位配置（左下角空地）
  const spots = [];
  for (let y = N - 1; y >= 0 && spots.length < 3; y--)
    for (let x = 0; x < N && spots.length < 3; x++)
      if (G.grid[idx(x, y)] === T_GROUND && !occupant(x, y)) spots.push({ x, y });
  G.units.forEach((u, i) => {
    u.dead = false; u.hp = u.maxHp; u.moved = false; u.acted = false;
    u.shieldUsed = false;
    const s = spots[i] || { x: i, y: N - 1 };
    u.x = s.x; u.y = s.y;
  });
  // 初始敵人
  const n = 2 + Math.floor(G.mission / 2);
  for (let i = 0; i < n; i++) spawnEnemy();
  G.enemies.forEach(e => planEnemy(e));
  addLog(`任務 ${G.mission} 開始：撐過 ${G.maxTurn} 個回合`);
  UI.render();
}

function enemyPool() {
  return Object.keys(ENEMY_DEFS).filter(k => ENEMY_DEFS[k].from <= G.mission);
}
function spawnEnemy() {
  const pool = enemyPool();
  const list = pool.map(k => ({ k, w: ENEMY_DEFS[k].w }));
  let total = list.reduce((s, x) => s + x.w, 0), r = Math.random() * total, key = list[0].k;
  for (const it of list) { r -= it.w; if (r <= 0) { key = it.k; break; } }
  const d = ENEMY_DEFS[key];
  // 從邊緣進場
  const cands = [];
  for (let i = 0; i < N; i++) {
    [[i, 0], [i, N - 1], [0, i], [N - 1, i]].forEach(([x, y]) => {
      if (!blocked(x, y, d.fly) && !occupant(x, y)) cands.push({ x, y });
    });
  }
  if (!cands.length) return null;
  const s = pick(cands);
  const hpBonus = Math.floor((G.mission - 1) / 3);
  const e = {
    uid: 'e' + Math.random().toString(36).slice(2, 7), type: key, def: d,
    name: d.name, emoji: d.emoji, hp: d.hp + hpBonus, maxHp: d.hp + hpBonus,
    dmg: d.dmg, x: s.x, y: s.y, fly: !!d.fly, intent: null, dead: false, fresh: true
  };
  G.enemies.push(e);
  return e;
}

/* ---------------- 移動範圍（BFS） ---------------- */
function moveRange(unit) {
  const out = [];
  const dist = new Int8Array(N * N).fill(-1);
  dist[idx(unit.x, unit.y)] = 0;
  const q = [{ x: unit.x, y: unit.y }];
  while (q.length) {
    const c = q.shift();
    const d = dist[idx(c.x, c.y)];
    if (d >= unit.move) continue;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!inB(nx, ny) || dist[idx(nx, ny)] >= 0) continue;
      if (blocked(nx, ny, false)) continue;
      if (occupant(nx, ny)) continue;
      dist[idx(nx, ny)] = d + 1;
      out.push({ x: nx, y: ny });
      q.push({ x: nx, y: ny });
    }
  }
  return out;
}

/* ---------------- 推撞與傷害 ---------------- */
function damageEntity(ent, n, src) {
  if (!ent || ent.dead) return;
  if (ent.isTower) {
    G.power -= n;
    addLog(`⚡ 能量塔受損 -${n}`);
    FX.push({ kind: 'dmg', x: ent.x, y: ent.y, t: .8, text: '-' + n, color: '#ff6b6b' });
    if (G.power <= 0) { G.power = 0; gameOver(); }
    return;
  }
  if (G.shields && ent.isUnit && !ent.shieldUsed) {
    ent.shieldUsed = true;
    FX.push({ kind: 'dmg', x: ent.x, y: ent.y, t: .9, text: '護盾', color: '#7fe0ff' });
    addLog(`🛡 ${ent.name} 的相位護盾擋下了傷害`);
    return;
  }
  ent.hp -= n;
  FX.push({ kind: 'dmg', x: ent.x, y: ent.y, t: .8, text: '-' + n, color: ent.isUnit ? '#ff6b6b' : '#ffd45e' });
  if (ent.hp <= 0) {
    ent.hp = 0; ent.dead = true;
    FX.push({ kind: 'boom', x: ent.x, y: ent.y, t: .5 });
    addLog(ent.isUnit ? `💀 ${ent.name} 被擊毀` : `✔ ${ent.name} 被消滅`);
  }
}

function pushEntity(ent, dx, dy, times) {
  if (!ent || ent.dead || ent.isTower) return;
  for (let i = 0; i < (times || 1); i++) {
    const nx = ent.x + dx, ny = ent.y + dy;
    if (!inB(nx, ny)) { damageEntity(ent, 1); addLog(`${ent.name} 撞上邊界`); return; }
    const t = G.grid[idx(nx, ny)];
    const other = occupant(nx, ny);
    if (t === T_MOUNTAIN || t === T_TOWER || other) {
      damageEntity(ent, 1);
      if (other) { damageEntity(other, 1); addLog(`💥 ${ent.name} 撞上 ${other.name}，雙方各受 1 傷`); }
      else addLog(`💥 ${ent.name} 撞上障礙物`);
      return;
    }
    if (t === T_WATER && !ent.fly) {
      FX.push({ kind: 'splash', x: nx, y: ny, t: .6 });
      ent.dead = true;
      addLog(ent.isUnit ? `🌊 ${ent.name} 掉進水裡` : `🌊 ${ent.name} 被推進水裡，直接淹死`);
      return;
    }
    ent.x = nx; ent.y = ny;
  }
}

/* ---------------- 玩家武器 ---------------- */
function weaponTargets(u) {
  const w = u.weapon;
  const out = [];
  if (w.kind === 'melee') {
    for (const [dx, dy] of DIRS) {
      const x = u.x + dx, y = u.y + dy;
      if (inB(x, y)) out.push({ x, y, dx, dy });
    }
  } else if (w.kind === 'line') {
    for (const [dx, dy] of DIRS) {
      for (let s = 1; s < N; s++) {
        const x = u.x + dx * s, y = u.y + dy * s;
        if (!inB(x, y)) break;
        const t = G.grid[idx(x, y)];
        if (t === T_MOUNTAIN || t === T_TOWER) break;
        if (occupant(x, y)) { out.push({ x, y, dx, dy }); break; }
      }
      // 沒有目標也允許朝該方向射（打空）
      const fx = u.x + dx, fy = u.y + dy;
      if (inB(fx, fy) && !out.some(o => o.dx === dx && o.dy === dy)) out.push({ x: fx, y: fy, dx, dy, empty: true });
    }
  } else if (w.kind === 'nova') {
    out.push({ x: u.x, y: u.y, nova: true });
  }
  return out;
}

function fireWeapon(u, target) {
  const w = u.weapon;
  if (w.kind === 'melee' || w.kind === 'line') {
    const ent = occupant(target.x, target.y);
    FX.push({ kind: 'slash', x: target.x, y: target.y, t: .35 });
    if (isTower(target.x, target.y)) {
      addLog('⚠ 你打到了自己的能量塔');
      damageEntity({ isTower: true, x: target.x, y: target.y }, w.dmg);
    } else if (ent) {
      damageEntity(ent, w.dmg, u);
      pushEntity(ent, target.dx, target.dy, w.push);
    } else addLog(`${u.name} 的攻擊落空`);
  } else if (w.kind === 'nova') {
    for (const [dx, dy] of DIRS) {
      const x = u.x + dx, y = u.y + dy;
      if (!inB(x, y)) continue;
      FX.push({ kind: 'slash', x, y, t: .35 });
      const ent = occupant(x, y);
      if (isTower(x, y)) { addLog('⚠ 震盪波打到能量塔'); damageEntity({ isTower: true, x, y }, w.dmg); }
      else if (ent) { damageEntity(ent, w.dmg, u); pushEntity(ent, dx, dy, w.push); }
    }
  }
  u.acted = true;
  G.mode = null; G.targets = [];
  cleanup();
  UI.render();
}

/* ---------------- 敵人規劃與行動 ---------------- */
function targetsOfInterest() {
  const list = G.units.filter(u => !u.dead).map(u => ({ x: u.x, y: u.y, w: 1 }));
  G.towers.forEach(t => { if (isTower(t.x, t.y)) list.push({ x: t.x, y: t.y, w: 1.4 }); });
  return list;
}

function stepToward(e, tx, ty) {
  // 簡易 BFS 找一步
  const dist = new Int16Array(N * N).fill(-1);
  dist[idx(e.x, e.y)] = 0;
  const q = [{ x: e.x, y: e.y }];
  const prev = {};
  while (q.length) {
    const c = q.shift();
    if (c.x === tx && c.y === ty) break;
    for (const [dx, dy] of DIRS) {
      const nx = c.x + dx, ny = c.y + dy;
      if (!inB(nx, ny) || dist[idx(nx, ny)] >= 0) continue;
      const isTarget = (nx === tx && ny === ty);
      if (!isTarget && (blocked(nx, ny, e.fly) || occupant(nx, ny))) continue;
      dist[idx(nx, ny)] = dist[idx(c.x, c.y)] + 1;
      prev[idx(nx, ny)] = { x: c.x, y: c.y };
      q.push({ x: nx, y: ny });
    }
  }
  if (dist[idx(tx, ty)] < 0) return null;
  // 回溯到起點的下一步
  let cur = { x: tx, y: ty };
  let steps = [];
  while (!(cur.x === e.x && cur.y === e.y)) {
    steps.unshift(cur);
    cur = prev[idx(cur.x, cur.y)];
    if (!cur) return null;
  }
  return steps;
}

function planEnemy(e) {
  const plan = e.def.plan(e);
  const tois = targetsOfInterest();
  let best = null, bd = 1e9;
  for (const t of tois) {
    const d = (Math.abs(t.x - e.x) + Math.abs(t.y - e.y)) / t.w;
    if (d < bd) { bd = d; best = t; }
  }
  e.intent = null;
  if (!best) return;

  if (plan.kind === 'adjacent') {
    for (const [dx, dy] of DIRS) {
      const x = e.x + dx, y = e.y + dy;
      if (!inB(x, y)) continue;
      if ((occupant(x, y) && occupant(x, y).isUnit) || isTower(x, y)) {
        e.intent = { tiles: [{ x, y, dx, dy }], dmg: e.dmg, push: 1 };
        return;
      }
    }
  } else if (plan.kind === 'line') {
    for (const [dx, dy] of DIRS) {
      for (let s = 1; s <= plan.range; s++) {
        const x = e.x + dx * s, y = e.y + dy * s;
        if (!inB(x, y)) break;
        const t = G.grid[idx(x, y)];
        if (t === T_MOUNTAIN) break;
        const oc = occupant(x, y);
        if ((oc && oc.isUnit) || t === T_TOWER) {
          e.intent = { tiles: [{ x, y, dx, dy }], dmg: e.dmg, push: 1 };
          return;
        }
        if (oc) break;
      }
    }
  } else if (plan.kind === 'nova') {
    const tiles = [];
    let worth = false;
    for (const [dx, dy] of DIRS) {
      const x = e.x + dx, y = e.y + dy;
      if (!inB(x, y)) continue;
      tiles.push({ x, y, dx, dy });
      const oc = occupant(x, y);
      if ((oc && oc.isUnit) || isTower(x, y)) worth = true;
    }
    if (worth) { e.intent = { tiles, dmg: e.dmg, push: 1 }; return; }
  }
  // 沒有可攻擊目標 → 這回合只移動（下一回合再說）
  e.intent = null;
}

function enemyPhase(done) {
  G.busy = true;
  const steps = [];
  // 1) 執行預告攻擊
  steps.push(() => {
    for (const e of G.enemies) {
      if (e.dead || !e.intent) continue;
      for (const t of e.intent.tiles) {
        FX.push({ kind: 'slash', x: t.x, y: t.y, t: .4 });
        const oc = occupant(t.x, t.y);
        if (isTower(t.x, t.y)) damageEntity({ isTower: true, x: t.x, y: t.y }, e.intent.dmg);
        else if (oc) {
          damageEntity(oc, e.intent.dmg, e);
          pushEntity(oc, t.dx, t.dy, e.intent.push);
        }
      }
      e.intent = null;
    }
    cleanup();
  });
  // 2) 移動
  steps.push(() => {
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (e.fresh) { e.fresh = false; continue; }
      const tois = targetsOfInterest();
      let best = null, bd = 1e9;
      for (const t of tois) {
        const d = (Math.abs(t.x - e.x) + Math.abs(t.y - e.y)) / t.w;
        if (d < bd) { bd = d; best = t; }
      }
      if (!best) continue;
      // 已經在攻擊距離就不動
      const adj = Math.abs(best.x - e.x) + Math.abs(best.y - e.y);
      if (adj <= 1) continue;
      const path = stepToward(e, best.x, best.y);
      if (!path || path.length < 2) continue;
      const nxt = path[0];
      if (!occupant(nxt.x, nxt.y) && !blocked(nxt.x, nxt.y, e.fly)) { e.x = nxt.x; e.y = nxt.y; }
    }
  });
  // 3) 新增敵人（前 3 回合）
  steps.push(() => {
    if (G.turn < G.maxTurn) {
      const n = Math.random() < 0.55 ? 1 : (G.mission > 3 && Math.random() < 0.4 ? 2 : 0);
      for (let i = 0; i < n; i++) { const e = spawnEnemy(); if (e) addLog(`⚠ ${e.name} 從邊界出現`); }
    }
  });
  // 4) 重新預告
  steps.push(() => {
    G.enemies.forEach(e => { if (!e.dead) planEnemy(e); });
    cleanup();
  });

  let i = 0;
  const run = () => {
    if (G.over) { G.busy = false; return; }
    if (i >= steps.length) { G.busy = false; done(); return; }
    steps[i++]();
    UI.render();
    setTimeout(run, 480);
  };
  setTimeout(run, 180);
}

function cleanup() {
  G.enemies = G.enemies.filter(e => !e.dead);
  if (G.units.length && G.units.every(u => u.dead) && !G.over) {
    addLog('☠ 所有單位都被擊毀了');
    gameOver();
  }
}

/* ---------------- 回合 ---------------- */
function endTurn() {
  if (G.busy || G.over) return;
  G.sel = null; G.mode = null; G.targets = [];
  UI.render();
  enemyPhase(() => {
    if (G.over) return;
    G.turn++;
    if (G.turn > G.maxTurn) { missionClear(); return; }
    G.units.forEach(u => { u.moved = false; u.acted = false; u.sx = u.x; u.sy = u.y; });
    addLog(`— 第 ${G.turn} 回合 —`);
    UI.render();
    save();
  });
}

function missionClear() {
  addLog(`🎉 任務 ${G.mission} 完成`);
  G.mission++;
  save();
  UI.rewardScreen();
}

function gameOver() {
  if (G.over) return;
  G.over = true;
  localStorage.removeItem(SAVE_KEY);
  setTimeout(() => UI.gameOverScreen(), 700);
}

function addLog(t) {
  G.log.unshift(t);
  if (G.log.length > 40) G.log.pop();
}

/* ---------------- 特效 ---------------- */
const FX = [];

/* ---------------- 存檔 ---------------- */
function save() {
  if (G.over) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      mission: G.mission, power: G.power, maxPower: G.maxPower, shields: G.shields,
      units: G.units.map(u => ({ id: u.id, maxHp: u.maxHp, move: u.move, weapon: u.weapon }))
    }));
  } catch (e) { }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    G.units = UNIT_DEFS.map(def => {
      const s = (d.units || []).find(x => x.id === def.id) || {};
      return {
        id: def.id, name: def.name, emoji: def.emoji,
        maxHp: s.maxHp || def.hp, hp: s.maxHp || def.hp,
        move: s.move || def.move, weapon: Object.assign({}, def.weapon, s.weapon || {}),
        x: 0, y: 0, moved: false, acted: false, dead: false, isUnit: true
      };
    });
    G.mission = d.mission || 1; G.power = d.power; G.maxPower = d.maxPower;
    G.shields = !!d.shields;
    return true;
  } catch (e) { return false; }
}

/* ---------------- 繪圖 ---------------- */
const R = {
  cv: null, ctx: null, size: 0, ts: TS,
  init() {
    this.cv = document.getElementById('cv');
    this.ctx = this.cv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => { this.resize(); UI.render(); });
  },
  resize() {
    const wrap = document.getElementById('boardwrap');
    const avail = Math.min(wrap.clientWidth - 16, wrap.clientHeight - 16);
    this.ts = clamp(Math.floor(avail / N), 34, 92);
    this.size = this.ts * N;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = this.size * dpr; this.cv.height = this.size * dpr;
    this.cv.style.width = this.size + 'px'; this.cv.style.height = this.size + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
  s2g(sx, sy) {
    const r = this.cv.getBoundingClientRect();
    return { x: Math.floor((sx - r.left) / this.ts), y: Math.floor((sy - r.top) / this.ts) };
  },
  draw() {
    const ctx = this.ctx, ts = this.ts;
    ctx.clearRect(0, 0, this.size, this.size);
    // 地形
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const t = G.grid[idx(x, y)], px = x * ts, py = y * ts;
      if (t === T_WATER) {
        ctx.fillStyle = '#1b3a52';
        ctx.fillRect(px, py, ts, ts);
        ctx.strokeStyle = 'rgba(140,210,255,.25)'; ctx.lineWidth = 1.5;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          const yy = py + ts * (0.35 + i * 0.3) + Math.sin(Date.now() / 700 + x + i) * 2;
          ctx.moveTo(px + 6, yy); ctx.quadraticCurveTo(px + ts / 2, yy + 4, px + ts - 6, yy);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = ((x + y) & 1) ? '#1a222b' : '#1e2831';
        ctx.fillRect(px, py, ts, ts);
      }
      if (t === T_MOUNTAIN) {
        ctx.fillStyle = '#3c4a56';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + ts - 7); ctx.lineTo(px + ts / 2, py + 7);
        ctx.lineTo(px + ts - 6, py + ts - 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#5c6c7a';
        ctx.beginPath();
        ctx.moveTo(px + ts / 2, py + 7); ctx.lineTo(px + ts * .66, py + ts * .5);
        ctx.lineTo(px + ts * .38, py + ts * .5); ctx.closePath(); ctx.fill();
      }
      if (t === T_TOWER) {
        ctx.fillStyle = 'rgba(127,224,160,.14)';
        ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        ctx.fillStyle = '#2c4a3c';
        ctx.fillRect(px + ts * .28, py + ts * .3, ts * .44, ts * .55);
        ctx.fillStyle = '#7fe0a0';
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts * .28, ts * .13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(127,224,160,.3)';
        ctx.beginPath();
        ctx.arc(px + ts / 2, py + ts * .28, ts * .22 + Math.sin(Date.now() / 400) * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      ctx.strokeRect(px + .5, py + .5, ts - 1, ts - 1);
    }

    // 移動範圍
    if (G.mode === 'move' && G.sel && !G.sel.moved) {
      ctx.fillStyle = 'rgba(95,214,255,.18)';
      ctx.strokeStyle = 'rgba(95,214,255,.55)'; ctx.lineWidth = 1.5;
      for (const t of G.targets) {
        ctx.fillRect(t.x * ts + 3, t.y * ts + 3, ts - 6, ts - 6);
        ctx.strokeRect(t.x * ts + 3, t.y * ts + 3, ts - 6, ts - 6);
      }
    }
    // 攻擊目標
    if (G.mode === 'attack' && G.sel) {
      for (const t of G.targets) {
        ctx.fillStyle = 'rgba(255,180,90,.22)';
        ctx.strokeStyle = 'rgba(255,180,90,.8)'; ctx.lineWidth = 2;
        ctx.fillRect(t.x * ts + 3, t.y * ts + 3, ts - 6, ts - 6);
        ctx.strokeRect(t.x * ts + 3, t.y * ts + 3, ts - 6, ts - 6);
      }
    }

    // 敵人預告
    for (const e of G.enemies) {
      if (e.dead || !e.intent) continue;
      for (const t of e.intent.tiles) {
        const px = t.x * ts, py = t.y * ts;
        ctx.fillStyle = 'rgba(255,70,70,.22)';
        ctx.fillRect(px + 2, py + 2, ts - 4, ts - 4);
        ctx.strokeStyle = 'rgba(255,90,90,.9)'; ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
        ctx.setLineDash([]);
        // 傷害數字
        ctx.fillStyle = '#ff9a9a';
        ctx.font = `bold ${Math.round(ts * .26)}px "Noto Sans TC",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('-' + e.intent.dmg, px + ts / 2, py + ts * .38);
        // 推的方向
        if (t.dx !== undefined) {
          ctx.strokeStyle = 'rgba(255,140,140,.9)'; ctx.lineWidth = 2.5;
          const cx = px + ts / 2, cy = py + ts * .68;
          ctx.beginPath();
          ctx.moveTo(cx - t.dx * ts * .18, cy - t.dy * ts * .18);
          ctx.lineTo(cx + t.dx * ts * .18, cy + t.dy * ts * .18);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + t.dx * ts * .18, cy + t.dy * ts * .18);
          ctx.lineTo(cx + t.dx * ts * .06 - t.dy * ts * .09, cy + t.dy * ts * .06 + t.dx * ts * .09);
          ctx.lineTo(cx + t.dx * ts * .06 + t.dy * ts * .09, cy + t.dy * ts * .06 - t.dx * ts * .09);
          ctx.closePath(); ctx.fillStyle = 'rgba(255,140,140,.9)'; ctx.fill();
        }
      }
    }

    // 單位
    for (const u of G.units) if (!u.dead) this.drawActor(ctx, u, '#5fd6ff', u === G.sel);
    for (const e of G.enemies) if (!e.dead) this.drawActor(ctx, e, '#ff8a6b', false);

    // 特效
    for (const f of FX) {
      const px = f.x * ts + ts / 2, py = f.y * ts + ts / 2;
      const k = clamp(f.t, 0, 1);
      if (f.kind === 'slash') {
        ctx.strokeStyle = `rgba(255,240,180,${k})`; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px, py, ts * .42 * (1.3 - k), 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'boom') {
        ctx.fillStyle = `rgba(255,140,60,${k})`;
        ctx.beginPath(); ctx.arc(px, py, ts * .5 * (1.4 - k), 0, Math.PI * 2); ctx.fill();
      } else if (f.kind === 'splash') {
        ctx.strokeStyle = `rgba(120,200,255,${k})`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(px, py, ts * .45 * (1.4 - k), 0, Math.PI * 2); ctx.stroke();
      } else if (f.kind === 'dmg') {
        ctx.fillStyle = f.color;
        ctx.globalAlpha = k;
        ctx.font = `bold ${Math.round(ts * .3)}px "Noto Sans TC",sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(f.text, px, py - ts * .35 - (1 - k) * 14);
        ctx.globalAlpha = 1;
      }
    }

    // 游標
    if (G.hover && inB(G.hover.x, G.hover.y)) {
      ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(G.hover.x * ts + 1, G.hover.y * ts + 1, ts - 2, ts - 2);
    }
  },

  drawActor(ctx, a, color, selected) {
    const ts = this.ts, px = a.x * ts, py = a.y * ts;
    if (selected) {
      ctx.strokeStyle = '#ffd45e'; ctx.lineWidth = 3;
      ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
    }
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(px + ts / 2, py + ts * .8, ts * .3, ts * .12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = a.isUnit ? 'rgba(95,214,255,.16)' : 'rgba(255,110,80,.16)';
    ctx.beginPath(); ctx.arc(px + ts / 2, py + ts / 2, ts * .4, 0, Math.PI * 2); ctx.fill();
    ctx.font = `${Math.round(ts * .56)}px system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.emoji, px + ts / 2, py + ts * .48);
    ctx.textBaseline = 'alphabetic';
    // 血條
    const w = ts * .62, h = 4;
    const bx = px + (ts - w) / 2, by = py + ts - 9;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
    ctx.fillStyle = a.isUnit ? '#5fd6ff' : '#ff8a6b';
    ctx.fillRect(bx, by, w * clamp(a.hp / a.maxHp, 0, 1), h);
    if (a.isUnit && (a.moved || a.acted)) {
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(px, py, ts, ts);
    }
  }
};

/* ---------------- UI ---------------- */
const UI = {
  init() {
    document.getElementById('btnStart').onclick = () => {
      document.getElementById('modal').classList.add('hidden');
    };
    document.getElementById('endturn').onclick = () => endTurn();
    document.getElementById('btnUndo').onclick = () => {
      const u = G.sel;
      if (!u || !u.moved || u.acted) { this.toast('沒有可復原的移動'); return; }
      u.x = u.sx; u.y = u.sy; u.moved = false;
      G.mode = 'move'; G.targets = moveRange(u);
      this.render();
    };
    document.getElementById('btnHelp').onclick = () => {
      document.getElementById('modal').classList.remove('hidden');
    };
    const cv = R.cv;
    cv.addEventListener('mousemove', e => { G.hover = R.s2g(e.clientX, e.clientY); });
    cv.addEventListener('mouseleave', () => { G.hover = null; });
    cv.addEventListener('click', e => {
      const g = R.s2g(e.clientX, e.clientY);
      this.clickTile(g.x, g.y);
    });
    cv.addEventListener('touchstart', e => {
      const t = e.touches[0];
      const g = R.s2g(t.clientX, t.clientY);
      G.hover = g;
      this.clickTile(g.x, g.y);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') { G.mode = G.sel && !G.sel.moved ? 'move' : null; G.targets = G.mode === 'move' ? moveRange(G.sel) : []; this.render(); }
      if (e.key === ' ') { e.preventDefault(); endTurn(); }
      if (e.key >= '1' && e.key <= '3') {
        const u = G.units[+e.key - 1];
        if (u && !u.dead) this.selectUnit(u);
      }
    });
  },

  clickTile(x, y) {
    if (!inB(x, y) || G.busy || G.over) return;
    if (G.mode === 'attack' && G.sel) {
      const t = G.targets.find(t => t.x === x && t.y === y);
      if (t) { fireWeapon(G.sel, t); return; }
    }
    if (G.mode === 'move' && G.sel && !G.sel.moved) {
      const t = G.targets.find(t => t.x === x && t.y === y);
      if (t) {
        G.sel.sx = G.sel.x; G.sel.sy = G.sel.y;
        G.sel.x = x; G.sel.y = y; G.sel.moved = true;
        G.mode = null; G.targets = [];
        this.render();
        return;
      }
    }
    const u = unitAt(x, y);
    if (u) { this.selectUnit(u); return; }
    G.sel = null; G.mode = null; G.targets = [];
    this.render();
  },

  selectUnit(u) {
    if (u.dead) return;
    G.sel = u;
    if (!u.moved) { G.mode = 'move'; G.targets = moveRange(u); }
    else { G.mode = null; G.targets = []; }
    this.render();
  },
  aimWeapon(u) {
    if (u.acted) return;
    G.sel = u;
    G.mode = 'attack';
    G.targets = weaponTargets(u);
    this.render();
  },

  render() {
    document.getElementById('hPower').textContent = `${G.power}/${G.maxPower}`;
    document.getElementById('hTurn').textContent = `${Math.min(G.turn, G.maxTurn)}/${G.maxTurn}`;
    document.getElementById('hMission').textContent = G.mission;
    document.getElementById('endturn').disabled = G.busy || G.over;

    const el = document.getElementById('units');
    el.innerHTML = G.units.map((u, i) => {
      if (u.dead) return `<div class="unit done"><div class="un">${u.emoji} ${u.name} <span style="font-size:11px;color:#ff8a8a">已擊毀</span></div></div>`;
      const pips = Array.from({ length: u.maxHp }, (_, k) =>
        `<span class="pip ${k < u.hp ? 'on' : ''}"></span>`).join('');
      return `<div class="unit ${G.sel === u ? 'sel' : ''} ${u.moved && u.acted ? 'done' : ''}" data-i="${i}">
        <div class="un"><span>${u.emoji} ${u.name}</span><span style="font-size:10px;color:#7f92a3">[${i + 1}]</span></div>
        <div class="uh">${pips}</div>
        <div class="uw">移動 ${u.move}　${u.moved ? '已移動' : '可移動'}</div>
        <button class="wbtn ${u.acted ? 'used' : ''} ${G.sel === u && G.mode === 'attack' ? 'on' : ''}" data-w="${i}">
          ⚔ ${u.weapon.name}（${u.weapon.dmg} 傷 / 推 ${u.weapon.push}）<br>
          <span style="font-size:10px;color:#7f92a3">${u.weapon.desc}</span>
        </button>
      </div>`;
    }).join('');
    el.querySelectorAll('.unit[data-i]').forEach(d => d.onclick = () => this.selectUnit(G.units[+d.dataset.i]));
    el.querySelectorAll('.wbtn[data-w]').forEach(b => b.onclick = ev => {
      ev.stopPropagation();
      const u = G.units[+b.dataset.w];
      if (u.acted || u.dead) return;
      this.aimWeapon(u);
    });
    document.getElementById('log').innerHTML = G.log.slice(0, 14).map(l => `<div>${l}</div>`).join('');
    R.draw();
  },

  rewardScreen() {
    const opts = [];
    const pool = UPGRADES.filter(u => u.id !== 'u_shield' || !G.shields);
    while (opts.length < 3 && opts.length < pool.length) {
      const u = pick(pool);
      if (!opts.includes(u)) opts.push(u);
    }
    const html = `<h1>任務完成</h1><div class="sub">M I S S I O N &nbsp; C L E A R</div>
      <p>能量塔守住了。深淵正在集結更多怪物——先做點強化吧。</p>
      <div style="font-size:13px;color:#b9c8d4">目前電網：⚡ ${G.power}/${G.maxPower}　下一個任務：第 ${G.mission} 號</div>
      <div class="rewards">${opts.map((o, i) => `<div class="rw" data-u="${i}"><b>${o.name}</b>${o.desc}</div>`).join('')}</div>`;
    const box = document.getElementById('mbox');
    box.innerHTML = html;
    document.getElementById('modal').classList.remove('hidden');
    box.querySelectorAll('.rw').forEach(d => d.onclick = () => {
      opts[+d.dataset.u].apply(G);
      document.getElementById('modal').classList.add('hidden');
      startMission();
      save();
    });
  },

  gameOverScreen() {
    const box = document.getElementById('mbox');
    box.innerHTML = `<h1 style="color:#ff6b6b">電網崩潰</h1>
      <div class="sub">G A M E &nbsp; O V E R</div>
      <p>能量塔全部失效，深淵的怪物淹沒了整片棋盤。法師睡得很沉，完全沒有發現。</p>
      <div style="font-size:13px;line-height:2;color:#b9c8d4">
        撐過任務：<b>${G.mission - 1}</b> 個<br>
        存活單位：<b>${G.units.filter(u => !u.dead).length}/3</b>
      </div>
      <button class="bigbtn" id="btnAgain">再來一次</button>`;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('btnAgain').onclick = () => {
      document.getElementById('modal').classList.add('hidden');
      newGame();
      UI.render();
    };
  },

  toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => { d.style.transition = '.4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 1800);
  }
};

/* ---------------- 主迴圈（僅動畫） ---------------- */
let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = (now - lastT) / 1000; lastT = now;
  let dirty = FX.length > 0;
  for (let i = FX.length - 1; i >= 0; i--) { FX[i].t -= dt * 1.6; if (FX[i].t <= 0) FX.splice(i, 1); }
  if (dirty || Math.floor(now / 100) % 2 === 0) R.draw();
}

/* ---------------- 啟動 ---------------- */
R.init();
UI.init();
if (!load()) newGame();
else { startMission(); document.getElementById('modal').classList.add('hidden'); }
UI.render();
requestAnimationFrame(loop);
