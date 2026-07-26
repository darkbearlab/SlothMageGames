/* ===========================================================
   Sloth Abyss - entity.js
   玩家、敵人、投射物、召喚物、戰鬥計算
   =========================================================== */
'use strict';

const ELEMENT_COLOR = {
  phys: '#ffffff', fire: '#ff7a3c', cold: '#7fd4ff',
  lightning: '#ffe066', poison: '#9bf56a', void: '#c07ae8'
};

/* ---------- 基礎實體 ---------- */
class Entity {
  constructor(x, y, r) {
    this.x = x; this.y = y; this.r = r;
    this.vx = 0; this.vy = 0;
    this.dead = false;
    this.hp = 1; this.maxHp = 1;
    this.status = {};
    this.flash = 0;
    this.facing = 0;
  }
  addStatus(type, dur, data) {
    const s = this.status[type];
    if (s && s.t > dur) { Object.assign(s, data || {}); return; }
    this.status[type] = Object.assign({ t: dur }, data || {});
  }
  hasStatus(t) { return this.status[t] && this.status[t].t > 0; }
  updateStatus(dt, game) {
    for (const k in this.status) {
      const s = this.status[k];
      s.t -= dt;
      if (s.t <= 0) { delete this.status[k]; continue; }
      if (k === 'burn' || k === 'poison') {
        s.acc = (s.acc || 0) + dt;
        if (s.acc >= 0.5) {
          s.acc -= 0.5;
          const dmg = s.dps * 0.5;
          if (this.isPlayer) game.damagePlayer(dmg, { element: k === 'burn' ? 'fire' : 'poison', dot: true });
          else game.hitEnemy(this, dmg, { element: k === 'burn' ? 'fire' : 'poison', dot: true, silent: true });
        }
      }
    }
  }
  moveWith(dt, map, speed) {
    let sp = speed;
    if (this.hasStatus('chill')) sp *= (1 - this.status.chill.amt);
    if (this.hasStatus('stun')) sp = 0;
    let dx = this.vx * sp * dt, dy = this.vy * sp * dt;
    // 擊退
    if (this.kbx || this.kby) {
      dx += this.kbx * dt; dy += this.kby * dt;
      this.kbx *= Math.pow(0.001, dt); this.kby *= Math.pow(0.001, dt);
      if (Math.abs(this.kbx) < 4) this.kbx = 0;
      if (Math.abs(this.kby) < 4) this.kby = 0;
    }
    if (this.ghost) { this.x += dx; this.y += dy; return; }
    if (map.free(this.x + dx, this.y, this.r)) this.x += dx;
    else {
      if (map.free(this.x + dx * 0.4, this.y, this.r)) this.x += dx * 0.4;
      this.kbx = 0;
    }
    if (map.free(this.x, this.y + dy, this.r)) this.y += dy;
    else {
      if (map.free(this.x, this.y + dy * 0.4, this.r)) this.y += dy * 0.4;
      this.kby = 0;
    }
  }
  knockback(fromX, fromY, force) {
    const a = angTo(fromX, fromY, this.x, this.y);
    this.kbx = (this.kbx || 0) + Math.cos(a) * force;
    this.kby = (this.kby || 0) + Math.sin(a) * force;
  }
}

/* =========================================================
   玩家
   ========================================================= */
const EMPTY_BONUS = () => ({
  str: 0, dex: 0, int: 0, vit: 0, hp: 0, hpPct: 0, mp: 0, armor: 0, dmgPct: 0, atkSpd: 0,
  crit: 0, critDmg: 0, speedPct: 0, lifeSteal: 0, onKill: 0, cdr: 0, mpRegen: 0, hpRegen: 0,
  resAll: 0, fireDmg: 0, coldDmg: 0, lightDmg: 0, poisonDmg: 0, gold: 0, thorns: 0,
  pickup: 0, projectiles: 0, pierce: 0, explodeShot: 0, meleeRange: 0, chain: 0,
  burnOnHit: 0, chillOnHit: 0, lowHpDmg: 0, execute: 0, soulPct: 0, orbs: 0,
  deathNova: 0, autoShield: 0, secondWind: 0, dodge: 0, luck: 0, minionCap: 0
});

const MAIN_ATTR = { berserker: 'str', sorceress: 'int', shadowblade: 'dex', summoner: 'int', templar: 'str' };

