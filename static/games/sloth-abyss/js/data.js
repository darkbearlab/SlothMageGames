/* ===========================================================
   Sloth Abyss - data.js
   遊戲資料表：職業、敵人、生態域、裝備、詞綴、天賦、永久升級
   =========================================================== */
'use strict';

/* ================= 職業 ================= */
const CLASSES = [
  {
    id: 'berserker', name: '狂戰士', tag: 'BERSERKER', color: '#e2564a',
    desc: '以血肉為代價的近戰暴力。生命愈低、揮擊愈狠。',
    base: { str: 12, dex: 6, int: 3, vit: 11 },
    hp: 120, mp: 40, speed: 128,
    attack: { kind: 'melee', dmg: 11, cd: 0.42, range: 58, arc: 1.5, color: '#ff9a6b' },
    startSkill: 'whirlwind',
    passive: { id: 'bloodrage', name: '血怒', desc: '生命低於 50% 時傷害 +30%' },
    startWeapon: 'axe'
  },
  {
    id: 'sorceress', name: '咒術師', tag: 'SORCERESS', color: '#5aa9f0',
    desc: '操縱火、冰、雷。脆弱，但能把整個房間化為灰燼。',
    base: { str: 4, dex: 6, int: 14, vit: 7 },
    hp: 82, mp: 110, speed: 122,
    attack: { kind: 'bolt', dmg: 9, cd: 0.36, range: 420, speed: 470, color: '#8fd3ff', element: 'cold' },
    startSkill: 'fireball',
    passive: { id: 'arcaneflow', name: '奧術流轉', desc: '擊殺敵人回復 4 點法力' },
    startWeapon: 'staff'
  },
  {
    id: 'shadowblade', name: '影刃', tag: 'SHADOWBLADE', color: '#a678f0',
    desc: '快、狠、準。以暴擊與位移撕開包圍網。',
    base: { str: 8, dex: 14, int: 6, vit: 7 },
    hp: 95, mp: 60, speed: 142,
    attack: { kind: 'melee', dmg: 8, cd: 0.26, range: 48, arc: 1.1, color: '#d7b3ff' },
    startSkill: 'dash',
    passive: { id: 'backstab', name: '背刺', desc: '暴擊率 +8%，暴擊傷害 +40%' },
    startWeapon: 'dagger'
  },
  {
    id: 'summoner', name: '樹懶術士', tag: 'SLOTHMANCER', color: '#5fc98a',
    desc: '自己動手是最後手段。召喚樹懶靈替你打完全場。',
    base: { str: 6, dex: 7, int: 12, vit: 9 },
    hp: 100, mp: 95, speed: 118,
    attack: { kind: 'bolt', dmg: 7, cd: 0.44, range: 360, speed: 400, color: '#9bf5c0', element: 'poison' },
    startSkill: 'summon',
    passive: { id: 'pack', name: '懶群', desc: '同時最多 3 隻樹懶靈，並持續緩速回血' },
    startWeapon: 'wand',
    lockedBy: 'unlock_summoner'
  },
  {
    id: 'templar', name: '斷罪聖徒', tag: 'TEMPLAR', color: '#f0c454',
    desc: '以雷霆審判罪孽。厚實、穩定、範圍傷害。',
    base: { str: 11, dex: 5, int: 9, vit: 12 },
    hp: 135, mp: 70, speed: 120,
    attack: { kind: 'melee', dmg: 12, cd: 0.5, range: 66, arc: 2.0, color: '#ffe58a', element: 'lightning' },
    startSkill: 'holynova',
    passive: { id: 'aegis', name: '聖盾', desc: '護甲 +40，受傷後 3 秒內減傷 15%' },
    startWeapon: 'hammer',
    lockedBy: 'unlock_templar'
  }
];

