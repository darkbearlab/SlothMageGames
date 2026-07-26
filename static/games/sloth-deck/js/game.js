/* ===========================================================
   Sloth Deck —《樹懶法師：睡前牌局》
   卡牌構築 roguelike：分支地圖、卡牌、遺物、三位守關者
   =========================================================== */
'use strict';

const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const rnd = () => Math.random();
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const SAVE_KEY = 'slothDeck.v1';

/* =================== 卡片 =================== */
/* v(up) 取值：未強化 / 強化 */
const V = (a, b) => (up) => up ? b : a;

const CARDS = {
  /* ---- 攻擊 ---- */
  strike: {
    name: '打擊', type: 'attack', cost: 1, rarity: 0, art: '🗡', target: true,
    dmg: V(6, 9), desc: c => `造成 <b>${c.dmg}</b> 點傷害。`,
    play: (B, c, t) => dealDamage(t, c.dmg)
  },
  heavy: {
    name: '重擊', type: 'attack', cost: 2, rarity: 0, art: '🔨', target: true,
    dmg: V(13, 17), desc: c => `造成 <b>${c.dmg}</b> 點傷害。`,
    play: (B, c, t) => dealDamage(t, c.dmg)
  },
  jab: {
    name: '連刺', type: 'attack', cost: 1, rarity: 0, art: '🔪', target: true,
    dmg: V(3, 4), hits: V(3, 3), desc: c => `造成 <b>${c.dmg}</b> 點傷害 <b>${c.hits}</b> 次。`,
    play: (B, c, t) => { for (let i = 0; i < c.hits; i++) if (!t.dead) dealDamage(t, c.dmg); }
  },
  ember: {
    name: '火花彈', type: 'attack', cost: 1, rarity: 1, art: '🔥', target: true,
    dmg: V(7, 10), burn: V(2, 3), desc: c => `造成 <b>${c.dmg}</b> 點傷害，並施加 <b>${c.burn}</b> 層燃燒。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); addBuff(t, 'burn', c.burn); }
  },
  icicle: {
    name: '冰錐', type: 'attack', cost: 1, rarity: 1, art: '❄️', target: true,
    dmg: V(7, 9), weak: V(1, 2), desc: c => `造成 <b>${c.dmg}</b> 點傷害，施加 <b>${c.weak}</b> 層虛弱。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); addBuff(t, 'weak', c.weak); }
  },
  bolt: {
    name: '雷擊', type: 'attack', cost: 2, rarity: 1, art: '⚡', target: true,
    dmg: V(12, 16), desc: c => `造成 <b>${c.dmg}</b> 點傷害，抽 1 張牌。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); drawCards(1); }
  },
  flurry: {
    name: '亂舞', type: 'attack', cost: 'X', rarity: 2, art: '🌪', target: true,
    dmg: V(5, 7), desc: c => `消耗所有能量，每點能量造成 <b>${c.dmg}</b> 點傷害。`,
    play: (B, c, t, x) => { for (let i = 0; i < x; i++) if (!t.dead) dealDamage(t, c.dmg); }
  },
  backstab: {
    name: '背刺', type: 'attack', cost: 1, rarity: 1, art: '🗡', target: true,
    dmg: V(8, 11), bonus: V(6, 9), desc: c => `造成 <b>${c.dmg}</b> 點傷害；若本回合尚未受到傷害，額外 <b>${c.bonus}</b> 點。`,
    play: (B, c, t) => dealDamage(t, c.dmg + (B.tookDamage ? 0 : c.bonus))
  },
  riposte: {
    name: '反擊', type: 'attack', cost: 1, rarity: 0, art: '⚔️', target: true,
    dmg: V(5, 7), blk: V(5, 8), desc: c => `造成 <b>${c.dmg}</b> 點傷害，獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); gainBlock(c.blk); }
  },
  slothsmash: {
    name: '樹懶重擊', type: 'attack', cost: 2, rarity: 1, art: '🦥', target: true,
    dmg: V(16, 21), desc: c => `造成 <b>${c.dmg}</b> 點傷害。下回合少抽一張牌。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); B.drawPenalty = (B.drawPenalty || 0) + 1; }
  },
  rend: {
    name: '撕裂', type: 'attack', cost: 1, rarity: 1, art: '💥', target: true,
    dmg: V(6, 8), vuln: V(2, 3), desc: c => `造成 <b>${c.dmg}</b> 點傷害，施加 <b>${c.vuln}</b> 層易傷。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); addBuff(t, 'vuln', c.vuln); }
  },
  venom: {
    name: '毒刃', type: 'attack', cost: 1, rarity: 1, art: '🧪', target: true,
    dmg: V(5, 6), poison: V(3, 5), desc: c => `造成 <b>${c.dmg}</b> 點傷害，施加 <b>${c.poison}</b> 層中毒。`,
    play: (B, c, t) => { dealDamage(t, c.dmg); addBuff(t, 'poison', c.poison); }
  },
  cleave: {
    name: '橫掃', type: 'attack', cost: 1, rarity: 1, art: '🌀',
    dmg: V(7, 10), desc: c => `對<b>所有</b>敵人造成 <b>${c.dmg}</b> 點傷害。`,
    play: (B, c) => B.enemies.slice().forEach(e => { if (!e.dead) dealDamage(e, c.dmg); })
  },
  charge: {
    name: '蓄力斬', type: 'attack', cost: 2, rarity: 2, art: '💪', target: true,
    dmg: V(8, 11), desc: c => `造成 <b>${c.dmg}</b> 點傷害，每擁有 1 點力量再額外 +2。`,
    play: (B, c, t) => dealDamage(t, c.dmg + (B.buffs.str || 0) * 2)
  },
  drain: {
    name: '靈魂汲取', type: 'attack', cost: 1, rarity: 1, art: '🩸', target: true,
    dmg: V(5, 7), desc: c => `造成 <b>${c.dmg}</b> 點傷害，並回復等量生命。`,
    play: (B, c, t) => { const d = dealDamage(t, c.dmg); healPlayer(d); }
  },
  finisher: {
    name: '終結', type: 'attack', cost: 2, rarity: 2, art: '☠️', target: true,
    dmg: V(11, 15), desc: c => `造成 <b>${c.dmg}</b> 點傷害；若目標生命低於 30%，傷害 +80%。`,
    play: (B, c, t) => dealDamage(t, Math.round(c.dmg * (t.hp / t.maxHp < 0.3 ? 1.8 : 1)))
  },

  /* ---- 技能 ---- */
  defend: {
    name: '防禦', type: 'skill', cost: 1, rarity: 0, art: '🛡',
    blk: V(5, 8), desc: c => `獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c) => gainBlock(c.blk)
  },
  ironwall: {
    name: '鐵壁', type: 'skill', cost: 2, rarity: 0, art: '🧱',
    blk: V(13, 17), desc: c => `獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c) => gainBlock(c.blk)
  },
  dodge: {
    name: '閃避', type: 'skill', cost: 1, rarity: 1, art: '💨',
    blk: V(7, 9), desc: c => `獲得 <b>${c.blk}</b> 點格擋，抽 1 張牌。`,
    play: (B, c) => { gainBlock(c.blk); drawCards(1); }
  },
  meditate: {
    name: '冥想', type: 'skill', cost: 0, rarity: 2, art: '🧘', exhaust: true,
    e: V(2, 3), desc: c => `獲得 <b>${c.e}</b> 點能量。<i>消耗</i>`,
    play: (B, c) => { B.energy += c.e; }
  },
  speedread: {
    name: '速讀', type: 'skill', cost: 1, rarity: 1, art: '📖',
    n: V(3, 4), desc: c => `抽 <b>${c.n}</b> 張牌。`,
    play: (B, c) => drawCards(c.n)
  },
  tidy: {
    name: '整備', type: 'skill', cost: 0, rarity: 1, art: '🗂',
    n: V(2, 3), desc: c => `抽 <b>${c.n}</b> 張牌，然後隨機棄 1 張。`,
    play: (B, c) => {
      drawCards(c.n);
      if (B.hand.length) { const i = Math.floor(rnd() * B.hand.length); B.discard.push(B.hand.splice(i, 1)[0]); }
    }
  },
  nap: {
    name: '打盹', type: 'skill', cost: 1, rarity: 1, art: '😴',
    heal: V(7, 10), blk: V(4, 6), desc: c => `回復 <b>${c.heal}</b> 點生命，獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c) => { healPlayer(c.heal); gainBlock(c.blk); }
  },
  mist: {
    name: '中毒之霧', type: 'skill', cost: 1, rarity: 1, art: '☠️',
    poison: V(3, 5), desc: c => `對所有敵人施加 <b>${c.poison}</b> 層中毒。`,
    play: (B, c) => B.enemies.forEach(e => { if (!e.dead) addBuff(e, 'poison', c.poison); })
  },
  frostshield: {
    name: '寒霜護盾', type: 'skill', cost: 2, rarity: 1, art: '🛡',
    blk: V(9, 12), weak: V(1, 2), desc: c => `獲得 <b>${c.blk}</b> 點格擋，對所有敵人施加 <b>${c.weak}</b> 層虛弱。`,
    play: (B, c) => { gainBlock(c.blk); B.enemies.forEach(e => { if (!e.dead) addBuff(e, 'weak', c.weak); }); }
  },
  siesta: {
    name: '樹懶的午睡', type: 'skill', cost: 1, rarity: 2, art: '🛌',
    heal: V(12, 17), desc: c => `回復 <b>${c.heal}</b> 點生命，然後立刻結束回合。`,
    play: (B, c) => { healPlayer(c.heal); B.forceEnd = true; }
  },
  echo: {
    name: '復誦', type: 'skill', cost: 1, rarity: 2, art: '🔁', exhaust: true,
    desc: () => `將手中隨機一張牌複製一份加入手牌。<i>消耗</i>`,
    play: (B) => {
      const pool = B.hand.filter(c => c.id !== 'echo');
      if (pool.length) B.hand.push({ id: pick(pool).id, up: false });
    }
  },
  rush: {
    name: '加速', type: 'skill', cost: 0, rarity: 1, art: '⏩', exhaust: true,
    n: V(1, 2), desc: c => `獲得 1 點能量，抽 <b>${c.n}</b> 張牌。<i>消耗</i>`,
    play: (B, c) => { B.energy += 1; drawCards(c.n); }
  },
  focus: {
    name: '集中', type: 'skill', cost: 1, rarity: 2, art: '🎯',
    desc: () => `本回合下一張攻擊牌的傷害<b>翻倍</b>。`,
    play: (B) => { B.doubleNext = true; }
  },
  purge: {
    name: '淨化', type: 'skill', cost: 1, rarity: 1, art: '✨',
    blk: V(6, 9), desc: c => `移除自身所有負面狀態，獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c) => {
      ['vuln', 'weak', 'poison', 'burn'].forEach(k => delete B.buffs[k]);
      gainBlock(c.blk);
    }
  },
  prep: {
    name: '掩護', type: 'skill', cost: 0, rarity: 1, art: '🪖',
    blk: V(3, 5), desc: c => `獲得 <b>${c.blk}</b> 點格擋。`,
    play: (B, c) => gainBlock(c.blk)
  },

  /* ---- 能力 ---- */
  rage: {
    name: '激勵', type: 'power', cost: 1, rarity: 1, art: '💢',
    n: V(2, 3), desc: c => `獲得 <b>${c.n}</b> 點力量（攻擊傷害提升）。`,
    play: (B, c) => addBuffP('str', c.n)
  },
  agility: {
    name: '磨練', type: 'power', cost: 1, rarity: 1, art: '🤸',
    n: V(2, 3), desc: c => `獲得 <b>${c.n}</b> 點敏捷（格擋提升）。`,
    play: (B, c) => addBuffP('dex', c.n)
  },
  barrier: {
    name: '護體', type: 'power', cost: 2, rarity: 2, art: '🔰',
    n: V(4, 6), desc: c => `每回合開始時獲得 <b>${c.n}</b> 點格擋。`,
    play: (B, c) => addBuffP('barrier', c.n)
  },
  inferno: {
    name: '燃燒之魂', type: 'power', cost: 2, rarity: 2, art: '🔥',
    n: V(2, 3), desc: c => `每回合開始時對所有敵人施加 <b>${c.n}</b> 層燃燒。`,
    play: (B, c) => addBuffP('inferno', c.n)
  },
  metabolism: {
    name: '代謝', type: 'power', cost: 1, rarity: 1, art: '🌿',
    n: V(3, 4), desc: c => `每回合開始時回復 <b>${c.n}</b> 點生命。`,
    play: (B, c) => addBuffP('regen', c.n)
  },
  overload: {
    name: '過載', type: 'power', cost: 2, rarity: 2, art: '🧠',
    desc: () => `每回合多抽 1 張牌。`,
    play: () => addBuffP('extraDraw', 1)
  },
  thorns: {
    name: '荊棘之皮', type: 'power', cost: 1, rarity: 2, art: '🌵',
    n: V(3, 5), desc: c => `受到攻擊時對攻擊者造成 <b>${c.n}</b> 點傷害。`,
    play: (B, c) => addBuffP('thorns', c.n)
  }
};
Object.keys(CARDS).forEach(k => CARDS[k].id = k);

