/* ===========================================================
   Sloth Abyss - gen.js
   地城生成：房間 + 走廊 + 特殊房
   =========================================================== */
'use strict';

const T_WALL = 0, T_FLOOR = 1, T_LAVA = 2, T_WATER = 3;

class DungeonMap {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.tiles = new Uint8Array(w * h);      // 0 牆
    this.deco = new Uint8Array(w * h);       // 裝飾索引
    this.seen = new Uint8Array(w * h);       // 迷霧：0 未見 1 見過
    this.rooms = [];
  }
  idx(x, y) { return y * this.w + x; }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T_WALL;
    return this.tiles[y * this.w + x];
  }
  set(x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.tiles[y * this.w + x] = v; }
  solid(x, y) { const t = this.get(x, y); return t === T_WALL; }
  // 世界座標是否可走
  walkable(px, py) {
    return !this.solid(Math.floor(px / TILE), Math.floor(py / TILE));
  }
  // 圓形碰撞（檢查四周格）
  free(px, py, r) {
    const x0 = Math.floor((px - r) / TILE), x1 = Math.floor((px + r) / TILE);
    const y0 = Math.floor((py - r) / TILE), y1 = Math.floor((py + r) / TILE);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (this.solid(x, y)) return false;
    return true;
  }
  // 視線
  lineOfSight(ax, ay, bx, by) {
    const d = dist(ax, ay, bx, by);
    const steps = Math.ceil(d / (TILE * 0.5));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.solid(Math.floor(lerp(ax, bx, t) / TILE), Math.floor(lerp(ay, by, t) / TILE))) return false;
    }
    return true;
  }
  revealAround(px, py, radiusTiles) {
    const cx = Math.floor(px / TILE), cy = Math.floor(py / TILE);
    const r = radiusTiles;
    for (let y = cy - r; y <= cy + r; y++) {
      if (y < 0 || y >= this.h) continue;
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || x >= this.w) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.seen[y * this.w + x] = 1;
      }
    }
  }
}

function carveRoom(map, r) {
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++)
      map.set(x, y, T_FLOOR);
}

function carveCorridor(map, ax, ay, bx, by, wide) {
  const w = wide ? 1 : 0;
  const horizFirst = rng.chance(0.5);
  const put = (x, y) => {
    for (let dy = -w; dy <= w; dy++)
      for (let dx = -w; dx <= w; dx++)
        map.set(x + dx, y + dy, T_FLOOR);
  };
  if (horizFirst) {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) put(x, ay);
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) put(bx, y);
  } else {
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) put(ax, y);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) put(x, by);
  }
}

function roomCenter(r) { return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) }; }
function roomCenterWorld(r) { const c = roomCenter(r); return { x: c.x * TILE + TILE / 2, y: c.y * TILE + TILE / 2 }; }