/* ================= 生態域 ================= */
const BIOMES = [
  {
    id: 'crypt', name: '腐朽地窖', from: 1, to: 4,
    floor: '#2a2723', floor2: '#332f29', wall: '#4a4239', wallTop: '#5d5348',
    accent: '#8a7a5c', fog: 'rgba(10,8,14,0.55)', light: '#ffb066',
    pool: ['rat', 'skeleton', 'zombie', 'archer', 'bat'],
    boss: 'boneking'
  },
  {
    id: 'warren', name: '血肉巢穴', from: 5, to: 9,
    floor: '#2e1d22', floor2: '#3a2429', wall: '#5c3033', wallTop: '#743b3d',
    accent: '#a24d4d', fog: 'rgba(20,4,10,0.55)', light: '#ff7a7a',
    pool: ['zombie', 'bloat', 'cultist', 'bat', 'spider', 'archer'],
    boss: 'fleshmass'
  },
  {
    id: 'molten', name: '熔火深淵', from: 10, to: 14,
    floor: '#2b1c14', floor2: '#382318', wall: '#5e3018', wallTop: '#7d411f',
    accent: '#e0651f', fog: 'rgba(30,8,0,0.5)', light: '#ff9a3c',
    pool: ['imp', 'gargoyle', 'bloat', 'cultist', 'hellhound', 'skeleton'],
    boss: 'magmalord'
  },
  {
    id: 'void', name: '虛空迴廊', from: 15, to: 19,
    floor: '#1b1c2e', floor2: '#22243a', wall: '#343867', wallTop: '#454a80',
    accent: '#7b7ee0', fog: 'rgba(8,6,26,0.55)', light: '#9aa6ff',
    pool: ['wraith', 'beholder', 'gargoyle', 'hellhound', 'cultist', 'spider'],
    boss: 'voideye'
  },
  {
    id: 'throne', name: '樹懶魔神的王座', from: 20, to: 24,
    floor: '#241a2c', floor2: '#2d2138', wall: '#4a3560', wallTop: '#5f4479',
    accent: '#b46ee0', fog: 'rgba(14,4,20,0.55)', light: '#d59aff',
    pool: ['wraith', 'beholder', 'imp', 'hellhound', 'gargoyle', 'bloat'],
    boss: 'slothdemon'
  }
];

function biomeFor(floor) {
  for (const b of BIOMES) if (floor >= b.from && floor <= b.to) return b;
  return BIOMES[BIOMES.length - 1];
}

/* ================= 敵人 ================= */
/* ai: melee / ranged / charger / exploder / caster / swarm / summonerAI / boss 各自處理 */
const ENEMIES = {
  rat: { name: '屍鼠', hp: 20, dmg: 5, speed: 118, r: 9, color: '#8a7a60', ai: 'swarm', atkCd: 0.8, xp: 3, w: 10, group: [2, 5] },
  skeleton: { name: '骷髏戰士', hp: 42, dmg: 9, speed: 82, r: 12, color: '#d8d2bd', ai: 'melee', atkCd: 1.1, xp: 6, w: 10, group: [1, 3] },
  zombie: { name: '腐屍', hp: 70, dmg: 12, speed: 52, r: 14, color: '#7c9160', ai: 'melee', atkCd: 1.4, xp: 8, w: 8, group: [1, 3], onHit: 'poison' },
  archer: { name: '骸骨弓手', hp: 34, dmg: 8, speed: 74, r: 11, color: '#c2b48a', ai: 'ranged', atkCd: 1.6, range: 300, projSpeed: 300, xp: 8, w: 7, group: [1, 2] },
  bat: { name: '蝠魔', hp: 24, dmg: 6, speed: 150, r: 9, color: '#6b5a7a', ai: 'erratic', atkCd: 0.9, xp: 5, w: 7, group: [2, 4] },
  bloat: { name: '爆裂菌', hp: 55, dmg: 22, speed: 60, r: 15, color: '#9fbc55', ai: 'exploder', atkCd: 1, xp: 10, w: 6, group: [1, 2] },
  cultist: { name: '妖術師', hp: 48, dmg: 13, speed: 70, r: 12, color: '#a05fd0', ai: 'caster', atkCd: 2.2, range: 340, projSpeed: 210, xp: 12, w: 6, group: [1, 2] },
  spider: { name: '深淵蛛', hp: 38, dmg: 10, speed: 128, r: 11, color: '#4a4a6a', ai: 'charger', atkCd: 1.2, xp: 9, w: 6, group: [2, 4], onHit: 'poison' },
  imp: { name: '烈焰小鬼', hp: 45, dmg: 12, speed: 108, r: 10, color: '#e2703a', ai: 'ranged', atkCd: 1.3, range: 260, projSpeed: 260, xp: 12, w: 7, group: [2, 3], element: 'fire' },
  gargoyle: { name: '石像鬼', hp: 110, dmg: 18, speed: 66, r: 16, color: '#8a8f9c', ai: 'charger', atkCd: 1.6, xp: 18, w: 5, group: [1, 2], armor: 30 },
  hellhound: { name: '獄犬', hp: 80, dmg: 16, speed: 158, r: 13, color: '#c04a30', ai: 'charger', atkCd: 1.0, xp: 16, w: 6, group: [2, 3], element: 'fire' },
  wraith: { name: '怨靈', hp: 70, dmg: 15, speed: 96, r: 13, color: '#7f8fd0', ai: 'phaser', atkCd: 1.2, xp: 18, w: 6, group: [1, 3], element: 'cold' },
  beholder: { name: '深淵之瞳', hp: 130, dmg: 14, speed: 58, r: 18, color: '#b45fd0', ai: 'spreader', atkCd: 2.0, range: 380, projSpeed: 200, xp: 26, w: 4, group: [1, 1] }
};