/* 依稀有度抽卡池 */
const CARD_POOL = Object.keys(CARDS).filter(k => !['strike', 'defend'].includes(k));
function rollCard(luckyElite) {
  const r = rnd();
  let want = r < 0.62 ? 0 : (r < 0.92 ? 1 : 2);
  if (luckyElite) want = Math.min(2, want + 1);
  let pool = CARD_POOL.filter(k => CARDS[k].rarity === want);
  if (!pool.length) pool = CARD_POOL;
  return { id: pick(pool), up: false };
}

/* =================== 遺物 =================== */
const RELICS = {
  badge: { name: '樹懶徽章', icon: '🦥', desc: '每場戰鬥的第 1 回合獲得 1 點額外能量。' },
  amulet: { name: '破損護符', icon: '🧿', desc: '每場戰鬥開始時獲得 6 點格擋。' },
  coffee: { name: '咖啡杯', icon: '☕', desc: '每回合多抽 1 張牌，但回合開始失去 1 點生命。' },
  mossstone: { name: '苔癬石', icon: '🪨', desc: '回合結束時，每剩餘 1 點能量回復 2 點生命。' },
  fang: { name: '尖牙', icon: '🦷', desc: '攻擊牌傷害 +2。' },
  feather: { name: '羽毛', icon: '🪶', desc: '獲得格擋時額外 +2。' },
  bloodbag: { name: '血袋', icon: '🩸', desc: '每場戰鬥結束後回復 7 點生命。' },
  purse: { name: '錢袋', icon: '👛', desc: '獲得的金幣 +50%。' },
  hourglass: { name: '沙漏', icon: '⏳', desc: '每 3 回合獲得 1 點力量。' },
  shard: { name: '護符碎片', icon: '💠', desc: '每場戰鬥可免疫一次致命傷害（留下 1 點生命）。' },
  glove: { name: '魔導手套', icon: '🧤', desc: '每回合第一張技能牌費用 -1。' },
  wormwood: { name: '苦艾', icon: '🌿', desc: '中毒與燃燒的效果提升 50%。' },
  whetstone: { name: '磨刀石', icon: '🪚', desc: '每場戰鬥開始時獲得 1 點力量。' },
  quilt: { name: '厚棉被', icon: '🛏', desc: '最大生命 +18（取得時同步回復）。' },
  coin: { name: '雙面幣', icon: '🪙', desc: '每場戰鬥的第 1 回合多抽 2 張牌。' },
  core: { name: '魔導核心', icon: '🔮', desc: '能量上限 +1，但最大生命 -10。' }
};
Object.keys(RELICS).forEach(k => RELICS[k].id = k);