class Player extends Entity {
  constructor(cls, meta) {
    super(0, 0, 12);
    this.isPlayer = true;
    this.cls = cls;
    this.level = 1;
    this.xp = 0;
    this.pendingLevels = 0;
    this.attrs = Object.assign({}, cls.base);
    this.bonus = EMPTY_BONUS();
    this.gear = {};
    this.inventory = [];
    this.gold = 0;
    this.souls = 0;
    this.potions = 3;
    this.manaPots = 1;
    this.skills = {};
    this.cds = {};
    this.talents = [];
    this.attackTimer = 0;
    this.invuln = 0;
    this.shield = 0;
    this.shieldTimer = 0;
    this.buffs = {};
    this.orbAngle = 0;
    this.minions = [];
    this.revives = 0;
    this.secondWindUsed = false;
    this.dashTimer = 0;
    this.kills = 0;
    this.stats = {};
    this.channel = null;

    // meta 升級
    const up = meta.upgrades || {};
    this.metaBonus = {
      hp: (up.m_hp || 0) * 12,
      dmgPct: (up.m_dmg || 0) * 5,
      armor: (up.m_armor || 0) * 15,
      resAll: (up.m_armor || 0) * 3,
      speedPct: (up.m_speed || 0) * 3,
      soulPct: (up.m_souls || 0) * 12,
      gold: (up.m_gold || 0) * 10,
      luck: (up.m_luck || 0) * 8,
      potionPct: (up.m_potion || 0) * 8
    };
    this.gold = (up.m_gold || 0) * 120;
    this.potions = 3 + (up.m_potion || 0);
    this.revives = up.m_revive || 0;
    const startLv = up.m_level || 0;

    // 起始裝備
    const w = makeItem('weapon', 1, { baseId: cls.startWeapon, rarity: 0 });
    this.equip(w, true);

    this.skills[cls.startSkill] = true;
    this.skillList = [cls.startSkill];

    for (let i = 0; i < startLv; i++) { this.level++; this.pendingLevels++; }
    this.recalc();
    this.hp = this.maxHp; this.mp = this.maxMp;
  }

  get xpNext() { return Math.floor(22 * Math.pow(this.level, 1.42)); }

  gearStat(k) {
    let v = 0;
    for (const s of SLOTS) { const it = this.gear[s]; if (it && it.stats[k]) v += it.stats[k]; }
    return v;
  }
  hasPower(p) {
    for (const s of SLOTS) { const it = this.gear[s]; if (it && it.power === p) return true; }
    return false;
  }

  recalc() {
    const b = this.bonus, m = this.metaBonus;
    const g = (k) => this.gearStat(k) + b[k] + (m[k] || 0);
    const lv = this.level - 1;
    this.str = this.cls.base.str + Math.floor(lv * 1.1) + this.gearStat('str') + b.str;
    this.dex = this.cls.base.dex + Math.floor(lv * 1.0) + this.gearStat('dex') + b.dex;
    this.int = this.cls.base.int + Math.floor(lv * 1.0) + this.gearStat('int') + b.int;
    this.vit = this.cls.base.vit + Math.floor(lv * 1.15) + this.gearStat('vit') + b.vit;

    const oldMax = this.maxHp || 0;
    this.maxHp = Math.round((this.cls.hp + lv * 9 + this.vit * 5 + g('hp')) * (1 + b.hpPct / 100));
    this.maxMp = Math.round(this.cls.mp + lv * 4 + this.int * 2.2 + g('mp'));
    if (oldMax && this.maxHp > oldMax) this.hp += (this.maxHp - oldMax);
    this.hp = Math.min(this.hp || this.maxHp, this.maxHp);
    this.mp = Math.min(this.mp === undefined ? this.maxMp : this.mp, this.maxMp);

    this.armor = Math.round(g('armor') + (this.cls.passive.id === 'aegis' ? 40 : 0));
    this.resAll = Math.min(75, g('resAll'));
    this.critChance = 5 + this.dex * 0.22 + g('crit') + (this.cls.passive.id === 'backstab' ? 8 : 0);
    this.critDmg = 150 + g('critDmg') + (this.cls.passive.id === 'backstab' ? 40 : 0);
    this.cdr = Math.min(60, g('cdr'));
    this.lifeSteal = g('lifeSteal');
    this.onKillHeal = g('onKill');
    this.hpRegen = g('hpRegen') + this.vit * 0.05;
    this.mpRegen = g('mpRegen') + 1.5 + this.int * 0.045;
    this.thorns = g('thorns');
    this.goldFind = g('gold');
    this.luck = g('luck');
    this.moveSpeed = this.cls.speed * (1 + g('speedPct') / 100);
    this.pickupRange = 46 + b.pickup;
    this.soulPct = g('soulPct');
    this.dodge = Math.min(60, b.dodge);

    const mainAttr = this[MAIN_ATTR[this.cls.id]];
    this.dmgMul = (1 + g('dmgPct') / 100) * (1 + mainAttr * 0.012);
    this.elemMul = {
      phys: 1, fire: 1 + g('fireDmg') / 100, cold: 1 + g('coldDmg') / 100,
      lightning: 1 + g('lightDmg') / 100, poison: 1 + g('poisonDmg') / 100, void: 1
    };

    const w = this.gear.weapon;
    this.wpnDmg = w ? w.dmg : 5;
    this.wpnCd = (w ? w.cd : 1) * (this.cls.attack.cd / 1.0);
    this.atkInterval = this.wpnCd / (1 + (g('atkSpd') + this.dex * 0.15) / 100);
    this.atkSpdPct = g('atkSpd') + this.dex * 0.15;
    this.minionCap = 3 + b.minionCap + (this.cls.passive.id === 'pack' ? 0 : 0);
  }

  damageMultiplier() {
    let m = this.dmgMul;
    if (this.cls.passive.id === 'bloodrage' && this.hp < this.maxHp * 0.5) m *= 1.3;
    if (this.bonus.lowHpDmg && this.hp < this.maxHp * 0.35) m *= 1 + this.bonus.lowHpDmg / 100;
    if (this.buffs.power) m *= 1.5;
    if (this.buffs.chaosDmg) m *= this.buffs.chaosDmg.mul;
    return m;
  }
  attackSpeedMul() {
    let m = 1;
    if (this.buffs.haste) m *= 1.35;
    return m;
  }