/* 精英詞綴 */
const ELITE_MODS = [
  { id: 'fiery', name: '烈焰', color: '#ff7a3c', desc: '死亡時引爆火海' },
  { id: 'frozen', name: '寒霜', color: '#7fd4ff', desc: '攻擊冰緩' },
  { id: 'shocking', name: '雷擊', color: '#ffe066', desc: '攻擊釋放連鎖閃電' },
  { id: 'swift', name: '迅捷', color: '#9bff9b', desc: '移動與攻擊速度大幅提升' },
  { id: 'regen', name: '再生', color: '#7bffc0', desc: '持續回復生命' },
  { id: 'shielded', name: '護盾', color: '#c0c8ff', desc: '週期性免疫傷害' },
  { id: 'splitter', name: '分裂', color: '#ffa0d0', desc: '死亡時分裂成兩隻小型' },
  { id: 'vampiric', name: '嗜血', color: '#ff5a7a', desc: '造成傷害時吸血' },
  { id: 'giant', name: '巨化', color: '#d0b070', desc: '體型與生命大幅增加' },
  { id: 'summoner', name: '召喚', color: '#a0ffd0', desc: '不斷召喚小怪' }
];

/* ================= 王 ================= */
const BOSSES = {
  boneking: {
    name: '骨之王 · 歐斯蒙', hp: 900, dmg: 20, speed: 62, r: 30, color: '#e8e0c8', xp: 200,
    phases: ['slam', 'boneSpray', 'summonAdds']
  },
  fleshmass: {
    name: '血肉聚合體', hp: 1500, dmg: 24, speed: 46, r: 36, color: '#c05a5a', xp: 320,
    phases: ['spew', 'charge', 'summonAdds']
  },
  magmalord: {
    name: '熔岩君王 · 卡魯格', hp: 2400, dmg: 30, speed: 60, r: 34, color: '#e2712f', xp: 480,
    phases: ['meteor', 'novaRing', 'charge']
  },
  voideye: {
    name: '虛空之眼', hp: 3600, dmg: 34, speed: 54, r: 34, color: '#9a6fe0', xp: 700,
    phases: ['laserSweep', 'spiral', 'summonAdds']
  },
  slothdemon: {
    name: '樹懶魔神 · 阿斯莫貝爾', hp: 6000, dmg: 42, speed: 58, r: 42, color: '#c07ae8', xp: 1200,
    phases: ['spiral', 'meteor', 'laserSweep', 'summonAdds', 'novaRing']
  }
};

/* ================= 裝備 ================= */
const SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'ring1', 'ring2', 'amulet'];
const SLOT_NAME = {
  weapon: '武器', helm: '頭盔', armor: '護甲', gloves: '手套',
  boots: '靴子', ring1: '戒指 I', ring2: '戒指 II', amulet: '護符'
};