/* =================== 敵人 =================== */
function mv(type, o) { return Object.assign({ type }, o); }
const ENEMIES = {
  slime: {
    name: '史萊姆', emoji: '🟢', hp: [20, 26],
    ai: (e, t) => t % 3 === 2 ? mv('block', { n: 8 }) : mv('attack', { n: 7 })
  },
  bat: {
    name: '暗影蝠', emoji: '🦇', hp: [15, 20],
    ai: (e, t) => t % 2 ? mv('attack', { n: 4, times: 2 }) : mv('debuff', { buff: 'weak', n: 1, txt: '虛弱' })
  },
  skel: {
    name: '骷髏兵', emoji: '💀', hp: [24, 30],
    ai: (e, t) => t % 3 === 1 ? mv('blockattack', { n: 6, blk: 6 }) : mv('attack', { n: 10 })
  },
  thief: {
    name: '盜賊', emoji: '🥷', hp: [22, 28],
    ai: (e, t) => t % 3 === 2 ? mv('steal', { n: 6, gold: 25 }) : mv('attack', { n: 8 })
  },
  mush: {
    name: '毒菇', emoji: '🍄', hp: [26, 32],
    ai: (e, t) => t % 2 ? mv('attack', { n: 5, poison: 2 }) : mv('buff', { buff: 'str', n: 2, txt: '力量' })
  },
  gargoyle: {
    name: '石像鬼', emoji: '🗿', hp: [34, 42],
    ai: (e, t) => t % 2 ? mv('block', { n: 12 }) : mv('attack', { n: 13 })
  },
  firespirit: {
    name: '火靈', emoji: '🔥', hp: [22, 28],
    ai: (e, t) => t % 3 === 0 ? mv('attack', { n: 6, burn: 2 }) : mv('attack', { n: 5, times: 2 })
  },
  iceling: {
    name: '冰魔', emoji: '❄️', hp: [28, 34],
    ai: (e, t) => t % 3 === 1 ? mv('debuff', { buff: 'weak', n: 2, txt: '虛弱' }) : mv('attack', { n: 9 })
  },
  cursed: {
    name: '詛咒書', emoji: '📕', hp: [20, 26],
    ai: (e, t) => t % 2 ? mv('debuff', { buff: 'vuln', n: 2, txt: '易傷' }) : mv('attack', { n: 11 })
  }
};
const ELITES = {
  twohead: {
    name: '雙頭獄犬', emoji: '🐺', hp: [62, 72], elite: true,
    ai: (e, t) => t % 3 === 0 ? mv('buff', { buff: 'str', n: 3, txt: '力量' })
      : (t % 3 === 1 ? mv('attack', { n: 9, times: 2 }) : mv('attack', { n: 17 }))
  },
  cultist: {
    name: '深淵咒術師', emoji: '🧙', hp: [54, 62], elite: true,
    ai: (e, t) => t % 3 === 0 ? mv('debuff', { buff: 'vuln', n: 2, txt: '易傷' })
      : (t % 3 === 1 ? mv('attack', { n: 13 }) : mv('blockattack', { n: 8, blk: 10 }))
  },
  knight: {
    name: '鐵甲武士', emoji: '🛡', hp: [74, 86], elite: true,
    ai: (e, t) => t % 3 === 0 ? mv('block', { n: 16 })
      : (t % 3 === 1 ? mv('attack', { n: 15 }) : mv('attack', { n: 8, times: 2 }))
  }
};
const BOSSES = {
  boneking: {
    name: '骨之王 · 歐斯蒙', emoji: '☠️', hp: [132, 132], boss: true,
    ai: (e, t) => {
      const m = t % 4;
      if (m === 0) return mv('buff', { buff: 'str', n: 3, txt: '力量' });
      if (m === 1) return mv('attack', { n: 7, times: 3 });
      if (m === 2) return mv('blockattack', { n: 11, blk: 14 });
      return mv('attack', { n: 19 });
    }
  },
  eye: {
    name: '深淵之瞳', emoji: '👁', hp: [185, 185], boss: true,
    ai: (e, t) => {
      const m = t % 4;
      if (m === 0) return mv('debuff', { buff: 'vuln', n: 2, txt: '易傷' });
      if (m === 1) return mv('attack', { n: 9, times: 3 });
      if (m === 2) return mv('attack', { n: 13, poison: 3 });
      return mv('attack', { n: 27 });
    }
  },
  slothdemon: {
    name: '樹懶魔神 · 阿斯莫貝爾', emoji: '👹', hp: [255, 255], boss: true,
    ai: (e, t) => {
      const m = t % 5;
      if (m === 0) return mv('buff', { buff: 'str', n: 4, txt: '力量' });
      if (m === 1) return mv('attack', { n: 11, times: 3 });
      if (m === 2) return mv('blockattack', { n: 15, blk: 18 });
      if (m === 3) return mv('debuff', { buff: 'weak', n: 2, txt: '虛弱' });
      return mv('attack', { n: 32 });
    }
  }
};
const ACT_BOSS = ['boneking', 'eye', 'slothdemon'];

/* =================== 事件 =================== */
const EVENTS = [
  {
    title: '苔蘚覆蓋的神龕', text: '一座半埋在土裡的神龕，散發著微弱的綠光。要獻上一點血嗎？',
    opts: [
      { t: '獻上 8 點生命 → 獲得一張稀有卡', act: () => { S.hp = Math.max(1, S.hp - 8); const c = { id: pick(CARD_POOL.filter(k => CARDS[k].rarity === 2)), up: false }; S.deck.push(c); return `失去 8 點生命，獲得「${CARDS[c.id].name}」。`; } },
      { t: '把神龕擦乾淨 → 回復 12 點生命', act: () => { healOut(12); return '神龕溫暖地發亮，你感覺好多了。'; } },
      { t: '不理它，繼續睡', act: () => '你走過去了。神龕看起來有點失望。' }
    ]
  },
  {
    title: '睡著的旅商', text: '一位商人靠在牆邊打呼，貨物就攤在旁邊。旁邊立了個牌子：「自助，請自律。」',
    opts: [
      { t: '拿一件遺物（並留下 90 金幣）', cond: () => S.gold >= 90, act: () => { S.gold -= 90; const r = grantRelic(); return `你留下 90 金幣，帶走了「${RELICS[r].name}」。`; } },
      { t: '偷走全部（獲得 140 金幣，但失去 12 生命）', act: () => { S.gold += 140; S.hp = Math.max(1, S.hp - 12); return '你抱著金幣逃跑，途中撞到門框。'; } },
      { t: '幫他蓋被子（回復 8 生命）', act: () => { healOut(8); return '你也順便打了個盹。'; } }
    ]
  },
  {
    title: '遺忘的書架', text: '滿架子的書，大部分已經爛掉了。有幾本還看得懂。',
    opts: [
      { t: '強化一張牌', act: () => { UI.upgradeScreen(); return null; } },
      { t: '移除一張牌', act: () => { UI.removeScreen(); return null; } },
      { t: '把書全賣了（+120 金幣）', act: () => { addGold(120); return '這些書意外地值錢。'; } }
    ]
  },
  {
    title: '深淵的低語', text: '牆縫裡傳出聲音：「把你的一部分給我，我讓你更強。」',
    opts: [
      { t: '獻上最大生命 12 點 → 獲得 2 張稀有卡', act: () => { S.maxHp -= 12; S.hp = Math.min(S.hp, S.maxHp); for (let i = 0; i < 2; i++) S.deck.push({ id: pick(CARD_POOL.filter(k => CARDS[k].rarity === 2)), up: false }); return '低語滿意地退去。你的牌組變厚了。'; } },
      { t: '獻上 150 金幣 → 獲得一件遺物', cond: () => S.gold >= 150, act: () => { S.gold -= 150; const r = grantRelic(); return `牆縫吐出了「${RELICS[r].name}」。`; } },
      { t: '拒絕', act: () => '低語罵了句髒話就消失了。' }
    ]
  },
  {
    title: '溫泉', text: '一池冒著熱氣的溫泉，聞起來有硫磺味。',
    opts: [
      { t: '泡一下（回復 35% 生命）', act: () => { healOut(Math.round(S.maxHp * 0.35)); return '舒服。'; } },
      { t: '喝一口（最大生命 +8）', act: () => { S.maxHp += 8; S.hp += 8; return '味道很糟，但你感覺更耐打了。'; } },
      { t: '在裡面睡著（回滿生命，但失去 60 金幣）', act: () => { S.hp = S.maxHp; S.gold = Math.max(0, S.gold - 60); return '醒來時錢包輕了不少。'; } }
    ]
  },
  {
    title: '賭徒的骰子', text: '地上有一顆會自己滾動的骰子。',
    opts: [
      { t: '擲一次（隨機好事或壞事）', act: () => {
        const r = rnd();
        if (r < 0.4) { addGold(200); return '🎲 六點！獲得 200 金幣。'; }
        if (r < 0.65) { const rl = grantRelic(); return `🎲 幸運！獲得遺物「${RELICS[rl].name}」。`; }
        if (r < 0.85) { S.hp = Math.max(1, S.hp - 15); return '🎲 一點…你被骰子砸到頭，失去 15 生命。'; }
        S.deck.push({ id: 'strike', up: false }); return '🎲 骰子塞給你一張普通的「打擊」。';
      } },
      { t: '不賭', act: () => '骰子滾走了。' }
    ]
  }
];

/* =================== 遊戲狀態 =================== */
let S = null, B = null;

function newRun() {
  S = {
    hp: 75, maxHp: 75, gold: 100, act: 1, floor: 0,
    deck: [], relics: [], map: null, node: null, path: [],
    maxEnergy: 3, won: false, dead: false,
    stats: { battles: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0 }
  };
  for (let i = 0; i < 5; i++) S.deck.push({ id: 'strike', up: false });
  for (let i = 0; i < 4; i++) S.deck.push({ id: 'defend', up: false });
  S.deck.push({ id: 'riposte', up: false });
  S.deck.push({ id: 'nap', up: false });
  S.relics.push('badge');
  genMap();
  save();
}

