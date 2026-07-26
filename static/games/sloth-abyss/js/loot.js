/* ===========================================================
   Sloth Abyss - loot.js
   物品生成、詞綴、估價
   =========================================================== */
'use strict';

let ITEM_UID = 1;

function pickRarity(luck) {
  // luck 為百分比，會把權重往高稀有度推
  const l = 1 + (luck || 0) / 100;
  const list = RARITY.map(r => ({
    ref: r,
    w: r.id === 0 ? r.w / l : r.w * Math.pow(l, r.id * 0.85)
  }));
  return rng.weighted(list).ref;
}

function rollAffix(def, ilvl) {
  const raw = rng.range(def.base[0], def.base[1]) + def.per * ilvl;
  let v = Math.max(1, Math.round(raw));
  return { id: def.id, stat: def.stat, v, text: def.fmt(v), pre: def.pre, suf: def.suf };
}

function makeItem(slot, ilvl, opts) {
  opts = opts || {};
  ilvl = Math.max(1, Math.round(ilvl));
  const rarity = opts.rarity !== undefined ? RARITY[opts.rarity] : pickRarity(opts.luck || 0);

  // 神器
  if (rarity.id === 4 || opts.unique) {
    const pool = UNIQUES.filter(u => !opts.slot || true);
    const u = opts.unique ? UNIQUES.find(x => x.id === opts.unique) : rng.pick(pool);
    if (u) return makeUnique(u, ilvl);
  }

  const basePool = BASES[slot] || BASES.amulet;
  let base = opts.baseId ? basePool.find(b => b.id === opts.baseId) : null;
  if (!base) base = rng.pick(basePool);

  const it = {
    uid: ITEM_UID++, slot, baseId: base.id, baseName: base.name,
    rarity: rarity.id, ilvl, stats: {}, affixes: [], tags: base.tags || []
  };

  const scale = 1 + ilvl * 0.14;
  if (slot === 'weapon') {
    it.dmg = Math.round(rng.range(base.dmg[0], base.dmg[1]) * scale);
    it.cd = base.cd;
    it.wtags = base.tags;
  } else if (base.armor && base.armor[1] > 0) {
    it.armor = Math.round(rng.range(base.armor[0], base.armor[1]) * scale);
  }
  if (base.implicit) {
    it.implicit = {};
    for (const k in base.implicit) it.implicit[k] = base.implicit[k];
  }

  const [lo, hi] = rarity.affixes;
  const n = lo === hi ? lo : rng.int(lo, hi);
  const pool = AFFIXES.slice();
  const used = new Set();
  for (let i = 0; i < n; i++) {
    const cand = pool.filter(a => !used.has(a.id));
    if (!cand.length) break;
    const def = rng.weighted(cand);
    used.add(def.id);
    const af = rollAffix(def, ilvl);
    it.affixes.push(af);
    it.stats[af.stat] = (it.stats[af.stat] || 0) + af.v;
  }
  if (it.implicit) for (const k in it.implicit) it.stats[k] = (it.stats[k] || 0) + it.implicit[k];

  it.name = buildName(it, base);
  it.value = itemValue(it);
  return it;
}

function makeUnique(u, ilvl) {
  const slot = u.slot;
  const basePool = BASES[slot] || BASES.amulet;
  const base = (u.base && basePool.find(b => b.id === u.base)) || basePool[0];
  const it = {
    uid: ITEM_UID++, slot, baseId: base.id, baseName: base.name, rarity: 4,
    ilvl, stats: {}, affixes: [], unique: u.id, power: u.power, uniqueDesc: u.desc,
    name: u.name, tags: base.tags || []
  };
  const scale = 1 + ilvl * 0.17;
  if (slot === 'weapon') { it.dmg = Math.round(rng.range(base.dmg[0], base.dmg[1]) * scale * 1.25); it.cd = base.cd; }
  else if (base.armor && base.armor[1] > 0) it.armor = Math.round(rng.range(base.armor[0], base.armor[1]) * scale * 1.3);

  // 神器固定 4 條高卷詞綴
  const pool = rng.shuffle(AFFIXES).slice(0, 4);
  for (const def of pool) {
    const af = rollAffix(def, ilvl * 1.25);
    it.affixes.push(af);
    it.stats[af.stat] = (it.stats[af.stat] || 0) + af.v;
  }
  if (base.implicit) for (const k in base.implicit) it.stats[k] = (it.stats[k] || 0) + base.implicit[k];
  // unique power 附帶屬性
  if (u.power === 'slowfast') { it.stats.speedPct = (it.stats.speedPct || 0) - 15; it.stats.dmgPct = (it.stats.dmgPct || 0) + 45; }
  if (u.power === 'phase') it.stats.speedPct = (it.stats.speedPct || 0) + 20;
  if (u.power === 'greed') it.stats.gold = (it.stats.gold || 0) + 80;
  it.value = itemValue(it) * 3;
  return it;
}

const RARE_WORDS_A = ['暗影', '龍血', '深淵', '霜牙', '灰燼', '腐骨', '雷鳴', '虛空', '狂潮', '殞星', '荊棘', '幽咽', '獠牙', '流火'];
const RARE_WORDS_B = ['之語', '守誓', '低吟', '殘響', '烙印', '哀歌', '契約', '裁決', '碎片', '終末', '之息', '徽記'];

function buildName(it, base) {
  if (it.rarity === 0) return base.name;
  if (it.rarity === 1) {
    const a = it.affixes[0], b = it.affixes[1];
    return (a ? a.pre : '') + base.name + (b ? b.suf : '');
  }
  if (it.rarity >= 2) {
    return rng.pick(RARE_WORDS_A) + rng.pick(RARE_WORDS_B) + ' ' + base.name;
  }
  return base.name;
}

function itemValue(it) {
  let v = 15 + it.ilvl * 6 + it.rarity * 40;
  if (it.dmg) v += it.dmg * 4;
  if (it.armor) v += it.armor * 2;
  for (const a of it.affixes) v += 10 + a.v;
  return Math.round(v);
}

/* 粗略評分，用於「比目前裝備好」的箭頭提示 */
const SCORE_W = {
  str: 3, dex: 3, int: 3, vit: 3, hp: 0.4, mp: 0.15, armor: 0.5, dmgPct: 4,
  atkSpd: 4, crit: 5, critDmg: 1.6, speedPct: 3, lifeSteal: 6, onKill: 1.2,
  cdr: 3, mpRegen: 1.5, hpRegen: 2, resAll: 3, fireDmg: 1.2, coldDmg: 1.2,
  lightDmg: 1.2, poisonDmg: 1.2, gold: 0.3, thorns: 0.4
};
function itemScore(it) {
  if (!it) return 0;
  let s = 0;
  for (const k in it.stats) s += (SCORE_W[k] || 1) * it.stats[k];
  if (it.dmg) s += it.dmg * 6 / (it.cd || 1);
  if (it.armor) s += it.armor * 0.5;
  if (it.unique) s += 60;
  return s;
}

/* 掉落決定 */
function rollDrop(floor, luck, forced) {
  const ilvl = floor + rng.int(0, 2);
  const slot = rng.pick(SLOTS);
  return makeItem(slot, ilvl, { luck: luck, rarity: forced });
}

function statLine(stat, v) {
  const def = AFFIXES.find(a => a.stat === stat);
  if (def) return def.fmt(v);
  const map = { speedPct: v => `+${v}% 移動速度`, cdr: v => `+${v}% 冷卻縮減` };
  return map[stat] ? map[stat](v) : `${stat} +${v}`;
}