  equip(item, silent) {
    let slot = item.slot;
    if (slot === 'ring1' && this.gear.ring1 && !this.gear.ring2) slot = 'ring2';
    const prev = this.gear[slot];
    this.gear[slot] = item;
    item.slot = slot;
    const i = this.inventory.indexOf(item);
    if (i >= 0) this.inventory.splice(i, 1);
    if (prev) this.inventory.push(prev);
    this.recalc();
    return prev;
  }
  unequip(slot) {
    const it = this.gear[slot];
    if (!it) return;
    delete this.gear[slot];
    this.inventory.push(it);
    this.recalc();
  }

  gainXp(n, game) {
    this.xp += n;
    let leveled = false;
    while (this.xp >= this.xpNext) {
      this.xp -= this.xpNext;
      this.level++;
      this.pendingLevels++;
      this.recalc();
      this.hp = this.maxHp; this.mp = this.maxMp;
      leveled = true;
    }
    if (leveled && game.state === 'play') game.onLevelUp();
  }

  skillCd(id) {
    const s = SKILLS[id];
    return s.cd * (1 - this.cdr / 100);
  }

  update(dt, game) {
    this.updateStatus(dt, game);
    this.invuln = Math.max(0, this.invuln - dt);
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    for (const k in this.cds) this.cds[k] = Math.max(0, this.cds[k] - dt);
    for (const k in this.buffs) {
      this.buffs[k].t -= dt;
      if (this.buffs[k].t <= 0) delete this.buffs[k];
    }
    // 回復
    this.hp = Math.min(this.maxHp, this.hp + this.hpRegen * dt);
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * dt);
    if (this.cls.passive.id === 'pack') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.004 * dt);
    // 自動護盾
    if (this.bonus.autoShield) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldTimer = 8;
        this.shield = Math.max(this.shield, this.maxHp * 0.18 * this.bonus.autoShield);
        game.fx.ring(this.x, this.y, '#8fd3ff', 40);
      }
    }
    // 環繞球
    if (this.bonus.orbs > 0) {
      this.orbAngle += dt * 2.4;
      const n = this.bonus.orbs;
      for (let i = 0; i < n; i++) {
        const a = this.orbAngle + (TAU / n) * i;
        const ox = this.x + Math.cos(a) * 62, oy = this.y + Math.sin(a) * 62;
        for (const e of game.enemies) {
          if (e.dead || e.orbHit > game.time) continue;
          if (dist2(ox, oy, e.x, e.y) < (e.r + 12) * (e.r + 12)) {
            e.orbHit = game.time + 0.45;
            game.hitEnemy(e, this.wpnDmg * 0.55 * this.damageMultiplier(), { element: 'void', source: 'orb' });
            game.fx.burst(ox, oy, '#c07ae8', 5, 90);
          }
        }
      }
    }
    // 燃燒光環（神器）
    if (this.hasPower('burnaura')) {
      this.auraTick = (this.auraTick || 0) + dt;
      if (this.auraTick > 0.4) {
        this.auraTick = 0;
        for (const e of game.enemies) {
          if (!e.dead && dist2(this.x, this.y, e.x, e.y) < 90 * 90)
            game.hitEnemy(e, this.wpnDmg * 0.3 * this.damageMultiplier(), { element: 'fire', silent: true });
        }
      }
    }
    if (this.dashTimer > 0) this.dashTimer -= dt;
  }

  /* 基本攻擊 */
  tryAttack(tx, ty, game) {
    if (this.attackTimer > 0 || this.hasStatus('stun')) return;
    this.attackTimer = this.atkInterval / this.attackSpeedMul();
    const a = angTo(this.x, this.y, tx, ty);
    this.facing = a;
    const atk = this.cls.attack;
    const dmg = this.wpnDmg * this.damageMultiplier();
    const kind = (this.gear.weapon && this.gear.weapon.wtags && this.gear.weapon.wtags.includes('caster') && atk.kind === 'melee')
      ? 'bolt' : atk.kind;

    if (kind === 'melee') {
      const range = atk.range + this.bonus.meleeRange;
      game.meleeSwing(this, a, range, atk.arc, dmg, atk.element || 'phys');
      game.fx.swing(this.x, this.y, a, range, atk.arc, atk.color);
      Audio.play('swing');
    } else {
      const n = 1 + this.bonus.projectiles;
      const spread = n > 1 ? 0.16 : 0;
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * spread;
        game.spawnProjectile({
          x: this.x, y: this.y, angle: a + off, speed: atk.speed || 420,
          dmg: dmg, r: 6, life: 1.6, from: 'player',
          color: atk.color, element: atk.element || 'phys',
          pierce: this.bonus.pierce, explode: this.bonus.explodeShot > 0
        });
      }
      Audio.play('shoot');
    }
  }

  castSkill(id, tx, ty, game) {
    const sk = SKILLS[id];
    if (!sk) return false;
    if ((this.cds[id] || 0) > 0) return false;
    if (this.mp < sk.mana) { game.floatText(this.x, this.y - 30, '法力不足', '#7fb0ff', 12); return false; }
    if (this.hasStatus('stun')) return false;
    this.mp -= sk.mana;
    this.cds[id] = this.skillCd(id);
    sk.cast(this, tx, ty, game);
    return true;
  }

  usePotion(game) {
    if (this.potions <= 0 || this.hp >= this.maxHp) return;
    this.potions--;
    const heal = this.maxHp * (0.45 * (1 + (this.metaBonus.potionPct || 0) / 100));
    this.hp = Math.min(this.maxHp, this.hp + heal);
    game.floatText(this.x, this.y - 26, '+' + Math.round(heal), '#7bff9b', 16);
    game.fx.burst(this.x, this.y, '#ff5a6e', 14, 120);
    Audio.play('potion');
  }
  useMana(game) {
    if (this.manaPots <= 0 || this.mp >= this.maxMp) return;
    this.manaPots--;
    this.mp = Math.min(this.maxMp, this.mp + this.maxMp * 0.6);
    game.floatText(this.x, this.y - 26, '+法力', '#7fb0ff', 15);
    Audio.play('potion');
  }
}

