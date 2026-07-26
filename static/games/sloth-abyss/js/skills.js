/* ===========================================================
   Sloth Abyss - skills.js
   主動技能
   =========================================================== */
'use strict';

const SKILLS = {
  whirlwind: {
    name: '旋風斬', icon: '🌀', mana: 18, cd: 5, color: '#ff9a6b',
    desc: '原地旋轉 1.4 秒，持續對周圍敵人造成傷害並擊退。',
    cast(p, tx, ty, game) {
      p.buffs.whirl = { t: 1.4 };
      let t = 0;
      const tick = () => {
        if (p.dead || t >= 7) return;
        t++;
        const dmg = p.wpnDmg * 0.55 * p.damageMultiplier();
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (dist2(p.x, p.y, e.x, e.y) < 95 * 95) {
            game.hitEnemy(e, dmg, { element: 'phys', knock: 60 });
          }
        }
        game.fx.ring(p.x, p.y, '#ffb98a', 90);
        game.after(0.2, tick);
      };
      tick();
      Audio.play('whirl');
    }
  },
  fireball: {
    name: '火球術', icon: '🔥', mana: 14, cd: 1.6, color: '#ff7a3c',
    desc: '射出爆裂火球，命中後造成範圍火焰傷害。',
    cast(p, tx, ty, game) {
      const a = angTo(p.x, p.y, tx, ty);
      const n = 1 + p.bonus.projectiles;
      for (let i = 0; i < n; i++) {
        game.spawnProjectile({
          x: p.x, y: p.y, angle: a + (i - (n - 1) / 2) * 0.14, speed: 380,
          dmg: p.wpnDmg * 1.5 * p.damageMultiplier(), r: 10, life: 2.2, from: 'player',
          color: '#ff7a3c', element: 'fire', explode: true, pierce: p.bonus.pierce
        });
      }
      Audio.play('cast');
    }
  },
  dash: {
    name: '疾閃', icon: '💨', mana: 10, cd: 3, color: '#d7b3ff',
    desc: '朝游標方向瞬間突進，沿途造成傷害並短暫無敵。',
    cast(p, tx, ty, game) {
      const a = angTo(p.x, p.y, tx, ty);
      const range = 210;
      let nx = p.x, ny = p.y;
      for (let s = 8; s <= range; s += 8) {
        const cx = p.x + Math.cos(a) * s, cy = p.y + Math.sin(a) * s;
        if (!game.map.free(cx, cy, p.r)) break;
        nx = cx; ny = cy;
      }
      const dmg = p.wpnDmg * 1.3 * p.damageMultiplier();
      for (const e of game.enemies) {
        if (e.dead) continue;
        // 線段距離判定
        const t = clamp(((e.x - p.x) * Math.cos(a) + (e.y - p.y) * Math.sin(a)), 0, range);
        const px = p.x + Math.cos(a) * t, py = p.y + Math.sin(a) * t;
        if (dist2(px, py, e.x, e.y) < (e.r + 26) * (e.r + 26))
          game.hitEnemy(e, dmg, { element: 'phys', knock: 120 });
      }
      game.fx.trailLine(p.x, p.y, nx, ny, '#d7b3ff');
      p.x = nx; p.y = ny;
      p.invuln = Math.max(p.invuln, 0.35);
      Audio.play('dash');
    }
  },
  summon: {
    name: '召喚樹懶靈', icon: '🦥', mana: 22, cd: 6, color: '#7bd8a0',
    desc: '召喚樹懶靈為你作戰（上限依懶群而定）。',
    cast(p, tx, ty, game) {
      const cap = p.minionCap;
      const alive = game.minions.filter(m => !m.dead && m.kind === 'sloth');
      const n = Math.min(2, cap - alive.length);
      if (n <= 0) { game.floatText(p.x, p.y - 30, '樹懶已滿', '#7bd8a0', 12); return; }
      for (let i = 0; i < n; i++) {
        const m = new Minion(p.x + rng.range(-30, 30), p.y + rng.range(-30, 30), p, {
          kind: 'sloth', hp: 40 + p.level * 8, dmg: p.wpnDmg * 0.75 * p.damageMultiplier(),
          speed: 140, atkCd: 0.9, color: '#7bd8a0', ranged: p.cls.id === 'summoner' && rng.chance(0.4)
        });
        game.minions.push(m);
        game.fx.ring(m.x, m.y, '#7bd8a0', 26);
      }
      Audio.play('summon');
    }
  },
  holynova: {
    name: '聖光爆發', icon: '✨', mana: 20, cd: 4.5, color: '#ffe58a',
    desc: '以自身為中心爆發聖光，造成閃電傷害並回復生命。',
    cast(p, tx, ty, game) {
      const dmg = p.wpnDmg * 1.6 * p.damageMultiplier();
      let hit = 0;
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist2(p.x, p.y, e.x, e.y) < 150 * 150) {
          game.hitEnemy(e, dmg, { element: 'lightning', knock: 140 });
          hit++;
        }
      }
      p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.03 * Math.min(hit, 5));
      game.fx.bigRing(p.x, p.y, '#ffe58a', 150);
      game.shake(6);
      Audio.play('nova');
    }
  },
  meteor: {
    name: '隕石', icon: '☄️', mana: 30, cd: 7, color: '#ff7a3c',
    desc: '在游標處召喚隕石，造成大範圍火焰傷害。',
    cast(p, tx, ty, game) {
      const dmg = p.wpnDmg * 4.2 * p.damageMultiplier();
      game.telegraphCircle(tx, ty, 100, 0.65, () => {
        game.explode(tx, ty, 110, dmg, 'fire', true);
        game.shake(14);
      }, '#ff7a3c');
      game.fx.meteorFall(tx, ty);
      Audio.play('cast');
    }
  },
  frostnova: {
    name: '冰霜新星', icon: '❄️', mana: 22, cd: 6, color: '#7fd4ff',
    desc: '爆發寒氣，凍結並傷害周圍敵人。',
    cast(p, tx, ty, game) {
      const dmg = p.wpnDmg * 1.5 * p.damageMultiplier();
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist2(p.x, p.y, e.x, e.y) < 175 * 175) {
          game.hitEnemy(e, dmg, { element: 'cold' });
          e.addStatus('chill', 3.5, { amt: 0.6 });
          if (rng.chance(0.3)) e.addStatus('stun', 1.2);
        }
      }
      game.fx.bigRing(p.x, p.y, '#7fd4ff', 175);
      Audio.play('frost');
    }
  },
  chainlightning: {
    name: '雷鏈', icon: '⚡', mana: 18, cd: 3.5, color: '#ffe066',
    desc: '釋放閃電，在敵人之間連鎖跳躍最多 7 次。',
    cast(p, tx, ty, game) {
      game.chainLightning(p.x, p.y, p.wpnDmg * 1.7 * p.damageMultiplier(), 7, null, false);
      Audio.play('zap');
    }
  },
  turret: {
    name: '符文砲塔', icon: '🗼', mana: 25, cd: 9, color: '#ffd45e',
    desc: '部署一座自動射擊的符文砲塔，持續 18 秒。',
    cast(p, tx, ty, game) {
      const m = new Minion(p.x, p.y, p, {
        kind: 'turret', hp: 9999, dmg: p.wpnDmg * 0.6 * p.damageMultiplier(),
        atkCd: 0.45, color: '#ffd45e', r: 13, life: 18
      });
      game.minions.push(m);
      game.fx.ring(m.x, m.y, '#ffd45e', 30);
      Audio.play('summon');
    }
  },
  blackhole: {
    name: '黑洞', icon: '🕳️', mana: 40, cd: 12, color: '#b46ee0',
    desc: '在游標處生成黑洞，吸引敵人並持續造成虛空傷害。',
    cast(p, tx, ty, game) {
      game.hazards.push({
        kind: 'blackhole', x: tx, y: ty, r: 170, t: 3.2, tick: 0,
        dmg: p.wpnDmg * 0.7 * p.damageMultiplier(), color: '#b46ee0'
      });
      Audio.play('cast');
    }
  }
};

/* 技能顯示順序：玩家取得技能後依序填入 Q E R */
const SKILL_KEYS = ['Q', 'E', 'R'];
