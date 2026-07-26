/* ===========================================================
   Sloth Abyss - main.js
   遊戲主體：狀態機、主迴圈、戰鬥判定、樓層流程
   =========================================================== */
'use strict';

const Game = {
  state: 'title',        // title | class | town | play | levelup | dead | paused | shop | win
  player: null,
  map: null, biome: null, floor: 1,
  enemies: [], projectiles: [], particles: [], texts: [], pickups: [],
  props: [], minions: [], hazards: [], telegraphs: [], timers: [],
  cam: { x: 0, y: 0 },
  time: 0, frame: 0, shakeAmt: 0,
  keys: {}, mouse: { x: 0, y: 0, wx: 0, wy: 0, down: false, rdown: false },
  runStats: null,
  bossActive: null,
  paused: false,
  seed: 0,
  killsThisFloor: 0,
  floorCleared: false,
  endless: false,

  /* ================= 初始化 ================= */
  init() {
    Save.loadMeta();
    Render.init(document.getElementById('game'));
    UI.init(this);
    this.bindInput();
    this.fx = FX;
    FX.G = this;
    this.last = performance.now();
    requestAnimationFrame(this.loop.bind(this));
    UI.showTitle();
  },

  bindInput() {
    const cv = document.getElementById('game');
    window.addEventListener('keydown', e => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      Audio.resume();
      if (k === 'escape') { if (this.state === 'play' || this.paused) UI.togglePause(); else UI.backFromPanel(); }
      if (this.state !== 'play') return;
      if (k === 'i' || k === 'tab') { e.preventDefault(); UI.toggleInventory(); }
      if (k === 'c') UI.toggleInventory();
      if (k === 'f') this.interact();
      if (k === ' ' || k === '1') { e.preventDefault(); this.player.usePotion(this); }
      if (k === '2') this.player.useMana(this);
      if (k === 'm') { const s = Save.meta.settings; s.minimap = !s.minimap; Save.saveMeta(); UI.syncMinimap(); }
      if (k === 'q') this.useSkillSlot(0);
      if (k === 'e') this.useSkillSlot(1);
      if (k === 'r') this.useSkillSlot(2);
    });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    cv.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    });
    cv.addEventListener('mousedown', e => {
      Audio.resume();
      if (e.button === 0) this.mouse.down = true;
      if (e.button === 2) { this.mouse.rdown = true; this.useSkillSlot(0); }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rdown = false;
    });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', () => {
      this.keys = {}; this.mouse.down = false;
      if (this.state === 'play') UI.togglePause();
    });
    // 觸控：點擊移動 + 自動攻擊
    cv.addEventListener('touchstart', e => {
      Audio.resume();
      const t = e.touches[0];
      this.mouse.x = t.clientX; this.mouse.y = t.clientY;
      this.mouse.down = true; this.touchMode = true;
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      const t = e.touches[0];
      this.mouse.x = t.clientX; this.mouse.y = t.clientY;
      e.preventDefault();
    }, { passive: false });
    cv.addEventListener('touchend', e => { this.mouse.down = false; e.preventDefault(); }, { passive: false });
  },

  useSkillSlot(i) {
    if (this.state !== 'play' || !this.player) return;
    const id = this.player.skillList[i];
    if (!id) return;
    this.player.castSkill(id, this.mouse.wx, this.mouse.wy, this);
  },

  /* ================= 開始一場 ================= */
  startRun(classId, opts) {
    opts = opts || {};
    const cls = CLASSES.find(c => c.id === classId) || CLASSES[0];
    this.seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    rng = new Rng(this.seed);
    this.player = new Player(cls, Save.meta);
    this.endless = false;
    this.runStats = { kills: 0, elites: 0, bosses: 0, gold: 0, souls: 0, items: 0, startTime: performance.now(), floor: 1, dmgDealt: 0, dmgTaken: 0 };
    const startFloor = opts.floor || 1;
    this.floor = startFloor;
    if (startFloor > 1) {
      // 深淵捷徑：補足等級與天賦，避免一進場就被輾壓
      const bonusLv = Math.round((startFloor - 1) * 1.25);
      this.player.level += bonusLv;
      this.player.pendingLevels += Math.min(6, bonusLv);
      this.player.gold += startFloor * 60;
      this.player.potions += 2;
      for (let s = 0; s < Math.min(3, Math.floor(startFloor / 5) + 1); s++) {
        const it = makeItem(rng.pick(SLOTS), startFloor, { luck: 40 });
        this.player.inventory.push(it);
      }
      this.player.recalc();
      this.player.hp = this.player.maxHp; this.player.mp = this.player.maxMp;
    }
    Save.meta.runs++;
    Save.saveMeta();
    this.enterFloor(startFloor, true);
    this.state = 'play';
    UI.hideAll();
    UI.showHud();
    if (this.player.pendingLevels > 0) this.processPendingLevels();
  },

  processPendingLevels() {
    if (this.player.pendingLevels > 0) UI.showLevelUp(this.rollTalents());
  },

  /* ================= 樓層 ================= */
  enterFloor(n, first) {
    this.floor = n;
    this.floorCleared = false;
    this.killsThisFloor = 0;
    const isBoss = (n % 5 === 0);
    const d = generateDungeon(n, isBoss);
    this.map = d.map; this.biome = d.biome; this.dungeon = d;
    this.enemies = []; this.projectiles = []; this.particles = []; this.texts = [];
    this.pickups = []; this.props = []; this.hazards = []; this.telegraphs = []; this.timers = [];
    this.minions = this.minions.filter(m => !m.dead && m.kind === 'sloth').slice(0, 3);
    this.bossActive = null;

    const sp = randomSpotIn(this.map, d.start, this.player.r);
    this.player.x = sp.x; this.player.y = sp.y;
    for (const m of this.minions) { m.x = sp.x + rng.range(-30, 30); m.y = sp.y + rng.range(-30, 30); }
    this.cam.x = sp.x; this.cam.y = sp.y;
    this.map.revealAround(sp.x, sp.y, 9);

    if (isBoss) {
      // 王的競技場整個揭開（只揭開地板與其相鄰牆面）
      const mp = this.map;
      for (let y = 0; y < mp.h; y++) for (let x = 0; x < mp.w; x++) {
        if (mp.get(x, y) !== T_WALL) { mp.seen[y * mp.w + x] = 1; continue; }
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++)
          if (mp.get(x + dx, y + dy) !== T_WALL) { mp.seen[y * mp.w + x] = 1; }
      }
      this.spawnBoss(d);
    } else {
      this.populateFloor(d);
      // 樓梯
      const ex = randomSpotIn(this.map, d.exit, 16);
      this.props.push({ kind: 'stairs', x: ex.x, y: ex.y, r: 30 });
    }

    this.runStats.floor = Math.max(this.runStats.floor, n);
    if (n > (Save.meta.bestFloor || 0)) { Save.meta.bestFloor = n; Save.saveMeta(); }
    UI.floorBanner(n, this.biome.name, isBoss);
    if (first && !Save.meta.seenTutorial) {
      Save.meta.seenTutorial = true; Save.saveMeta();
      setTimeout(() => UI.toast('WASD 移動 · 左鍵攻擊 · Q/E/R 技能 · F 互動 · 空白鍵喝藥水', '#9ad0ff', 9), 2000);
      setTimeout(() => UI.toast('找到藍色樓梯往下走，每 5 層有一位王', '#ffd45e', 8), 5000);
    }
    this.saveRun();
    Audio.play('stairs');
  },

  populateFloor(d) {
    const f = this.floor;
    const pool = this.biome.pool;
    const budget = 9 + f * 2.4;
    let spent = 0;
    const rooms = d.rooms.filter(r => r.kind !== 'start');
    for (const room of rooms) {
      if (room.kind === 'shop') {
        const sp = randomSpotIn(this.map, room, 16);
        this.props.push({ kind: 'shop', x: sp.x, y: sp.y, r: 34, stock: this.rollShop() });
        continue;
      }
      if (room.kind === 'shrine') {
        const sp = randomSpotIn(this.map, room, 16);
        this.props.push({ kind: 'shrine', x: sp.x, y: sp.y, r: 30, def: rng.pick(SHRINES), used: false });
      }
      if (room.kind === 'treasure') {
        const sp = randomSpotIn(this.map, room, 16);
        this.props.push({ kind: 'chest', x: sp.x, y: sp.y, r: 26, opened: false, big: true });
      }
      if (rng.chance(0.22)) {
        const sp = randomSpotIn(this.map, room, 16);
        this.props.push({ kind: 'chest', x: sp.x, y: sp.y, r: 26, opened: false });
      }
      // 敵人
      const isElite = room.kind === 'elite';
      const count = isElite ? 1 : rng.int(2, 4);
      for (let i = 0; i < count && spent < budget; i++) {
        const t = rng.pick(pool);
        const def = ENEMIES[t];
        const g = def.group ? rng.int(def.group[0], def.group[1]) : 1;
        for (let k = 0; k < g && spent < budget; k++) {
          const sp = randomSpotIn(this.map, room, def.r);
          this.spawnEnemy(t, sp.x, sp.y, { elite: isElite && k === 0 });
          spent += isElite ? 4 : 1;
        }
      }
      // 隨機精英
      if (!isElite && rng.chance(0.13 + f * 0.006)) {
        const t = rng.pick(pool);
        const sp = randomSpotIn(this.map, room, 20);
        this.spawnEnemy(t, sp.x, sp.y, { elite: true });
      }
    }
  },

  spawnBoss(d) {
    const key = this.biome.boss;
    const c = roomCenterWorld(d.arena);
    const scale = this.endless ? (1 + (this.floor - 20) * 0.25) : 1;
    const e = new Enemy(key, c.x, c.y - 40, this.floor, { boss: true, hpMul: scale, dmgMul: Math.sqrt(scale) });
    this.enemies.push(e);
    this.bossActive = e;
    UI.bossBar(e);
    Audio.play('boss');
    this.shake(20);
  },

  spawnEnemy(typeId, x, y, opts) {
    if (!this.map.free(x, y, ENEMIES[typeId] ? ENEMIES[typeId].r : 12)) {
      // 找附近可用點
      for (let i = 0; i < 12; i++) {
        const a = rng.range(0, TAU), dd = rng.range(20, 90);
        const nx = x + Math.cos(a) * dd, ny = y + Math.sin(a) * dd;
        if (this.map.free(nx, ny, 14)) { x = nx; y = ny; break; }
      }
    }
    const e = new Enemy(typeId, x, y, this.floor, opts || {});
    this.enemies.push(e);
    return e;
  },

  rollShop() {
    const n = 4;
    const items = [];
    for (let i = 0; i < n; i++) {
      const it = makeItem(rng.pick(SLOTS), this.floor + 2, { luck: 30 + this.player.luck });
      items.push(it);
    }
    items.push({ consumable: 'potion', name: '治療藥水 x2', value: 60 + this.floor * 8 });
    items.push({ consumable: 'mana', name: '法力藥水 x2', value: 50 + this.floor * 6 });
    return items;
  },

  nextFloor() {
    this.floor++;
    if (this.floor > 20 && !this.endless) this.endless = true;
    this.enterFloor(this.floor);
  },

  /* ================= 互動 ================= */
  interact() {
    const p = this.player;
    for (const o of this.props) {
      if (dist2(p.x, p.y, o.x, o.y) > o.r * o.r) continue;
      if (o.kind === 'stairs') { this.nextFloor(); return; }
      if (o.kind === 'chest' && !o.opened) {
        o.opened = true;
        Audio.play('chest');
        const n = o.big ? rng.int(2, 3) : 1;
        for (let i = 0; i < n; i++) {
          const it = rollDrop(this.floor + (o.big ? 2 : 0), this.player.luck + (o.big ? 25 : 0));
          this.dropItem(it, o.x, o.y);
        }
        this.dropGold(o.x, o.y, rng.int(20, 45) + this.floor * 12);
        if (rng.chance(0.35)) this.pickups.push({ kind: 'potion', x: o.x + rng.range(-20, 20), y: o.y + rng.range(-20, 20), seed: urng.range(0, 9) });
        this.fx.burst(o.x, o.y, '#ffd45e', 18, 130);
        return;
      }
      if (o.kind === 'shrine' && !o.used) { this.useShrine(o); return; }
      if (o.kind === 'shop') { UI.showShop(o); return; }
      if (o.kind === 'portal') { this.endRun(true); return; }
    }
  },

  useShrine(o) {
    o.used = true;
    const d = o.def;
    Audio.play('shrine');
    this.fx.bigRing(o.x, o.y, d.color, 130);
    const p = this.player;
    let msg = d.name;
    if (d.id === 'power') p.buffs.power = { t: d.dur, name: '力量', color: d.color };
    else if (d.id === 'haste') p.buffs.haste = { t: d.dur, name: '疾速', color: d.color };
    else if (d.id === 'shield') p.buffs.shield = { t: d.dur, name: '守護', color: d.color };
    else if (d.id === 'fortune') { p.buffs.fortune = { t: 999, name: '財富', color: d.color }; }
    else if (d.id === 'blood') {
      p.hp = p.maxHp; p.bonus.hpPct -= 10; p.recalc();
      msg = '血之獻祭';
    } else if (d.id === 'chaos') {
      if (rng.chance(0.6)) {
        const t = rng.pick(TALENTS.filter(t => t.rarity <= 2));
        t.apply(p); p.talents.push(t); p.recalc();
        msg = '混沌：' + t.name;
      } else {
        p.bonus.dmgPct -= 8; p.recalc();
        msg = '混沌：詛咒（傷害 -8%）';
        for (let i = 0; i < 5; i++) {
          const sp = { x: p.x + rng.range(-140, 140), y: p.y + rng.range(-140, 140) };
          if (this.map.free(sp.x, sp.y, 14)) this.spawnEnemy(rng.pick(this.biome.pool), sp.x, sp.y, { elite: rng.chance(0.2) });
        }
      }
    }
    this.floatText(p.x, p.y - 40, msg, d.color, 20);
    UI.updateHud();
  },

  /* ================= 尋路（flow field） ================= */
  computeFlow() {
    const map = this.map, w = map.w, h = map.h, n = w * h;
    if (!this.flow || this.flow.length !== n) { this.flow = new Int32Array(n); this.flowQ = new Int32Array(n); }
    this.flow.fill(-1);
    const q = this.flowQ;
    let head = 0, tail = 0;
    const px = Math.floor(this.player.x / TILE), py = Math.floor(this.player.y / TILE);
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const start = py * w + px;
    if (map.tiles[start] === T_WALL) return;
    this.flow[start] = 0; q[tail++] = start;
    while (head < tail) {
      const cur = q[head++];
      const d = this.flow[cur];
      if (d > 160) continue;
      const cx = cur % w, cy = (cur / w) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        const ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (this.flow[ni] !== -1 || map.tiles[ni] === T_WALL) continue;
        this.flow[ni] = d + 1;
        q[tail++] = ni;
      }
    }
  },

  flowAngle(e) {
    if (!this.flow) return null;
    const map = this.map, w = map.w, h = map.h;
    const cx = Math.floor(e.x / TILE), cy = Math.floor(e.y / TILE);
    if (cx < 0 || cy < 0 || cx >= w || cy >= h) return null;
    let best = this.flow[cy * w + cx];
    if (best < 0) return null;
    let bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (dx && dy && (map.solid(cx + dx, cy) || map.solid(cx, cy + dy))) continue;
        const d = this.flow[ny * w + nx];
        if (d >= 0 && d < best) { best = d; bx = dx; by = dy; }
      }
    }
    if (!bx && !by) return null;
    return angTo(e.x, e.y, (cx + bx + 0.5) * TILE, (cy + by + 0.5) * TILE);
  },

  /* ================= 戰鬥 ================= */
  meleeSwing(p, angle, range, arc, dmg, element) {
    let hit = 0;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d > range + e.r) continue;
      const a = angTo(p.x, p.y, e.x, e.y);
      if (Math.abs(angDiff(angle, a)) > arc / 2 + Math.atan2(e.r, Math.max(20, d))) continue;
      this.hitEnemy(e, dmg, { element, knock: 110 });
      hit++;
    }
    return hit;
  },

  hitEnemy(e, dmg, opts) {
    opts = opts || {};
    if (e.dead) return;
    const p = this.player;
    if (e.immune) { this.floatText(e.x, e.y - e.r - 8, '免疫', '#c0c8ff', 13); return; }

    let d = dmg * (p.elemMul[opts.element || 'phys'] || 1);
    // 處決
    if (p.bonus.execute && e.hp / e.maxHp < 0.2) d *= 1 + p.bonus.execute / 100;
    // 暴擊
    let crit = false;
    if (!opts.dot && rng.next() * 100 < p.critChance) { crit = true; d *= p.critDmg / 100; }
    // 敵人護甲
    if (e.armor) d *= 1 - Math.min(0.6, e.armor / (e.armor + 220));
    d = Math.max(1, d);

    e.hp -= d;
    e.flash = 1;
    if (!e.aggro) {
      e.aggro = true;
      // 叫醒附近同伴
      for (const o of this.enemies)
        if (!o.dead && !o.aggro && dist2(e.x, e.y, o.x, o.y) < 190 * 190) o.aggro = true;
    }
    this.runStats.dmgDealt += d;
    if (opts.knock && !e.isBoss) e.knockback(p.x, p.y, opts.knock * (e.elite ? 0.4 : 1));

    if (!opts.silent) {
      this.floatText(e.x + rng.range(-8, 8), e.y - e.r - 6, Math.round(d) + (crit ? '!' : ''),
        crit ? '#ffd45e' : (ELEMENT_COLOR[opts.element] || '#fff'), crit ? 20 : 15);
      this.fx.burst(e.x, e.y, ELEMENT_COLOR[opts.element] || '#ffdcc0', crit ? 8 : 4, crit ? 140 : 80);
      Audio.play(crit ? 'crit' : 'hit');
    }

    // 攻擊附加效果
    if (!opts.dot) {
      if (p.bonus.burnOnHit) e.addStatus('burn', 3, { dps: dmg * 0.22 });
      if (p.bonus.chillOnHit) e.addStatus('chill', 2.2, { amt: 0.35 });
      if (p.bonus.chain && rng.next() * 100 < p.bonus.chain && opts.source !== 'chain')
        this.chainLightning(e.x, e.y, dmg * 0.5, 3, e, false);
      if (p.hasPower('chain') && rng.chance(0.25) && opts.source !== 'chain')
        this.chainLightning(e.x, e.y, dmg * 0.6, 4, e, false);
      if (p.hasPower('bleed')) e.addStatus('poison', 3, { dps: dmg * 0.2 });
      if (p.lifeSteal > 0) {
        const heal = d * p.lifeSteal / 100;
        p.hp = Math.min(p.maxHp, p.hp + heal);
      }
    }

    if (e.hp <= 0) this.killEnemy(e);
  },

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    const p = this.player;
    this.runStats.kills++;
    this.killsThisFloor++;
    p.kills++;
    Save.meta.kills++;

    p.gainXp(e.xpValue, this);
    if (p.onKillHeal) p.hp = Math.min(p.maxHp, p.hp + p.onKillHeal);
    if (p.cls.passive.id === 'arcaneflow') p.mp = Math.min(p.maxMp, p.mp + 4);
    if (p.hasPower('soulgain')) p.mp = Math.min(p.maxMp, p.mp + 3);

    this.fx.burst(e.x, e.y, e.color, e.isBoss ? 60 : (e.elite ? 24 : 10), e.isBoss ? 260 : 140);
    Audio.play(e.isBoss ? 'explode' : 'die');

    // 死亡新星
    if (p.bonus.deathNova && rng.next() * 100 < p.bonus.deathNova) {
      for (let i = 0; i < 6; i++)
        this.spawnProjectile({
          x: e.x, y: e.y, angle: (TAU / 6) * i + rng.range(0, 1), speed: 300,
          dmg: p.wpnDmg * 0.6 * p.damageMultiplier(), r: 6, life: 1.2, from: 'player',
          color: '#c07ae8', element: 'void'
        });
    }
    // 精英死亡效果
    for (const m of (e.mods || [])) {
      if (m.id === 'fiery') { this.explode(e.x, e.y, 110, e.dmg * 1.2, 'fire', false); }
      if (m.id === 'splitter' && !e.minion) {
        for (let i = 0; i < 2; i++)
          this.spawnEnemy(e.typeId, e.x + rng.range(-25, 25), e.y + rng.range(-25, 25), { minion: true, hpMul: 0.35, dmgMul: 0.6 });
      }
    }

    // 掉落
    const fortune = p.buffs.fortune ? 1.6 : 1;
    const goldAmt = Math.round((rng.int(3, 9) + this.floor * 2.2) * (e.elite ? 4 : 1) * (e.isBoss ? 25 : 1) * (1 + p.goldFind / 100) * fortune);
    this.dropGold(e.x, e.y, goldAmt);

    const soulAmt = Math.max(1, Math.round((0.35 + this.floor * 0.14) * (e.elite ? 5 : 1) * (e.isBoss ? 40 : 1) * (1 + p.soulPct / 100)));
    this.dropSoul(e.x, e.y, soulAmt);

    let dropChance = (0.09 + this.floor * 0.002) * fortune;
    if (e.elite) dropChance = 1;
    if (e.minion) dropChance *= 0.25;
    if (rng.chance(dropChance)) {
      this.dropItem(rollDrop(this.floor + (e.elite ? 2 : 0), p.luck + (e.elite ? 20 : 0)), e.x, e.y);
    }
    if (p.hasPower('greed') && rng.chance(0.12)) this.dropItem(rollDrop(this.floor, p.luck), e.x, e.y);
    if (rng.chance(e.elite ? 0.5 : 0.05)) this.pickups.push({ kind: 'potion', x: e.x, y: e.y, seed: urng.range(0, 9) });

    if (e.elite) { this.runStats.elites++; }
    if (e.isBoss) {
      this.runStats.bosses++;
      Save.meta.bossKills++;
      this.bossActive = null;
      UI.hideBossBar();
      this.shake(24);
      // 王的寶藏
      for (let i = 0; i < 4; i++) this.dropItem(rollDrop(this.floor + 4, p.luck + 45), e.x + rng.range(-50, 50), e.y + rng.range(-50, 50));
      if (rng.chance(0.55)) this.dropItem(makeItem(rng.pick(SLOTS), this.floor + 5, { rarity: 4 }), e.x, e.y);
      const cx = e.x, cy = e.y;
      this.after(1.2, () => {
        if (this.floor >= 20 && !this.endless) {
          this.props.push({ kind: 'portal', x: cx, y: cy - 40, r: 40 });
          this.props.push({ kind: 'stairs', x: cx + 90, y: cy - 40, r: 30 });
          UI.toast('深淵之主已倒下！你可以離開，或繼續向下（無盡模式）', '#e0b0ff', 6);
          Save.meta.wins++; Save.saveMeta();
          this.state = 'play';
          UI.showVictory();
        } else {
          this.props.push({ kind: 'stairs', x: cx, y: cy, r: 30 });
        }
      });
    }
    Save.saveMeta();
  },

  damagePlayer(dmg, opts) {
    opts = opts || {};
    const p = this.player;
    if (p.dead || this.state !== 'play') return;
    if (p.invuln > 0 && !opts.dot) return;
    if (!opts.dot && p.dodge > 0 && rng.next() * 100 < p.dodge) {
      this.floatText(p.x, p.y - 30, '閃避', '#9bff9b', 15);
      return;
    }
    let d = dmg;
    // 護甲
    const red = p.armor / (p.armor + 180 + this.floor * 30);
    d *= (1 - Math.min(0.72, red));
    // 抗性
    if (opts.element && opts.element !== 'phys') d *= (1 - p.resAll / 100);
    if (p.buffs.shield) d *= 0.6;
    if (p.cls.passive.id === 'aegis' && p.recentHit > 0) d *= 0.85;
    d = Math.max(1, d);

    // 吸收護盾
    if (p.shield > 0) {
      const absorb = Math.min(p.shield, d);
      p.shield -= absorb; d -= absorb;
      this.floatText(p.x, p.y - 34, '護盾 -' + Math.round(absorb), '#8fd3ff', 13);
    }
    p.hp -= d;
    p.recentHit = 3;
    this.runStats.dmgTaken += d;
    if (!opts.dot) {
      p.invuln = Math.max(p.invuln, 0.28);
      this.shake(Math.min(10, 3 + d / p.maxHp * 40));
      Audio.play('hurt');
      if (p.hasPower('phase')) p.invuln = Math.max(p.invuln, 0.6);
    }
    if (d > 0.5) this.floatText(p.x + rng.range(-6, 6), p.y - 20, '-' + Math.round(d), '#ff6b6b', 16);
    this.fx.burst(p.x, p.y, '#ff4a4a', 5, 90);

    // 反傷
    if (p.thorns > 0 && opts.from && !opts.from.dead) {
      this.hitEnemy(opts.from, p.thorns, { element: 'phys', silent: true });
    }

    if (p.hp <= 0) {
      // 第二次呼吸 / 神器
      if (p.bonus.secondWind && !p.secondWindUsed) {
        p.secondWindUsed = true;
        p.hp = p.maxHp * 0.4;
        p.invuln = 1.5;
        this.floatText(p.x, p.y - 40, '第二次呼吸！', '#7bff9b', 22);
        this.fx.bigRing(p.x, p.y, '#7bff9b', 140);
        return;
      }
      if (p.hasPower('lastbreath') && !p.lastBreathUsed) {
        p.lastBreathUsed = true;
        p.hp = 1; p.invuln = 1.2;
        this.floatText(p.x, p.y - 40, '終末王冠！', '#ffd45e', 22);
        return;
      }
      if (p.revives > 0) {
        p.revives--;
        p.hp = p.maxHp * 0.6; p.invuln = 2;
        this.floatText(p.x, p.y - 40, '契約重生！', '#e0b0ff', 22);
        this.fx.bigRing(p.x, p.y, '#e0b0ff', 180);
        UI.updateHud();
        return;
      }
      this.playerDeath();
    }
  },

  playerDeath() {
    const p = this.player;
    p.dead = true;
    p.hp = 0;
    this.state = 'dead';
    Audio.play('die');
    this.shake(20);
    this.fx.burst(p.x, p.y, '#ff4a4a', 40, 220);
    Save.clearRun();
    this.endRun(false);
  },

  endRun(escaped) {
    const p = this.player;
    const meta = Save.meta;
    const souls = Math.round(p.souls * (escaped ? 1.25 : 1));
    meta.souls += souls;
    meta.totalSouls += souls;
    Save.clearRun();
    Save.saveMeta();
    this.runStats.soulsEarned = souls;
    this.runStats.escaped = escaped;
    this.state = 'dead';
    UI.showDeath(this.runStats, escaped);
  },

  /* ================= 效果 ================= */
  explode(x, y, r, dmg, element, fromPlayer) {
    this.fx.bigRing(x, y, ELEMENT_COLOR[element] || '#ff9a3c', r);
    this.fx.burst(x, y, ELEMENT_COLOR[element] || '#ff9a3c', 20, 200);
    Audio.play('explode');
    this.shake(6);
    if (fromPlayer) {
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (dist2(x, y, e.x, e.y) < (r + e.r) * (r + e.r)) this.hitEnemy(e, dmg, { element, knock: 100 });
      }
    } else {
      const p = this.player;
      if (dist2(x, y, p.x, p.y) < (r + p.r) * (r + p.r)) this.damagePlayer(dmg, { element });
      for (const m of this.minions) {
        if (!m.dead && dist2(x, y, m.x, m.y) < (r + m.r) * (r + m.r)) { m.hp -= dmg; if (m.hp <= 0) m.dead = true; }
      }
      if (element === 'fire') this.hazards.push({ kind: 'fire', x, y, r: r * 0.7, t: 3, dmg: dmg * 0.25, tick: 0 });
    }
  },

  chainLightning(x, y, dmg, jumps, from, toPlayer) {
    let cx = x, cy = y;
    const hit = new Set();
    if (from) hit.add(from);
    for (let i = 0; i < jumps; i++) {
      let best = null, bd = 260 * 260;
      if (toPlayer) {
        const p = this.player;
        this.fx.bolt(cx, cy, p.x, p.y, '#ffe066');
        this.damagePlayer(dmg, { element: 'lightning' });
        break;
      }
      for (const e of this.enemies) {
        if (e.dead || hit.has(e)) continue;
        const d = dist2(cx, cy, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      hit.add(best);
      this.fx.bolt(cx, cy, best.x, best.y, '#ffe066');
      this.hitEnemy(best, dmg * Math.pow(0.85, i), { element: 'lightning', source: 'chain' });
      cx = best.x; cy = best.y;
    }
    Audio.play('zap');
  },

  telegraphCircle(x, y, r, dur, cb, color) {
    this.telegraphs.push({ x, y, r, t: dur, dur, cb, color });
  },
  after(t, cb) { this.timers.push({ t, cb }); },
  addPuddle(x, y, dps) { this.hazards.push({ kind: 'puddle', x, y, r: 34, t: 6, dmg: dps, tick: 0 }); },

  spawnProjectile(o) { this.projectiles.push(new Projectile(o)); },

  dropGold(x, y, amt) {
    const n = clamp(Math.floor(amt / 12), 1, 6);
    for (let i = 0; i < n; i++)
      this.pickups.push({
        kind: 'gold', x: x + rng.range(-16, 16), y: y + rng.range(-16, 16),
        amt: Math.ceil(amt / n), seed: urng.range(0, 9)
      });
  },
  dropSoul(x, y, amt) {
    const n = clamp(Math.floor(amt / 4), 1, 5);
    for (let i = 0; i < n; i++)
      this.pickups.push({
        kind: 'soul', x: x + rng.range(-14, 14), y: y + rng.range(-14, 14),
        amt: Math.ceil(amt / n), seed: urng.range(0, 9)
      });
  },
  dropItem(it, x, y) {
    if (!it) return;
    this.pickups.push({ kind: 'item', item: it, x: x + rng.range(-14, 14), y: y + rng.range(-14, 14), seed: urng.range(0, 9), t: 0 });
    if (it.rarity >= 3) { Audio.play('legendary'); UI.toast(`${RARITY[it.rarity].name}掉落：${it.name}`, RARITY[it.rarity].color, 3); }
  },

  floatText(x, y, text, color, size) {
    this.texts.push({ x, y, text, color, size: size || 14, life: 0.9, maxLife: 0.9, vy: -34 });
  },
  shake(a) { this.shakeAmt = Math.min(24, this.shakeAmt + a * (Save.meta.settings.shake || 1)); },

  onLevelUp() {
    Audio.play('levelup');
    this.fx.bigRing(this.player.x, this.player.y, '#ffd45e', 120);
    this.floatText(this.player.x, this.player.y - 50, '升級！ Lv.' + this.player.level, '#ffd45e', 24);
    UI.showLevelUp(this.rollTalents());
    this.state = 'levelup';
  },

  rollTalents() {
    const p = this.player;
    const isProj = p.cls.attack.kind === 'bolt';
    let pool = TALENTS.filter(t => {
      if (t.tag === 'proj' && !isProj) return false;
      if (t.tag === 'melee' && isProj) return false;
      const taken = p.talents.filter(x => x.id === t.id).length;
      if (t.id === 't_glass' && taken >= 1) return false;
      if (t.id === 't_second' && taken >= 1) return false;
      return taken < 4;
    });
    // 技能天賦
    const skillPool = SKILL_TALENTS.filter(st => !p.skills[st.skill] && p.skillList.length < 3);
    const combined = pool.concat(skillPool.length ? rng.sample(skillPool, 1) : []);
    const out = [];
    const picked = new Set();
    let guard = 0;
    while (out.length < 3 && guard++ < 100) {
      const t = rng.pick(combined);
      if (!t || picked.has(t.id)) continue;
      picked.add(t.id);
      out.push(t);
    }
    return out;
  },

  applyTalent(t) {
    const p = this.player;
    if (t.skill) {
      p.skills[t.skill] = true;
      if (p.skillList.length < 3) p.skillList.push(t.skill);
    } else {
      t.apply(p);
      p.talents.push(t);
    }
    p.recalc();
    p.pendingLevels = Math.max(0, p.pendingLevels - 1);
    UI.updateHud();
    if (p.pendingLevels > 0) {
      UI.showLevelUp(this.rollTalents());
    } else {
      this.state = 'play';
      UI.hidePanels();
      this.buildBarIfNeeded();
    }
  },

  buildBarIfNeeded() {
    if (this._skillCount !== this.player.skillList.length) {
      this._skillCount = this.player.skillList.length;
      UI.buildSkillbar();
    }
  },

  /* ================= 存檔 ================= */
  saveRun() {
    if (!this.player || this.state === 'dead') return;
    const p = this.player;
    Save.saveRun({
      cls: p.cls.id, floor: this.floor, level: p.level, xp: p.xp,
      hp: p.hp, mp: p.mp, gold: p.gold, souls: p.souls, potions: p.potions, manaPots: p.manaPots,
      bonus: p.bonus, talents: p.talents.map(t => t.id), skills: p.skillList,
      gear: p.gear, inv: p.inventory, revives: p.revives, endless: this.endless,
      stats: this.runStats
    });
  },
  loadRun() {
    const d = Save.loadRun();
    if (!d) return false;
    const cls = CLASSES.find(c => c.id === d.cls) || CLASSES[0];
    this.seed = (Date.now() ^ 0x1234) >>> 0;
    rng = new Rng(this.seed);
    const p = new Player(cls, Save.meta);
    p.level = d.level; p.xp = d.xp;
    p.bonus = Object.assign(EMPTY_BONUS(), d.bonus || {});
    p.talents = (d.talents || []).map(id => TALENTS.find(t => t.id === id)).filter(Boolean);
    p.gear = d.gear || {};
    p.inventory = d.inv || [];
    p.gold = d.gold; p.souls = d.souls; p.potions = d.potions; p.manaPots = d.manaPots || 0;
    p.revives = d.revives || 0;
    p.skillList = d.skills && d.skills.length ? d.skills : [cls.startSkill];
    p.skills = {}; p.skillList.forEach(s => p.skills[s] = true);
    p.pendingLevels = 0;
    p.recalc();
    p.hp = Math.max(1, d.hp); p.mp = d.mp;
    this.player = p;
    this.endless = !!d.endless;
    this.runStats = d.stats || { kills: 0, elites: 0, bosses: 0, gold: 0, souls: 0, items: 0, startTime: performance.now(), floor: d.floor, dmgDealt: 0, dmgTaken: 0 };
    this.floor = d.floor;
    this.minions = [];
    this.enterFloor(d.floor, true);
    this.state = 'play';
    UI.hideAll(); UI.showHud();
    return true;
  },

  /* ================= 主迴圈 ================= */
  loop(now) {
    requestAnimationFrame(this.loop.bind(this));
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    this.frame++;

    if (this.state === 'play') this.update(dt);
    else if (this.state === 'levelup' || this.state === 'shop' || this.state === 'paused') {
      // 暫停但仍畫面更新
      this.updateVisualOnly(dt);
    }
    const inWorld = this.player && (this.state === 'play' || this.state === 'levelup' ||
      this.state === 'dead' || this.state === 'shop' || this.state === 'paused');
    if (!inWorld) { Render.drawMenuBg(now / 1000); return; }
    if (inWorld) {
      Render.draw(this);
      if (this.frame % 3 === 0 && Save.meta.settings.minimap) UI.drawMinimap();
      if (this.frame % 6 === 0) UI.updateHud();
    }
  },

  updateVisualOnly(dt) {
    this.time += dt;
    this.shakeAmt *= Math.pow(0.001, dt);
    for (const p of this.particles) { p.life -= dt; if (p.life <= 0) p.dead = true; else { p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; } }
    removeDead(this.particles);
  },

  update(dt) {
    this.time += dt;
    const p = this.player;

    // 輸入 → 移動
    let mx = 0, my = 0;
    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;

    // 世界滑鼠座標
    this.mouse.wx = (this.mouse.x - Render.w / 2) / Render.zoom + this.cam.x;
    this.mouse.wy = (this.mouse.y - Render.h / 2) / Render.zoom + this.cam.y;

    if (this.touchMode && this.mouse.down && (mx === 0 && my === 0)) {
      const d = dist(p.x, p.y, this.mouse.wx, this.mouse.wy);
      if (d > 40) { const a = angTo(p.x, p.y, this.mouse.wx, this.mouse.wy); mx = Math.cos(a); my = Math.sin(a); }
    }
    const len = Math.hypot(mx, my);
    if (len > 0) { p.vx = mx / len; p.vy = my / len; } else { p.vx = 0; p.vy = 0; }
    p.moveWith(dt, this.map, p.moveSpeed);
    p.update(dt, this);
    if (p.recentHit > 0) p.recentHit -= dt;

    // 攻擊
    if (this.mouse.down) {
      if (this.touchMode) {
        // 觸控：自動攻擊最近敵人
        let best = null, bd = 1e9;
        for (const e of this.enemies) { if (e.dead) continue; const d = dist2(p.x, p.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
        if (best && bd < 420 * 420) p.tryAttack(best.x, best.y, this);
      } else {
        p.tryAttack(this.mouse.wx, this.mouse.wy, this);
      }
    }
    if (!this.touchMode) p.facing = angTo(p.x, p.y, this.mouse.wx, this.mouse.wy);

    // 相機
    const tx = p.x + (this.mouse.wx - p.x) * 0.12, ty = p.y + (this.mouse.wy - p.y) * 0.12;
    this.cam.x = lerp(this.cam.x, this.touchMode ? p.x : tx, 1 - Math.pow(0.0001, dt));
    this.cam.y = lerp(this.cam.y, this.touchMode ? p.y : ty, 1 - Math.pow(0.0001, dt));
    this.shakeAmt *= Math.pow(0.0015, dt);

    this.map.revealAround(p.x, p.y, 9);

    // 尋路場（每 0.22 秒重算一次）
    this.flowTick = (this.flowTick || 0) - dt;
    if (this.flowTick <= 0) { this.flowTick = 0.22; this.computeFlow(); }

    // 實體
    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    for (const m of this.minions) if (!m.dead) m.update(dt, this);
    for (const pr of this.projectiles) if (!pr.dead) pr.update(dt, this);

    // 計時器
    for (const t of this.timers) {
      t.t -= dt;
      if (t.t <= 0) { t.cb(); t.done = true; }
    }
    this.timers = this.timers.filter(t => !t.done);

    // 預告圈
    for (const t of this.telegraphs) {
      t.t -= dt;
      if (t.t <= 0) { t.cb && t.cb(); t.dead = true; }
    }
    removeDead(this.telegraphs);

    // 地形危害
    for (const h of this.hazards) {
      h.t -= dt;
      if (h.t <= 0) { h.dead = true; continue; }
      h.tick -= dt;
      if (h.kind === 'blackhole') {
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = dist(h.x, h.y, e.x, e.y);
          if (d < h.r && !e.isBoss) {
            const a = angTo(e.x, e.y, h.x, h.y);
            e.x += Math.cos(a) * 90 * dt; e.y += Math.sin(a) * 90 * dt;
          }
        }
        if (h.tick <= 0) {
          h.tick = 0.35;
          for (const e of this.enemies)
            if (!e.dead && dist2(h.x, h.y, e.x, e.y) < h.r * h.r)
              this.hitEnemy(e, h.dmg, { element: 'void', silent: true });
        }
      } else if (h.tick <= 0) {
        h.tick = 0.5;
        if (dist2(h.x, h.y, this.player.x, this.player.y) < h.r * h.r)
          this.damagePlayer(h.dmg, { element: h.kind === 'fire' ? 'fire' : 'poison', dot: true });
      }
    }
    removeDead(this.hazards);

    // 岩漿地形
    const ti = Math.floor(p.y / TILE) * this.map.w + Math.floor(p.x / TILE);
    if (this.map.tiles[ti] === T_LAVA) {
      this.lavaTick = (this.lavaTick || 0) + dt;
      if (this.lavaTick > 0.4) { this.lavaTick = 0; this.damagePlayer(p.maxHp * 0.03 + this.floor, { element: 'fire', dot: true }); }
    }

    // 拾取
    const pr2 = p.pickupRange * p.pickupRange;
    for (const pk of this.pickups) {
      if (pk.dead) continue;
      pk.t = (pk.t || 0) + dt;
      const d2 = dist2(p.x, p.y, pk.x, pk.y);
      const auto = pk.kind !== 'item' || Save.meta.settings.autoPickup;
      if (d2 < pr2 * (pk.kind === 'item' ? 0.35 : 1)) {
        if (auto || d2 < 26 * 26) {
          // 吸附
          const a = angTo(pk.x, pk.y, p.x, p.y);
          const sp = 260;
          pk.x += Math.cos(a) * sp * dt; pk.y += Math.sin(a) * sp * dt;
        }
      }
      if (d2 < 22 * 22) this.pickup(pk);
    }
    removeDead(this.pickups);
    removeDead(this.enemies);
    removeDead(this.minions);
    removeDead(this.projectiles);

    // 粒子
    for (const pa of this.particles) {
      pa.life -= dt;
      if (pa.life <= 0) { pa.dead = true; continue; }
      pa.x += (pa.vx || 0) * dt; pa.y += (pa.vy || 0) * dt;
      if (pa.drag) { pa.vx *= Math.pow(pa.drag, dt); pa.vy *= Math.pow(pa.drag, dt); }
    }
    removeDead(this.particles);
    for (const t of this.texts) {
      t.life -= dt;
      if (t.life <= 0) { t.dead = true; continue; }
      t.y += t.vy * dt; t.vy += 40 * dt;
    }
    removeDead(this.texts);

    // 樓層清空提示
    if (!this.floorCleared && this.enemies.length === 0 && this.floor % 5 !== 0) {
      this.floorCleared = true;
      UI.toast('本層已清空！', '#7bff9b', 2.2);
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.08);
    }
    // 定期存檔
    this.saveTick = (this.saveTick || 0) + dt;
    if (this.saveTick > 12) { this.saveTick = 0; this.saveRun(); }
  },

  pickup(pk) {
    const p = this.player;
    pk.dead = true;
    if (pk.kind === 'gold') {
      p.gold += pk.amt; this.runStats.gold += pk.amt;
      Audio.play('coin');
    } else if (pk.kind === 'soul') {
      p.souls += pk.amt; this.runStats.souls += pk.amt;
      Audio.play('pickup');
    } else if (pk.kind === 'potion') {
      p.potions++; Audio.play('pickup');
      this.floatText(p.x, p.y - 30, '+藥水', '#ff5a6e', 14);
    } else if (pk.kind === 'item') {
      this.runStats.items++;
      Audio.play('pickup');
      const cur = p.gear[pk.item.slot] || (pk.item.slot === 'ring1' ? p.gear.ring2 : null);
      if (!cur) {
        p.equip(pk.item);
        this.floatText(p.x, p.y - 30, '裝備：' + pk.item.name, RARITY[pk.item.rarity].color, 14);
      } else {
        p.inventory.push(pk.item);
        if (itemScore(pk.item) > itemScore(cur) * 1.02) UI.flashUpgrade();
        this.floatText(p.x, p.y - 30, pk.item.name, RARITY[pk.item.rarity].color, 14);
      }
      UI.updateHud();
    }
  }
};

/* ================= 粒子特效工廠 ================= */
const FX = {
  G: null,
  burst(x, y, color, n, speed) {
    const G = this.G;
    if (G.particles.length > 900) return;
    for (let i = 0; i < n; i++) {
      const a = urng.range(0, TAU), s = urng.range(speed * 0.3, speed);
      G.particles.push({
        kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: urng.range(0.25, 0.6), maxLife: 0.6, color, size: urng.range(2, 5), drag: 0.02
      });
    }
  },
  spark(x, y, color) {
    const G = this.G;
    if (G.particles.length > 900) return;
    G.particles.push({
      kind: 'spark', x, y, vx: urng.range(-14, 14), vy: urng.range(-14, 14),
      life: 0.24, maxLife: 0.24, color, size: 3, drag: 0.3
    });
  },
  ring(x, y, color, r) {
    this.G.particles.push({ kind: 'ring', x, y, color, r, life: 0.4, maxLife: 0.4 });
  },
  bigRing(x, y, color, r) {
    this.G.particles.push({ kind: 'ring', x, y, color, r: r * 0.5, life: 0.55, maxLife: 0.55 });
    this.G.particles.push({ kind: 'shock', x, y, color, r, life: 0.35, maxLife: 0.35 });
  },
  swing(x, y, a, r, arc, color) {
    this.G.particles.push({ kind: 'swing', x, y, a, r, arc, color, life: 0.22, maxLife: 0.22 });
  },
  bolt(x, y, x2, y2, color) {
    const seed = [];
    for (let i = 0; i < 10; i++) seed.push(urng.next());
    this.G.particles.push({ kind: 'bolt', x, y, x2, y2, color, seed, life: 0.22, maxLife: 0.22 });
  },
  trailLine(x, y, x2, y2, color) {
    this.G.particles.push({ kind: 'line', x, y, x2, y2, color, life: 0.35, maxLife: 0.35 });
  },
  meteorFall(x, y) {
    this.G.particles.push({ kind: 'meteor', x, y, color: '#ff9a3c', life: 0.65, maxLife: 0.65 });
  }
};

window.addEventListener('load', () => Game.init());