function hasRelic(id) { return S.relics.includes(id); }
function grantRelic() {
  const pool = Object.keys(RELICS).filter(r => !S.relics.includes(r));
  if (!pool.length) { addGold(120); return null; }
  const r = pick(pool);
  S.relics.push(r);
  if (r === 'quilt') { S.maxHp += 18; S.hp += 18; }
  if (r === 'core') { S.maxEnergy += 1; S.maxHp = Math.max(10, S.maxHp - 10); S.hp = Math.min(S.hp, S.maxHp); }
  return r;
}
function addGold(n) { S.gold += Math.round(n * (hasRelic('purse') ? 1.5 : 1)); }
function healOut(n) { S.hp = Math.min(S.maxHp, S.hp + n); }

/* =================== 地圖 =================== */
const NODE_ICON = { battle: '⚔️', elite: '💀', event: '❓', shop: '🛒', rest: '🔥', boss: '👑' };
const NODE_NAME = { battle: '戰鬥', elite: '精英', event: '事件', shop: '商店', rest: '休息', boss: '守關者' };

function genMap() {
  const rows = 13;
  const map = [];
  for (let r = 0; r < rows; r++) {
    const n = r === 0 ? 2 : (r === rows - 1 ? 1 : ri(2, 4));
    const row = [];
    for (let i = 0; i < n; i++) {
      let type = 'battle';
      if (r === rows - 1) type = 'boss';
      else if (r === 0) type = 'battle';
      else {
        const p = rnd();
        if (r >= rows - 3 && p < 0.5) type = 'rest';
        else if (p < 0.34) type = 'battle';
        else if (p < 0.5) type = 'event';
        else if (p < 0.63) type = 'elite';
        else if (p < 0.74) type = 'shop';
        else if (p < 0.87) type = 'rest';
        else type = 'battle';
      }
      row.push({ r, i, type, x: (i + 1) / (n + 1), next: [], done: false });
    }
    map.push(row);
  }
  // 連線
  for (let r = 0; r < rows - 1; r++) {
    const cur = map[r], nx = map[r + 1];
    cur.forEach((node, i) => {
      const target = Math.round(node.x * (nx.length - 1));
      const set = new Set([clamp(target, 0, nx.length - 1)]);
      if (rnd() < 0.5) set.add(clamp(target + (rnd() < 0.5 ? -1 : 1), 0, nx.length - 1));
      node.next = [...set];
    });
    // 確保每個下一排節點都有人連
    nx.forEach((n2, j) => {
      if (!cur.some(c => c.next.includes(j))) {
        const best = cur.reduce((a, b) => Math.abs(a.x - n2.x) < Math.abs(b.x - n2.x) ? a : b);
        best.next.push(j);
      }
    });
  }
  S.map = map;
  S.node = null;
  S.floor = 0;
}

function availableNodes() {
  if (!S.node) return S.map[0].map((n, i) => ({ r: 0, i }));
  const cur = S.map[S.node.r][S.node.i];
  return cur.next.map(i => ({ r: S.node.r + 1, i }));
}

function enterNode(r, i) {
  const node = S.map[r][i];
  S.node = { r, i };
  S.floor = r + 1 + (S.act - 1) * 13;
  save();
  if (node.type === 'battle') startBattle('normal');
  else if (node.type === 'elite') startBattle('elite');
  else if (node.type === 'boss') startBattle('boss');
  else if (node.type === 'event') UI.eventScreen(pick(EVENTS));
  else if (node.type === 'shop') UI.shopScreen();
  else if (node.type === 'rest') UI.restScreen();
}

/* =================== 戰鬥 =================== */
function actScale() { return 1 + (S.act - 1) * 0.55; }
function actDmg() { return 1 + (S.act - 1) * 0.36; }

function makeEnemy(defId, table) {
  const d = (table || ENEMIES)[defId];
  const hp = Math.round(ri(d.hp[0], d.hp[1]) * actScale());
  return {
    defId, def: d, name: d.name, emoji: d.emoji,
    hp, maxHp: hp, block: 0, buffs: {}, turn: 0, intent: null, dead: false,
    uid: 'e' + Math.random().toString(36).slice(2, 8)
  };
}

function startBattle(kind) {
  const list = [];
  if (kind === 'boss') {
    list.push(makeEnemy(ACT_BOSS[Math.min(S.act, 3) - 1], BOSSES));
  } else if (kind === 'elite') {
    list.push(makeEnemy(pick(Object.keys(ELITES)), ELITES));
    S.stats.elites++;
  } else {
    const n = rnd() < 0.45 ? 1 : (rnd() < 0.8 ? 2 : 3);
    const keys = Object.keys(ENEMIES);
    for (let i = 0; i < n; i++) list.push(makeEnemy(pick(keys)));
  }
  S.stats.battles++;

  B = {
    kind, enemies: list, hand: [], drawPile: shuffle(S.deck.map(c => ({ id: c.id, up: c.up }))),
    discard: [], exhaust: [], energy: S.maxEnergy, turn: 0, block: 0, buffs: {},
    tookDamage: false, doubleNext: false, forceEnd: false, drawPenalty: 0,
    shardUsed: false, glovedUsed: false, over: false, busy: false
  };
  // 遺物：戰鬥開始
  if (hasRelic('amulet')) B.block += 6;
  if (hasRelic('whetstone')) B.buffs.str = (B.buffs.str || 0) + 1;
  UI.toBattle();
  startTurn();
}

function startTurn() {
  B.turn++;
  B.block = 0;
  B.tookDamage = false;
  B.doubleNext = false;
  B.gloveUsed = false;
  B.energy = S.maxEnergy;
  if (B.turn === 1 && hasRelic('badge')) B.energy += 1;
  if (hasRelic('coffee')) { S.hp = Math.max(1, S.hp - 1); }
  if (hasRelic('hourglass') && B.turn % 3 === 0) { B.buffs.str = (B.buffs.str || 0) + 1; UI.float(null, '力量+1', '#ffd45e'); }

  // 能力效果
  if (B.buffs.barrier) gainBlock(B.buffs.barrier, true);
  if (B.buffs.regen) healPlayer(B.buffs.regen);
  if (B.buffs.inferno) B.enemies.forEach(e => { if (!e.dead) addBuff(e, 'burn', B.buffs.inferno); });

  let n = 5 + (B.buffs.extraDraw || 0) - (B.drawPenalty || 0);
  if (hasRelic('coffee')) n += 1;
  if (B.turn === 1 && hasRelic('coin')) n += 2;
  B.drawPenalty = 0;
  drawCards(Math.max(0, n));

  // 敵人意圖
  B.enemies.forEach(e => { if (!e.dead) e.intent = e.def.ai(e, e.turn); });
  UI.renderBattle();
}

function drawCards(n) {
  for (let i = 0; i < n; i++) {
    if (B.hand.length >= 10) break;
    if (!B.drawPile.length) {
      if (!B.discard.length) break;
      B.drawPile = shuffle(B.discard);
      B.discard = [];
    }
    B.hand.push(B.drawPile.pop());
  }
}

function cardCost(c) {
  const def = CARDS[c.id];
  if (def.cost === 'X') return 'X';
  let cost = def.cost;
  if (hasRelic('glove') && def.type === 'skill' && !B.gloveUsed) cost = Math.max(0, cost - 1);
  return cost;
}

function canPlay(c) {
  const cost = cardCost(c);
  if (cost === 'X') return B.energy > 0;
  return B.energy >= cost;
}

function playCard(idx, target) {
  const c = B.hand[idx];
  if (!c || B.over || B.busy) return false;
  const def = CARDS[c.id];
  if (!canPlay(c)) return false;
  if (def.target && !target) return false;
  const cost = cardCost(c);
  let x = 0;
  if (cost === 'X') { x = B.energy; B.energy = 0; }
  else B.energy -= cost;
  if (hasRelic('glove') && def.type === 'skill') B.gloveUsed = true;

  B.hand.splice(idx, 1);
  const view = cardView(c);
  S.stats.cardsPlayed++;
  def.play(B, view, target, x);

  if (def.type === 'power') { /* 能力牌打完消失 */ }
  else if (def.exhaust) B.exhaust.push(c);
  else B.discard.push(c);
  if (def.type === 'power') B.exhaust.push(c);

  cleanupDead();
  UI.renderBattle();
  if (B.forceEnd) { B.forceEnd = false; setTimeout(endTurn, 260); }
  else checkWin();
  return true;
}