const RARITY = [
  { id: 0, name: '普通', color: '#cfcfcf', affixes: [0, 0], w: 44 },
  { id: 1, name: '魔法', color: '#6fa8ff', affixes: [1, 2], w: 32 },
  { id: 2, name: '稀有', color: '#ffd45e', affixes: [3, 4], w: 17 },
  { id: 3, name: '傳說', color: '#ff8c3c', affixes: [4, 5], w: 6 },
  { id: 4, name: '神器', color: '#4ade80', affixes: [5, 6], w: 1 }
];

/* 基礎裝備：implicit 為固定屬性 */
const BASES = {
  weapon: [
    { id: 'dagger', name: '短匕', dmg: [6, 9], cd: 0.72, tags: ['melee'] },
    { id: 'sword', name: '長劍', dmg: [9, 13], cd: 1.0, tags: ['melee'] },
    { id: 'axe', name: '戰斧', dmg: [12, 17], cd: 1.15, tags: ['melee'] },
    { id: 'hammer', name: '戰鎚', dmg: [15, 21], cd: 1.35, tags: ['melee'] },
    { id: 'staff', name: '法杖', dmg: [8, 12], cd: 1.0, tags: ['caster'], implicit: { int: 3 } },
    { id: 'wand', name: '魔杖', dmg: [6, 10], cd: 0.8, tags: ['caster'], implicit: { int: 2, cdr: 3 } },
    { id: 'bow', name: '獵弓', dmg: [8, 12], cd: 0.9, tags: ['ranged'], implicit: { dex: 3 } }
  ],
  helm: [
    { id: 'cap', name: '皮帽', armor: [4, 8] },
    { id: 'helmet', name: '鐵盔', armor: [10, 18] },
    { id: 'hood', name: '兜帽', armor: [5, 10], implicit: { mp: 12 } }
  ],
  armor: [
    { id: 'robe', name: '法袍', armor: [6, 12], implicit: { mp: 18 } },
    { id: 'leather', name: '皮甲', armor: [12, 22], implicit: { dex: 2 } },
    { id: 'plate', name: '板甲', armor: [22, 40], implicit: { speedPct: -4 } }
  ],
  gloves: [
    { id: 'gloves', name: '手套', armor: [3, 7] },
    { id: 'gauntlet', name: '護手', armor: [7, 13], implicit: { str: 2 } }
  ],
  boots: [
    { id: 'boots', name: '皮靴', armor: [3, 7], implicit: { speedPct: 4 } },
    { id: 'greaves', name: '脛甲', armor: [8, 15], implicit: { speedPct: 2 } }
  ],
  ring1: [{ id: 'ring', name: '指環', armor: [0, 0] }],
  ring2: [{ id: 'ring', name: '指環', armor: [0, 0] }],
  amulet: [{ id: 'amulet', name: '護符', armor: [0, 0] }]
};