/* =========================================================
   敵人
   ========================================================= */
function floorScale(floor) {
  return {
    hp: 1 + (floor - 1) * 0.34 + Math.pow(floor, 1.85) * 0.012,
    dmg: 1 + (floor - 1) * 0.23 + Math.pow(floor, 1.5) * 0.006,
    xp: 1 + (floor - 1) * 0.28
  };
}

class Enemy extends Entity {
  constructor(typeId, x, y, floor, opts) {
    opts = opts || {};
    const def = opts.boss ? BOSSES[typeId] : ENEMIES[typeId];
    super(x, y, def.r);
    this.typeId = typeId;
    this.def = def;
    this.name = def.name;
    this.isBoss = !!opts.boss;
    this.ai = opts.boss ? 'boss' : def.ai;
    const sc = floorScale(floor);
    this.maxHp = Math.round(def.hp * sc.hp * (opts.hpMul || 1));
    this.hp = this.maxHp;
    this.dmg = def.dmg * sc.dmg * (opts.dmgMul || 1);
    this.speed = def.speed;
    this.color = def.color;
    this.xpValue = Math.round(def.xp * sc.xp);
    this.atkCd = def.atkCd || 1;
    this.atkTimer = rng.range(0, 0.6);
    this.range = def.range || 0;
    this.element = def.element || 'phys';
    this.armor = def.armor || 0;
    this.elite = null;
    this.mods = [];
    this.floor = floor;
    this.wander = rng.range(0, TAU);
    this.state = 'idle';
    this.stateT = 0;
    this.phaseIdx = 0;
    this.animT = rng.range(0, 10);
    this.bobSeed = rng.range(0, TAU);
    this.minion = !!opts.minion;

    if (opts.elite) this.makeElite(opts.eliteMods);
  }

  makeElite(mods) {
    this.elite = true;
    this.mods = mods || rng.sample(ELITE_MODS, rng.int(1, 2));
    this.maxHp = Math.round(this.maxHp * 4.5);
    this.hp = this.maxHp;
    this.dmg *= 1.5;
    this.xpValue = Math.round(this.xpValue * 4);
    this.r *= 1.25;
    for (const m of this.mods) {
      if (m.id === 'swift') { this.speed *= 1.45; this.atkCd *= 0.6; }
      if (m.id === 'giant') { this.r *= 1.5; this.maxHp = Math.round(this.maxHp * 1.8); this.hp = this.maxHp; this.speed *= 0.85; }
      if (m.id === 'shielded') { this.shieldCycle = 0; }
    }
    this.name = (this.mods.map(m => m.name).join('') || '') + this.def.name;
  }

  update(dt, game) {
    this.updateStatus(dt, game);
    this.animT += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    const p = game.player;
    const d = dist(this.x, this.y, p.x, p.y);
    this.atkTimer -= dt;
    if (this.hasStatus('stun')) { this.vx = this.vy = 0; this.moveWith(dt, game.map, 0); return; }

    // 精英 mod 行為
    if (this.elite) {
      for (const m of this.mods) {
        if (m.id === 'regen') this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.012 * dt);
        if (m.id === 'shielded') {
          this.shieldCycle += dt;
          this.immune = (this.shieldCycle % 6) > 4.2;
        }
        if (m.id === 'summoner') {
          this.summonT = (this.summonT || 0) + dt;
          if (this.summonT > 4 && game.enemies.length < 90) {
            this.summonT = 0;
            const t = rng.pick(game.biome.pool);
            game.spawnEnemy(t, this.x + rng.range(-30, 30), this.y + rng.range(-30, 30), { minion: true });
            game.fx.ring(this.x, this.y, '#a0ffd0', this.r + 20);
          }
        }
      }
    }

    // 仇恨：靠近、有視線或被打到才會醒來
    if (!this.aggro && !this.isBoss) {
      if (d < 340 || (d < 620 && game.map.lineOfSight(this.x, this.y, p.x, p.y))) {
        this.aggro = true;
        this.wakeT = 0.25;
      } else {
        this.idleT = (this.idleT || rng.range(0, 3)) - dt;
        if (this.idleT <= 0) {
          this.idleT = rng.range(1.5, 4);
          this.wander = rng.range(0, TAU);
          this.wanderMove = rng.chance(0.45);
        }
        if (this.wanderMove) { this.vx = Math.cos(this.wander) * 0.28; this.vy = Math.sin(this.wander) * 0.28; }
        else { this.vx = this.vy = 0; }
        this.facing = this.wander;
        this.moveWith(dt, game.map, this.speed);
        return;
      }
    }
    if (this.wakeT > 0) { this.wakeT -= dt; }