/* 卡片實際數值（含強化） */
function cardView(c) {
  const def = CARDS[c.id];
  const v = { id: c.id, up: c.up, name: def.name + (c.up ? '+' : ''), type: def.type, art: def.art };
  for (const k in def) {
    if (typeof def[k] === 'function' && !['play', 'desc'].includes(k)) v[k] = def[k](c.up);
  }
  v.cost = def.cost;
  v.descText = def.desc(v);
  return v;
}

/* ---- 傷害與狀態 ---- */
function dmgMultiplierFor(src, tgt) {
  let m = 1;
  if (src && src.buffs && src.buffs.weak) m *= 0.75;
  if (tgt && tgt.buffs && tgt.buffs.vuln) m *= 1.5;
  return m;
}

function dealDamage(enemy, base) {
  if (!enemy || enemy.dead) return 0;
  let d = base + (B.buffs.str || 0);
  if (hasRelic('fang')) d += 2;
  if (B.doubleNext) { d *= 2; B.doubleNext = false; }
  d = Math.max(0, Math.round(d * dmgMultiplierFor({ buffs: B.buffs }, enemy)));
  const absorbed = Math.min(enemy.block, d);
  enemy.block -= absorbed;
  const real = d - absorbed;
  enemy.hp -= real;
  S.stats.dmgDealt += real;
  UI.float(enemy.uid, '-' + d, '#ff8a6b');
  UI.hit(enemy.uid);
  if (enemy.hp <= 0) { enemy.hp = 0; enemy.dead = true; }
  return real;
}

function damagePlayer(base, srcEnemy) {
  let d = Math.round(base * dmgMultiplierFor(srcEnemy, { buffs: B.buffs }));
  const absorbed = Math.min(B.block, d);
  B.block -= absorbed;
  const real = d - absorbed;
  if (real > 0) {
    S.hp -= real;
    B.tookDamage = true;
    if (B.buffs.thorns && srcEnemy && !srcEnemy.dead) dealDamageRaw(srcEnemy, B.buffs.thorns);
  }
  UI.float('player', '-' + d, '#ff5a5a');
  UI.hit('player');
  if (S.hp <= 0) {
    if (hasRelic('shard') && !B.shardUsed) { B.shardUsed = true; S.hp = 1; UI.toast('護符碎片替你擋下了致命一擊！'); }
    else { S.hp = 0; gameOver(); }
  }
  return real;
}
function dealDamageRaw(enemy, n) {
  enemy.hp -= n;
  UI.float(enemy.uid, '-' + n, '#9fe08a');
  if (enemy.hp <= 0) { enemy.hp = 0; enemy.dead = true; }
}

function gainBlock(n, silent) {
  let b = n + (B.buffs.dex || 0);
  if (hasRelic('feather')) b += 2;
  b = Math.max(0, b);
  B.block += b;
  if (!silent) UI.float('player', '+' + b + ' 格擋', '#6fa8ff');
}
function healPlayer(n) {
  if (n <= 0) return;
  S.hp = Math.min(S.maxHp, S.hp + n);
  UI.float('player', '+' + n, '#7fe07f');
}
function addBuff(target, key, n) {
  let amt = n;
  if ((key === 'poison' || key === 'burn') && hasRelic('wormwood')) amt = Math.round(amt * 1.5);
  target.buffs[key] = (target.buffs[key] || 0) + amt;
  UI.float(target.uid || 'player', BUFF_NAME[key] + '+' + amt, '#c48cff');
}
function addBuffP(key, n) {
  B.buffs[key] = (B.buffs[key] || 0) + n;
  UI.float('player', BUFF_NAME[key] + '+' + n, '#9fe08a');
}
const BUFF_NAME = {
  str: '力量', dex: '敏捷', vuln: '易傷', weak: '虛弱', poison: '中毒', burn: '燃燒',
  barrier: '護體', regen: '再生', inferno: '燃燒之魂', extraDraw: '過載', thorns: '荊棘'
};

function cleanupDead() {
  B.enemies.forEach(e => { if (e.hp <= 0) e.dead = true; });
}

/* ---- 回合結束與敵人行動 ---- */
function endTurn() {
  if (B.over || B.busy) return;
  B.busy = true;
  // 苔癬石
  if (hasRelic('mossstone') && B.energy > 0) healPlayer(B.energy * 2);
  // 手牌棄置
  B.discard.push(...B.hand);
  B.hand = [];
  UI.renderBattle();

  // 玩家身上的持續傷害
  applyDots({ buffs: B.buffs, isPlayer: true });
  if (S.hp <= 0) { B.busy = false; return; }

  let i = 0;
  const step = () => {
    if (B.over) { B.busy = false; return; }
    if (i >= B.enemies.length) {
      // 敵人狀態衰減
      B.enemies.forEach(e => {
        if (e.dead) return;
        applyDots(e);
        if (e.buffs.weak) e.buffs.weak--;
        if (e.buffs.vuln) e.buffs.vuln--;
        cleanKeys(e.buffs);
      });
      if (B.buffs.weak) B.buffs.weak--;
      if (B.buffs.vuln) B.buffs.vuln--;
      cleanKeys(B.buffs);
      cleanupDead();
      B.busy = false;
      if (checkWin()) return;
      startTurn();
      return;
    }
    const e = B.enemies[i++];
    if (e.dead || !e.intent) { step(); return; }
    e.block = 0;
    doIntent(e);
    e.turn++;
    UI.renderBattle();
    if (S.hp <= 0) { B.busy = false; return; }
    setTimeout(step, 420);
  };
  setTimeout(step, 320);
}

function applyDots(unit) {
  const bf = unit.buffs;
  if (bf.poison) {
    const n = bf.poison;
    if (unit.isPlayer) { S.hp -= n; UI.float('player', '-' + n + ' 毒', '#9fe08a'); }
    else { unit.hp -= n; UI.float(unit.uid, '-' + n + ' 毒', '#9fe08a'); if (unit.hp <= 0) { unit.hp = 0; unit.dead = true; } }
    bf.poison--;
  }
  if (bf.burn) {
    const n = bf.burn * 2;
    if (unit.isPlayer) { S.hp -= n; UI.float('player', '-' + n + ' 燒', '#ff8a3c'); }
    else { unit.hp -= n; UI.float(unit.uid, '-' + n + ' 燒', '#ff8a3c'); if (unit.hp <= 0) { unit.hp = 0; unit.dead = true; } }
    bf.burn--;
  }
  cleanKeys(bf);
  if (unit.isPlayer && S.hp <= 0) { S.hp = 0; gameOver(); }
}
function cleanKeys(o) { for (const k in o) if (!o[k]) delete o[k]; }

function doIntent(e) {
  const it = e.intent;
  const dm = e.def.boss ? (1 + (S.act - 1) * 0.1) : actDmg();
  const times = it.times || 1;
  switch (it.type) {
    case 'attack':
      for (let i = 0; i < times; i++) {
        damagePlayer(Math.round((it.n + (e.buffs.str || 0)) * dm), e);
        if (S.hp <= 0) return;
      }
      if (it.poison) addBuff({ buffs: B.buffs, uid: 'player' }, 'poison', it.poison);
      if (it.burn) addBuff({ buffs: B.buffs, uid: 'player' }, 'burn', it.burn);
      break;
    case 'block':
      e.block += Math.round(it.n * actScale() * 0.8);
      UI.float(e.uid, '+' + e.block + ' 格擋', '#6fa8ff');
      break;
    case 'blockattack':
      e.block += Math.round(it.blk * actScale() * 0.8);
      damagePlayer(Math.round((it.n + (e.buffs.str || 0)) * dm), e);
      break;
    case 'buff':
      e.buffs[it.buff] = (e.buffs[it.buff] || 0) + it.n;
      UI.float(e.uid, it.txt + '+' + it.n, '#ffd45e');
      break;
    case 'debuff':
      B.buffs[it.buff] = (B.buffs[it.buff] || 0) + it.n;
      UI.float('player', it.txt + '+' + it.n, '#ff9ad0');
      break;
    case 'steal':
      damagePlayer(Math.round((it.n + (e.buffs.str || 0)) * dm), e);
      const g = Math.min(S.gold, it.gold);
      S.gold -= g;
      if (g) UI.float('player', '-' + g + ' 金幣', '#ffd45e');
      break;
  }
}

function checkWin() {
  if (B.over) return true;
  if (B.enemies.every(e => e.dead)) {
    B.over = true;
    setTimeout(() => winBattle(), 500);
    return true;
  }
  return false;
}

