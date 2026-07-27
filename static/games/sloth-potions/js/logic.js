/* ===========================================================
   樹懶法師的分裝魔藥 — 純邏輯層（沒有任何 DOM，可以直接在 Node 裡測）
   規則：
     - 每個瓶子容量 cap，裡面由下往上疊著顏色
     - 倒的規則：來源非空、目標沒滿、且目標是空的或最上層同色
       一次倒的是「最上層連續同色的一整段」，倒到目標裝滿為止
     - 一瓶裝滿且整瓶同色 → 完成（畫面上會把它移走）
     - 全部瓶子都空或都完成 → 過關
   =========================================================== */
'use strict';

const SORT = (() => {

  /* ---------- 可重現亂數 ---------- */
  function rngFrom(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- 基本操作 ---------- */
  // 最上層連續同色的那一段
  function topRun(t) {
    if (!t.length) return null;
    const c = t[t.length - 1];
    let n = 1;
    while (n < t.length && t[t.length - 1 - n] === c) n++;
    return { color: c, count: n };
  }
  function isComplete(t, cap) {
    return t.length === cap && t[0] === t[t.length - 1] && t.every(v => v === t[0]);
  }
  function isMono(t) {
    return t.length > 0 && t.every(v => v === t[0]);
  }
  // 這一步合法嗎？（整瓶同色倒進空瓶沒有任何進展，直接視為不合法）
  function canPour(tubes, cap, a, b) {
    if (a === b) return false;
    const A = tubes[a], B = tubes[b];
    if (!A || !B) return false;
    if (!A.length || B.length >= cap) return false;
    if (isComplete(A, cap)) return false;
    if (B.length && B[B.length - 1] !== A[A.length - 1]) return false;
    if (!B.length && isMono(A)) return false;
    return true;
  }
  function pour(tubes, cap, a, b) {
    const r = topRun(tubes[a]);
    const n = Math.min(r.count, cap - tubes[b].length);
    const A = tubes[a].slice(0, tubes[a].length - n);
    const B = tubes[b].concat(new Array(n).fill(r.color));
    const out = tubes.slice();
    out[a] = A; out[b] = B;
    return { tubes: out, moved: n, color: r.color };
  }
  function isDone(tubes, cap) {
    return tubes.every(t => t.length === 0 || isComplete(t, cap));
  }
  // 一樣的瓶子、空瓶彼此可互換，排序後當作同一個狀態
  function key(tubes) {
    const a = new Array(tubes.length);
    for (let i = 0; i < tubes.length; i++) a[i] = tubes[i].join(',');
    a.sort();
    return a.join('|');
  }
  function clone(tubes) { return tubes.map(t => t.slice()); }

  /* ---------- 求解器：DFS ＋ 狀態記憶 ＋ 走法排序 ---------- */
  function moves(tubes, cap) {
    const out = [];
    const n = tubes.length;
    for (let a = 0; a < n; a++) {
      if (!tubes[a].length || isComplete(tubes[a], cap)) continue;
      const ra = topRun(tubes[a]);
      const monoA = isMono(tubes[a]);
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        const B = tubes[b];
        if (B.length >= cap) continue;
        if (B.length && B[B.length - 1] !== ra.color) continue;
        if (!B.length && monoA) continue;
        // 評分：能直接把 b 裝滿最好；倒進非空瓶（合併）優於倒進空瓶
        const fits = Math.min(ra.count, cap - B.length);
        let score = 0;
        if (B.length && B.length + fits === cap && isMono(B)) score += 100;  // 這一步完成一瓶
        if (B.length) score += 20 + fits;                                     // 合併
        else score += 1;                                                      // 佔用空瓶，最不優先
        if (ra.count === fits) score += 5;                                    // 整段倒得完
        if (monoA) score -= 30;
        out.push({ a, b, score });
      }
    }
    out.sort((x, y) => y.score - x.score);
    return out;
  }

  // 一律回傳 { path, nodes, hitLimit }
  //   path 是陣列 → 有解；path 是 null 且 hitLimit=false → 真的無解；
  //   path 是 null 且 hitLimit=true → 只是想太久放棄了（不能當成無解）
  function solve(tubes0, cap, opts) {
    opts = opts || {};
    const nodeLimit = opts.nodeLimit || 300000;
    const maxDepth = opts.maxDepth || 220;
    const seen = new Set();
    const path = [];
    let nodes = 0, hitLimit = false;

    function dfs(tubes, depth) {
      if (isDone(tubes, cap)) return true;
      if (depth >= maxDepth) return false;
      if (nodes >= nodeLimit) { hitLimit = true; return false; }
      const k = key(tubes);
      if (seen.has(k)) return false;
      seen.add(k);
      const ms = moves(tubes, cap);
      for (const m of ms) {
        nodes++;
        if (nodes >= nodeLimit) { hitLimit = true; return false; }
        const nx = pour(tubes, cap, m.a, m.b).tubes;
        path.push([m.a, m.b]);
        if (dfs(nx, depth + 1)) return true;
        path.pop();
      }
      return false;
    }

    const ok = dfs(clone(tubes0), 0);
    return { path: ok ? path.slice() : null, nodes, hitLimit };
  }

  // 只要下一步（提示用）
  function hint(tubes, cap) {
    const s = solve(tubes, cap, { nodeLimit: 120000 });
    return s.path && s.path.length ? s.path[0] : null;
  }

  // 「這盤還救得回來嗎」：只有在確定搜完整棵樹都沒解時才回 false
  function isDeadEnd(tubes, cap) {
    const s = solve(tubes, cap, { nodeLimit: 50000 });
    return !s.path && !s.hitLimit;
  }

  /* ---------- 關卡產生 ---------- */
  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  // cfg: { colors, empties, cap }
  // 先隨機灌，再用求解器驗證；驗不過就重抽。回傳 { tubes, cap, par, tries }
  function generate(cfg, seed) {
    const cap = cfg.cap || 4;
    const rnd = rngFrom(seed >>> 0);
    let tries = 0;
    for (; tries < 600; tries++) {
      const pool = [];
      for (let c = 0; c < cfg.colors; c++) for (let i = 0; i < cap; i++) pool.push(c);
      shuffle(pool, rnd);
      const tubes = [];
      for (let i = 0; i < cfg.colors; i++) tubes.push(pool.slice(i * cap, (i + 1) * cap));
      for (let i = 0; i < cfg.empties; i++) tubes.push([]);
      // 一開始就有整瓶同色的話太送分，重抽
      if (tubes.some(t => t.length && isMono(t))) continue;
      // 節點上限刻意壓低：要花超過這個量才解得開的盤面通常是「歪到很難玩」的，
      // 重抽一張比較快，也避免產生關卡時卡住畫面
      const s = solve(tubes, cap, { nodeLimit: 40000 });
      if (s.path) return { tubes, cap, par: s.path.length, tries: tries + 1, seed };
    }
    return null;
  }

  // 無盡／關卡模式共用的難度曲線
  // 空瓶固定 2 個：實測只給 1 個空瓶時，隨機盤面幾乎都無解（8 色 0%、12 色更慘），
  // 產生器會卡在重抽迴圈裡，而且對玩家也太兇。難度改成往「顏色數」與「瓶子深度」加。
  function difficulty(level) {
    const n = Math.max(1, level | 0);
    const empties = 2;
    if (n <= 22) return { colors: Math.min(3 + Math.floor((n - 1) / 2), 13), empties, cap: 4 };
    if (n <= 34) return { colors: Math.min(11 + Math.floor((n - 23) / 2), 13), empties, cap: 5 };
    if (n <= 44) return { colors: Math.min(11 + Math.floor((n - 35) / 2), 13), empties, cap: 6 };
    // 之後在最高難度附近循環，換個手感：每五關穿插一關比較淺的
    const k = (n - 45) % 5;
    if (k === 0) return { colors: 14, empties, cap: 4 };
    if (k === 1 || k === 3) return { colors: 14, empties, cap: 5 };
    return { colors: 13, empties, cap: 6 };
  }

  function levelSeed(mode, level, salt) {
    return hashSeed(`${mode}#${level}#${salt || 0}`);
  }

  return {
    rngFrom, hashSeed,
    topRun, isComplete, isMono, canPour, pour, isDone, key, clone,
    moves, solve, hint, isDeadEnd, generate, difficulty, levelSeed
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = SORT;
