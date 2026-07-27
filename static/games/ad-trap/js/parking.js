/* ===========================================================
   停車場大逃殺 — Parking Jam
   點一台車，它就往車頭方向開出去。被擋住就開不動。
   =========================================================== */
'use strict';

const PARK = (() => {
  // 格數可以逐關變大（6×6 → 8×8），畫布大小維持差不多，每格自動縮小
  const PAD = 26;              // 邊框（出口道路）
  const BASE = 400;            // 畫布邊長基準
  let N = 6, TS = 58, W = BASE, H = BASE;
  function setSize(n) {
    N = n;
    TS = Math.floor((BASE - PAD * 2) / N);
    W = N * TS + PAD * 2; H = W;
  }

  // dir: 0=右 1=下 2=左 3=上
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
  const COLORS = ['#e2564a', '#4a9fe2', '#5fc98a', '#e2b04a', '#b47ae0', '#e07aa8', '#4ad8d8', '#c98a5a'];

  /* ---------- 關卡：car = [x, y, len, dir] ----------
     車身從 (x,y) 起，沿 dir 軸延伸 len 格（車頭在 dir 方向那端）  */
  const LEVELS = [
    { name: '第一關', cars: [[4, 2, 2, 2], [3, 4, 2, 3], [0, 4, 3, 3]] },
    { name: '第二關', cars: [[4, 4, 2, 3], [0, 4, 2, 0], [4, 0, 3, 2], [0, 1, 2, 3]] },
    { name: '第三關', cars: [[1, 1, 2, 1], [4, 5, 3, 3], [0, 4, 3, 0], [0, 5, 2, 0], [3, 0, 2, 0]] },
    { name: '第四關', cars: [[1, 5, 2, 2], [4, 4, 2, 3], [0, 2, 3, 1], [3, 3, 2, 2], [5, 0, 2, 2], [0, 0, 2, 1]] },
    { name: '第五關', cars: [[1, 0, 2, 1], [3, 1, 2, 0], [3, 3, 2, 3], [0, 4, 2, 0], [5, 0, 2, 1], [0, 2, 2, 1], [3, 5, 2, 3]] },
    { name: '第六關', cars: [[2, 5, 2, 0], [4, 5, 2, 3], [4, 0, 2, 0], [0, 1, 2, 0], [5, 4, 2, 3], [0, 3, 2, 3], [1, 4, 3, 0], [5, 2, 2, 3]] },
    // 以下由 scratchpad/parkgen3.js 隨機生成後篩選：只留下「每回合幾乎只有一台開得動」的盤面
    { name: '第七關', cars: [[5, 1, 2, 2], [2, 5, 2, 3], [4, 4, 2, 2], [5, 3, 2, 3], [0, 0, 3, 1], [2, 2, 2, 0]], blocks: [[3, 3]] },
    { name: '第八關', cars: [[3, 5, 3, 3], [5, 2, 3, 3], [4, 2, 2, 1], [1, 1, 2, 1], [3, 1, 2, 0], [0, 3, 3, 0], [5, 5, 2, 2]], blocks: [[4, 0], [0, 4]] },
    { name: '第九關', n: 7, cars: [[6, 0, 2, 1], [4, 2, 2, 3], [3, 0, 2, 0], [5, 4, 2, 0], [3, 6, 2, 3], [1, 2, 3, 0], [2, 4, 2, 3], [0, 6, 2, 0]], blocks: [[1, 1]] },
    { name: '第十關', n: 7, cars: [[1, 6, 3, 0], [4, 1, 3, 2], [2, 5, 2, 3], [1, 3, 2, 1], [4, 2, 3, 2], [1, 0, 3, 1], [5, 5, 2, 1], [5, 4, 2, 2], [6, 3, 2, 3]], blocks: [[5, 0], [6, 5], [3, 3]] },
    { name: '第十一關', n: 7, cars: [[4, 2, 2, 3], [4, 0, 2, 0], [6, 2, 2, 2], [2, 2, 2, 1], [4, 6, 2, 0], [0, 4, 2, 3], [2, 4, 2, 2], [1, 2, 2, 2], [6, 6, 2, 3], [0, 1, 3, 0]], blocks: [[4, 4], [5, 3]] },
    { name: '第十二關', n: 8, cars: [[1, 5, 2, 1], [0, 7, 2, 0], [7, 5, 2, 3], [3, 7, 2, 0], [6, 1, 2, 0], [6, 3, 2, 3], [7, 3, 2, 3], [1, 1, 2, 1], [4, 3, 2, 0], [7, 7, 2, 3], [4, 1, 2, 1]], blocks: [[2, 6], [5, 5]] },
    { name: '第十三關', n: 8, cars: [[0, 6, 2, 1], [3, 0, 3, 0], [6, 0, 2, 1], [7, 4, 2, 1], [2, 1, 3, 1], [1, 1, 2, 3], [2, 6, 2, 1], [7, 3, 3, 2], [4, 7, 2, 2], [7, 7, 2, 2], [1, 4, 2, 0], [1, 2, 2, 1]], blocks: [[3, 5], [4, 2], [4, 1], [5, 5]] },
    { name: '第十四關', n: 8, cars: [[4, 2, 2, 2], [2, 7, 2, 0], [0, 1, 3, 1], [2, 6, 3, 3], [7, 4, 3, 1], [4, 5, 2, 3], [2, 2, 3, 3], [4, 0, 2, 0], [4, 7, 2, 3], [3, 3, 2, 0], [0, 4, 2, 1], [7, 2, 3, 2], [7, 0, 2, 1]], blocks: [[1, 3], [1, 5], [3, 5]] },
    { name: '第十五關', n: 8, cars: [[3, 1, 3, 2], [0, 2, 2, 3], [7, 7, 3, 3], [4, 6, 3, 0], [7, 4, 2, 3], [1, 2, 2, 1], [2, 7, 3, 2], [3, 4, 3, 1], [5, 2, 2, 1], [6, 7, 3, 2], [6, 0, 2, 0], [7, 1, 2, 2], [6, 5, 2, 3], [0, 4, 3, 1]], blocks: [[4, 4], [3, 3], [5, 0], [3, 2], [2, 0]] },
    { name: '第十六關', n: 8, cars: [[0, 0, 2, 1], [4, 5, 2, 1], [6, 1, 2, 2], [3, 6, 2, 2], [2, 5, 3, 3], [6, 4, 3, 3], [7, 1, 2, 3], [3, 1, 2, 2], [3, 0, 2, 0], [2, 2, 3, 0], [3, 4, 3, 0], [5, 2, 2, 1], [0, 5, 2, 1], [1, 5, 2, 1], [1, 4, 2, 3]], blocks: [[7, 6], [2, 7], [3, 3], [6, 6]] }
  ];

  /* ---------- 狀態 ---------- */
  let lv = null, cars = [], state = 'playing', moves = 0, idx = 0;
  let cv = null, ctx = null, scale = 1, hover = -1, anim = [], shakeCar = -1, shakeT = 0, t = 0;
  let onEnd = null;

  function cells(c) {
    const out = [];
    for (let i = 0; i < c.len; i++) out.push([c.x + DX[c.dir] * i, c.y + DY[c.dir] * i]);
    return out;
  }
  function occupied(exclude) {
    const g = {};
    (lv.blocks || []).forEach(([x, y]) => g[y * N + x] = 'blk');   // 水泥柱：永遠不會移動
    cars.forEach((c, i) => {
      if (c.gone || i === exclude) return;
      cells(c).forEach(([x, y]) => g[y * N + x] = i);
    });
    return g;
  }
  // 車頭往前的路徑是否淨空（一路開出邊界）
  function canExit(i) {
    const c = cars[i];
    if (c.gone) return false;
    const g = occupied(i);
    const hx = c.x + DX[c.dir] * (c.len - 1), hy = c.y + DY[c.dir] * (c.len - 1);
    let x = hx + DX[c.dir], y = hy + DY[c.dir];
    while (x >= 0 && y >= 0 && x < N && y < N) {
      if (g[y * N + x] !== undefined) return false;
      x += DX[c.dir]; y += DY[c.dir];
    }
    return true;
  }

  function load(i) {
    idx = i;
    lv = LEVELS[i];
    setSize(lv.n || 6);
    cars = lv.cars.map((c, k) => ({ x: c[0], y: c[1], len: c[2], dir: c[3], color: COLORS[k % COLORS.length], gone: false, off: 0 }));
    state = 'playing'; moves = 0; anim = []; hover = -1; shakeCar = -1; shakeT = 0;
  }

  function tap(i) {
    if (state !== 'playing' || i < 0 || !cars[i] || cars[i].gone) return false;
    if (!canExit(i)) { shakeCar = i; shakeT = 0.45; return false; }
    cars[i].gone = true;
    moves++;
    anim.push({ car: cars[i], t: 0 });
    if (cars.every(c => c.gone)) {
      state = 'win';
      if (onEnd) setTimeout(() => onEnd('win', moves), 620);
    }
    return true;
  }

  function step(dt) {
    t += dt;
    if (shakeT > 0) shakeT -= dt; else shakeCar = -1;
    for (const a of anim) { a.t += dt; a.car.off = a.t * 16; }
    anim = anim.filter(a => a.t < 1.2);
  }

  /* ---------- 求解器（自動測試用）：BFS ---------- */
  function solvable(levelIndex) {
    const L = LEVELS[levelIndex];
    const N = L.n || 6;
    const start = L.cars.map(() => false);
    const key = a => a.map(v => v ? 1 : 0).join('');
    const seen = new Set([key(start)]);
    const q = [start];
    const cellsOf = c => {
      const out = [];
      for (let i = 0; i < c[2]; i++) out.push([c[0] + DX[c[3]] * i, c[1] + DY[c[3]] * i]);
      return out;
    };
    const canGo = (gone, i) => {
      const c = L.cars[i];
      const g = {};
      (L.blocks || []).forEach(([x, y]) => g[y * N + x] = 'blk');
      L.cars.forEach((o, k) => { if (!gone[k] && k !== i) cellsOf(o).forEach(([x, y]) => g[y * N + x] = k); });
      const hx = c[0] + DX[c[3]] * (c[2] - 1), hy = c[1] + DY[c[3]] * (c[2] - 1);
      let x = hx + DX[c[3]], y = hy + DY[c[3]];
      while (x >= 0 && y >= 0 && x < N && y < N) {
        if (g[y * N + x] !== undefined) return false;
        x += DX[c[3]]; y += DY[c[3]];
      }
      return true;
    };
    while (q.length) {
      const st = q.shift();
      if (st.every(Boolean)) return true;
      for (let i = 0; i < st.length; i++) {
        if (st[i] || !canGo(st, i)) continue;
        const nx = st.slice(); nx[i] = true;
        const k = key(nx);
        if (seen.has(k)) continue;
        seen.add(k); q.push(nx);
      }
    }
    return false;
  }
  // 檢查有無重疊 / 出界
  function validate(levelIndex) {
    const L = LEVELS[levelIndex];
    const N = L.n || 6;
    const used = {};
    for (const b of (L.blocks || [])) {
      if (b[0] < 0 || b[1] < 0 || b[0] >= N || b[1] >= N) return `柱子 ${JSON.stringify(b)} 出界`;
      const k = b[1] * N + b[0];
      if (used[k] !== undefined) return `柱子 ${JSON.stringify(b)} 重疊`;
      used[k] = b;
    }
    for (const c of L.cars) {
      if (c[2] < 2) return '車長至少 2';
      for (let i = 0; i < c[2]; i++) {
        const x = c[0] + DX[c[3]] * i, y = c[1] + DY[c[3]] * i;
        if (x < 0 || y < 0 || x >= N || y >= N) return `車 ${JSON.stringify(c)} 出界`;
        const k = y * N + x;
        if (used[k] !== undefined) return `車 ${JSON.stringify(c)} 與 ${JSON.stringify(used[k])} 重疊於 ${x},${y}`;
        used[k] = c;
      }
    }
    return null;
  }

  /* ---------- 繪圖 ---------- */
  function fit() {
    const wrap = cv.parentElement;
    const avail = Math.min(wrap.clientWidth - 12, wrap.clientHeight - 12);
    scale = avail / W;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * scale * dpr);
    cv.height = Math.round(H * scale * dpr);
    cv.style.width = Math.round(W * scale) + 'px';
    cv.style.height = Math.round(H * scale) + 'px';
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  function draw() {
    if (!lv || !ctx) return;
    ctx.clearRect(0, 0, W, H);
    // 外圈道路
    ctx.fillStyle = '#232f3a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.setLineDash([7, 9]); ctx.lineWidth = 2;
    ctx.strokeRect(PAD / 2, PAD / 2, W - PAD, H - PAD);
    ctx.setLineDash([]);
    // 停車格
    ctx.fillStyle = '#16202a';
    ctx.fillRect(PAD, PAD, N * TS, N * TS);
    ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD + i * TS, PAD); ctx.lineTo(PAD + i * TS, PAD + N * TS); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + i * TS); ctx.lineTo(PAD + N * TS, PAD + i * TS); ctx.stroke();
    }
    // 水泥柱
    (lv.blocks || []).forEach(([x, y]) => {
      const px = PAD + x * TS + 5, py = PAD + y * TS + 5, s = TS - 10;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      round(px + 2, py + 4, s, s, 6); ctx.fill();
      const g = ctx.createLinearGradient(px, py, px, py + s);
      g.addColorStop(0, '#6b7683'); g.addColorStop(1, '#3d4650');
      ctx.fillStyle = g;
      round(px, py, s, s, 6); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(px + 4, py + s * i / 3); ctx.lineTo(px + s - 4, py + s * i / 3); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.font = 'bold 13px system-ui,sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('▧', px + s / 2, py + s / 2);
      ctx.textBaseline = 'alphabetic';
    });

    // 車
    cars.forEach((c, i) => {
      const blocked = !c.gone && !canExit(i);
      drawCar(c, i, blocked);
    });
  }

  function drawCar(c, i, blocked) {
    const dx = DX[c.dir], dy = DY[c.dir];
    let ox = 0, oy = 0;
    if (c.gone) { ox = dx * c.off * 26; oy = dy * c.off * 26; }
    if (i === shakeCar && shakeT > 0) {
      const s = Math.sin(shakeT * 60) * 4;
      ox += dx ? 0 : s; oy += dx ? s : 0;
      ox += dx * s * .4; oy += dy * s * .4;
    }
    const x0 = Math.min(c.x, c.x + dx * (c.len - 1)), y0 = Math.min(c.y, c.y + dy * (c.len - 1));
    const w = (dx ? c.len : 1) * TS, h = (dy ? c.len : 1) * TS;
    const px = PAD + x0 * TS + ox + 4, py = PAD + y0 * TS + oy + 4;
    const pw = w - 8, ph = h - 8;
    if (c.gone && Math.abs(ox) + Math.abs(oy) > W) return;

    ctx.save();
    if (c.gone) ctx.globalAlpha = Math.max(0, 1 - c.off * .8);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    round(px + 2, py + 4, pw, ph, 10); ctx.fill();
    // 車身
    const g = ctx.createLinearGradient(px, py, px, py + ph);
    g.addColorStop(0, c.color);
    g.addColorStop(1, shade(c.color, -40));
    ctx.fillStyle = g;
    round(px, py, pw, ph, 10); ctx.fill();
    // 車窗
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    if (dx) round(px + pw * .18, py + ph * .2, pw * .34, ph * .6, 5);
    else round(px + pw * .2, py + ph * .18, pw * .6, ph * .34, 5);
    ctx.fill();
    // 車頭箭頭
    const hx = px + pw / 2 + dx * (pw / 2 - 13), hy = py + ph / 2 + dy * (ph / 2 - 13);
    ctx.fillStyle = blocked ? '#ff8080' : 'rgba(255,255,255,.92)';
    ctx.beginPath();
    ctx.moveTo(hx + dx * 9, hy + dy * 9);
    ctx.lineTo(hx - dx * 5 - dy * 8, hy - dy * 5 - dx * 8);
    ctx.lineTo(hx - dx * 5 + dy * 8, hy - dy * 5 + dx * 8);
    ctx.closePath(); ctx.fill();
    if (blocked) {
      ctx.strokeStyle = 'rgba(255,110,110,.85)'; ctx.lineWidth = 2.5;
      round(px, py, pw, ph, 10); ctx.stroke();
    }
    ctx.restore();
  }
  function round(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* ---------- 輸入 ---------- */
  function carAt(vx, vy) {
    const gx = Math.floor((vx - PAD) / TS), gy = Math.floor((vy - PAD) / TS);
    if (gx < 0 || gy < 0 || gx >= N || gy >= N) return -1;
    for (let i = 0; i < cars.length; i++) {
      if (cars[i].gone) continue;
      if (cells(cars[i]).some(([x, y]) => x === gx && y === gy)) return i;
    }
    return -1;
  }
  function toVirtual(cx, cy) {
    const r = cv.getBoundingClientRect();
    return { x: (cx - r.left) / scale, y: (cy - r.top) / scale };
  }

  function init(canvas, endCb) {
    cv = canvas; ctx = cv.getContext('2d'); onEnd = endCb;
    cv.addEventListener('mousemove', e => {
      const v = toVirtual(e.clientX, e.clientY);
      hover = carAt(v.x, v.y);
      cv.style.cursor = hover >= 0 ? 'pointer' : 'default';
    });
    cv.addEventListener('click', e => {
      const v = toVirtual(e.clientX, e.clientY);
      tap(carAt(v.x, v.y));
    });
    cv.addEventListener('touchstart', e => {
      const t0 = e.touches[0];
      const v = toVirtual(t0.clientX, t0.clientY);
      tap(carAt(v.x, v.y));
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('resize', () => { if (cv.offsetParent) fit(); });
  }

  return {
    LEVELS, init, load, tap, step, draw, fit, solvable, validate, canExit,
    get state() { return state; },
    get moves() { return moves; },
    get index() { return idx; },
    get cars() { return cars; },
    get left() { return cars.filter(c => !c.gone).length; }
  };
})();