function winBattle() {
  const node = S.map[S.node.r][S.node.i];
  node.done = true;
  if (hasRelic('bloodbag')) healOut(7);
  const isBoss = B.kind === 'boss', isElite = B.kind === 'elite';
  const gold = isBoss ? ri(110, 160) : (isElite ? ri(55, 85) : ri(22, 40));
  addGold(gold);
  const rewards = { gold, cards: [rollCard(isElite || isBoss), rollCard(isElite || isBoss), rollCard(isElite || isBoss)], relic: null };
  if (isElite || isBoss) rewards.relic = true;
  if (isBoss) {
    healOut(Math.round(S.maxHp * 0.3));
  }
  save();
  UI.rewardScreen(rewards, isBoss);
}

function gameOver() {
  if (S.dead) return;
  S.dead = true;
  if (B) B.over = true;
  localStorage.removeItem(SAVE_KEY);
  setTimeout(() => UI.gameOverScreen(), 600);
}

function nextAct() {
  S.act++;
  if (S.act > 3) { UI.victoryScreen(); return; }
  genMap();
  S.hp = Math.min(S.maxHp, S.hp + Math.round(S.maxHp * 0.2));
  save();
  UI.toMap();
  UI.toast(`第 ${S.act} 幕開始 — 深淵變得更深了`);
}

/* =================== 存檔 =================== */
function save() {
  if (!S || S.dead) return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      hp: S.hp, maxHp: S.maxHp, gold: S.gold, act: S.act, floor: S.floor,
      deck: S.deck, relics: S.relics, maxEnergy: S.maxEnergy, stats: S.stats,
      map: S.map.map(row => row.map(n => ({ r: n.r, i: n.i, type: n.type, x: n.x, next: n.next, done: n.done }))),
      node: S.node
    }));
  } catch (e) { }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    S = Object.assign({ won: false, dead: false, stats: { battles: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0 } }, d);
    S.map = d.map;
    return true;
  } catch (e) { return false; }
}