    const AI = ENEMY_AI[this.ai] || ENEMY_AI.melee;
    AI(this, dt, game, p, d);

    this.moveWith(dt, game.map, this.speed * (this.slowAura ? 0.6 : 1));

    // 與其他敵人分離
    if (!this.isBoss) {
      this.sepT = (this.sepT || 0) + dt;
      if (this.sepT > 0.05) {
        this.sepT = 0;
        for (const o of game.enemies) {
          if (o === this || o.dead) continue;
          const dd = dist2(this.x, this.y, o.x, o.y);
          const min = (this.r + o.r) * 0.9;
          if (dd < min * min && dd > 0.01) {
            const dd2 = Math.sqrt(dd);
            const push = (min - dd2) * 0.5;
            const ax = (this.x - o.x) / dd2, ay = (this.y - o.y) / dd2;
            if (game.map.free(this.x + ax * push, this.y + ay * push, this.r)) { this.x += ax * push; this.y += ay * push; }
          }
        }
      }
    }
  }

  meleeHit(game, p) {
    if (this.atkTimer > 0) return;
    this.atkTimer = this.atkCd;
    this.state = 'attack'; this.stateT = 0.2;
    game.damagePlayer(this.dmg, { element: this.element, from: this });
    if (this.def.onHit === 'poison') p.addStatus('poison', 3, { dps: this.dmg * 0.15 });
    for (const m of this.mods) {
      if (m.id === 'frozen') p.addStatus('chill', 2.5, { amt: 0.4 });
      if (m.id === 'shocking') game.chainLightning(p.x, p.y, this.dmg * 0.5, 3, this, true);
      if (m.id === 'vampiric') this.hp = Math.min(this.maxHp, this.hp + this.dmg * 0.5);
    }
  }
  shootAt(game, p, angleOff, speedMul) {
    game.spawnProjectile({
      x: this.x, y: this.y, angle: angTo(this.x, this.y, p.x, p.y) + (angleOff || 0),
      speed: (this.def.projSpeed || 240) * (speedMul || 1), dmg: this.dmg, r: 7, life: 3.2,
      from: 'enemy', color: ELEMENT_COLOR[this.element] || '#ff9a6b', element: this.element
    });
  }
}

/* ---------- AI 行為 ---------- */
/* 追擊角度：有視線就直衝，否則沿著 flow field 繞路 */
function chaseAngle(e, game, p, d) {
  if (d < 190 && game.map.lineOfSight(e.x, e.y, p.x, p.y)) return angTo(e.x, e.y, p.x, p.y);
  const a = game.flowAngle(e);
  return a === null ? angTo(e.x, e.y, p.x, p.y) : a;
}