/* 主生成函式：回傳 {map, rooms, start, exit, specials} */
function generateDungeon(floor, isBoss) {
  const biome = biomeFor(floor);
  if (isBoss) return generateBossArena(floor, biome);

  const size = clamp(48 + Math.floor(floor * 1.6), 48, 82);
  const map = new DungeonMap(size, size);
  const targetRooms = clamp(7 + Math.floor(floor / 2), 7, 15);
  const rooms = [];
  let attempts = 0;
  while (rooms.length < targetRooms && attempts < 700) {
    attempts++;
    const w = rng.int(7, 14), h = rng.int(7, 13);
    const x = rng.int(2, size - w - 3), y = rng.int(2, size - h - 3);
    const r = { x, y, w, h };
    let ok = true;
    for (const o of rooms) {
      if (x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y) { ok = false; break; }
    }
    if (!ok) continue;
    rooms.push(r);
  }
  rooms.forEach(r => carveRoom(map, r));

  // 依 x 排序連線（保證連通），再隨機加幾條迴路
  const order = rooms.slice().sort((a, b) => roomCenter(a).x - roomCenter(b).x);
  for (let i = 1; i < order.length; i++) {
    const a = roomCenter(order[i - 1]), b = roomCenter(order[i]);
    carveCorridor(map, a.x, a.y, b.x, b.y, rng.chance(0.35));
  }
  for (let i = 0; i < Math.min(4, rooms.length - 2); i++) {
    const a = roomCenter(rng.pick(rooms)), b = roomCenter(rng.pick(rooms));
    if (a.x !== b.x || a.y !== b.y) carveCorridor(map, a.x, a.y, b.x, b.y, false);
  }

  // 裝飾 / 危險地形
  for (const r of rooms) {
    if (biome.id === 'molten' && rng.chance(0.45)) {
      const n = rng.int(2, 5);
      for (let i = 0; i < n; i++) {
        const px = rng.int(r.x + 1, r.x + r.w - 2), py = rng.int(r.y + 1, r.y + r.h - 2);
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) map.set(px + dx, py + dy, T_LAVA);
      }
    }
    // 房內柱子
    if (r.w > 9 && r.h > 8 && rng.chance(0.5)) {
      const pad = 2;
      [[r.x + pad, r.y + pad], [r.x + r.w - pad - 1, r.y + pad],
      [r.x + pad, r.y + r.h - pad - 1], [r.x + r.w - pad - 1, r.y + r.h - pad - 1]].forEach(([x, y]) => map.set(x, y, T_WALL));
    }
  }
  // 地板裝飾
  for (let i = 0; i < map.tiles.length; i++) {
    if (map.tiles[i] === T_FLOOR && rng.chance(0.06)) map.deco[i] = rng.int(1, 4);
  }

  rooms.sort((a, b) => (roomCenter(a).x + roomCenter(a).y) - (roomCenter(b).x + roomCenter(b).y));
  const start = rooms[0];
  const exit = rooms[rooms.length - 1];
  start.kind = 'start'; exit.kind = 'exit';

  // 特殊房
  const mid = rooms.slice(1, rooms.length - 1);
  const shuffled = rng.shuffle(mid);
  let si = 0;
  const specials = [];
  const assign = (kind) => { if (si < shuffled.length) { shuffled[si].kind = kind; specials.push(shuffled[si]); si++; } };
  if (rng.chance(0.75)) assign('treasure');
  if (rng.chance(0.55)) assign('shrine');
  if (floor > 1 && rng.chance(0.4)) assign('shop');
  if (rng.chance(0.45)) assign('elite');
  for (const r of shuffled.slice(si)) r.kind = 'normal';

  map.rooms = rooms;
  return { map, rooms, start, exit, biome, specials };
}

function generateBossArena(floor, biome) {
  const size = 42;
  const map = new DungeonMap(size, size);
  const arena = { x: 6, y: 6, w: 30, h: 26, kind: 'boss' };
  carveRoom(map, arena);
  // 入口小房
  const entry = { x: 17, y: 33, w: 8, h: 6, kind: 'start' };
  carveRoom(map, entry);
  carveCorridor(map, 21, 33, 21, 30, true);
  // 角落柱
  [[10, 10], [31, 10], [10, 27], [31, 27], [20, 9], [20, 28]].forEach(([x, y]) => {
    map.set(x, y, T_WALL); map.set(x + 1, y, T_WALL); map.set(x, y + 1, T_WALL); map.set(x + 1, y + 1, T_WALL);
  });
  if (biome.id === 'molten') {
    for (let i = 0; i < 10; i++) {
      const px = rng.int(8, 34), py = rng.int(8, 30);
      map.set(px, py, T_LAVA); map.set(px + 1, py, T_LAVA);
    }
  }
  for (let i = 0; i < map.tiles.length; i++)
    if (map.tiles[i] === T_FLOOR && rng.chance(0.05)) map.deco[i] = rng.int(1, 4);

  map.rooms = [entry, arena];
  return { map, rooms: [entry, arena], start: entry, exit: null, biome, specials: [], arena, isBoss: true };
}

/* 在房間內找一個可站立的世界座標 */
function randomSpotIn(map, room, r = 12) {
  for (let i = 0; i < 60; i++) {
    const x = (rng.int(room.x + 1, room.x + room.w - 2) + 0.5) * TILE;
    const y = (rng.int(room.y + 1, room.y + room.h - 2) + 0.5) * TILE;
    if (map.free(x, y, r) && map.get(Math.floor(x / TILE), Math.floor(y / TILE)) === T_FLOOR) return { x, y };
  }
  const c = roomCenterWorld(room);
  return c;
}