/* =================== UI =================== */
const UI = {
  init() {
    document.getElementById('btnDeck').onclick = () => this.deckScreen();
    document.getElementById('btnHelp').onclick = () => this.helpScreen();
    document.getElementById('btnNew').onclick = () => {
      if (confirm('確定要放棄目前的旅程，重新開始嗎？')) { localStorage.removeItem(SAVE_KEY); newRun(); this.toMap(); }
    };
    document.getElementById('endturn').onclick = () => endTurn();
    document.getElementById('pDraw').onclick = () => this.pileScreen('抽牌堆（順序已打亂顯示）', B ? B.drawPile : []);
    document.getElementById('pDisc').onclick = () => this.pileScreen('棄牌堆', B ? B.discard : []);
    document.addEventListener('mousemove', e => { if (this._tipAnchor) this.moveTip(e.clientX, e.clientY); });
  },

  /* ---- 畫面切換 ---- */
  toMap() {
    B = null;
    document.getElementById('battle').classList.add('hidden');
    document.getElementById('map').classList.remove('hidden');
    this.closeOverlay();
    this.renderMap();
    this.renderHud();
    save();
  },
  toBattle() {
    document.getElementById('map').classList.add('hidden');
    document.getElementById('battle').classList.remove('hidden');
    this.closeOverlay();
    this.renderBattle();
  },

  /* ---- HUD ---- */
  renderHud() {
    document.getElementById('hHp').textContent = `${Math.max(0, S.hp)}/${S.maxHp}`;
    document.getElementById('hGold').textContent = S.gold;
    document.getElementById('hFloor').textContent = `第 ${S.act} 幕 · ${S.node ? S.node.r + 1 : 0}/13`;
    const el = document.getElementById('relics');
    el.innerHTML = S.relics.map(r =>
      `<span class="relic" data-r="${r}">${RELICS[r].icon}</span>`).join('');
    el.querySelectorAll('.relic').forEach(x => {
      const r = RELICS[x.dataset.r];
      x.onmouseenter = e => this.showTip(e.target, `<b>${r.name}</b><br>${r.desc}`);
      x.onmouseleave = () => this.hideTip();
    });
  },

  /* ---- 地圖 ---- */
  renderMap() {
    const wrap = document.getElementById('mapInner');
    const rows = S.map.length;
    const rowH = 78;
    const H = rows * rowH + 40;
    wrap.style.height = H + 'px';
    const avail = availableNodes();
    const isAvail = (r, i) => avail.some(a => a.r === r && a.i === i);
    const W = wrap.clientWidth || 700;

    let svg = '';
    for (let r = 0; r < rows - 1; r++) {
      for (const n of S.map[r]) {
        for (const j of n.next) {
          const n2 = S.map[r + 1][j];
          const x1 = n.x * W, y1 = H - 30 - r * rowH;
          const x2 = n2.x * W, y2 = H - 30 - (r + 1) * rowH;
          const on = S.node && S.node.r === r && S.node.i === n.i;
          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? '#c48cff' : '#332a45'}" stroke-width="${on ? 3 : 2}" stroke-dasharray="${on ? '' : '4 5'}"/>`;
        }
      }
    }
    let html = `<svg id="mapSvg" width="100%" height="${H}">${svg}</svg>`;
    for (let r = 0; r < rows; r++) {
      for (const n of S.map[r]) {
        const cur = S.node && S.node.r === r && S.node.i === n.i;
        const av = isAvail(r, n.i);
        const cls = ['node', av ? 'avail' : '', cur ? 'cur' : '', n.done ? 'done' : ''].join(' ');
        html += `<div class="${cls}" style="left:${n.x * 100}%;top:${H - 30 - r * rowH}px" data-r="${r}" data-i="${n.i}">
          ${NODE_ICON[n.type]}<span class="lbl">${NODE_NAME[n.type]}</span></div>`;
      }
    }
    wrap.innerHTML = html;
    wrap.querySelectorAll('.node.avail').forEach(el => el.onclick = () => {
      enterNode(+el.dataset.r, +el.dataset.i);
    });
    document.getElementById('mapTitle').textContent =
      `第 ${S.act} 幕 — ${['腐朽地窖', '血肉巢穴', '魔神王座'][S.act - 1] || '深淵'} · 選擇路線`;
    document.getElementById('map').scrollTop = 99999;
  },

  /* ---- 戰鬥 ---- */
  renderBattle() {
    if (!B) return;
    this.renderHud();
    // 玩家
    const ps = document.getElementById('playerSide');
    ps.innerHTML = `<div class="actor" id="a-player">
      ${B.block > 0 ? `<div class="blockbadge">${B.block}</div>` : ''}
      <div class="body">🦥</div>
      <div class="name">樹懶法師</div>
      <div class="bar"><i style="width:${clamp(S.hp / S.maxHp, 0, 1) * 100}%"></i><span>${Math.max(0, S.hp)}/${S.maxHp}</span></div>
      <div class="buffs">${this.buffHtml(B.buffs)}</div>
    </div>`;
    // 敵人
    const es = document.getElementById('enemySide');
    es.innerHTML = B.enemies.map(e => e.dead ? '' : `
      <div class="actor target ${this._targeting ? 'targetable' : ''}" id="a-${e.uid}" data-uid="${e.uid}">
        <div class="intent">${this.intentText(e)}</div>
        ${e.block > 0 ? `<div class="blockbadge">${e.block}</div>` : ''}
        <div class="body">${e.emoji}</div>
        <div class="name">${e.name}</div>
        <div class="bar"><i style="width:${clamp(e.hp / e.maxHp, 0, 1) * 100}%"></i><span>${e.hp}/${e.maxHp}</span></div>
        <div class="buffs">${this.buffHtml(e.buffs)}</div>
      </div>`).join('');
    es.querySelectorAll('.actor').forEach(el => {
      el.onclick = () => {
        if (this._targeting !== null && this._targeting !== undefined) {
          const e = B.enemies.find(x => x.uid === el.dataset.uid);
          const idx = this._targeting;
          this._targeting = null;
          playCard(idx, e);
        }
      };
    });
    // 手牌
    const hand = document.getElementById('hand');
    hand.innerHTML = B.hand.map((c, i) => this.cardHtml(c, i)).join('');
    hand.querySelectorAll('.card').forEach(el => {
      const i = +el.dataset.i;
      el.onclick = () => this.clickCard(i);
      el.onmouseenter = e => {
        const v = cardView(B.hand[i]);
        this.showTip(el, `<b>${v.name}</b><br>${v.descText}`);
      };
      el.onmouseleave = () => this.hideTip();
    });
    document.getElementById('energy').textContent = `${B.energy}/${S.maxEnergy}`;
    document.querySelector('#pDraw b').textContent = B.drawPile.length;
    document.querySelector('#pDisc b').textContent = B.discard.length;
    document.getElementById('endturn').disabled = B.busy || B.over;
  },

  buffHtml(bf) {
    return Object.keys(bf).filter(k => bf[k]).map(k =>
      `<span class="buff">${BUFF_NAME[k] || k} ${bf[k]}</span>`).join('');
  },
  intentText(e) {
    const it = e.intent;
    if (!it) return '…';
    const dm = e.def.boss ? (1 + (S.act - 1) * 0.1) : actDmg();
    switch (it.type) {
      case 'attack': {
        const n = Math.round((it.n + (e.buffs.str || 0)) * dm * (e.buffs.weak ? 0.75 : 1) * ((B.buffs.vuln) ? 1.5 : 1));
        return `⚔️ ${n}${it.times ? ' ×' + it.times : ''}`;
      }
      case 'block': return `🛡 ${Math.round(it.n * actScale() * 0.8)}`;
      case 'blockattack': {
        const n = Math.round((it.n + (e.buffs.str || 0)) * dm * (e.buffs.weak ? 0.75 : 1) * ((B.buffs.vuln) ? 1.5 : 1));
        return `🛡⚔️ ${n}`;
      }
      case 'buff': return `✨ 強化`;
      case 'debuff': return `☠️ ${it.txt}`;
      case 'steal': return `💰 搶奪`;
    }
    return '?';
  },
  cardHtml(c, i) {
    const v = cardView(c);
    const def = CARDS[c.id];
    const cost = B ? cardCost(c) : def.cost;
    const playable = B ? canPlay(c) : true;
    return `<div class="card ${def.type} ${playable ? '' : 'unplayable'} ${c.up ? 'upg' : ''} ${this._targeting === i ? 'sel' : ''}" data-i="${i}">
      <div class="cost">${cost}</div>
      <div class="cn">${v.name}</div>
      <div class="art">${def.art}</div>
      <div class="cd">${v.descText}</div>
      <div class="ct">${['普通', '罕見', '稀有'][def.rarity]}</div>
    </div>`;
  },
  clickCard(i) {
    const c = B.hand[i];
    if (!c || !canPlay(c) || B.busy || B.over) return;
    const def = CARDS[c.id];
    if (def.target) {
      const alive = B.enemies.filter(e => !e.dead);
      if (alive.length === 1) { playCard(i, alive[0]); return; }
      this._targeting = (this._targeting === i) ? null : i;
      this.renderBattle();
      if (this._targeting !== null) this.toast('選擇一個目標');
    } else {
      playCard(i, null);
    }
  },

  float(uid, text, color) {
    const host = uid === 'player' ? document.getElementById('a-player')
      : (uid ? document.getElementById('a-' + uid) : document.getElementById('a-player'));
    if (!host) return;
    const d = document.createElement('div');
    d.className = 'float';
    d.textContent = text;
    d.style.color = color;
    d.style.left = '50%';
    d.style.top = '10px';
    d.style.transform = 'translateX(-50%)';
    d.style.fontSize = '17px';
    host.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  },
  hit(uid) {
    const host = uid === 'player' ? document.getElementById('a-player') : document.getElementById('a-' + uid);
    if (!host) return;
    host.classList.remove('hit'); void host.offsetWidth; host.classList.add('hit');
  },

  /* ---- 疊層 ---- */
  overlay(html) {
    const o = document.getElementById('overlay');
    o.innerHTML = `<div class="panel">${html}</div>`;
    o.classList.remove('hidden');
    return o.querySelector('.panel');
  },
  closeOverlay() { document.getElementById('overlay').classList.add('hidden'); },

  rewardScreen(rw, isBoss) {
    let html = `<h2>${isBoss ? '守關者倒下了' : '戰鬥勝利'}</h2>
      <div class="ps">獲得 💰 ${rw.gold} 金幣${isBoss ? ' · 回復 30% 生命' : ''}</div>`;
    if (rw.relic) {
      const r = grantRelic();
      if (r) html += `<div class="relicrow"><div class="relicbig"><div class="rn">${RELICS[r].icon} ${RELICS[r].name}</div>${RELICS[r].desc}</div></div>`;
    }
    html += `<div class="ps">選擇一張卡加入牌組</div><div class="cardrow" id="rwCards">
      ${rw.cards.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row-c"><button class="btn" id="skip">略過</button></div>`;
    const p = this.overlay(html);
    p.querySelectorAll('#rwCards .card').forEach(el => {
      el.classList.remove('unplayable');
      el.onclick = () => {
        S.deck.push(rw.cards[+el.dataset.i]);
        this.afterReward(isBoss);
      };
    });
    p.querySelector('#skip').onclick = () => this.afterReward(isBoss);
  },
  afterReward(isBoss) {
    save();
    if (isBoss) { this.closeOverlay(); nextAct(); }
    else this.toMap();
  },

  restScreen() {
    const html = `<h2>🔥 營火</h2><div class="ps">短暫的休息。要做什麼？</div>
      <div class="row-c">
        <button class="btn primary" id="rest">睡一覺（回復 ${Math.round(S.maxHp * 0.3)} 生命）</button>
        <button class="btn" id="upg">強化一張卡</button>
        <button class="btn" id="rem">移除一張卡（丟進火裡）</button>
      </div>`;
    const p = this.overlay(html);
    p.querySelector('#rest').onclick = () => {
      healOut(Math.round(S.maxHp * 0.3));
      S.map[S.node.r][S.node.i].done = true;
      this.toMap();
    };
    p.querySelector('#upg').onclick = () => this.upgradeScreen(() => { S.map[S.node.r][S.node.i].done = true; this.toMap(); });
    p.querySelector('#rem').onclick = () => this.removeScreen(() => { S.map[S.node.r][S.node.i].done = true; this.toMap(); });
  },

  upgradeScreen(done) {
    const cands = S.deck.map((c, i) => ({ c, i })).filter(x => !x.c.up);
    if (!cands.length) { this.toast('沒有可強化的卡'); (done || (() => this.toMap()))(); return; }
    const html = `<h2>強化一張卡</h2><div class="ps">強化後數值提升，名字會多一個 +</div>
      <div class="deckgrid">${cands.map(x => this.cardHtml(x.c, x.i)).join('')}</div>
      <div class="row-c"><button class="btn" id="cancel">取消</button></div>`;
    const p = this.overlay(html);
    p.querySelectorAll('.card').forEach(el => {
      el.classList.remove('unplayable');
      el.onclick = () => {
        S.deck[+el.dataset.i].up = true;
        save();
        this.toast('已強化：' + CARDS[S.deck[+el.dataset.i].id].name + '+');
        (done || (() => this.toMap()))();
      };
    });
    p.querySelector('#cancel').onclick = () => (done || (() => this.toMap()))();
  },
  removeScreen(done) {
    const html = `<h2>移除一張卡</h2><div class="ps">牌組越精簡，抽到好牌的機會越高</div>
      <div class="deckgrid">${S.deck.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row-c"><button class="btn" id="cancel">取消</button></div>`;
    const p = this.overlay(html);
    p.querySelectorAll('.card').forEach(el => {
      el.classList.remove('unplayable');
      el.onclick = () => {
        const c = S.deck.splice(+el.dataset.i, 1)[0];
        save();
        this.toast('已移除：' + CARDS[c.id].name);
        (done || (() => this.toMap()))();
      };
    });
    p.querySelector('#cancel').onclick = () => (done || (() => this.toMap()))();
  },

  shopScreen() {
    const node = S.map[S.node.r][S.node.i];
    if (!node.stock) {
      node.stock = {
        cards: [rollCard(), rollCard(), rollCard(), rollCard(true)].map(c => ({ c, price: 45 + CARDS[c.id].rarity * 45 + ri(0, 20) })),
        relics: [],
        removeUsed: false, removePrice: 75
      };
      const pool = Object.keys(RELICS).filter(r => !S.relics.includes(r));
      shuffle(pool).slice(0, 2).forEach(r => node.stock.relics.push({ r, price: ri(140, 200) }));
    }
    const st = node.stock;
    let html = `<h2>🛒 樹懶商人</h2><div class="ps">你有 💰 ${S.gold}</div>
      <div class="cardrow">${st.cards.map((s, i) => s.sold ? '' :
      `<div style="text-align:center">${this.cardHtml(s.c, i)}<div style="margin-top:6px;color:var(--gold);font-weight:700">💰 ${s.price}</div></div>`).join('')}</div>
      <div class="relicrow">${st.relics.map((s, i) => s.sold ? '' :
        `<div class="relicbig" data-ri="${i}"><div class="rn">${RELICS[s.r].icon} ${RELICS[s.r].name}</div>
          ${RELICS[s.r].desc}<div style="color:var(--gold);margin-top:6px;font-weight:700">💰 ${s.price}</div></div>`).join('')}</div>
      <div class="row-c">
        ${st.removeUsed ? '' : `<button class="btn" id="rem">移除一張卡 — 💰 ${st.removePrice}</button>`}
        <button class="btn primary" id="leave">離開商店</button>
      </div>`;
    const p = this.overlay(html);
    p.querySelectorAll('.cardrow .card').forEach(el => {
      el.classList.remove('unplayable');
      el.onclick = () => {
        const s = st.cards[+el.dataset.i];
        if (s.sold) return;
        if (S.gold < s.price) { this.toast('金幣不足'); return; }
        S.gold -= s.price; s.sold = true;
        S.deck.push(s.c);
        save(); this.shopScreen();
      };
    });
    p.querySelectorAll('.relicbig[data-ri]').forEach(el => el.onclick = () => {
      const s = st.relics[+el.dataset.ri];
      if (s.sold) return;
      if (S.gold < s.price) { this.toast('金幣不足'); return; }
      S.gold -= s.price; s.sold = true;
      S.relics.push(s.r);
      if (s.r === 'quilt') { S.maxHp += 18; S.hp += 18; }
      if (s.r === 'core') { S.maxEnergy += 1; S.maxHp = Math.max(10, S.maxHp - 10); S.hp = Math.min(S.hp, S.maxHp); }
      save(); this.shopScreen();
    });
    const rem = p.querySelector('#rem');
    if (rem) rem.onclick = () => {
      if (S.gold < st.removePrice) { this.toast('金幣不足'); return; }
      this.removeScreen(() => { S.gold -= st.removePrice; st.removeUsed = true; this.shopScreen(); });
    };
    p.querySelector('#leave').onclick = () => { node.done = true; this.toMap(); };
  },

  eventScreen(ev) {
    const opts = ev.opts.filter(o => !o.cond || o.cond());
    const html = `<h2>${ev.title}</h2><div class="ps" style="font-size:13px;line-height:1.9">${ev.text}</div>
      <div class="row-c" style="flex-direction:column;align-items:center">
        ${opts.map((o, i) => `<button class="btn" data-o="${i}" style="min-width:340px">${o.t}</button>`).join('')}
      </div>`;
    const p = this.overlay(html);
    p.querySelectorAll('button[data-o]').forEach(b => b.onclick = () => {
      const res = opts[+b.dataset.o].act();
      S.map[S.node.r][S.node.i].done = true;
      save();
      if (res === null) return;      // 由子畫面接手
      const p2 = this.overlay(`<h2>${ev.title}</h2><div class="ps" style="font-size:13px">${res}</div>
        <div class="row-c"><button class="btn primary" id="ok">繼續</button></div>`);
      p2.querySelector('#ok').onclick = () => this.toMap();
    });
  },

  deckScreen() {
    const counts = {};
    S.deck.forEach(c => { const k = c.id + (c.up ? '+' : ''); counts[k] = (counts[k] || 0) + 1; });
    const html = `<h2>牌組（${S.deck.length} 張）</h2>
      <div class="ps">遺物 ${S.relics.length} 件 · 能量上限 ${S.maxEnergy}</div>
      <div class="deckgrid">${S.deck.map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row-c"><button class="btn primary" id="close">關閉</button></div>`;
    const p = this.overlay(html);
    p.querySelectorAll('.card').forEach(el => el.classList.remove('unplayable'));
    p.querySelector('#close').onclick = () => {
      this.closeOverlay();
      if (B) this.renderBattle();
    };
  },
  pileScreen(title, pile) {
    if (!pile.length) { this.toast('這裡是空的'); return; }
    const html = `<h2>${title}</h2><div class="ps">${pile.length} 張</div>
      <div class="deckgrid">${shuffle(pile.slice()).map((c, i) => this.cardHtml(c, i)).join('')}</div>
      <div class="row-c"><button class="btn primary" id="close">關閉</button></div>`;
    const p = this.overlay(html);
    p.querySelectorAll('.card').forEach(el => el.classList.remove('unplayable'));
    p.querySelector('#close').onclick = () => { this.closeOverlay(); if (B) this.renderBattle(); };
  },

  helpScreen() {
    const html = `<h2>怎麼玩</h2>
      <div style="font-size:13px;line-height:1.95;color:#c7bcd8">
        <p><b>目標：</b>穿過三幕地圖，擊敗每一幕最後的守關者。死亡就是結束（但進度會自動保存，可以關掉分頁再回來）。</p>
        <p><b>回合：</b>每回合有 ${S ? S.maxEnergy : 3} 點能量，抽 5 張牌。打完想打的牌後按「結束回合」，敵人就會照著頭上的<b>意圖</b>行動。</p>
        <p><b>格擋</b>會在你的回合開始時歸零，所以格擋要用在「敵人即將攻擊」的那一刻。</p>
        <p><b>狀態：</b>力量＝攻擊 +N；敏捷＝格擋 +N；易傷＝受到傷害 +50%；虛弱＝造成傷害 -25%；中毒與燃燒在回合結束結算並逐層遞減。</p>
        <p><b>地圖：</b>⚔️ 戰鬥　💀 精英（掉遺物）　❓ 事件　🛒 商店　🔥 營火（回血或強化卡）　👑 守關者。</p>
        <p><b>建議：</b>牌組不是越厚越好。精簡的牌組更容易抽到你的核心組合。</p>
      </div>
      <div class="row-c"><button class="btn primary" id="close">知道了</button></div>`;
    const p = this.overlay(html);
    p.querySelector('#close').onclick = () => { this.closeOverlay(); if (B) this.renderBattle(); };
  },

  gameOverScreen() {
    const html = `<h2 style="color:#ff6b6b">你倒下了</h2>
      <div class="ps">深淵裡又多了一位睡著就沒醒來的法師</div>
      <div style="font-size:13px;line-height:2;text-align:center;color:#c7bcd8">
        抵達：第 ${S.act} 幕 第 ${S.node ? S.node.r + 1 : 0} 層<br>
        戰鬥次數：${S.stats.battles}（精英 ${S.stats.elites}）<br>
        打出卡牌：${S.stats.cardsPlayed} 張<br>
        總傷害：${S.stats.dmgDealt}<br>
        牌組張數：${S.deck.length}
      </div>
      <div class="row-c"><button class="btn primary" id="again">再來一局</button></div>`;
    const p = this.overlay(html);
    p.querySelector('#again').onclick = () => { newRun(); this.toMap(); };
  },
  victoryScreen() {
    const html = `<h2>通關！</h2>
      <div class="ps">樹懶魔神倒下了，法師終於可以安穩地睡了</div>
      <div style="font-size:13px;line-height:2;text-align:center;color:#c7bcd8">
        戰鬥次數：${S.stats.battles}（精英 ${S.stats.elites}）<br>
        打出卡牌：${S.stats.cardsPlayed} 張<br>
        總傷害：${S.stats.dmgDealt}<br>
        最終牌組：${S.deck.length} 張 · 遺物 ${S.relics.length} 件
      </div>
      <div class="row-c"><button class="btn primary" id="again">再挑戰一次</button></div>`;
    const p = this.overlay(html);
    p.querySelector('#again').onclick = () => { newRun(); this.toMap(); };
  },

  toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = msg;
    document.getElementById('toasts').appendChild(d);
    setTimeout(() => { d.style.transition = '.4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 2200);
  },
  showTip(anchor, html) {
    const t = document.getElementById('tip');
    t.innerHTML = html;
    t.classList.remove('hidden');
    this._tipAnchor = anchor;
    const r = anchor.getBoundingClientRect();
    this.moveTip(r.left + r.width / 2, r.top);
  },
  moveTip(x, y) {
    const t = document.getElementById('tip');
    let px = x + 14, py = y - t.offsetHeight - 10;
    if (px + t.offsetWidth > innerWidth - 8) px = innerWidth - t.offsetWidth - 8;
    if (py < 8) py = y + 22;
    t.style.left = px + 'px'; t.style.top = py + 'px';
  },
  hideTip() { document.getElementById('tip').classList.add('hidden'); this._tipAnchor = null; }
};

/* =================== 啟動 =================== */
UI.init();
if (!load()) newRun();
UI.toMap();
if (S.node) {
  // 從存檔回來時，如果停在未完成的節點就重新進入
  const n = S.map[S.node.r][S.node.i];
  if (!n.done) enterNode(S.node.r, S.node.i);
}