const ENEMY_AI = {
  melee(e, dt, game, p, d) {
    const a = chaseAngle(e, game, p, d);
    e.facing = angTo(e.x, e.y, p.x, p.y);
    if (d > e.r + p.r + 4) { e.vx = Math.cos(a); e.vy = Math.sin(a); }
    else { e.vx = e.vy = 0; e.meleeHit(game, p); }
  },
  swarm(e, dt, game, p, d) {
    const a = chaseAngle(e, game, p, d) + Math.sin(game.time * 3 + e.bobSeed) * 0.35;
    e.facing = a;
    if (d > e.r + p.r + 2) { e.vx = Math.cos(a); e.vy = Math.sin(a); }
    else { e.vx = e.vy = 0; e.meleeHit(game, p); }
  },
  erratic(e, dt, game, p, d) {
    const a = chaseAngle(e, game, p, d) + Math.sin(game.time * 6 + e.bobSeed) * 0.9;
    e.facing = a;
    e.vx = Math.cos(a); e.vy = Math.sin(a);
    if (d < e.r + p.r + 4) e.meleeHit(game, p);
  },
  ranged(e, dt, game, p, d) {
    const a = angTo(e.x, e.y, p.x, p.y);
    e.facing = a;
    const ca = chaseAngle(e, game, p, d);
    const want = e.range * 0.62;
    if (d > want * 1.15 || !game.map.lineOfSight(e.x, e.y, p.x, p.y)) { e.vx = Math.cos(ca); e.vy = Math.sin(ca); }
    else if (d < want * 0.6) { e.vx = -Math.cos(a); e.vy = -Math.sin(a); }
    else {
      e.vx = Math.cos(a + Math.PI / 2) * 0.5; e.vy = Math.sin(a + Math.PI / 2) * 0.5;
      if (e.atkTimer <= 0 && d < e.range && game.map.lineOfSight(e.x, e.y, p.x, p.y)) {
        e.atkTimer = e.atkCd; e.state = 'cast'; e.stateT = 0.25;
        e.shootAt(game, p);
        Audio.play('enemyShoot');
      }
    }
  },
  caster(e, dt, game, p, d) {
    const a = angTo(e.x, e.y, p.x, p.y);
    e.facing = a;
    e.blinkT = (e.blinkT || rng.range(2, 5)) - dt;
    if (e.blinkT <= 0) {
      e.blinkT = rng.range(4, 7);
      for (let i = 0; i < 20; i++) {
        const ang = rng.range(0, TAU), dd = rng.range(90, 200);
        const nx = p.x + Math.cos(ang) * dd, ny = p.y + Math.sin(ang) * dd;
        if (game.map.free(nx, ny, e.r)) {
          game.fx.burst(e.x, e.y, '#a05fd0', 12, 140);
          e.x = nx; e.y = ny;
          game.fx.burst(e.x, e.y, '#a05fd0', 12, 140);
          break;
        }
      }
    }
    if (d > e.range * 0.8 || !game.map.lineOfSight(e.x, e.y, p.x, p.y)) {
      const ca = chaseAngle(e, game, p, d);
      e.vx = Math.cos(ca); e.vy = Math.sin(ca);
    } else { e.vx = e.vy = 0; }
    if (e.atkTimer <= 0 && d < e.range) {
      e.atkTimer = e.atkCd; e.state = 'cast'; e.stateT = 0.4;
      game.spawnProjectile({
        x: e.x, y: e.y, angle: a, speed: e.def.projSpeed, dmg: e.dmg, r: 8, life: 4,
        from: 'enemy', color: '#c07ae8', element: 'void', homing: 1.6, target: p
      });
      Audio.play('enemyShoot');
    }
  },
  spreader(e, dt, game, p, d) {
    const a = angTo(e.x, e.y, p.x, p.y);
    e.facing = a;
    if (d > e.range * 0.75 || !game.map.lineOfSight(e.x, e.y, p.x, p.y)) {
      const ca = chaseAngle(e, game, p, d);
      e.vx = Math.cos(ca) * 0.7; e.vy = Math.sin(ca) * 0.7;
    }
    else { e.vx = Math.cos(a + Math.PI / 2) * 0.4; e.vy = Math.sin(a + Math.PI / 2) * 0.4; }
    if (e.atkTimer <= 0 && d < e.range) {
      e.atkTimer = e.atkCd; e.state = 'cast'; e.stateT = 0.4;
      for (let i = -2; i <= 2; i++) e.shootAt(game, p, i * 0.22);
      Audio.play('enemyShoot');
    }
  },
  charger(e, dt, game, p, d) {
    e.chargeT = (e.chargeT || 0);
    if (e.state === 'windup') {
      e.vx = e.vy = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = 'charge'; e.stateT = 0.55;
        const a = e.chargeAngle;
        e.kbx = Math.cos(a) * 620; e.kby = Math.sin(a) * 620;
        Audio.play('charge');
      }
      return;
    }
    if (e.state === 'charge') {
      e.stateT -= dt;
      e.vx = e.vy = 0;
      if (d < e.r + p.r + 6) { e.meleeHit(game, p); e.state = 'idle'; }
      if (e.stateT <= 0) e.state = 'idle';
      return;
    }
    const a = angTo(e.x, e.y, p.x, p.y);
    e.facing = a;
    if (d < 260 && d > 60 && e.atkTimer <= 0 && game.map.lineOfSight(e.x, e.y, p.x, p.y)) {
      e.atkTimer = e.atkCd + 1.2;
      e.state = 'windup'; e.stateT = 0.5; e.chargeAngle = a;
      game.fx.ring(e.x, e.y, e.color, e.r + 10);
      return;
    }
    const ca = chaseAngle(e, game, p, d);
    if (d > e.r + p.r + 4) { e.vx = Math.cos(ca); e.vy = Math.sin(ca); }
    else { e.vx = e.vy = 0; e.meleeHit(game, p); }
  },
  exploder(e, dt, game, p, d) {
    const a = chaseAngle(e, game, p, d);
    e.facing = angTo(e.x, e.y, p.x, p.y);
    e.vx = Math.cos(a); e.vy = Math.sin(a);
    if (d < e.r + p.r + 12) {
      e.dead = true;
      game.explode(e.x, e.y, 95, e.dmg * 1.6, 'poison', false);
    }
  },
  phaser(e, dt, game, p, d) {
    const a = angTo(e.x, e.y, p.x, p.y);
    e.facing = a;
    e.ghost = true;
    e.phaseT = (e.phaseT || 0) + dt;
    e.alpha = 0.55 + Math.sin(e.phaseT * 2) * 0.3;
    if (d > e.r + p.r + 2) { e.vx = Math.cos(a) * 0.85; e.vy = Math.sin(a) * 0.85; }
    else { e.vx = e.vy = 0; e.meleeHit(game, p); }
  },
  boss(e, dt, game, p, d) { BossAI(e, dt, game, p, d); }
};

/* ---------- 王 AI ---------- */
function BossAI(e, dt, game, p, d) {
  e.actT = (e.actT === undefined ? 1.6 : e.actT) - dt;
  e.telegraph = Math.max(0, (e.telegraph || 0) - dt);

  if (e.state === 'act') {
    e.stateT -= dt;
    e.vx = e.vy = 0;
    if (e.action === 'charge') {
      if (d < e.r + p.r + 8) { e.meleeHit(game, p); }
    }
    if (e.stateT <= 0) { e.state = 'idle'; e.action = null; }
    return;
  }

  const a = chaseAngle(e, game, p, d);
  e.facing = angTo(e.x, e.y, p.x, p.y);
  if (d > e.r + p.r + 40) { e.vx = Math.cos(a) * 0.85; e.vy = Math.sin(a) * 0.85; }
  else { e.vx = e.vy = 0; if (e.atkTimer <= 0) e.meleeHit(game, p); }

  if (e.actT <= 0) {
    const hpFrac = e.hp / e.maxHp;
    const speedUp = hpFrac < 0.4 ? 0.62 : (hpFrac < 0.7 ? 0.8 : 1);
    e.actT = rng.range(2.4, 3.8) * speedUp;
    const act = e.def.phases[(e.phaseIdx++) % e.def.phases.length];
    e.action = act; e.state = 'act'; e.stateT = 1.0;
    BOSS_ACTS[act](e, game, p);
  }
}