/* 詞綴：v = 每 ilvl 的成長，base = 起始值 */
const AFFIXES = [
  { id: 'str', pre: '巨力的', suf: '之力', stat: 'str', base: [2, 4], per: 0.35, w: 10, fmt: v => `+${v} 力量` },
  { id: 'dex', pre: '迅敏的', suf: '之敏', stat: 'dex', base: [2, 4], per: 0.35, w: 10, fmt: v => `+${v} 敏捷` },
  { id: 'int', pre: '睿智的', suf: '之智', stat: 'int', base: [2, 4], per: 0.35, w: 10, fmt: v => `+${v} 智力` },
  { id: 'vit', pre: '堅韌的', suf: '之韌', stat: 'vit', base: [2, 4], per: 0.35, w: 10, fmt: v => `+${v} 體力` },
  { id: 'hp', pre: '厚血的', suf: '之心', stat: 'hp', base: [10, 20], per: 2.2, w: 12, fmt: v => `+${v} 最大生命` },
  { id: 'mp', pre: '深藍的', suf: '之泉', stat: 'mp', base: [8, 15], per: 1.4, w: 8, fmt: v => `+${v} 最大法力` },
  { id: 'armor', pre: '護衛的', suf: '之壁', stat: 'armor', base: [5, 12], per: 1.6, w: 10, fmt: v => `+${v} 護甲` },
  { id: 'dmgPct', pre: '兇殘的', suf: '之刃', stat: 'dmgPct', base: [4, 9], per: 0.28, w: 11, fmt: v => `+${v}% 傷害` },
  { id: 'atkSpd', pre: '疾風的', suf: '之風', stat: 'atkSpd', base: [4, 8], per: 0.16, w: 8, fmt: v => `+${v}% 攻擊速度` },
  { id: 'crit', pre: '致命的', suf: '之準', stat: 'crit', base: [3, 6], per: 0.12, w: 8, fmt: v => `+${v}% 暴擊率` },
  { id: 'critDmg', pre: '殘暴的', suf: '之戮', stat: 'critDmg', base: [10, 20], per: 0.7, w: 8, fmt: v => `+${v}% 暴擊傷害` },
  { id: 'speedPct', pre: '疾行的', suf: '之途', stat: 'speedPct', base: [3, 6], per: 0.1, w: 6, fmt: v => `+${v}% 移動速度` },
  { id: 'lifeSteal', pre: '嗜血的', suf: '之渴', stat: 'lifeSteal', base: [1, 3], per: 0.06, w: 5, fmt: v => `+${v}% 生命偷取` },
  { id: 'onKill', pre: '收割的', suf: '之鐮', stat: 'onKill', base: [2, 5], per: 0.5, w: 6, fmt: v => `擊殺回復 ${v} 生命` },
  { id: 'cdr', pre: '流轉的', suf: '之律', stat: 'cdr', base: [3, 6], per: 0.14, w: 6, fmt: v => `+${v}% 冷卻縮減` },
  { id: 'mpRegen', pre: '湧泉的', suf: '之潮', stat: 'mpRegen', base: [1, 3], per: 0.12, w: 5, fmt: v => `+${v} 法力回復/秒` },
  { id: 'hpRegen', pre: '癒合的', suf: '之癒', stat: 'hpRegen', base: [1, 3], per: 0.16, w: 5, fmt: v => `+${v} 生命回復/秒` },
  { id: 'resAll', pre: '抗魔的', suf: '之衡', stat: 'resAll', base: [3, 7], per: 0.16, w: 6, fmt: v => `+${v}% 全元素抗性` },
  { id: 'fireDmg', pre: '燃燒的', suf: '之炎', stat: 'fireDmg', base: [5, 11], per: 0.3, w: 5, fmt: v => `+${v}% 火焰傷害` },
  { id: 'coldDmg', pre: '凜冽的', suf: '之霜', stat: 'coldDmg', base: [5, 11], per: 0.3, w: 5, fmt: v => `+${v}% 冰霜傷害` },
  { id: 'lightDmg', pre: '轟鳴的', suf: '之雷', stat: 'lightDmg', base: [5, 11], per: 0.3, w: 5, fmt: v => `+${v}% 閃電傷害` },
  { id: 'poisonDmg', pre: '劇毒的', suf: '之毒', stat: 'poisonDmg', base: [5, 11], per: 0.3, w: 5, fmt: v => `+${v}% 毒素傷害` },
  { id: 'gold', pre: '貪婪的', suf: '之財', stat: 'gold', base: [8, 16], per: 0.5, w: 4, fmt: v => `+${v}% 金幣掉落` },
  { id: 'thorns', pre: '棘刺的', suf: '之棘', stat: 'thorns', base: [3, 8], per: 0.8, w: 4, fmt: v => `反傷 ${v} 點` }
];

