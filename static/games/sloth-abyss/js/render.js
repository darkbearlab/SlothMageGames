/* ===========================================================
   Sloth Abyss - render.js
   Canvas 繪圖：地圖、實體、粒子、光照、小地圖
   =========================================================== */
'use strict';

const Render = {
  canvas: null, ctx: null, w: 0, h: 0, dpr: 1, zoom: 1.4,
  lightCanvas: null, lctx: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lightCanvas = document.createElement('canvas');
    this.lctx = this.lightCanvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.lightCanvas.width = Math.floor(this.w * 0.5);
    this.lightCanvas.height = Math.floor(this.h * 0.5);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  },

  /* ============ 主繪製 ============ */
  draw(G) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#07070b';
    ctx.fillRect(0, 0, this.w, this.h);

    const cam = G.cam;
    const shakeX = (urng.next() - 0.5) * G.shakeAmt * 2;
    const shakeY = (urng.next() - 0.5) * G.shakeAmt * 2;
    ctx.save();
    ctx.translate(this.w / 2 + shakeX, this.h / 2 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cam.x, -cam.y);

    this.drawMap(G, ctx);
    this.drawGroundFx(G, ctx);
    this.drawProps(G, ctx);
    this.drawPickups(G, ctx);

    // 依 y 排序繪製實體
    const list = [];
    for (const e of G.enemies) if (!e.dead) list.push(e);
    for (const m of G.minions) if (!m.dead) list.push(m);
    if (!G.player.dead) list.push(G.player);
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (!this.onScreen(G, e.x, e.y, 80)) continue;
      if (e.isPlayer) this.drawPlayer(ctx, e, G);
      else if (e instanceof Minion) this.drawMinion(ctx, e, G);
      else this.drawEnemy(ctx, e, G);
    }

    this.drawProjectiles(G, ctx);
    this.drawParticles(G, ctx);
    this.drawTexts(G, ctx);
    ctx.restore();

    this.drawLighting(G);
    this.drawVignette(ctx);
  },

  onScreen(G, x, y, pad) {
    return Math.abs(x - G.cam.x) < this.w / (2 * this.zoom) + pad &&
      Math.abs(y - G.cam.y) < this.h / (2 * this.zoom) + pad;
  },

  /* ============ 地圖 ============ */
  drawMap(G, ctx) {
    const map = G.map, b = G.biome;
    const hw = this.w / (2 * this.zoom), hh = this.h / (2 * this.zoom);
    const x0 = Math.max(0, Math.floor((G.cam.x - hw) / TILE) - 1);
    const x1 = Math.min(map.w - 1, Math.ceil((G.cam.x + hw) / TILE) + 1);
    const y0 = Math.max(0, Math.floor((G.cam.y - hh) / TILE) - 1);
    const y1 = Math.min(map.h - 1, Math.ceil((G.cam.y + hh) / TILE) + 2);

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.w + x;
        if (!map.seen[i]) continue;
        const t = map.tiles[i];
        const px = x * TILE, py = y * TILE;
        if (t === T_FLOOR) {
          ctx.fillStyle = ((x + y) & 1) ? b.floor : b.floor2;
          ctx.fillRect(px, py, TILE, TILE);
          // 磚縫
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(px, py, TILE, 1); ctx.fillRect(px, py, 1, TILE);
          ctx.fillStyle = 'rgba(255,255,255,0.045)';
          ctx.fillRect(px + 1, py + 1, TILE - 2, 1);
          const d = map.deco[i];
          if (d) {
            ctx.fillStyle = withAlpha(b.accent, 0.22);
            if (d === 1) { ctx.fillRect(px + 6, py + 9, 9, 3); ctx.fillRect(px + 8, py + 14, 5, 2); }
            else if (d === 2) { ctx.fillRect(px + 17, py + 19, 7, 3); ctx.fillRect(px + 7, py + 24, 5, 3); }
            else if (d === 3) {
              ctx.fillStyle = withAlpha(b.accent, 0.14);
              ctx.fillRect(px + 9, py + 9, 14, 14);
              ctx.fillStyle = withAlpha(b.accent, 0.3);
              ctx.fillRect(px + 13, py + 13, 6, 6);
            }
            else { ctx.fillRect(px + 4, py + 6, 3, 3); ctx.fillRect(px + 22, py + 18, 3, 3); ctx.fillRect(px + 14, py + 25, 2, 2); }
          }
        } else if (t === T_LAVA) {
          const pulse = 0.5 + Math.sin(G.time * 2 + x * 0.7 + y * 0.5) * 0.15;
          ctx.fillStyle = `rgba(${200 + pulse * 55 | 0},${70 + pulse * 60 | 0},20,1)`;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = `rgba(255,220,120,${0.15 + pulse * 0.2})`;
          ctx.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
        }
      }
    }
    // 牆（後畫，做出高度感）
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * map.w + x;
        if (!map.seen[i] || map.tiles[i] !== T_WALL) continue;
        const px = x * TILE, py = y * TILE;
        const openBelow = map.get(x, y + 1) !== T_WALL;
        const openAbove = map.get(x, y - 1) !== T_WALL;
        // 頂面
        ctx.fillStyle = b.wallTop;
        ctx.fillRect(px, py - 8, TILE, TILE);
        // 磚紋
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(px, py - 8 + ((x * 7 + y * 3) % 2 ? 10 : 16), TILE, 1);
        ctx.fillRect(px + ((x * 5 + y) % TILE), py - 8, 1, TILE);
        if (openAbove) {
          ctx.fillStyle = shade(b.wallTop, 34);
          ctx.fillRect(px, py - 8, TILE, 2);
        }
        if (openBelow) {
          // 側面（面向鏡頭）
          ctx.fillStyle = b.wall;
          ctx.fillRect(px, py + TILE - 8, TILE, 8);
          ctx.fillStyle = shade(b.wall, -22);
          ctx.fillRect(px, py + TILE - 3, TILE, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(px, py + TILE, TILE, 7);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py - 7.5, TILE - 1, TILE - 1);
      }
    }
  },

  drawGroundFx(G, ctx) {
    // 危險區、預告圈、毒池
    for (const h of G.hazards) {
      if (h.kind === 'blackhole') {
        const g = ctx.createRadialGradient(h.x, h.y, 4, h.x, h.y, h.r);
        g.addColorStop(0, 'rgba(0,0,0,0.9)');
        g.addColorStop(0.5, withAlpha(h.color, 0.4));
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
        ctx.strokeStyle = withAlpha(h.color, 0.6); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (0.5 + Math.sin(G.time * 5) * 0.05), 0, TAU); ctx.stroke();
      } else if (h.kind === 'puddle') {
        ctx.fillStyle = 'rgba(120,190,60,0.28)';
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      } else if (h.kind === 'fire') {
        const a = 0.25 + Math.sin(G.time * 8 + h.x) * 0.08;
        ctx.fillStyle = `rgba(255,120,40,${a})`;
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      }
    }
    for (const t of G.telegraphs) {
      const p = 1 - t.t / t.dur;
      ctx.strokeStyle = withAlpha(t.color || '#ff5a5a', 0.8);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, TAU); ctx.stroke();
      ctx.fillStyle = withAlpha(t.color || '#ff5a5a', 0.18);
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r * p, 0, TAU); ctx.fill();
    }
  },

  drawProps(G, ctx) {
    for (const p of G.props) {
      if (!this.onScreen(G, p.x, p.y, 60)) continue;
      const bob = Math.sin(G.time * 2 + p.x * 0.01) * 2;
      if (p.kind === 'stairs') {
        ctx.fillStyle = '#000'; ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 30, 14, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = ['#5a5a6e', '#4a4a5c', '#3a3a4a', '#2a2a36'][i];
          ctx.fillRect(p.x - 26 + i * 3, p.y - 14 + i * 7, 52 - i * 6, 8);
        }
        const glow = 0.4 + Math.sin(G.time * 3) * 0.2;
        ctx.fillStyle = `rgba(150,200,255,${glow})`;
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 2, 20, 9, 0, 0, TAU); ctx.fill();
        this.label(ctx, p.x, p.y - 34, '下一層 [F]', '#9ad0ff');
      } else if (p.kind === 'chest') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 10, 20, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = p.opened ? '#5a4632' : '#8a6a3c';
        ctx.fillRect(p.x - 18, p.y - 12, 36, 24);
        ctx.fillStyle = p.opened ? '#3a2c20' : '#c89a4c';
        ctx.fillRect(p.x - 18, p.y - (p.opened ? 22 : 12), 36, 10);
        ctx.fillStyle = '#ffd45e';
        ctx.fillRect(p.x - 3, p.y - 4, 6, 8);
        if (!p.opened) {
          const g = 0.3 + Math.sin(G.time * 4) * 0.15;
          ctx.fillStyle = `rgba(255,212,94,${g})`;
          ctx.beginPath(); ctx.arc(p.x, p.y, 26, 0, TAU); ctx.fill();
          this.label(ctx, p.x, p.y - 30, '寶箱 [F]', '#ffd45e');
        }
      } else if (p.kind === 'shrine') {
        const c = p.used ? '#555' : p.def.color;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 18, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a4a58';
        ctx.fillRect(p.x - 10, p.y - 6, 20, 18);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(p.x, p.y - 14 + bob, 10, 0, TAU); ctx.fill();
        if (!p.used) {
          ctx.fillStyle = withAlpha(c, 0.25);
          ctx.beginPath(); ctx.arc(p.x, p.y - 14 + bob, 22 + Math.sin(G.time * 3) * 4, 0, TAU); ctx.fill();
          this.label(ctx, p.x, p.y - 40, p.def.name + ' [F]', c);
        }
      } else if (p.kind === 'shop') {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 22, 9, 0, 0, TAU); ctx.fill();
        // 樹懶商人
        ctx.fillStyle = '#6b5844';
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 2 + bob, 16, 20, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#8a7660';
        ctx.beginPath(); ctx.arc(p.x, p.y - 18 + bob, 11, 0, TAU); ctx.fill();
        ctx.fillStyle = '#2a2018';
        ctx.beginPath(); ctx.arc(p.x - 4, p.y - 19 + bob, 2, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(p.x + 4, p.y - 19 + bob, 2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d94c8a';
        ctx.fillRect(p.x - 14, p.y - 34 + bob, 28, 6);
        this.label(ctx, p.x, p.y - 46, '商人 [F]', '#ffd45e');
      } else if (p.kind === 'portal') {
        const g = 0.5 + Math.sin(G.time * 4) * 0.2;
        const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 40);
        grd.addColorStop(0, `rgba(200,140,255,${g})`);
        grd.addColorStop(1, 'rgba(120,60,200,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, TAU); ctx.fill();
        for (let i = 0; i < 3; i++) {
          const a = G.time * 2 + i * TAU / 3;
          ctx.fillStyle = '#e0b0ff';
          ctx.beginPath(); ctx.arc(p.x + Math.cos(a) * 24, p.y + Math.sin(a) * 12, 3, 0, TAU); ctx.fill();
        }
        this.label(ctx, p.x, p.y - 50, '離開深淵 [F]', '#e0b0ff');
      }
    }
  },

  label(ctx, x, y, text, color) {
    ctx.font = 'bold 12px "Noto Sans TC",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    const w = ctx.measureText(text).width + 10;
    ctx.fillRect(x - w / 2, y - 11, w, 16);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
  },

  drawPickups(G, ctx) {
    for (const p of G.pickups) {
      if (!this.onScreen(G, p.x, p.y, 40)) continue;
      const bob = Math.sin(G.time * 4 + p.seed) * 3;
      if (p.kind === 'gold') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath(); ctx.ellipse(p.x, p.y + 6, 6, 3, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffd45e';
        ctx.beginPath(); ctx.arc(p.x, p.y + bob, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6c0';
        ctx.beginPath(); ctx.arc(p.x - 1.5, p.y - 1.5 + bob, 1.8, 0, TAU); ctx.fill();
      } else if (p.kind === 'soul') {
        const a = 0.6 + Math.sin(G.time * 6 + p.seed) * 0.2;
        ctx.fillStyle = `rgba(140,230,255,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y + bob, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(220,250,255,${a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y + bob - 1, 2.4, 0, TAU); ctx.fill();
      } else if (p.kind === 'item') {
        const col = RARITY[p.item.rarity].color;
        ctx.fillStyle = withAlpha(col, 0.25);
        ctx.beginPath(); ctx.arc(p.x, p.y, 18 + Math.sin(G.time * 3 + p.seed) * 3, 0, TAU); ctx.fill();
        // 光柱
        const grd = ctx.createLinearGradient(p.x, p.y - 60, p.x, p.y);
        grd.addColorStop(0, withAlpha(col, 0));
        grd.addColorStop(1, withAlpha(col, 0.35));
        ctx.fillStyle = grd;
        ctx.fillRect(p.x - 7, p.y - 60, 14, 60);
        this.drawItemIcon(ctx, p.item, p.x, p.y + bob, 1);
      } else if (p.kind === 'potion') {
        ctx.fillStyle = '#ff5a6e';
        ctx.fillRect(p.x - 4, p.y - 6 + bob, 8, 11);
        ctx.fillStyle = '#ffd0d8';
        ctx.fillRect(p.x - 2, p.y - 9 + bob, 4, 3);
      }
    }
  },

  drawItemIcon(ctx, it, x, y, s) {
    const col = RARITY[it.rarity].color;
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
    const slot = it.slot;
    if (slot === 'weapon') {
      if (it.tags && it.tags.includes('caster')) {
        ctx.fillRect(-1.5, -10, 3, 20);
        ctx.beginPath(); ctx.arc(0, -12, 4, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(3, 6); ctx.lineTo(-3, 6); ctx.closePath(); ctx.fill();
        ctx.fillRect(-6, 6, 12, 3);
      }
    } else if (slot === 'helm') {
      ctx.beginPath(); ctx.arc(0, 0, 8, Math.PI, 0); ctx.lineTo(8, 6); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    } else if (slot === 'armor') {
      ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(8, -7); ctx.lineTo(6, 9); ctx.lineTo(-6, 9); ctx.closePath(); ctx.fill();
    } else if (slot === 'gloves') {
      ctx.fillRect(-7, -6, 14, 10); ctx.fillRect(-7, 4, 5, 5);
    } else if (slot === 'boots') {
      ctx.fillRect(-6, -8, 7, 12); ctx.fillRect(-6, 4, 13, 5);
    } else if (slot === 'ring1' || slot === 'ring2') {
      ctx.beginPath(); ctx.arc(0, 1, 6, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -6, 3, 0, TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -1, 9, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    }
    ctx.restore();
  },

  /* ============ 玩家 ============ */
  drawPlayer(ctx, p, G) {
    const t = G.time;
    const moving = Math.hypot(p.vx, p.vy) > 0.1;
    const bob = moving ? Math.sin(t * 14) * 2 : Math.sin(t * 2.5) * 1;
    const col = p.cls.color;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 11, 12, 5, 0, 0, TAU); ctx.fill();

    if (p.invuln > 0 && Math.floor(t * 20) % 2 === 0) ctx.globalAlpha = 0.5;

    // 披風
    ctx.fillStyle = shade(col, -60);
    ctx.beginPath();
    ctx.ellipse(p.x - Math.cos(p.facing) * 4, p.y + 1 + bob - Math.sin(p.facing) * 4, 12, 14, 0, 0, TAU);
    ctx.fill();
    // 身體
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(p.x, p.y + bob, 9, 11, 0, 0, TAU); ctx.fill();
    // 頭
    ctx.fillStyle = '#e8d5b8';
    ctx.beginPath(); ctx.arc(p.x, p.y - 11 + bob, 7, 0, TAU); ctx.fill();
    // 兜帽
    ctx.fillStyle = shade(col, 25);
    ctx.beginPath(); ctx.arc(p.x, p.y - 13 + bob, 7.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    // 眼睛（朝向）
    const ex = Math.cos(p.facing) * 3, ey = Math.sin(p.facing) * 2;
    ctx.fillStyle = '#2a2018';
    ctx.beginPath(); ctx.arc(p.x - 2.5 + ex, p.y - 10 + bob + ey, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x + 2.5 + ex, p.y - 10 + bob + ey, 1.4, 0, TAU); ctx.fill();

    // 武器
    const w = p.gear.weapon;
    const swing = p.attackTimer > 0 ? (p.attackTimer / Math.max(0.001, p.atkInterval)) : 0;
    const wa = p.facing + (1 - swing) * 0.6 - 0.3;
    const wx = p.x + Math.cos(wa) * 14, wy = p.y + Math.sin(wa) * 14 + bob;
    ctx.save();
    ctx.translate(wx, wy); ctx.rotate(wa + Math.PI / 2);
    const wcol = w ? RARITY[w.rarity].color : '#aaa';
    if (w && w.tags && w.tags.includes('caster')) {
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-1.5, -12, 3, 22);
      ctx.fillStyle = wcol; ctx.beginPath(); ctx.arc(0, -14, 4.5, 0, TAU); ctx.fill();
      ctx.fillStyle = withAlpha(wcol, 0.3); ctx.beginPath(); ctx.arc(0, -14, 8, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = wcol;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(2.5, 4); ctx.lineTo(-2.5, 4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6b4a2a'; ctx.fillRect(-1.5, 4, 3, 7);
    }
    ctx.restore();

    ctx.globalAlpha = 1;

    // 護盾
    if (p.shield > 0) {
      ctx.strokeStyle = `rgba(140,200,255,${0.5 + Math.sin(t * 6) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, TAU); ctx.stroke();
    }
    // 環繞球
    if (p.bonus.orbs > 0) {
      for (let i = 0; i < p.bonus.orbs; i++) {
        const a = p.orbAngle + (TAU / p.bonus.orbs) * i;
        const ox = p.x + Math.cos(a) * 62, oy = p.y + Math.sin(a) * 62;
        ctx.fillStyle = 'rgba(192,122,232,0.85)';
        ctx.beginPath(); ctx.arc(ox, oy, 7, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(240,210,255,0.9)';
        ctx.beginPath(); ctx.arc(ox - 2, oy - 2, 2.5, 0, TAU); ctx.fill();
      }
    }
    // 狀態
    this.drawStatusIcons(ctx, p);
    if (p.buffs.whirl) {
      ctx.strokeStyle = 'rgba(255,180,120,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 60 + Math.sin(t * 20) * 8, 0, TAU); ctx.stroke();
    }
  },

  drawStatusIcons(ctx, e) {
    let i = 0;
    for (const k in e.status) {
      const c = { burn: '#ff7a3c', chill: '#7fd4ff', poison: '#9bf56a', stun: '#ffe066' }[k];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(e.x - 10 + i * 7, e.y - e.r - 20, 5, 5);
      i++;
    }
  },

  /* ============ 敵人 ============ */
  drawEnemy(ctx, e, G) {
    const t = G.time;
    const bob = Math.sin(t * 6 + e.bobSeed) * 2;
    ctx.globalAlpha = e.alpha !== undefined ? e.alpha : 1;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.8, e.r * 0.85, e.r * 0.35, 0, 0, TAU); ctx.fill();

    if (e.elite) {
      const c = e.mods[0] ? e.mods[0].color : '#fff';
      ctx.strokeStyle = withAlpha(c, 0.55); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 7 + Math.sin(t * 3) * 2, 0, TAU); ctx.stroke();
    }
    if (e.immune) {
      ctx.strokeStyle = 'rgba(200,210,255,0.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 10, 0, TAU); ctx.stroke();
    }

    const body = e.flash > 0 ? '#ffffff' : e.color;
    const shp = ENEMY_SHAPES[e.typeId] || (e.isBoss ? ENEMY_SHAPES._boss : ENEMY_SHAPES._default);
    shp(ctx, e, body, bob, t);

    ctx.globalAlpha = 1;

    // 血條
    if (e.hp < e.maxHp) {
      const w = Math.max(24, e.r * 2.2), h = e.isBoss ? 5 : 3;
      const x = e.x - w / 2, y = e.y - e.r - (e.isBoss || e.elite ? 16 : 13);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = e.elite ? '#ffb03c' : '#e2564a';
      ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), h);
    }
    if (e.elite || e.isBoss) {
      ctx.font = 'bold 11px "Noto Sans TC",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = e.isBoss ? '#ff8c6b' : '#ffd45e';
      ctx.fillText(e.name, e.x, e.y - e.r - 24);
      ctx.textAlign = 'left';
    }
    this.drawStatusIcons(ctx, e);

    if (e.state === 'windup') {
      ctx.strokeStyle = 'rgba(255,90,90,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + Math.cos(e.chargeAngle) * 200, e.y + Math.sin(e.chargeAngle) * 200);
      ctx.stroke();
    }
  },

  drawMinion(ctx, m, G) {
    const t = G.time;
    const bob = Math.sin(t * 5 + m.animT) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(m.x, m.y + m.r * 0.8, m.r * 0.8, m.r * 0.3, 0, 0, TAU); ctx.fill();
    if (m.kind === 'turret') {
      ctx.fillStyle = '#5a5040'; ctx.fillRect(m.x - 8, m.y - 4, 16, 14);
      ctx.fillStyle = m.color;
      ctx.beginPath(); ctx.arc(m.x, m.y - 8, 7, 0, TAU); ctx.fill();
      ctx.fillStyle = withAlpha(m.color, 0.3);
      ctx.beginPath(); ctx.arc(m.x, m.y - 8, 12 + Math.sin(t * 5) * 2, 0, TAU); ctx.fill();
    } else {
      // 樹懶靈
      ctx.fillStyle = withAlpha(m.color, 0.85);
      ctx.beginPath(); ctx.ellipse(m.x, m.y + bob, m.r * 0.9, m.r, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x, m.y - m.r * 0.9 + bob, m.r * 0.72, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(20,40,30,0.9)';
      ctx.beginPath(); ctx.arc(m.x - 3, m.y - m.r * 0.9 + bob, 1.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x + 3, m.y - m.r * 0.9 + bob, 1.6, 0, TAU); ctx.fill();
      ctx.fillStyle = withAlpha(m.color, 0.2);
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r + 6, 0, TAU); ctx.fill();
    }
  },

  /* ============ 投射物 / 粒子 ============ */
  drawProjectiles(G, ctx) {
    for (const p of G.projectiles) {
      if (p.dead) continue;
      ctx.fillStyle = withAlpha(p.color, 0.28);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.1, 0, TAU); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(p.x - p.vx * 0.004, p.y - p.vy * 0.004, p.r * 0.45, 0, TAU); ctx.fill();
    }
  },

  drawParticles(G, ctx) {
    for (const p of G.particles) {
      if (p.dead) continue;
      const k = p.life / p.maxLife;
      if (p.kind === 'spark') {
        ctx.fillStyle = withAlpha(p.color, k);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = withAlpha(p.color, k * 0.85);
        ctx.lineWidth = 2 + (1 - k) * 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + (1 - k) * 0.9), 0, TAU); ctx.stroke();
      } else if (p.kind === 'swing') {
        ctx.strokeStyle = withAlpha(p.color, k * 0.75);
        ctx.lineWidth = 8 * k + 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 0.8, p.a - p.arc / 2, p.a + p.arc / 2);
        ctx.stroke();
      } else if (p.kind === 'line') {
        ctx.strokeStyle = withAlpha(p.color, k);
        ctx.lineWidth = 4 * k + 1;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
      } else if (p.kind === 'bolt') {
        // 鋸齒閃電
        ctx.strokeStyle = withAlpha(p.color, k);
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        const seg = 5;
        for (let i = 1; i <= seg; i++) {
          const tt = i / seg;
          const nx = lerp(p.x, p.x2, tt) + (p.seed[i - 1] - 0.5) * 22 * (1 - Math.abs(tt - 0.5) * 2);
          const ny = lerp(p.y, p.y2, tt) + (p.seed[i + 4] - 0.5) * 22 * (1 - Math.abs(tt - 0.5) * 2);
          ctx.lineTo(nx, ny);
        }
        ctx.stroke();
      } else if (p.kind === 'meteor') {
        const prog = 1 - k;
        const sx = p.x + 300 * (1 - prog), sy = p.y - 500 * (1 - prog);
        ctx.strokeStyle = withAlpha('#ff9a3c', 0.8);
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(sx + 40, sy - 70); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.fillStyle = '#ffd08c';
        ctx.beginPath(); ctx.arc(sx, sy, 14, 0, TAU); ctx.fill();
      } else if (p.kind === 'shock') {
        ctx.fillStyle = withAlpha(p.color, k * 0.5);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.2 - k * 0.4), 0, TAU); ctx.fill();
      }
    }
  },

  drawTexts(G, ctx) {
    ctx.textAlign = 'center';
    for (const t of G.texts) {
      if (t.dead) continue;
      const k = t.life / t.maxLife;
      ctx.font = `bold ${t.size}px "Noto Sans TC",system-ui,sans-serif`;
      ctx.fillStyle = `rgba(0,0,0,${k * 0.6})`;
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      ctx.fillStyle = withAlpha(t.color, k);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.textAlign = 'left';
  },

  /* ============ 光照 ============ */
  drawLighting(G) {
    const lc = this.lightCanvas, l = this.lctx;
    const s = 0.5;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.fillStyle = 'rgba(6,5,14,0.78)';
    l.fillRect(0, 0, lc.width, lc.height);
    l.globalCompositeOperation = 'destination-out';

    const z = s * this.zoom;
    const cx = (x) => (x - G.cam.x) * z + lc.width / 2;
    const cy = (y) => (y - G.cam.y) * z + lc.height / 2;

    const addLight = (x, y, r, str) => {
      const px = cx(x), py = cy(y), pr = r * z;
      if (px < -pr || py < -pr || px > lc.width + pr || py > lc.height + pr) return;
      const g = l.createRadialGradient(px, py, 0, px, py, pr);
      g.addColorStop(0, `rgba(0,0,0,${str})`);
      g.addColorStop(0.55, `rgba(0,0,0,${str * 0.65})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g;
      l.beginPath(); l.arc(px, py, pr, 0, TAU); l.fill();
    };
    const p = G.player;
    addLight(p.x, p.y, 300 + Math.sin(G.time * 3) * 8, 1);
    for (const pr of G.projectiles) addLight(pr.x, pr.y, 70, 0.75);
    for (const pp of G.pickups) if (pp.kind === 'item') addLight(pp.x, pp.y, 80, 0.6);
    for (const pp of G.props) {
      if (pp.kind === 'shrine' && !pp.used) addLight(pp.x, pp.y, 130, 0.8);
      if (pp.kind === 'stairs' || pp.kind === 'portal') addLight(pp.x, pp.y, 130, 0.8);
      if (pp.kind === 'chest' && !pp.opened) addLight(pp.x, pp.y, 100, 0.65);
    }
    for (const e of G.enemies) {
      if (e.elite || e.isBoss) addLight(e.x, e.y, 110, 0.55);
      else if (e.element === 'fire') addLight(e.x, e.y, 70, 0.45);
    }
    for (const h of G.hazards) addLight(h.x, h.y, h.r * 1.2, 0.55);
    for (const t of G.telegraphs) addLight(t.x, t.y, t.r * 1.4, 0.6);
    for (const pa of G.particles) if (pa.kind === 'ring' || pa.kind === 'bolt') addLight(pa.x, pa.y, 90, 0.5);

    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(lc, 0, 0, this.w, this.h);
    // 生態域色調（暖光/冷光）
    ctx.globalCompositeOperation = 'lighter';
    const px = (p.x - G.cam.x) * this.zoom + this.w / 2;
    const py = (p.y - G.cam.y) * this.zoom + this.h / 2;
    const gr = ctx.createRadialGradient(px, py, 0, px, py, 320 * this.zoom);
    gr.addColorStop(0, withAlpha(G.biome.light, 0.13));
    gr.addColorStop(0.6, withAlpha(G.biome.light, 0.05));
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'source-over';
  },

  drawVignette(ctx) {
    if (!this._vig || this._vigW !== this.w) {
      this._vigW = this.w;
      const g = ctx.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35,
        this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      this._vig = g;
    }
    ctx.fillStyle = this._vig;
    ctx.fillRect(0, 0, this.w, this.h);
  },

  /* ============ 小地圖 ============ */
  drawMinimap(G, ctx2, size) {
    const map = G.map;
    const scale = size / Math.max(map.w, map.h);
    ctx2.clearRect(0, 0, size, size);
    ctx2.fillStyle = 'rgba(0,0,0,0.55)';
    ctx2.fillRect(0, 0, size, size);
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const i = y * map.w + x;
        if (!map.seen[i]) continue;
        const t = map.tiles[i];
        if (t === T_WALL) ctx2.fillStyle = 'rgba(90,90,110,0.55)';
        else if (t === T_LAVA) ctx2.fillStyle = 'rgba(220,90,30,0.8)';
        else ctx2.fillStyle = 'rgba(190,190,210,0.42)';
        ctx2.fillRect(x * scale, y * scale, Math.ceil(scale), Math.ceil(scale));
      }
    }
    const dot = (x, y, c, r) => {
      ctx2.fillStyle = c;
      ctx2.beginPath(); ctx2.arc(x / TILE * scale, y / TILE * scale, r, 0, TAU); ctx2.fill();
    };
    for (const p of G.props) {
      if (p.kind === 'stairs') dot(p.x, p.y, '#7fd4ff', 3);
      else if (p.kind === 'chest' && !p.opened) dot(p.x, p.y, '#ffd45e', 2.5);
      else if (p.kind === 'shrine' && !p.used) dot(p.x, p.y, '#b46ee0', 2.5);
      else if (p.kind === 'shop') dot(p.x, p.y, '#5fc98a', 2.5);
      else if (p.kind === 'portal') dot(p.x, p.y, '#e0b0ff', 3);
    }
    for (const e of G.enemies) {
      if (e.dead) continue;
      const i = Math.floor(e.y / TILE) * map.w + Math.floor(e.x / TILE);
      if (!map.seen[i]) continue;
      dot(e.x, e.y, e.isBoss ? '#ff5a5a' : (e.elite ? '#ffb03c' : 'rgba(230,90,90,0.85)'), e.isBoss ? 3.5 : 1.8);
    }
    for (const p of G.pickups) if (p.kind === 'item') dot(p.x, p.y, RARITY[p.item.rarity].color, 2);
    dot(G.player.x, G.player.y, '#ffffff', 3);
  }
};

/* ============ 敵人造型 ============ */
const ENEMY_SHAPES = {
  _default(ctx, e, c, bob) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r, 0, TAU); ctx.fill();
  },
  rat(ctx, e, c, bob, t) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, e.r * 1.15, e.r * 0.78, e.facing, 0, TAU); ctx.fill();
    const hx = e.x + Math.cos(e.facing) * e.r, hy = e.y + Math.sin(e.facing) * e.r + bob;
    ctx.beginPath(); ctx.arc(hx, hy, e.r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(c, -30); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(e.x - Math.cos(e.facing) * e.r, e.y - Math.sin(e.facing) * e.r + bob);
    ctx.lineTo(e.x - Math.cos(e.facing) * e.r * 2.4 + Math.sin(t * 12) * 3, e.y - Math.sin(e.facing) * e.r * 2.4 + bob);
    ctx.stroke();
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.arc(hx + Math.cos(e.facing + 1) * 3, hy + Math.sin(e.facing + 1) * 3, 1.3, 0, TAU); ctx.fill();
  },
  skeleton(ctx, e, c, bob, t) {
    ctx.strokeStyle = c; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - 2 + bob); ctx.lineTo(e.x, e.y + e.r * 0.7 + bob);
    ctx.moveTo(e.x - 7, e.y + 2 + bob); ctx.lineTo(e.x + 7, e.y + 2 + bob);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(e.x, e.y - e.r * 0.75 + bob, e.r * 0.62, 0, TAU); ctx.fill();
    ctx.fillStyle = '#221c14';
    ctx.beginPath(); ctx.arc(e.x - 2.6, e.y - e.r * 0.8 + bob, 1.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 2.6, e.y - e.r * 0.8 + bob, 1.7, 0, TAU); ctx.fill();
    // 劍
    ctx.strokeStyle = '#9aa0a8'; ctx.lineWidth = 2.5;
    const a = e.facing + (e.state === 'attack' ? -0.7 : 0.3);
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(a) * 6, e.y + Math.sin(a) * 6 + bob);
    ctx.lineTo(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20 + bob - 4);
    ctx.stroke();
  },
  zombie(ctx, e, c, bob, t) {
    const sway = Math.sin(t * 3 + e.bobSeed) * 3;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x + sway * 0.3, e.y + bob, e.r * 0.85, e.r, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + sway * 0.5, e.y - e.r * 0.85 + bob, e.r * 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = shade(c, -40); ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 0.7, e.y + bob);
    ctx.lineTo(e.x - e.r * 0.7 + Math.cos(e.facing) * 12, e.y + bob + Math.sin(e.facing) * 8);
    ctx.moveTo(e.x + e.r * 0.7, e.y + bob);
    ctx.lineTo(e.x + e.r * 0.7 + Math.cos(e.facing) * 12, e.y + bob + Math.sin(e.facing) * 8);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath(); ctx.arc(e.x + sway * 0.5 - 2, e.y - e.r * 0.9 + bob, 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + sway * 0.5 + 2, e.y - e.r * 0.9 + bob, 1.5, 0, TAU); ctx.fill();
  },
  archer(ctx, e, c, bob, t) {
    ENEMY_SHAPES.skeleton(ctx, e, c, bob, t);
    ctx.strokeStyle = '#8a6a3c'; ctx.lineWidth = 2;
    const a = e.facing;
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(a) * 12, e.y + Math.sin(a) * 12 + bob, 9, a - 1.1, a + 1.1);
    ctx.stroke();
  },
  bat(ctx, e, c, bob, t) {
    const flap = Math.sin(t * 18 + e.bobSeed) * 8;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + bob);
    ctx.lineTo(e.x - 20, e.y - flap + bob);
    ctx.lineTo(e.x - 8, e.y + 3 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + bob);
    ctx.lineTo(e.x + 20, e.y - flap + bob);
    ctx.lineTo(e.x + 8, e.y + 3 + bob);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath(); ctx.arc(e.x - 2.4, e.y - 1 + bob, 1.4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 2.4, e.y - 1 + bob, 1.4, 0, TAU); ctx.fill();
  },
  bloat(ctx, e, c, bob, t) {
    const pulse = 1 + Math.sin(t * 5 + e.bobSeed) * 0.09;
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * pulse, 0, TAU); ctx.fill();
    ctx.fillStyle = withAlpha('#d8ff7a', 0.5);
    ctx.beginPath(); ctx.arc(e.x - 3, e.y - 3 + bob, e.r * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a4a20';
    ctx.beginPath(); ctx.arc(e.x - 4, e.y + bob, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 4, e.y + bob, 2, 0, TAU); ctx.fill();
  },
  cultist(ctx, e, c, bob, t) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(e.x, e.y - e.r + bob);
    ctx.lineTo(e.x + e.r * 0.95, e.y + e.r + bob);
    ctx.lineTo(e.x - e.r * 0.95, e.y + e.r + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1020';
    ctx.beginPath(); ctx.arc(e.x, e.y - e.r * 0.45 + bob, e.r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7aff';
    ctx.beginPath(); ctx.arc(e.x - 2, e.y - e.r * 0.5 + bob, 1.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 2, e.y - e.r * 0.5 + bob, 1.5, 0, TAU); ctx.fill();
    if (e.state === 'cast') {
      ctx.strokeStyle = 'rgba(200,120,255,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, 0, TAU); ctx.stroke();
    }
  },
  spider(ctx, e, c, bob, t) {
    ctx.strokeStyle = shade(c, 30); ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = e.facing + Math.PI / 2 + i * 0.4 - 0.6;
      const l = e.r * 1.5 + Math.sin(t * 12 + i) * 3;
      ctx.beginPath(); ctx.moveTo(e.x, e.y + bob); ctx.lineTo(e.x + Math.cos(a) * l, e.y + Math.sin(a) * l + bob); ctx.stroke();
      const a2 = e.facing - Math.PI / 2 - i * 0.4 + 0.6;
      ctx.beginPath(); ctx.moveTo(e.x, e.y + bob); ctx.lineTo(e.x + Math.cos(a2) * l, e.y + Math.sin(a2) * l + bob); ctx.stroke();
    }
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, e.r * 0.9, e.r * 0.75, e.facing, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff4a4a';
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(e.facing) * 6 + Math.cos(e.facing + Math.PI / 2) * i * 3,
        e.y + Math.sin(e.facing) * 6 + Math.sin(e.facing + Math.PI / 2) * i * 3 + bob, 1.5, 0, TAU);
      ctx.fill();
    }
  },
  imp(ctx, e, c, bob, t) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.85, 0, TAU); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 0.6, e.y - e.r * 0.55 + bob); ctx.lineTo(e.x - e.r * 0.95, e.y - e.r * 1.35 + bob); ctx.lineTo(e.x - e.r * 0.2, e.y - e.r * 0.8 + bob); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + e.r * 0.6, e.y - e.r * 0.55 + bob); ctx.lineTo(e.x + e.r * 0.95, e.y - e.r * 1.35 + bob); ctx.lineTo(e.x + e.r * 0.2, e.y - e.r * 0.8 + bob); ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(e.x - 3, e.y - 1 + bob, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 3, e.y - 1 + bob, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = withAlpha('#ff7a3c', 0.3);
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 1.4 + Math.sin(t * 8) * 2, 0, TAU); ctx.fill();
  },
  gargoyle(ctx, e, c, bob, t) {
    ctx.fillStyle = shade(c, -25);
    ctx.beginPath();
    ctx.moveTo(e.x - e.r * 1.4, e.y - e.r * 0.3 + bob);
    ctx.lineTo(e.x, e.y - e.r * 0.9 + bob);
    ctx.lineTo(e.x + e.r * 1.4, e.y - e.r * 0.3 + bob);
    ctx.lineTo(e.x, e.y + e.r * 0.3 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, e.r * 0.8, e.r, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x, e.y - e.r * 0.85 + bob, e.r * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = e.state === 'windup' ? '#ff3030' : '#ffb060';
    ctx.beginPath(); ctx.arc(e.x - 3, e.y - e.r * 0.9 + bob, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 3, e.y - e.r * 0.9 + bob, 2, 0, TAU); ctx.fill();
  },
  hellhound(ctx, e, c, bob, t) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, e.r * 1.25, e.r * 0.72, e.facing, 0, TAU); ctx.fill();
    const hx = e.x + Math.cos(e.facing) * e.r * 1.1, hy = e.y + Math.sin(e.facing) * e.r * 1.1 + bob;
    ctx.beginPath(); ctx.arc(hx, hy, e.r * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = withAlpha('#ff9a3c', 0.55);
    for (let i = 0; i < 3; i++) {
      const a = e.facing + Math.PI + (i - 1) * 0.3;
      ctx.beginPath();
      ctx.arc(e.x + Math.cos(a) * e.r * 1.3, e.y + Math.sin(a) * e.r * 1.3 + bob + Math.sin(t * 10 + i) * 2, 4, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe066';
    ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, TAU); ctx.fill();
  },
  wraith(ctx, e, c, bob, t) {
    const g = ctx.createRadialGradient(e.x, e.y + bob, 2, e.x, e.y + bob, e.r * 1.6);
    g.addColorStop(0, withAlpha(c, 0.95));
    g.addColorStop(1, withAlpha(c, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 1.6, 0, TAU); ctx.fill();
    ctx.fillStyle = withAlpha('#ffffff', 0.85);
    ctx.beginPath(); ctx.arc(e.x - 3.5, e.y - 3 + bob, 2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + 3.5, e.y - 3 + bob, 2, 0, TAU); ctx.fill();
    ctx.strokeStyle = withAlpha(c, 0.5); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const x = e.x - 8 + i * 8;
      ctx.moveTo(x, e.y + e.r * 0.5 + bob);
      ctx.lineTo(x + Math.sin(t * 4 + i) * 4, e.y + e.r * 1.3 + bob);
    }
    ctx.stroke();
  },
  beholder(ctx, e, c, bob, t) {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r, 0, TAU); ctx.fill();
    for (let i = 0; i < 6; i++) {
      const a = t * 0.7 + i * TAU / 6;
      ctx.strokeStyle = shade(c, -30); ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(a) * e.r * 0.8, e.y + Math.sin(a) * e.r * 0.8 + bob);
      ctx.lineTo(e.x + Math.cos(a + Math.sin(t * 2 + i) * 0.3) * e.r * 1.7, e.y + Math.sin(a + Math.sin(t * 2 + i) * 0.3) * e.r * 1.7 + bob);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c02020';
    ctx.beginPath();
    ctx.arc(e.x + Math.cos(e.facing) * 4, e.y + Math.sin(e.facing) * 4 + bob, e.r * 0.3, 0, TAU); ctx.fill();
  },
  _boss(ctx, e, c, bob, t) {
    // 通用巨獸造型 + 依 typeId 微調
    const r = e.r;
    ctx.fillStyle = shade(c, -50);
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob + r * 0.2, r * 1.15, r * 1.05, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + bob, r * 0.95, r * 0.95, 0, 0, TAU); ctx.fill();
    // 角
    ctx.fillStyle = shade(c, -70);
    ctx.beginPath();
    ctx.moveTo(e.x - r * 0.75, e.y - r * 0.55 + bob);
    ctx.lineTo(e.x - r * 1.25, e.y - r * 1.5 + bob);
    ctx.lineTo(e.x - r * 0.25, e.y - r * 0.85 + bob); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.x + r * 0.75, e.y - r * 0.55 + bob);
    ctx.lineTo(e.x + r * 1.25, e.y - r * 1.5 + bob);
    ctx.lineTo(e.x + r * 0.25, e.y - r * 0.85 + bob); ctx.fill();
    // 眼
    const glow = e.state === 'act' ? 1 : 0.6;
    ctx.fillStyle = `rgba(255,${60 + glow * 60},${40},${glow})`;
    ctx.beginPath(); ctx.arc(e.x - r * 0.32, e.y - r * 0.15 + bob, r * 0.16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(e.x + r * 0.32, e.y - r * 0.15 + bob, r * 0.16, 0, TAU); ctx.fill();
    // 嘴
    ctx.fillStyle = '#2a0a10';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.4 + bob, r * 0.4, r * 0.18, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(e.x + i * r * 0.16 - 2, e.y + r * 0.28 + bob);
      ctx.lineTo(e.x + i * r * 0.16 + 2, e.y + r * 0.28 + bob);
      ctx.lineTo(e.x + i * r * 0.16, e.y + r * 0.5 + bob);
      ctx.fill();
    }
    // 光環
    ctx.strokeStyle = withAlpha(c, 0.35); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, r * 1.35 + Math.sin(t * 2) * 4, 0, TAU); ctx.stroke();
  }
};