const BOSS_ACTS = {
  slam(e, game, p) {
    e.stateT = 1.0;
    game.telegraphCircle(p.x, p.y, 110, 0.7, () => {
      game.explode(p.x, p.y, 115, e.dmg * 1.6, 'phys', false);
      game.shake(12);
    });
  },
  boneSpray(e, game, p) {
    e.stateT = 1.2;
    const base = angTo(e.x, e.y, p.x, p.y);
    let i = 0;
    const fire = () => {
      if (e.dead || i >= 3) return;
      for (let k = -3; k <= 3; k++)
        game.spawnProjectile({
          x: e.x, y: e.y, angle: base + k * 0.2 + i * 0.1, speed: 250, dmg: e.dmg * 0.7, r: 7,
          life: 3, from: 'enemy', color: '#e8e0c8', element: 'phys'
        });
      i++;
      game.after(0.3, fire);
    };
    fire();
    Audio.play('enemyShoot');
  },
  summonAdds(e, game, p) {
    e.stateT = 1.0;
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const ang = (TAU / n) * i, r = 90;
      const t = rng.pick(game.biome.pool);
      game.spawnEnemy(t, e.x + Math.cos(ang) * r, e.y + Math.sin(ang) * r, { minion: true });
    }
    game.fx.ring(e.x, e.y, '#a0ffd0', e.r + 40);
    Audio.play('summon');
  },
  spew(e, game, p) {
    e.stateT = 1.6;
    let i = 0;
    const fire = () => {
      if (e.dead || i >= 10) return;
      const a = angTo(e.x, e.y, p.x, p.y) + rng.range(-0.5, 0.5);
      game.spawnProjectile({
        x: e.x, y: e.y, angle: a, speed: rng.range(160, 260), dmg: e.dmg * 0.6, r: 9,
        life: 3, from: 'enemy', color: '#9fbc55', element: 'poison', puddle: true
      });
      i++; game.after(0.1, fire);
    };
    fire();
  },
  charge(e, game, p) {
    e.stateT = 1.4;
    const a = angTo(e.x, e.y, p.x, p.y);
    game.fx.ring(e.x, e.y, e.color, e.r + 20);
    game.after(0.45, () => {
      if (e.dead) return;
      e.kbx = Math.cos(a) * 900; e.kby = Math.sin(a) * 900;
      Audio.play('charge');
    });
  },
  meteor(e, game, p) {
    e.stateT = 1.4;
    for (let i = 0; i < 6; i++) {
      const x = p.x + rng.range(-200, 200), y = p.y + rng.range(-200, 200);
      game.after(i * 0.15, () => {
        game.telegraphCircle(x, y, 70, 0.8, () => {
          game.explode(x, y, 75, e.dmg * 1.1, 'fire', false);
        });
      });
    }
    Audio.play('cast');
  },
  novaRing(e, game, p) {
    e.stateT = 1.2;
    for (let wave = 0; wave < 3; wave++) {
      game.after(wave * 0.45, () => {
        if (e.dead) return;
        const off = wave * 0.18;
        for (let i = 0; i < 18; i++)
          game.spawnProjectile({
            x: e.x, y: e.y, angle: (TAU / 18) * i + off, speed: 190, dmg: e.dmg * 0.6, r: 8,
            life: 4, from: 'enemy', color: '#ff9a3c', element: 'fire'
          });
      });
    }
  },
  laserSweep(e, game, p) {
    e.stateT = 2.2;
    const start = angTo(e.x, e.y, p.x, p.y) - 0.9;
    let i = 0;
    const fire = () => {
      if (e.dead || i >= 16) return;
      game.spawnProjectile({
        x: e.x, y: e.y, angle: start + i * 0.12, speed: 320, dmg: e.dmg * 0.55, r: 8,
        life: 4, from: 'enemy', color: '#c07ae8', element: 'void'
      });
      i++; game.after(0.08, fire);
    };
    fire();
  },
  spiral(e, game, p) {
    e.stateT = 2.4;
    let i = 0;
    const fire = () => {
      if (e.dead || i >= 40) return;
      for (let k = 0; k < 3; k++)
        game.spawnProjectile({
          x: e.x, y: e.y, angle: i * 0.35 + k * (TAU / 3), speed: 175, dmg: e.dmg * 0.5, r: 7,
          life: 5, from: 'enemy', color: '#b46ee0', element: 'void'
        });
      i++; game.after(0.06, fire);
    };
    fire();
  }
};

/* =========================================================
   投射物
   ========================================================= */