/* 神器（unique）：固定強力效果 */
const UNIQUES = [
  { id: 'u_slothheart', name: '樹懶之心', slot: 'amulet', color: '#4ade80', power: 'slowfast', desc: '移動速度 -15%，但傷害 +45%' },
  { id: 'u_bloodfang', name: '血牙', slot: 'weapon', base: 'dagger', color: '#4ade80', power: 'bleed', desc: '攻擊造成流血：3 秒內額外 60% 傷害' },
  { id: 'u_stormcore', name: '風暴核心', slot: 'ring1', color: '#4ade80', power: 'chain', desc: '攻擊有 25% 機率釋放連鎖閃電' },
  { id: 'u_emberplate', name: '餘燼胸甲', slot: 'armor', base: 'plate', color: '#4ade80', power: 'burnaura', desc: '周身燃燒，持續灼傷附近敵人' },
  { id: 'u_voidstep', name: '虛空之履', slot: 'boots', base: 'boots', color: '#4ade80', power: 'phase', desc: '移動速度 +20%，受傷後短暫無敵' },
  { id: 'u_greedhand', name: '貪婪之手', slot: 'gloves', base: 'gloves', color: '#4ade80', power: 'greed', desc: '金幣掉落 +80%，擊殺有機率額外掉寶' },
  { id: 'u_lastcrown', name: '終末王冠', slot: 'helm', base: 'helmet', color: '#4ade80', power: 'lastbreath', desc: '致命傷害會留下 1 點生命（每層一次）' },
  { id: 'u_soulring', name: '靈魂之環', slot: 'ring2', color: '#4ade80', power: 'soulgain', desc: '靈魂獲取 +35%，每擊殺回復 3 法力' }
];

/* ================= 天賦（升級三選一） ================= */
/* apply(p) 直接改玩家 bonus；tag 用來過濾職業 */
const TALENTS = [
  { id: 't_hp', name: '鋼鐵之軀', desc: '最大生命 +18%', rarity: 1, apply: p => p.bonus.hpPct += 18 },
  { id: 't_dmg', name: '殺意', desc: '全體傷害 +12%', rarity: 1, apply: p => p.bonus.dmgPct += 12 },
  { id: 't_crit', name: '弱點洞察', desc: '暴擊率 +8%', rarity: 1, apply: p => p.bonus.crit += 8 },
  { id: 't_critdmg', name: '致命一擊', desc: '暴擊傷害 +35%', rarity: 1, apply: p => p.bonus.critDmg += 35 },
  { id: 't_spd', name: '疾風步', desc: '移動速度 +10%', rarity: 1, apply: p => p.bonus.speedPct += 10 },
  { id: 't_atkspd', name: '連擊', desc: '攻擊速度 +12%', rarity: 1, apply: p => p.bonus.atkSpd += 12 },
  { id: 't_cdr', name: '奧術效率', desc: '冷卻縮減 +10%', rarity: 1, apply: p => p.bonus.cdr += 10 },
  { id: 't_armor', name: '鱗甲', desc: '護甲 +40，全抗性 +8%', rarity: 1, apply: p => { p.bonus.armor += 40; p.bonus.resAll += 8; } },
  { id: 't_ls', name: '飲血', desc: '生命偷取 +4%', rarity: 2, apply: p => p.bonus.lifeSteal += 4 },
  { id: 't_regen', name: '再生', desc: '生命回復 +4/秒', rarity: 1, apply: p => p.bonus.hpRegen += 4 },
  { id: 't_mp', name: '法力泉湧', desc: '最大法力 +30，法力回復 +3/秒', rarity: 1, apply: p => { p.bonus.mp += 30; p.bonus.mpRegen += 3; } },
  { id: 't_thorns', name: '荊棘之皮', desc: '反傷 +25', rarity: 1, apply: p => p.bonus.thorns += 25 },
  { id: 't_pickup', name: '磁力', desc: '拾取範圍大幅提升，金幣 +25%', rarity: 1, apply: p => { p.bonus.pickup += 90; p.bonus.gold += 25; } },
  { id: 't_multishot', name: '分裂投射', desc: '投射物 +1（傷害 -15%）', rarity: 2, tag: 'proj', apply: p => { p.bonus.projectiles += 1; p.bonus.dmgPct -= 15; } },
  { id: 't_pierce', name: '穿透', desc: '投射物可穿透 +2 個敵人', rarity: 2, tag: 'proj', apply: p => p.bonus.pierce += 2 },
  { id: 't_explode', name: '爆裂彈幕', desc: '投射物命中時小爆炸', rarity: 2, tag: 'proj', apply: p => p.bonus.explodeShot += 1 },
  { id: 't_cleave', name: '橫掃', desc: '近戰攻擊範圍 +30%，傷害 +8%', rarity: 2, tag: 'melee', apply: p => { p.bonus.meleeRange += 30; p.bonus.dmgPct += 8; } },
  { id: 't_chain', name: '連鎖閃電', desc: '擊中時 20% 機率彈射閃電', rarity: 2, apply: p => p.bonus.chain += 20 },
  { id: 't_burn', name: '燃燒之觸', desc: '攻擊附加燃燒', rarity: 2, apply: p => p.bonus.burnOnHit += 1 },
  { id: 't_chill', name: '寒霜之觸', desc: '攻擊附加冰緩', rarity: 2, apply: p => p.bonus.chillOnHit += 1 },
  { id: 't_glass', name: '玻璃大砲', desc: '傷害 +40%，最大生命 -20%', rarity: 3, apply: p => { p.bonus.dmgPct += 40; p.bonus.hpPct -= 20; } },
  { id: 't_berserk', name: '瀕死狂怒', desc: '生命低於 35% 時傷害 +50%', rarity: 3, apply: p => p.bonus.lowHpDmg += 50 },
  { id: 't_execute', name: '處決', desc: '對生命低於 20% 的敵人傷害 +80%', rarity: 2, apply: p => p.bonus.execute += 80 },
  { id: 't_soul', name: '靈魂虹吸', desc: '靈魂獲取 +30%，擊殺回復 5 生命', rarity: 2, apply: p => { p.bonus.soulPct += 30; p.bonus.onKill += 5; } },
  { id: 't_orb', name: '守護球體', desc: '獲得一顆環繞的靈魂球體（可疊加）', rarity: 2, apply: p => p.bonus.orbs += 1 },
  { id: 't_nova', name: '死亡新星', desc: '敵人死亡時 30% 機率爆出彈幕', rarity: 2, apply: p => p.bonus.deathNova += 30 },
  { id: 't_shield', name: '護盾湧現', desc: '每 8 秒獲得吸收護盾', rarity: 2, apply: p => p.bonus.autoShield += 1 },
  { id: 't_second', name: '第二次呼吸', desc: '每層一次：致命傷害改為回復 40% 生命', rarity: 3, apply: p => p.bonus.secondWind += 1 },
  { id: 't_dodge', name: '殘影', desc: '15% 機率完全閃避攻擊', rarity: 2, apply: p => p.bonus.dodge += 15 },
  { id: 't_luck', name: '幸運', desc: '掉寶品質提升，稀有度機率 +20%', rarity: 2, apply: p => p.bonus.luck += 20 }
];

