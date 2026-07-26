/* ===========================================================
   Sloth Abyss - ui.js
   HUD、選單、背包、商店、Tooltip
   =========================================================== */
'use strict';

const UI = {
  G: null, el: {}, invOpen: false, lastPanel: null,

  init(game) {
    this.G = game;
    const ids = ['hud', 'overlay', 'tooltip', 'toasts', 'banner', 'bossbar', 'minimap',
      'hpFill', 'hpText', 'mpFill', 'mpText', 'xpFill', 'lvText', 'floorText', 'goldText',
      'soulText', 'skillbar', 'potionCount', 'manaCount', 'buffs', 'bossName', 'bossFill', 'upgradeFlash'];
    ids.forEach(i => this.el[i] = document.getElementById(i));
    this.mmCtx = this.el.minimap ? this.el.minimap.getContext('2d') : null;
    this.el.overlay.addEventListener('click', e => {
      if (e.target === this.el.overlay && this.G.state === 'paused') this.togglePause();
    });
    document.addEventListener('mousemove', e => {
      if (this._tipEl) this.positionTip(e.clientX, e.clientY);
    });
  },

  /* ============ 通用 ============ */
  hideAll() {
    this.el.overlay.innerHTML = '';
    this.el.overlay.classList.add('hidden');
    this.el.hud.classList.add('hidden');
    this.hideTip();
  },
  hidePanels() {
    this.el.overlay.innerHTML = '';
    this.el.overlay.classList.add('hidden');
    this.invOpen = false;
    this.hideTip();
  },
  showHud() {
    this.el.hud.classList.remove('hidden');
    this.syncMinimap();
    this.updateHud();
    this.buildSkillbar();
  },
  panel(html, cls) {
    this.el.overlay.classList.remove('hidden');
    this.el.overlay.innerHTML = `<div class="panel ${cls || ''}">${html}</div>`;
    return this.el.overlay.querySelector('.panel');
  },
  backFromPanel() {
    if (this.invOpen) this.toggleInventory();
  },

  toast(msg, color, dur) {
    const d = document.createElement('div');
    d.className = 'toast';
    d.style.borderColor = color || '#ffd45e';
    d.style.color = color || '#ffd45e';
    d.textContent = msg;
    this.el.toasts.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 500); }, (dur || 2.5) * 1000);
  },
  floorBanner(n, name, isBoss) {
    const b = this.el.banner;
    b.innerHTML = `<div class="bn-floor">第 ${n} 層</div><div class="bn-name">${isBoss ? '☠ ' : ''}${name}${isBoss ? ' · 王座' : ''}</div>`;
    b.classList.remove('hidden');
    b.classList.remove('fade');
    void b.offsetWidth;
    b.classList.add('fade');
    setTimeout(() => b.classList.add('hidden'), 2600);
  },
  flashUpgrade() {
    const f = this.el.upgradeFlash;
    if (!f) return;
    f.classList.remove('hidden');
    f.classList.remove('anim'); void f.offsetWidth; f.classList.add('anim');
    setTimeout(() => f.classList.add('hidden'), 1500);
  },
  bossBar(e) {
    this.el.bossbar.classList.remove('hidden');
    this.el.bossName.textContent = e.name;
  },
  hideBossBar() { this.el.bossbar.classList.add('hidden'); },

  syncMinimap() {
    if (!this.el.minimap) return;
    this.el.minimap.style.display = Save.meta.settings.minimap ? 'block' : 'none';
  },
  drawMinimap() {
    if (!this.mmCtx || !this.G.map) return;
    Render.drawMinimap(this.G, this.mmCtx, this.el.minimap.width);
  },

  /* ============ HUD ============ */
  updateHud() {
    const G = this.G, p = G.player;
    if (!p) return;
    const hpPct = clamp(p.hp / p.maxHp, 0, 1) * 100;
    this.el.hpFill.style.height = hpPct + '%';
    this.el.hpText.textContent = Math.ceil(Math.max(0, p.hp)) + ' / ' + p.maxHp;
    const mpPct = clamp(p.mp / p.maxMp, 0, 1) * 100;
    this.el.mpFill.style.height = mpPct + '%';
    this.el.mpText.textContent = Math.ceil(p.mp) + ' / ' + p.maxMp;
    this.el.xpFill.style.width = clamp(p.xp / p.xpNext, 0, 1) * 100 + '%';
    this.el.lvText.textContent = 'Lv.' + p.level;
    this.el.floorText.textContent = `第 ${G.floor} 層 · ${G.biome ? G.biome.name : ''}` + (G.endless ? ' · 無盡' : '');
    this.el.goldText.textContent = fmt(p.gold);
    this.el.soulText.textContent = fmt(p.souls);
    this.el.potionCount.textContent = p.potions;
    this.el.manaCount.textContent = p.manaPots;
    const pc2 = document.getElementById('potionCount2');
    if (pc2) pc2.textContent = p.potions;

    // 技能冷卻
    if (this._skillEls) {
      for (let i = 0; i < this._skillEls.length; i++) {
        const s = this._skillEls[i];
        if (!s.id) continue;
        const cd = p.cds[s.id] || 0;
        const total = p.skillCd(s.id);
        s.cdEl.style.height = (cd > 0 ? (cd / total) * 100 : 0) + '%';
        s.el.classList.toggle('nomana', p.mp < SKILLS[s.id].mana);
      }
    }
    // 王血條
    if (G.bossActive && !G.bossActive.dead) {
      this.el.bossFill.style.width = clamp(G.bossActive.hp / G.bossActive.maxHp, 0, 1) * 100 + '%';
    }
    // buff
    let bh = '';
    for (const k in p.buffs) {
      const b = p.buffs[k];
      if (!b.name) continue;
      bh += `<div class="buff" style="border-color:${b.color};color:${b.color}">${b.name} ${b.t > 900 ? '' : Math.ceil(b.t)}</div>`;
    }
    if (p.shield > 0) bh += `<div class="buff" style="border-color:#8fd3ff;color:#8fd3ff">護盾 ${Math.round(p.shield)}</div>`;
    if (p.revives > 0) bh += `<div class="buff" style="border-color:#e0b0ff;color:#e0b0ff">重生 x${p.revives}</div>`;
    this.el.buffs.innerHTML = bh;
  },

  buildSkillbar() {
    const p = this.G.player;
    this._skillEls = [];
    let html = `<div class="skill basic"><div class="sk-icon">🗡</div><div class="sk-key">LMB</div></div>`;
    p.skillList.forEach((id, i) => {
      const s = SKILLS[id];
      html += `<div class="skill" data-i="${i}"><div class="sk-cd"></div><div class="sk-icon">${s.icon}</div><div class="sk-key">${SKILL_KEYS[i]}</div><div class="sk-mana">${s.mana}</div></div>`;
    });
    html += `<div class="skill potion" id="potBtn"><div class="sk-icon">🧪</div><div class="sk-key">SPACE</div><div class="sk-count" id="potionCount2"></div></div>`;
    this.el.skillbar.innerHTML = html;
    const els = this.el.skillbar.querySelectorAll('.skill[data-i]');
    els.forEach(el => {
      const i = +el.dataset.i;
      const id = p.skillList[i];
      this._skillEls.push({ el, id, cdEl: el.querySelector('.sk-cd') });
      el.addEventListener('click', () => this.G.useSkillSlot(i));
      el.addEventListener('mouseenter', () => this.showTip(el, `<div class="tip-name" style="color:${SKILLS[id].color}">${SKILLS[id].name}</div>
        <div class="tip-sub">冷卻 ${SKILLS[id].cd}s · 法力 ${SKILLS[id].mana}</div><div class="tip-desc">${SKILLS[id].desc}</div>`));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
    const pb = document.getElementById('potBtn');
    if (pb) pb.addEventListener('click', () => this.G.player.usePotion(this.G));
  },

  /* ============ Tooltip ============ */
  showTip(anchor, html) {
    const t = this.el.tooltip;
    t.innerHTML = html;
    t.classList.remove('hidden');
    this._tipEl = anchor;
    const r = anchor.getBoundingClientRect();
    this.positionTip(r.left + r.width / 2, r.top);
  },
  positionTip(x, y) {
    const t = this.el.tooltip;
    const w = t.offsetWidth, h = t.offsetHeight;
    let px = x + 16, py = y + 16;
    if (px + w > window.innerWidth - 10) px = x - w - 16;
    if (py + h > window.innerHeight - 10) py = Math.max(10, window.innerHeight - h - 10);
    t.style.left = px + 'px'; t.style.top = py + 'px';
  },
  hideTip() { this.el.tooltip.classList.add('hidden'); this._tipEl = null; },

  itemTipHtml(it, compareTo) {
    const rc = RARITY[it.rarity].color;
    let h = `<div class="tip-name" style="color:${rc}">${it.name}</div>`;
    h += `<div class="tip-sub">${RARITY[it.rarity].name} ${SLOT_NAME[it.slot] || ''} · 物品等級 ${it.ilvl}</div>`;
    if (it.dmg) {
      const dps = (it.dmg / it.cd).toFixed(1);
      h += `<div class="tip-main">攻擊力 ${it.dmg}　<span class="dim">(每秒 ${dps})</span></div>`;
    }
    if (it.armor) h += `<div class="tip-main">護甲 ${it.armor}</div>`;
    for (const a of it.affixes) h += `<div class="tip-affix">${a.text}</div>`;
    if (it.implicit) for (const k in it.implicit) h += `<div class="tip-affix dim">${statLine(k, it.implicit[k])}</div>`;
    if (it.uniqueDesc) h += `<div class="tip-unique">${it.uniqueDesc}</div>`;
    if (compareTo) {
      const diff = itemScore(it) - itemScore(compareTo);
      h += `<div class="tip-cmp ${diff > 0 ? 'up' : (diff < 0 ? 'down' : '')}">
        vs ${compareTo.name}：${diff > 0 ? '▲ 更好' : (diff < 0 ? '▼ 更差' : '≈ 相當')}</div>`;
    }
    h += `<div class="tip-sub">價值 ${it.value} 金幣</div>`;
    return h;
  },

  /* ============ 主選單 ============ */
  showTitle() {
    this.G.state = 'title';
    this.hideAll();
    const m = Save.meta;
    const hasRun = Save.hasRun();
    const p = this.panel(`
      <div class="title-wrap">
        <div class="game-logo">
          <div class="logo-sub">SLOTH MAGE GAMES 呈獻</div>
          <h1>樹懶法師：深淵輪迴</h1>
          <div class="logo-en">S L O T H &nbsp; A B Y S S</div>
        </div>
        <div class="menu-btns">
          ${hasRun ? '<button class="btn big" data-a="continue">繼續探索</button>' : ''}
          <button class="btn big primary" data-a="new">開始新的一場</button>
          <button class="btn" data-a="town">靈魂祭壇（永久升級）</button>
          <button class="btn" data-a="help">操作說明</button>
          <button class="btn" data-a="settings">設定</button>
        </div>
        <div class="title-stats">
          <span>總場次 ${m.runs}</span><span>最深 ${m.bestFloor} 層</span>
          <span>擊殺 ${fmt(m.kills)}</span><span>靈魂 ${fmt(m.souls)}</span>
          ${m.wins ? `<span class="win">通關 ${m.wins} 次</span>` : ''}
        </div>
      </div>`, 'title-panel');
    p.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      Audio.resume(); Audio.play('ui');
      const a = b.dataset.a;
      if (a === 'new') this.showClassSelect();
      else if (a === 'continue') { if (!this.G.loadRun()) this.toast('存檔損毀', '#ff6b6b'); }
      else if (a === 'town') this.showTown();
      else if (a === 'help') this.showHelp();
      else if (a === 'settings') this.showSettings();
    }));
  },

  showClassSelect() {
    const meta = Save.meta;
    const startLv = meta.upgrades && meta.upgrades.m_start || 0;
    let floors = '';
    if (startLv > 0) {
      floors = '<div class="start-floor">起始樓層：';
      for (let i = 0; i <= startLv; i++) {
        floors += `<button class="btn small floor-btn ${i === 0 ? 'sel' : ''}" data-f="${1 + i * 5}">${1 + i * 5}</button>`;
      }
      floors += '</div>';
    }
    const cards = CLASSES.map(c => {
      const locked = c.lockedBy && !(meta.upgrades[c.lockedBy] > 0);
      return `<div class="cls-card ${locked ? 'locked' : ''}" data-c="${c.id}" style="--c:${c.color}">
        <div class="cls-name">${c.name}</div>
        <div class="cls-tag">${c.tag}</div>
        <div class="cls-desc">${c.desc}</div>
        <div class="cls-stats">
          <span>生命 ${c.hp}</span><span>法力 ${c.mp}</span><span>速度 ${c.speed}</span>
        </div>
        <div class="cls-passive"><b>${c.passive.name}</b>：${c.passive.desc}</div>
        <div class="cls-skill">起始技能：${SKILLS[c.startSkill].icon} ${SKILLS[c.startSkill].name}</div>
        ${locked ? '<div class="cls-lock">🔒 需在靈魂祭壇解鎖</div>' : ''}
      </div>`;
    }).join('');
    const p = this.panel(`
      <h2 class="panel-title">選擇你的容器</h2>
      ${floors}
      <div class="cls-grid">${cards}</div>
      <div class="row-center"><button class="btn" data-a="back">返回</button></div>`, 'wide');
    let chosenFloor = 1;
    p.querySelectorAll('.floor-btn').forEach(b => b.addEventListener('click', () => {
      p.querySelectorAll('.floor-btn').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); chosenFloor = +b.dataset.f; Audio.play('ui');
    }));
    p.querySelectorAll('.cls-card').forEach(c => c.addEventListener('click', () => {
      if (c.classList.contains('locked')) { this.toast('此職業尚未解鎖', '#ff6b6b'); return; }
      Audio.play('levelup');
      this.G.startRun(c.dataset.c, { floor: chosenFloor });
    }));
    p.querySelector('[data-a=back]').addEventListener('click', () => this.showTitle());
  },

  showHelp() {
    const p = this.panel(`
      <h2 class="panel-title">操作說明</h2>
      <div class="help-grid">
        <div><kbd>W A S D</kbd><span>移動</span></div>
        <div><kbd>滑鼠左鍵</kbd><span>普通攻擊（可按住）</span></div>
        <div><kbd>右鍵 / Q</kbd><span>技能 1</span></div>
        <div><kbd>E</kbd><span>技能 2</span></div>
        <div><kbd>R</kbd><span>技能 3</span></div>
        <div><kbd>空白 / 1</kbd><span>喝治療藥水</span></div>
        <div><kbd>2</kbd><span>喝法力藥水</span></div>
        <div><kbd>F</kbd><span>互動（樓梯 / 寶箱 / 神龕 / 商人）</span></div>
        <div><kbd>I / C / Tab</kbd><span>背包與裝備</span></div>
        <div><kbd>M</kbd><span>切換小地圖</span></div>
        <div><kbd>Esc</kbd><span>暫停</span></div>
        <div><kbd>手機</kbd><span>按住畫面移動，自動攻擊最近敵人</span></div>
      </div>
      <div class="help-text">
        <p><b>深淵每 5 層有一位王。</b>擊敗第 20 層的樹懶魔神即可通關，之後可選擇離開或進入無盡模式。</p>
        <p>死亡會失去所有裝備，但<b>靈魂</b>會保留，可在靈魂祭壇購買永久強化。從傳送門離開深淵可多獲得 25% 靈魂。</p>
        <p>升級時可三選一取得<b>天賦</b>；同一場中天賦會不斷疊加，組合出你的 build。</p>
      </div>
      <div class="row-center"><button class="btn" data-a="back">返回</button></div>`, 'wide');
    p.querySelector('[data-a=back]').addEventListener('click', () => this.showTitle());
  },

  showSettings() {
    const s = Save.meta.settings;
    const p = this.panel(`
      <h2 class="panel-title">設定</h2>
      <div class="settings">
        <label>音效音量 <input type="range" min="0" max="1" step="0.05" value="${s.sfx}" data-k="sfx"><span class="v">${Math.round(s.sfx * 100)}%</span></label>
        <label>音樂音量 <input type="range" min="0" max="1" step="0.05" value="${s.music}" data-k="music"><span class="v">${Math.round(s.music * 100)}%</span></label>
        <label>畫面震動 <input type="range" min="0" max="1.5" step="0.1" value="${s.shake}" data-k="shake"><span class="v">${Math.round(s.shake * 100)}%</span></label>
        <label class="chk"><input type="checkbox" ${s.minimap ? 'checked' : ''} data-k="minimap"> 顯示小地圖</label>
        <label class="chk"><input type="checkbox" ${s.autoPickup ? 'checked' : ''} data-k="autoPickup"> 自動吸取掉落物</label>
      </div>
      <div class="row-center">
        <button class="btn danger" data-a="wipe">清除所有存檔</button>
        <button class="btn" data-a="back">返回</button>
      </div>`, '');
    p.querySelectorAll('input').forEach(i => i.addEventListener('input', () => {
      const k = i.dataset.k;
      s[k] = i.type === 'checkbox' ? i.checked : parseFloat(i.value);
      if (i.nextElementSibling && i.nextElementSibling.className === 'v')
        i.nextElementSibling.textContent = Math.round(s[k] * 100) + '%';
      Audio.setVol(s.sfx, s.music);
      Save.saveMeta();
      this.syncMinimap();
    }));
    p.querySelector('[data-a=wipe]').addEventListener('click', () => {
      if (confirm('確定要清除所有進度嗎？此動作無法復原。')) { Save.wipe(); this.showTitle(); }
    });
    p.querySelector('[data-a=back]').addEventListener('click', () => this.showTitle());
  },

  /* ============ 靈魂祭壇（永久升級） ============ */
  showTown() {
    const m = Save.meta;
    const cards = META_UPGRADES.map(u => {
      const lv = m.upgrades[u.id] || 0;
      const maxed = lv >= u.max;
      const cost = maxed ? 0 : u.cost(lv);
      const can = !maxed && m.souls >= cost;
      return `<div class="up-card ${maxed ? 'maxed' : ''} ${can ? 'can' : ''}" data-u="${u.id}">
        <div class="up-icon">${u.icon}</div>
        <div class="up-body">
          <div class="up-name">${u.name} <span class="up-lv">${u.max > 1 ? `${lv}/${u.max}` : (lv ? '已解鎖' : '')}</span></div>
          <div class="up-desc">${u.desc(Math.min(lv + 1, u.max))}</div>
        </div>
        <div class="up-cost">${maxed ? '★' : `💀 ${cost}`}</div>
      </div>`;
    }).join('');
    const p = this.panel(`
      <h2 class="panel-title">靈魂祭壇</h2>
      <div class="soul-bank">持有靈魂 <b>💀 ${fmt(m.souls)}</b>　<span class="dim">累計 ${fmt(m.totalSouls)}</span></div>
      <div class="up-grid">${cards}</div>
      <div class="row-center"><button class="btn" data-a="back">返回</button></div>`, 'wide');
    p.querySelectorAll('.up-card').forEach(c => c.addEventListener('click', () => {
      const u = META_UPGRADES.find(x => x.id === c.dataset.u);
      const lv = m.upgrades[u.id] || 0;
      if (lv >= u.max) return;
      const cost = u.cost(lv);
      if (m.souls < cost) { this.toast('靈魂不足', '#ff6b6b'); Audio.play('hit'); return; }
      m.souls -= cost;
      m.upgrades[u.id] = lv + 1;
      Save.saveMeta();
      Audio.play('levelup');
      this.showTown();
    }));
    p.querySelector('[data-a=back]').addEventListener('click', () => this.showTitle());
  },

  /* ============ 升級三選一 ============ */
  showLevelUp(choices) {
    this.G.state = 'levelup';
    const cards = choices.map((t, i) => {
      const col = t.skill ? '#7fd4ff' : ['#cfcfcf', '#6fa8ff', '#ffd45e', '#ff8c3c'][t.rarity] || '#cfcfcf';
      return `<div class="tal-card" data-i="${i}" style="--c:${col}">
        <div class="tal-icon">${t.skill ? SKILLS[t.skill].icon : '✦'}</div>
        <div class="tal-name">${t.name}</div>
        <div class="tal-desc">${t.desc}</div>
      </div>`;
    }).join('');
    const p = this.panel(`
      <div class="lvl-head">
        <div class="lvl-big">LEVEL ${this.G.player.level}</div>
        <div class="lvl-sub">選擇一項天賦</div>
      </div>
      <div class="tal-grid">${cards}</div>`, 'levelup-panel');
    p.querySelectorAll('.tal-card').forEach(c => c.addEventListener('click', () => {
      Audio.play('levelup');
      this.G.applyTalent(choices[+c.dataset.i]);
    }));
  },

  /* ============ 背包 ============ */
  toggleInventory() {
    if (this.invOpen) { this.hidePanels(); this.G.state = 'play'; return; }
    this.invOpen = true;
    this.G.state = 'paused';
    this.renderInventory();
  },
  renderInventory() {
    const p = this.G.player;
    const slotHtml = SLOTS.map(s => {
      const it = p.gear[s];
      return `<div class="eq-slot ${it ? 'filled' : ''}" data-slot="${s}" ${it ? `style="border-color:${RARITY[it.rarity].color}"` : ''}>
        <div class="eq-label">${SLOT_NAME[s]}</div>
        <div class="eq-name" ${it ? `style="color:${RARITY[it.rarity].color}"` : ''}>${it ? it.name : '—'}</div>
      </div>`;
    }).join('');
    const invHtml = p.inventory.length ? p.inventory.map((it, i) => {
      const cur = p.gear[it.slot] || (it.slot === 'ring1' ? p.gear.ring2 : null);
      const better = cur ? itemScore(it) > itemScore(cur) : true;
      return `<div class="inv-item" data-i="${i}" style="border-color:${RARITY[it.rarity].color}">
        <span class="inv-name" style="color:${RARITY[it.rarity].color}">${it.name}</span>
        <span class="inv-slot">${SLOT_NAME[it.slot]}</span>
        ${better ? '<span class="inv-up">▲</span>' : ''}
        <span class="inv-actions"><button class="mini" data-act="equip" data-i="${i}">裝備</button><button class="mini sell" data-act="sell" data-i="${i}">賣 ${Math.floor(it.value * 0.4)}</button></span>
      </div>`;
    }).join('') : '<div class="dim center">背包空空如也</div>';

    const s = p;
    const statsHtml = `
      <div class="st-row"><span>等級</span><b>${s.level}</b></div>
      <div class="st-row"><span>生命</span><b>${Math.ceil(s.hp)} / ${s.maxHp}</b></div>
      <div class="st-row"><span>法力</span><b>${Math.ceil(s.mp)} / ${s.maxMp}</b></div>
      <div class="st-sep"></div>
      <div class="st-row"><span>力量</span><b>${s.str}</b></div>
      <div class="st-row"><span>敏捷</span><b>${s.dex}</b></div>
      <div class="st-row"><span>智力</span><b>${s.int}</b></div>
      <div class="st-row"><span>體力</span><b>${s.vit}</b></div>
      <div class="st-sep"></div>
      <div class="st-row"><span>武器傷害</span><b>${Math.round(s.wpnDmg)}</b></div>
      <div class="st-row"><span>傷害倍率</span><b>${(s.dmgMul * 100).toFixed(0)}%</b></div>
      <div class="st-row"><span>攻擊間隔</span><b>${s.atkInterval.toFixed(2)}s</b></div>
      <div class="st-row"><span>暴擊 / 暴傷</span><b>${s.critChance.toFixed(1)}% / ${s.critDmg.toFixed(0)}%</b></div>
      <div class="st-row"><span>護甲</span><b>${s.armor}</b></div>
      <div class="st-row"><span>全抗性</span><b>${s.resAll}%</b></div>
      <div class="st-row"><span>冷卻縮減</span><b>${s.cdr}%</b></div>
      <div class="st-row"><span>移動速度</span><b>${Math.round(s.moveSpeed)}</b></div>
      <div class="st-row"><span>生命偷取</span><b>${s.lifeSteal}%</b></div>
      <div class="st-row"><span>幸運</span><b>${s.luck}%</b></div>`;

    const talHtml = p.talents.length
      ? p.talents.map(t => `<span class="tal-chip">${t.name}</span>`).join('')
      : '<span class="dim">尚未取得天賦</span>';

    const pan = this.panel(`
      <h2 class="panel-title">裝備與背包 <span class="dim small">Esc / I 關閉</span></h2>
      <div class="inv-layout">
        <div class="col">
          <h3>裝備</h3>
          <div class="eq-grid">${slotHtml}</div>
          <h3>天賦</h3>
          <div class="tal-chips">${talHtml}</div>
        </div>
        <div class="col">
          <h3>背包（${p.inventory.length}）</h3>
          <div class="inv-list">${invHtml}</div>
          <div class="row-center"><button class="btn small" data-a="sellall">賣出所有普通/魔法裝備</button></div>
        </div>
        <div class="col narrow">
          <h3>屬性</h3>
          <div class="stats-box">${statsHtml}</div>
          <div class="gold-line">💰 ${fmt(p.gold)}　💀 ${fmt(p.souls)}</div>
        </div>
      </div>`, 'wide inv-panel');

    // 事件
    pan.querySelectorAll('.eq-slot').forEach(el => {
      const it = p.gear[el.dataset.slot];
      if (!it) return;
      el.addEventListener('mouseenter', () => this.showTip(el, this.itemTipHtml(it)));
      el.addEventListener('mouseleave', () => this.hideTip());
      el.addEventListener('click', () => { p.unequip(el.dataset.slot); Audio.play('ui'); this.renderInventory(); });
    });
    pan.querySelectorAll('.inv-item').forEach(el => {
      const it = p.inventory[+el.dataset.i];
      if (!it) return;
      const cur = p.gear[it.slot] || (it.slot === 'ring1' ? p.gear.ring2 : null);
      el.addEventListener('mouseenter', () => this.showTip(el, this.itemTipHtml(it, cur)));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
    pan.querySelectorAll('button[data-act]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const i = +b.dataset.i;
      const it = p.inventory[i];
      if (!it) return;
      if (b.dataset.act === 'equip') { p.equip(it); Audio.play('pickup'); }
      else { p.gold += Math.floor(it.value * 0.4); p.inventory.splice(i, 1); Audio.play('coin'); }
      this.hideTip();
      this.renderInventory();
    }));
    const sa = pan.querySelector('[data-a=sellall]');
    if (sa) sa.addEventListener('click', () => {
      let g = 0;
      p.inventory = p.inventory.filter(it => {
        if (it.rarity <= 1) { g += Math.floor(it.value * 0.4); return false; }
        return true;
      });
      p.gold += g;
      Audio.play('coin');
      this.toast('賣出獲得 ' + g + ' 金幣', '#ffd45e');
      this.renderInventory();
    });
  },

  /* ============ 商店 ============ */
  showShop(prop) {
    this.G.state = 'shop';
    const p = this.G.player;
    const list = prop.stock.map((it, i) => {
      if (it.sold) return `<div class="shop-item sold"><span class="dim">已售出</span></div>`;
      const col = it.consumable ? '#ff8fa0' : RARITY[it.rarity].color;
      const name = it.consumable ? it.name : it.name;
      return `<div class="shop-item" data-i="${i}" style="border-color:${col}">
        <span style="color:${col}">${name}</span>
        <span class="shop-sub">${it.consumable ? '消耗品' : SLOT_NAME[it.slot]}</span>
        <button class="mini buy ${p.gold >= it.value ? '' : 'poor'}" data-i="${i}">💰 ${it.value}</button>
      </div>`;
    }).join('');
    const pan = this.panel(`
      <h2 class="panel-title">🦥 樹懶商人</h2>
      <div class="shop-gold">你的金幣：💰 ${fmt(p.gold)}</div>
      <div class="shop-list">${list}</div>
      <div class="row-center"><button class="btn" data-a="close">離開</button></div>`, '');
    pan.querySelectorAll('.shop-item[data-i]').forEach(el => {
      const it = prop.stock[+el.dataset.i];
      if (it.consumable) return;
      const cur = p.gear[it.slot] || (it.slot === 'ring1' ? p.gear.ring2 : null);
      el.addEventListener('mouseenter', () => this.showTip(el, this.itemTipHtml(it, cur)));
      el.addEventListener('mouseleave', () => this.hideTip());
    });
    pan.querySelectorAll('button.buy').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      const it = prop.stock[i];
      if (it.sold) return;
      if (p.gold < it.value) { this.toast('金幣不足', '#ff6b6b'); return; }
      p.gold -= it.value;
      it.sold = true;
      if (it.consumable === 'potion') p.potions += 2;
      else if (it.consumable === 'mana') p.manaPots += 2;
      else p.inventory.push(it);
      Audio.play('coin');
      this.hideTip();
      this.showShop(prop);
    }));
    pan.querySelector('[data-a=close]').addEventListener('click', () => {
      this.hidePanels(); this.G.state = 'play';
    });
  },

  /* ============ 暫停 ============ */
  togglePause() {
    const G = this.G;
    if (G.state === 'paused' || this.invOpen) {
      this.hidePanels(); G.state = 'play'; return;
    }
    if (G.state !== 'play') return;
    G.state = 'paused';
    const p = this.panel(`
      <h2 class="panel-title">暫停</h2>
      <div class="menu-btns">
        <button class="btn primary" data-a="resume">繼續</button>
        <button class="btn" data-a="inv">背包</button>
        <button class="btn" data-a="settings">設定</button>
        <button class="btn danger" data-a="quit">放棄本場（回主選單）</button>
      </div>
      <div class="dim center small">放棄會保留已獲得的靈魂</div>`, '');
    p.querySelector('[data-a=resume]').addEventListener('click', () => this.togglePause());
    p.querySelector('[data-a=inv]').addEventListener('click', () => { this.hidePanels(); this.toggleInventory(); });
    p.querySelector('[data-a=settings]').addEventListener('click', () => this.showSettings());
    p.querySelector('[data-a=quit]').addEventListener('click', () => {
      if (confirm('確定放棄本場探索？')) { this.G.endRun(false); }
    });
  },

  /* ============ 死亡 / 勝利 ============ */
  showDeath(st, escaped) {
    const t = ((performance.now() - st.startTime) / 1000) | 0;
    const mm = String(Math.floor(t / 60)).padStart(2, '0'), ss = String(t % 60).padStart(2, '0');
    this.el.hud.classList.add('hidden');
    const p = this.panel(`
      <h2 class="death-title" style="color:${escaped ? '#7bff9b' : '#ff5a5a'}">${escaped ? '你活著離開了深淵' : '你死了'}</h2>
      <div class="death-sub">${escaped ? '靈魂加成 +25%' : '深淵吞噬了你的一切…但靈魂留了下來'}</div>
      <div class="death-stats">
        <div><span>抵達樓層</span><b>${st.floor}</b></div>
        <div><span>擊殺</span><b>${st.kills}</b></div>
        <div><span>精英</span><b>${st.elites}</b></div>
        <div><span>王</span><b>${st.bosses}</b></div>
        <div><span>拾取裝備</span><b>${st.items}</b></div>
        <div><span>造成傷害</span><b>${fmt(st.dmgDealt)}</b></div>
        <div><span>承受傷害</span><b>${fmt(st.dmgTaken)}</b></div>
        <div><span>存活時間</span><b>${mm}:${ss}</b></div>
      </div>
      <div class="soul-earn">獲得靈魂 💀 <b>${st.soulsEarned}</b></div>
      <div class="menu-btns">
        <button class="btn primary" data-a="town">前往靈魂祭壇</button>
        <button class="btn" data-a="again">再來一場</button>
        <button class="btn" data-a="title">主選單</button>
      </div>`, 'death-panel');
    p.querySelector('[data-a=town]').addEventListener('click', () => this.showTown());
    p.querySelector('[data-a=again]').addEventListener('click', () => this.showClassSelect());
    p.querySelector('[data-a=title]').addEventListener('click', () => this.showTitle());
  },

  showVictory() {
    this.toast('★ 通關！樹懶魔神已被擊敗 ★', '#ffd45e', 6);
  }
};