class Projectile {
  constructor(o) {
    Object.assign(this, {
      r: 6, life: 2, color: '#fff', element: 'phys', pierce: 0, homing: 0,
      explode: false, dmg: 10, from: 'enemy', puddle: false, trail: true
    }, o);
    this.vx = Math.cos(this.angle) * this.speed;
    this.vy = Math.sin(this.angle) * this.speed;
    this.dead = false;
    this.hits = new Set();
    this.age = 0;
  }
  update(dt, game) {
    this.age += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.homing && this.target && !this.target.dead) {
      const a = angTo(this.x, this.y, this.target.x, this.target.y);
      const cur = Math.atan2(this.vy, this.vx);
      const na = cur + clamp(angDiff(cur, a), -this.homing * dt, this.homing * dt);
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(na) * sp; this.vy = Math.sin(na) * sp;
    }
    this.x += this.vx * dt; this.y += this.vy * dt;
    if (!game.map.free(this.x, this.y, this.r * 0.5)) {
      this.dead = true;
      if (this.explode) game.explode(this.x, this.y, 60, this.dmg * 0.6, this.element, this.from === 'player');
      game.fx.burst(this.x, this.y, this.color, 5, 70);
      return;
    }
    if (this.trail && game.frame % 2 === 0)
      game.fx.spark(this.x, this.y, this.color);

    if (this.from === 'player') {
      for (const e of game.enemies) {
        if (e.dead || this.hits.has(e)) continue;
        if (dist2(this.x, this.y, e.x, e.y) < (e.r + this.r) * (e.r + this.r)) {
          this.hits.add(e);
          game.hitEnemy(e, this.dmg, { element: this.element, source: 'proj', knock: 90 });
          if (this.explode) game.explode(this.x, this.y, 64, this.dmg * 0.55, this.element, true);
          if (this.pierce > 0) this.pierce--;
          else { this.dead = true; game.fx.burst(this.x, this.y, this.color, 6, 90); return; }
        }
      }
    } else {
      const p = game.player;
      if (dist2(this.x, this.y, p.x, p.y) < (p.r + this.r) * (p.r + this.r)) {
        this.dead = true;
        game.damagePlayer(this.dmg, { element: this.element });
        if (this.puddle) game.addPuddle(this.x, this.y, this.dmg * 0.3);
        game.fx.burst(this.x, this.y, this.color, 8, 110);
      }
    }
  }
}

/* =========================================================
   召喚物（樹懶靈 / 砲塔）
   ========================================================= */
class Minion extends Entity {
  constructor(x, y, owner, opts) {
    super(x, y, opts.r || 11);
    this.owner = owner;
    this.kind = opts.kind || 'sloth';
    this.maxHp = opts.hp || 60; this.hp = this.maxHp;
    this.dmg = opts.dmg || 10;
    this.speed = opts.speed || 130;
    this.life = opts.life || 0;   // 0 = 永久
    this.atkTimer = 0;
    this.atkCd = opts.atkCd || 1.0;
    this.color = opts.color || '#7bd8a0';
    this.animT = rng.range(0, 5);
    this.ranged = !!opts.ranged;
  }
  update(dt, game) {
    this.animT += dt;
    this.updateStatus(dt, game);
    if (this.life > 0) { this.life -= dt; if (this.life <= 0) { this.dead = true; return; } }
    this.atkTimer -= dt;
    // 找最近敵人
    let best = null, bd = 1e9;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist2(this.x, this.y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    const owner = this.owner;
    if (this.kind === 'turret') {
      this.vx = this.vy = 0;
      if (best && bd < 340 * 340 && this.atkTimer <= 0) {
        this.atkTimer = this.atkCd;
        game.spawnProjectile({
          x: this.x, y: this.y, angle: angTo(this.x, this.y, best.x, best.y), speed: 380,
          dmg: this.dmg, r: 5, life: 1.5, from: 'player', color: '#ffd45e', element: 'lightning'
        });
      }
      return;
    }
    if (best && bd < 420 * 420) {
      const a = angTo(this.x, this.y, best.x, best.y);
      this.facing = a;
      const bdist = Math.sqrt(bd);
      if (this.ranged) {
        if (bdist > 200) { this.vx = Math.cos(a); this.vy = Math.sin(a); }
        else { this.vx = this.vy = 0; }
        if (this.atkTimer <= 0 && bdist < 320) {
          this.atkTimer = this.atkCd;
          game.spawnProjectile({
            x: this.x, y: this.y, angle: a, speed: 340, dmg: this.dmg, r: 5, life: 1.5,
            from: 'player', color: this.color, element: 'poison'
          });
        }
      } else {
        if (bdist > this.r + best.r) { this.vx = Math.cos(a); this.vy = Math.sin(a); }
        else {
          this.vx = this.vy = 0;
          if (this.atkTimer <= 0) {
            this.atkTimer = this.atkCd;
            game.hitEnemy(best, this.dmg, { element: 'phys', source: 'minion' });
            game.fx.burst(best.x, best.y, this.color, 5, 80);
          }
        }
      }
    } else {
      // 跟隨主人
      const d = dist(this.x, this.y, owner.x, owner.y);
      if (d > 70) {
        const a = angTo(this.x, this.y, owner.x, owner.y);
        this.facing = a;
        this.vx = Math.cos(a); this.vy = Math.sin(a);
      } else { this.vx = this.vy = 0; }
    }
    this.moveWith(dt, game.map, this.speed);
  }
}