/* 技能天賦（給新主動技能） */
const SKILL_TALENTS = [
  { id: 'st_meteor', name: '技能：隕石', desc: '解鎖主動技「隕石」— 大範圍火焰傷害', skill: 'meteor', rarity: 2 },
  { id: 'st_nova', name: '技能：冰霜新星', desc: '解鎖主動技「冰霜新星」— 環繞冰凍', skill: 'frostnova', rarity: 2 },
  { id: 'st_chainl', name: '技能：雷鏈', desc: '解鎖主動技「雷鏈」— 連鎖閃電', skill: 'chainlightning', rarity: 2 },
  { id: 'st_dash', name: '技能：疾閃', desc: '解鎖主動技「疾閃」— 突進並造成傷害', skill: 'dash', rarity: 1 },
  { id: 'st_whirl', name: '技能：旋風', desc: '解鎖主動技「旋風」— 持續旋轉斬擊', skill: 'whirlwind', rarity: 2 },
  { id: 'st_summon', name: '技能：召喚樹懶靈', desc: '解鎖主動技「召喚樹懶靈」', skill: 'summon', rarity: 2 },
  { id: 'st_nova2', name: '技能：聖光爆發', desc: '解鎖主動技「聖光爆發」— 環形聖光', skill: 'holynova', rarity: 2 },
  { id: 'st_fire', name: '技能：火球', desc: '解鎖主動技「火球」', skill: 'fireball', rarity: 1 },
  { id: 'st_turret', name: '技能：符文砲塔', desc: '解鎖主動技「符文砲塔」— 部署自動攻擊塔', skill: 'turret', rarity: 2 },
  { id: 'st_black', name: '技能：黑洞', desc: '解鎖主動技「黑洞」— 吸引並持續傷害', skill: 'blackhole', rarity: 3 }
];

/* ================= 永久升級（小鎮） ================= */
const META_UPGRADES = [
  { id: 'm_hp', name: '祖傳體魄', desc: lv => `起始最大生命 +${lv * 12}`, max: 10, cost: lv => 40 + lv * 35, icon: '❤' },
  { id: 'm_dmg', name: '殺戮記憶', desc: lv => `全體傷害 +${lv * 5}%`, max: 10, cost: lv => 50 + lv * 45, icon: '⚔' },
  { id: 'm_armor', name: '亡者之甲', desc: lv => `護甲 +${lv * 15}，全抗性 +${lv * 3}%`, max: 8, cost: lv => 45 + lv * 40, icon: '🛡' },
  { id: 'm_speed', name: '不情願的敏捷', desc: lv => `移動速度 +${lv * 3}%`, max: 6, cost: lv => 60 + lv * 50, icon: '👟' },
  { id: 'm_souls', name: '靈魂共鳴', desc: lv => `靈魂獲取 +${lv * 12}%`, max: 8, cost: lv => 60 + lv * 55, icon: '💀' },
  { id: 'm_gold', name: '財富嗅覺', desc: lv => `起始金幣 +${lv * 120}，金幣掉落 +${lv * 10}%`, max: 6, cost: lv => 50 + lv * 40, icon: '💰' },
  { id: 'm_luck', name: '命運眷顧', desc: lv => `掉寶稀有度 +${lv * 8}%`, max: 8, cost: lv => 70 + lv * 60, icon: '🍀' },
  { id: 'm_potion', name: '藥水學', desc: lv => `起始藥水 +${lv}，藥水治療量 +${lv * 8}%`, max: 5, cost: lv => 55 + lv * 45, icon: '🧪' },
  { id: 'm_level', name: '前世經驗', desc: lv => `起始等級 +${lv}`, max: 5, cost: lv => 120 + lv * 110, icon: '⭐' },
  { id: 'm_revive', name: '契約重生', desc: lv => `每場可復活 ${lv} 次`, max: 2, cost: lv => 400 + lv * 600, icon: '✨' },
  { id: 'm_start', name: '深淵捷徑', desc: lv => `可從第 ${1 + lv * 5} 層開始（每 5 層解鎖）`, max: 3, cost: lv => 300 + lv * 350, icon: '🌀' },
  { id: 'unlock_summoner', name: '解鎖：樹懶術士', desc: () => '解鎖召喚職業', max: 1, cost: () => 300, icon: '🦥' },
  { id: 'unlock_templar', name: '解鎖：斷罪聖徒', desc: () => '解鎖聖騎職業', max: 1, cost: () => 450, icon: '⚡' }
];

/* ================= 神龕 ================= */
const SHRINES = [
  { id: 'power', name: '力量神龕', color: '#ff6b4a', desc: '傷害 +50%，持續 45 秒', dur: 45 },
  { id: 'haste', name: '疾速神龕', color: '#7bff9b', desc: '攻速與移速 +35%，持續 45 秒', dur: 45 },
  { id: 'shield', name: '守護神龕', color: '#7fb0ff', desc: '減傷 40%，持續 45 秒', dur: 45 },
  { id: 'fortune', name: '財富神龕', color: '#ffd45e', desc: '本層掉落大幅提升', dur: 999 },
  { id: 'blood', name: '血之神龕', color: '#ff4a6b', desc: '立即回滿生命，但最大生命 -10%', dur: 0 },
  { id: 'chaos', name: '混沌神龕', color: '#b46ee0', desc: '隨機祝福或詛咒…', dur: 45 }
];

/* ================= 消耗品 ================= */
const CONSUMABLES = {
  potion: { name: '治療藥水', color: '#ff5a6e', desc: '回復 45% 生命' },
  mana: { name: '法力藥水', color: '#5a8cff', desc: '回復 60% 法力' }
};
