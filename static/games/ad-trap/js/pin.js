/* ===========================================================
   拔針救法師 — Pin Pull
   廣告裡最經典的那個：拔錯針，主角就被岩漿淹死
   =========================================================== */
'use strict';

const PIN = (() => {
  const W = 360, H = 560;      // 虛擬座標
  const R = 6.8;               // 球半徑
  const GRAV = 1150;
  const SUB = 6;               // 每幀子步數

  /* ---------- 關卡工具 ---------- */
  // 產生球陣列
  function grid(x, y, cols, rows, sp) {
    const out = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push([x + c * sp, y + r * sp]);
    return out;
  }
  const FLOOR = [0, 545, W, 15];
  const LWALL = [0, 0, 10, 560], RWALL = [350, 0, 10, 560];

  /* ---------- 關卡 ----------
     rects: 靜態方塊  segs: 靜態斜坡
     pins:  { kind:'rect'|'seg', ... , dir:[dx,dy] 拔出方向 }
     solution: 正確拔針順序（用於自動測試）                     */
  const LEVELS = [
    { // 1 教學
      name: '第一關 · 熱身',
      hint: '點那根針，把金幣放下來給法師。',
      rects: [FLOOR, LWALL, RWALL, [128, 170, 10, 165], [222, 170, 10, 165]],
      segs: [],
      pins: [{ kind: 'rect', x: 138, y: 335, w: 84, h: 10, dir: [-1, 0] }],
      gold: grid(152, 200, 3, 5, 24),
      lava: [],
      hero: [180, 520],
      goal: [120, 455, 120, 90],
      solution: [0]
    },
    { // 2 順序
      name: '第二關 · 順序',
      hint: '上面那桶是岩漿，而法師就站在正下方。',
      rects: [FLOOR, LWALL, RWALL, [128, 40, 10, 300], [222, 40, 10, 300]],
      segs: [],
      pins: [
        { kind: 'rect', x: 138, y: 150, w: 84, h: 10, dir: [-1, 0] },   // 0 岩漿閘
        { kind: 'rect', x: 138, y: 340, w: 84, h: 10, dir: [1, 0] }     // 1 金幣閘
      ],
      lava: grid(152, 70, 3, 3, 24),
      gold: grid(152, 185, 3, 5, 24),
      hero: [180, 520],
      goal: [120, 455, 120, 90],
      solution: [1]
    },
    { // 3 分流板
      name: '第三關 · 分流板',
      hint: '斜的那塊也是針。它現在把東西導去左邊的坑——拔掉之後，路就通往法師了。',
      rects: [FLOOR, LWALL, RWALL,
        [50, 30, 10, 230], [150, 30, 10, 230],
        [200, 30, 10, 230], [300, 30, 10, 230],
        [95, 470, 10, 80]],
      segs: [[110, 410, 300, 470]],
      pins: [
        { kind: 'rect', x: 60, y: 250, w: 90, h: 10, dir: [-1, 0] },      // 0 岩漿閘
        { kind: 'rect', x: 210, y: 250, w: 90, h: 10, dir: [1, 0] },      // 1 金幣閘
        { kind: 'seg', x1: 320, y1: 300, x2: 40, y2: 380, dir: [0, 1] }   // 2 分流板
      ],
      lava: grid(74, 90, 3, 4, 24),
      gold: grid(224, 90, 3, 4, 24),
      hero: [315, 520],
      goal: [255, 455, 95, 90],
      solution: [0, 2, 1]
    },
    { // 4 三口井
      name: '第四關 · 三口井',
      hint: '兩桶岩漿、一桶金幣，只有一塊分流板。順序自己想。',
      rects: [FLOOR, LWALL, RWALL,
        [30, 30, 10, 230], [120, 30, 10, 230],
        [140, 30, 10, 230], [230, 30, 10, 230],
        [250, 30, 10, 230], [330, 30, 10, 230],
        [85, 470, 10, 80]],
      segs: [[100, 415, 300, 470]],
      pins: [
        { kind: 'rect', x: 40, y: 250, w: 80, h: 10, dir: [-1, 0] },      // 0 岩漿 A
        { kind: 'rect', x: 150, y: 250, w: 80, h: 10, dir: [-1, 0] },     // 1 岩漿 B
        { kind: 'rect', x: 260, y: 250, w: 70, h: 10, dir: [1, 0] },      // 2 金幣
        { kind: 'seg', x1: 340, y1: 300, x2: 30, y2: 385, dir: [0, 1] }   // 3 分流板
      ],
      lava: grid(54, 90, 3, 3, 26).concat(grid(164, 90, 3, 3, 26)),
      gold: grid(274, 90, 3, 4, 21),
      hero: [320, 520],
      goal: [250, 455, 100, 90],
      solution: [0, 1, 3, 2]
    },
    { // 5 反過來
      name: '第五關 · 反過來',
      hint: '金幣在上面、岩漿在下面。它們共用同一條路。',
      rects: [FLOOR, LWALL, RWALL,
        [130, 30, 10, 260], [230, 30, 10, 260],
        [100, 470, 10, 80]],
      segs: [[115, 420, 300, 485]],
      pins: [
        { kind: 'rect', x: 140, y: 130, w: 90, h: 10, dir: [1, 0] },      // 0 金幣閘
        { kind: 'rect', x: 140, y: 240, w: 90, h: 10, dir: [1, 0] },      // 1 岩漿閘
        { kind: 'seg', x1: 250, y1: 320, x2: 40, y2: 395, dir: [0, 1] }   // 2 分流板
      ],
      gold: grid(154, 60, 3, 3, 24),
      lava: grid(154, 170, 3, 3, 24),
      hero: [320, 525],
      goal: [252, 440, 98, 105],
      solution: [1, 2, 0]
    },
    { // 6 深淵
      name: '第六關 · 深淵',
      hint: '右下角那個洞是深淵。岩漿掉進去沒關係——金幣掉進去就永遠沒了。',
      rects: [FLOOR, LWALL, RWALL,
        [60, 30, 10, 230], [160, 30, 10, 230],     // 金幣井
        [210, 30, 10, 230], [310, 30, 10, 230],    // 岩漿井
        [255, 470, 10, 80]],                       // 深淵的牆
      segs: [[250, 410, 60, 470]],                 // 固定斜坡：往左送到法師
      pins: [
        { kind: 'rect', x: 70, y: 250, w: 90, h: 10, dir: [1, 0] },        // 0 金幣閘
        { kind: 'rect', x: 220, y: 250, w: 90, h: 10, dir: [-1, 0] },      // 1 岩漿閘
        { kind: 'seg', x1: 40, y1: 300, x2: 320, y2: 380, dir: [0, 1] }    // 2 分流板（往右倒進深淵）
      ],
      gold: grid(84, 90, 3, 4, 24),
      lava: grid(234, 90, 3, 4, 24),
      hero: [45, 520],
      goal: [10, 455, 95, 90],
      dead: [[265, 478, 85, 67]],
      solution: [1, 2, 0]
    },
    { // 7 疊在一起
      name: '第七關 · 疊在一起',
      hint: '金幣就疊在岩漿正上方。先把下面的倒乾淨，上面的才輪得到。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 300], [210, 30, 10, 300],    // 中央井 y30..330
        [115, 430, 10, 120]],                      // 深淵的牆
      segs: [[140, 455, 330, 515]],                // 固定斜坡：往右送到法師
      pins: [
        { kind: 'rect', x: 160, y: 150, w: 50, h: 10, dir: [-1, 0] },      // 0 中間閘（金幣的地板）
        { kind: 'rect', x: 160, y: 320, w: 50, h: 10, dir: [1, 0] },       // 1 井底閘
        { kind: 'seg', x1: 330, y1: 365, x2: 40, y2: 415, dir: [0, 1] }    // 2 分流板（往左倒進深淵）
      ],
      gold: grid(170, 62, 2, 4, 24),
      lava: grid(170, 195, 2, 2, 26),
      hero: [285, 520],
      goal: [215, 450, 135, 95],
      dead: [[10, 440, 105, 105]],
      solution: [1, 2, 0]
    },
    { // 8 別動最上面那根
      name: '第八關 · 別動最上面那根',
      hint: '井裡由上到下是：岩漿、金幣、岩漿。有一根針，你最好一輩子都別碰它。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 300], [210, 30, 10, 300],
        [115, 430, 10, 120]],
      segs: [[140, 455, 330, 515]],
      pins: [
        { kind: 'rect', x: 160, y: 110, w: 50, h: 10, dir: [-1, 0] },      // 0 最上面（絕對不能拔）
        { kind: 'rect', x: 160, y: 230, w: 50, h: 10, dir: [1, 0] },       // 1 金幣閘
        { kind: 'rect', x: 160, y: 320, w: 50, h: 10, dir: [-1, 0] },      // 2 井底閘
        { kind: 'seg', x1: 330, y1: 365, x2: 40, y2: 415, dir: [0, 1] }    // 3 分流板
      ],
      gold: grid(170, 142, 2, 3, 24),
      lava: grid(170, 52, 2, 2, 24).concat(grid(170, 258, 2, 2, 26)),
      hero: [285, 520],
      goal: [215, 450, 135, 95],
      dead: [[10, 440, 105, 105]],
      solution: [2, 3, 1]
    },
    { // 9 兩座深淵
      name: '第九關 · 兩座深淵',
      hint: '左右各一座深淵，中間才是法師。兩塊斜板要一塊一塊拆，順序錯了就全毀。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 220], [210, 30, 10, 220],    // 中央井 y30..250
        [95, 430, 10, 120], [255, 430, 10, 120]],  // 兩座深淵的牆
      segs: [],
      pins: [
        { kind: 'rect', x: 160, y: 115, w: 50, h: 10, dir: [-1, 0] },       // 0 金幣閘
        { kind: 'rect', x: 160, y: 180, w: 50, h: 10, dir: [1, 0] },        // 1 岩漿 B 閘
        { kind: 'rect', x: 160, y: 250, w: 50, h: 10, dir: [-1, 0] },       // 2 井底閘（岩漿 A）
        { kind: 'seg', x1: 250, y1: 290, x2: 40, y2: 330, dir: [0, 1] },    // 3 第一層（往左）
        { kind: 'seg', x1: 110, y1: 380, x2: 320, y2: 420, dir: [0, 1] }    // 4 第二層（往右）
      ],
      gold: grid(170, 47, 2, 3, 24),
      lava: grid(170, 137, 2, 2, 24).concat(grid(170, 202, 2, 2, 24)),
      hero: [180, 520],
      goal: [108, 450, 145, 95],
      dead: [[10, 440, 85, 105], [265, 440, 85, 105]],
      solution: [2, 3, 1, 4, 0]
    },
    { // 10 那根不要碰
      name: '第十關 · 那根不要碰',
      hint: '有一根針的正下方，就是法師的頭。廣告當然不會提這件事。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 240], [210, 30, 10, 240],
        [115, 430, 10, 120]],
      segs: [[140, 455, 330, 515]],
      pins: [
        { kind: 'rect', x: 160, y: 150, w: 50, h: 10, dir: [-1, 0] },       // 0 金幣閘
        { kind: 'rect', x: 160, y: 260, w: 50, h: 10, dir: [1, 0] },        // 1 井底閘（岩漿）
        { kind: 'seg', x1: 330, y1: 320, x2: 40, y2: 370, dir: [0, 1] },    // 2 分流板
        { kind: 'rect', x: 250, y: 400, w: 80, h: 10, dir: [1, 0] }         // 3 誘餌：法師頭上的岩漿
      ],
      gold: grid(170, 62, 2, 4, 24),
      lava: grid(170, 190, 2, 2, 26).concat(grid(262, 390, 3, 1, 24)),
      hero: [285, 520],
      goal: [215, 450, 135, 95],
      dead: [[10, 440, 105, 105]],
      solution: [1, 2, 0]
    },
    { // 11 左右開弓
      name: '第十一關 · 左右開弓',
      hint: '兩口井，兩份金幣，兩桶岩漿——但只有一塊分流板。它翻過去就再也翻不回來。',
      rects: [FLOOR, LWALL, RWALL,
        [120, 30, 10, 230], [200, 30, 10, 230],    // 左井 y30..260
        [240, 30, 10, 230], [320, 30, 10, 230],    // 右井
        [95, 380, 10, 170]],                       // 深淵的牆
      segs: [[110, 470, 330, 510]],                // 固定斜坡：往右送到法師
      pins: [
        { kind: 'rect', x: 130, y: 110, w: 70, h: 10, dir: [-1, 0] },       // 0 左井中閘
        { kind: 'rect', x: 130, y: 250, w: 70, h: 10, dir: [-1, 0] },       // 1 左井底閘
        { kind: 'rect', x: 250, y: 110, w: 70, h: 10, dir: [1, 0] },        // 2 右井中閘
        { kind: 'rect', x: 250, y: 250, w: 70, h: 10, dir: [1, 0] },        // 3 右井底閘
        { kind: 'seg', x1: 340, y1: 290, x2: 55, y2: 345, dir: [0, 1] }     // 4 分流板（往左倒進深淵）
      ],
      gold: grid(142, 62, 3, 2, 24).concat(grid(262, 62, 3, 2, 24)),
      lava: grid(142, 215, 3, 2, 24).concat(grid(262, 215, 3, 2, 24)),
      hero: [285, 520],
      goal: [215, 450, 135, 95],
      dead: [[10, 390, 85, 155]],
      solution: [1, 3, 4, 0, 2]
    },
    { // 12 兩桶都要倒
      name: '第十二關 · 兩桶都要倒',
      hint: '金幣底下壓著兩桶岩漿。分流板只能翻一次，所以兩桶都得先出去。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 300], [210, 30, 10, 300],
        [265, 430, 10, 120]],                      // 深淵的牆（右）
      segs: [[245, 455, 60, 515]],                 // 固定斜坡：往左送到法師
      pins: [
        { kind: 'rect', x: 160, y: 110, w: 50, h: 10, dir: [-1, 0] },       // 0 金幣閘
        { kind: 'rect', x: 160, y: 215, w: 50, h: 10, dir: [1, 0] },        // 1 岩漿 B 閘
        { kind: 'rect', x: 160, y: 320, w: 50, h: 10, dir: [-1, 0] },       // 2 井底閘（岩漿 A）
        { kind: 'seg', x1: 30, y1: 370, x2: 330, y2: 420, dir: [0, 1] }     // 3 分流板（往右倒進深淵）
      ],
      gold: grid(170, 42, 2, 3, 24),
      lava: grid(170, 140, 2, 2, 26).concat(grid(170, 250, 2, 2, 26)),
      hero: [70, 520],
      goal: [10, 450, 145, 95],
      dead: [[275, 440, 75, 105]],
      solution: [2, 1, 3, 0]
    },
    { // 13 最後一根針
      name: '第十三關 · 最後一根針',
      hint: '兩座深淵、三道閘、一根絕對不能碰的針。這關廣告是不敢演的。',
      rects: [FLOOR, LWALL, RWALL,
        [150, 30, 10, 220], [210, 30, 10, 220],
        [95, 430, 10, 120], [255, 430, 10, 120]],
      segs: [],
      pins: [
        { kind: 'rect', x: 160, y: 115, w: 50, h: 10, dir: [-1, 0] },       // 0 金幣閘
        { kind: 'rect', x: 160, y: 180, w: 50, h: 10, dir: [1, 0] },        // 1 岩漿 B 閘
        { kind: 'rect', x: 160, y: 250, w: 50, h: 10, dir: [-1, 0] },       // 2 井底閘（岩漿 A）
        { kind: 'seg', x1: 250, y1: 290, x2: 40, y2: 330, dir: [0, 1] },    // 3 第一層（往左）
        { kind: 'seg', x1: 110, y1: 355, x2: 320, y2: 395, dir: [0, 1] },   // 4 第二層（往右）
        { kind: 'rect', x: 110, y: 425, w: 45, h: 10, dir: [-1, 0] }        // 5 誘餌：法師旁邊的岩漿
      ],
      gold: grid(170, 47, 2, 3, 24),
      lava: grid(170, 137, 2, 2, 24).concat(grid(170, 202, 2, 2, 24))
        .concat([[120, 415], [142, 415]]),
      hero: [180, 520],
      goal: [108, 450, 145, 95],
      dead: [[10, 440, 85, 105], [265, 440, 85, 105]],
      solution: [2, 3, 1, 4, 0]
    },
    { // 14 廣告梗：看起來很難，其實一根
      name: '第十四關 · 99% 的人卡在這關',
      hint: '廣告是這樣寫的。畫面上有五根針會讓法師當場去世，還有一根不會。祝好運。',
      rects: [FLOOR, LWALL, RWALL,
        // 五個吊籃的隔板
        [55, 340, 10, 60], [105, 340, 10, 60], [155, 340, 10, 60],
        [205, 340, 10, 60], [255, 340, 10, 60], [295, 340, 10, 60],
        // 上面一堆看起來很重要、其實純裝飾的結構
        [40, 60, 10, 90], [120, 60, 10, 90], [230, 60, 10, 90], [310, 60, 10, 90],
        [40, 150, 90, 10], [230, 150, 90, 10],
        [90, 210, 10, 70], [260, 210, 10, 70],
        [20, 250, 70, 10], [270, 250, 70, 10]],
      segs: [[130, 190, 230, 215], [230, 215, 130, 240], [130, 240, 230, 265]],
      pins: [
        { kind: 'rect', x: 65, y: 400, w: 40, h: 10, dir: [-1, 0] },        // 0 岩漿
        { kind: 'rect', x: 115, y: 400, w: 40, h: 10, dir: [-1, 0] },       // 1 岩漿
        { kind: 'rect', x: 165, y: 400, w: 40, h: 10, dir: [1, 0] },        // 2 ← 金幣
        { kind: 'rect', x: 215, y: 400, w: 40, h: 10, dir: [1, 0] },        // 3 岩漿
        { kind: 'rect', x: 265, y: 400, w: 30, h: 10, dir: [1, 0] }         // 4 岩漿
      ],
      gold: [[173, 390], [197, 390], [173, 372], [197, 372]],
      lava: [[73, 390], [97, 390], [123, 390], [147, 390],
      [223, 390], [247, 390], [272, 390]],
      hero: [180, 520],
      goal: [60, 450, 240, 95],
      solution: [2]
    }
  ];

  /* ---------- 狀態 ---------- */
  let lv = null, balls = [], pins = [], state = 'playing', settleT = 0, sinceAction = 0;
  let cv = null, ctx = null, scale = 1, ox = 0, oy = 0, hoverPin = -1, time = 0;
  let onEnd = null, idx = 0;

  function load(i) {
    idx = i;
    lv = LEVELS[i];
    balls = [];
    lv.gold.forEach(p => balls.push({ x: p[0], y: p[1], px: p[0], py: p[1], vx: 0, vy: 0, t: 'gold' }));
    lv.lava.forEach(p => balls.push({ x: p[0], y: p[1], px: p[0], py: p[1], vx: 0, vy: 0, t: 'lava' }));
    pins = lv.pins.map(p => Object.assign({}, p, { pulled: false, anim: 0 }));
    state = 'playing'; settleT = 0; sinceAction = 0; time = 0;
  }

  function pull(i) {
    if (state !== 'playing') return false;
    const p = pins[i];
    if (!p || p.pulled) return false;
    p.pulled = true; p.anim = 1;
    sinceAction = 0; settleT = 0;
    return true;
  }

  /* ---------- 幾何 ---------- */
  function collideRect(b, r) {
    const cx = Math.max(r[0], Math.min(b.x, r[0] + r[2]));
    const cy = Math.max(r[1], Math.min(b.y, r[1] + r[3]));
    let dx = b.x - cx, dy = b.y - cy;
    let d2 = dx * dx + dy * dy;
    if (d2 > R * R) return;
    if (d2 > 1e-8) {
      const d = Math.sqrt(d2);
      const nx = dx / d, ny = dy / d, pen = R - d;
      b.x += nx * pen; b.y += ny * pen;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= vn * nx * 1.05; b.vy -= vn * ny * 1.05; }
      b.vx *= 0.94; b.vy *= 0.94;
    } else {
      // 圓心在方塊內：往最近的邊推出去
      const left = b.x - r[0], right = r[0] + r[2] - b.x;
      const top = b.y - r[1], bot = r[1] + r[3] - b.y;
      const m = Math.min(left, right, top, bot);
      if (m === left) { b.x = r[0] - R; b.vx = Math.min(0, b.vx); }
      else if (m === right) { b.x = r[0] + r[2] + R; b.vx = Math.max(0, b.vx); }
      else if (m === top) { b.y = r[1] - R; b.vy = Math.min(0, b.vy); }
      else { b.y = r[1] + r[3] + R; b.vy = Math.max(0, b.vy); }
    }
  }

  const SEG_T = 5;
  // 斜坡＝單向地板：球只會壓在上面滑下去，不會被擠穿
  function collideSeg(b, s) {
    const x1 = s[0], y1 = s[1], x2 = s[2], y2 = s[3];
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
    const rr = R + SEG_T;
    if (b.x < lo - rr || b.x > hi + rr) return;
    const t = Math.max(0, Math.min(1, (b.x - x1) / (x2 - x1 || 1e-6)));
    const lineY = y1 + (y2 - y1) * t;
    // 只在斜面上方一點點到下方 34 之間作用，避免抓到掉很遠的球
    if (b.y < lineY - rr || b.y > lineY + 34) return;
    // 法線（指向上方）
    let nx = -(y2 - y1), ny = (x2 - x1);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl; ny /= nl;
    if (ny > 0) { nx = -nx; ny = -ny; }
    b.y = lineY - rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) { b.vx -= vn * nx; b.vy -= vn * ny; }
    b.vx *= 0.997; b.vy *= 0.997;
  }

  function activeRects() {
    const out = lv.rects.slice();
    for (const p of pins) if (!p.pulled && p.kind === 'rect') out.push([p.x, p.y, p.w, p.h]);
    return out;
  }
  function activeSegs() {
    const out = lv.segs.slice();
    for (const p of pins) if (!p.pulled && p.kind === 'seg') out.push([p.x1, p.y1, p.x2, p.y2]);
    return out;
  }

  /* ---------- 物理 ---------- */
  function step(dt) {
    if (!lv) return;
    time += dt;
    for (const p of pins) if (p.anim > 0) p.anim = Math.max(0, p.anim - dt * 4);
    if (state !== 'playing') return;
    sinceAction += dt;

    const h = dt / SUB;
    const rects = activeRects(), segs = activeSegs();
    for (let s = 0; s < SUB; s++) {
      for (const b of balls) {
        b.vy += GRAV * h;
        b.x += b.vx * h; b.y += b.vy * h;
      }
      // 球與球
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          const a = balls[i], c = balls[j];
          let dx = c.x - a.x, dy = c.y - a.y;
          let d2 = dx * dx + dy * dy;
          const min = R * 2;
          if (d2 >= min * min || d2 < 1e-9) continue;
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d, pen = (min - d) * 0.5;
          a.x -= nx * pen; a.y -= ny * pen;
          c.x += nx * pen; c.y += ny * pen;
          const rvn = (c.vx - a.vx) * nx + (c.vy - a.vy) * ny;
          if (rvn < 0) {
            const im = rvn * 0.5;
            a.vx += im * nx; a.vy += im * ny;
            c.vx -= im * nx; c.vy -= im * ny;
          }
          a.vx *= 0.995; c.vx *= 0.995;
        }
      }
      for (let pass = 0; pass < 2; pass++)
        for (const b of balls) {
          for (const r of rects) collideRect(b, r);
          for (const sg of segs) collideSeg(b, sg);
        }
      for (const b of balls) {
        if (b.x < R) { b.x = R; b.vx = Math.abs(b.vx) * 0.3; }
        if (b.x > W - R) { b.x = W - R; b.vx = -Math.abs(b.vx) * 0.3; }
        if (b.y > H - R) { b.y = H - R; b.vy = -Math.abs(b.vy) * 0.2; }
      }
    }

    // 岩漿碰到法師、或掉進寶藏區 → 立刻失敗
    const hx = lv.hero[0], hy = lv.hero[1], g = lv.goal;
    for (const b of balls) {
      if (b.t !== 'lava') continue;
      if (Math.hypot(b.x - hx, b.y - hy) < 26) { finish('lose', 'lava'); return; }
      if (b.x > g[0] - 4 && b.x < g[0] + g[2] + 4 && b.y > g[1] - 4 && b.y < g[1] + g[3] + 4) {
        finish('lose', 'lava'); return;
      }
    }

    // 金幣掉進深淵 → 立刻失敗（岩漿掉進去反而是正解，所以只判金幣）
    if (lv.dead) {
      for (const b of balls) {
        if (b.t !== 'gold') continue;
        for (const d of lv.dead) {
          if (b.x > d[0] && b.x < d[0] + d[2] && b.y > d[1] && b.y < d[1] + d[3]) {
            finish('lose', 'lost'); return;
          }
        }
      }
    }

    // 靜止判定
    let maxV = 0;
    for (const b of balls) maxV = Math.max(maxV, Math.abs(b.vx) + Math.abs(b.vy));
    if (maxV < 30) settleT += dt; else settleT = 0;
    if (sinceAction > 0.9) evaluate(settleT > 0.5 || sinceAction > 2.2);
  }

  function inGoal(b) {
    const g = lv.goal;
    return b.x > g[0] && b.x < g[0] + g[2] && b.y > g[1] && b.y < g[1] + g[3];
  }

  function evaluate(settled) {
    if (!settled) return;                      // 一定要等東西停下來才判定
    const golds = balls.filter(b => b.t === 'gold');
    const got = golds.filter(inGoal).length;
    if (got === golds.length) { finish('win'); return; }
    // 針都拔完、東西也停了，卻沒收齊 → 這局結束
    if (settled && pins.every(p => p.pulled)) finish('lose', 'stuck', got + '/' + golds.length);
  }

  function finish(st, reason, extra) {
    if (state !== 'playing') return;
    state = st;
    if (onEnd) onEnd(st, reason, extra);
  }

  /* ---------- 給求解器用的存檔／回復 ----------
     關卡設計時用樹狀搜尋窮舉所有拔針順序，有這兩個就不必每個分支從頭重跑。 */
  function snapshot() {
    return {
      balls: balls.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, t: b.t })),
      pulled: pins.map(p => p.pulled),
      state, settleT, sinceAction, time
    };
  }
  function restore(s) {
    balls = s.balls.map(b => ({ x: b.x, y: b.y, px: b.x, py: b.y, vx: b.vx, vy: b.vy, t: b.t }));
    pins.forEach((p, i) => { p.pulled = s.pulled[i]; p.anim = 0; });
    state = s.state; settleT = s.settleT; sinceAction = s.sinceAction; time = s.time;
  }

  /* ---------- 繪圖 ---------- */
  function fit() {
    const wrap = cv.parentElement;
    const availW = wrap.clientWidth - 12, availH = wrap.clientHeight - 12;
    scale = Math.min(availW / W, availH / H);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * scale * dpr);
    cv.height = Math.round(H * scale * dpr);
    cv.style.width = Math.round(W * scale) + 'px';
    cv.style.height = Math.round(H * scale) + 'px';
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  function draw() {
    if (!lv || !ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#182430'); bg.addColorStop(1, '#0a1017');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,.018)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % W, y = (i * 173) % H;
      ctx.fillRect(x, y, 30, 3);
    }

    // 深淵（金幣掉進去就沒了）
    if (lv.dead) for (const d of lv.dead) {
      const dg = ctx.createLinearGradient(0, d[1], 0, d[1] + d[3]);
      dg.addColorStop(0, 'rgba(0,0,0,.15)'); dg.addColorStop(1, 'rgba(0,0,0,.75)');
      ctx.fillStyle = dg; ctx.fillRect(d[0], d[1], d[2], d[3]);
      ctx.strokeStyle = 'rgba(255,107,107,.35)';
      ctx.setLineDash([4, 6]); ctx.lineWidth = 1.5;
      ctx.strokeRect(d[0] + .5, d[1] + .5, d[2] - 1, d[3] - 1);
      ctx.setLineDash([]);
      ctx.font = '11px system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,107,107,.5)';
      ctx.textAlign = 'center';
      if (d[2] > 46) ctx.fillText('深淵', d[0] + d[2] / 2, d[1] + 16);
    }

    // 目標區
    const g = lv.goal;
    ctx.fillStyle = 'rgba(255,212,94,.07)';
    ctx.fillRect(g[0], g[1], g[2], g[3]);
    ctx.strokeStyle = 'rgba(255,212,94,.3)';
    ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
    ctx.strokeRect(g[0], g[1], g[2], g[3]);
    ctx.setLineDash([]);

    // 靜態石塊
    for (const r of lv.rects) drawRock(r);
    for (const s of lv.segs) drawSlope(s, '#4a5a68', '#63788a');

    // 針
    pins.forEach((p, i) => {
      const a = p.pulled ? p.anim : 1;
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = p.pulled ? a : 1;
      const off = p.pulled ? (1 - a) * 90 : 0;
      const dx = (p.dir[0] || 0) * off, dy = (p.dir[1] || 0) * off;
      ctx.translate(dx, dy);
      const hot = (i === hoverPin && !p.pulled);
      if (p.kind === 'rect') {
        ctx.fillStyle = hot ? '#ffd45e' : '#c9d4dd';
        roundRect(p.x, p.y, p.w, p.h, 4); ctx.fill();
        ctx.fillStyle = hot ? '#fff0b8' : '#eef4f8';
        ctx.fillRect(p.x + 2, p.y + 2, p.w - 4, 2.5);
        // 拉環
        const kx = p.dir[0] < 0 ? p.x : p.x + p.w;
        ctx.strokeStyle = hot ? '#ffd45e' : '#9fb0bd'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(kx + (p.dir[0] < 0 ? -9 : 9), p.y + p.h / 2, 7, 0, Math.PI * 2); ctx.stroke();
      } else {
        drawSlope([p.x1, p.y1, p.x2, p.y2], hot ? '#ffd45e' : '#c9d4dd', hot ? '#fff0b8' : '#eef4f8');
        ctx.strokeStyle = hot ? '#ffd45e' : '#9fb0bd'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x1, p.y1 - 10, 7, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    });

    // 球
    for (const b of balls) {
      if (b.t === 'gold') {
        ctx.fillStyle = '#8a6a1c';
        ctx.beginPath(); ctx.arc(b.x, b.y + 1, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd45e';
        ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(b.x - R * .3, b.y - R * .35, R * .3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(255,110,40,.28)';
        ctx.beginPath(); ctx.arc(b.x, b.y, R * 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath(); ctx.arc(b.x, b.y, R, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd08a';
        ctx.beginPath(); ctx.arc(b.x - R * .25, b.y - R * .3, R * .38, 0, Math.PI * 2); ctx.fill();
      }
    }

    // 法師
    const hx = lv.hero[0], hy = lv.hero[1];
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath(); ctx.ellipse(hx, hy + 17, 17, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.font = '38px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(state === 'lose' ? '💀' : (state === 'win' ? '🤩' : '🦥'), hx, hy);
    if (state !== 'lose') {
      ctx.font = '13px system-ui,sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillText(state === 'win' ? '' : 'z z Z', hx + 24, hy - 18);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawRock(r) {
    ctx.fillStyle = '#42556380'.slice(0, 7);
    ctx.fillRect(r[0], r[1], r[2], r[3]);
    ctx.fillStyle = '#5a7082';
    ctx.fillRect(r[0], r[1], r[2], Math.min(3, r[3]));
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.fillRect(r[0], r[1] + r[3] - 2, r[2], 2);
    // 石紋
    ctx.fillStyle = 'rgba(255,255,255,.045)';
    for (let y = r[1] + 6; y < r[1] + r[3] - 4; y += 14)
      ctx.fillRect(r[0] + 2, y, Math.max(2, r[2] - 4), 2);
  }
  function drawSlope(s, col, hi) {
    ctx.strokeStyle = col; ctx.lineWidth = SEG_T * 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); ctx.stroke();
    ctx.strokeStyle = hi; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(s[0], s[1] - 2); ctx.lineTo(s[2], s[3] - 2); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  /* ---------- 輸入 ---------- */
  function pinHit(vx, vy) {
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.pulled) continue;
      if (p.kind === 'rect') {
        const pad = 14;
        if (vx > p.x - pad && vx < p.x + p.w + pad && vy > p.y - pad && vy < p.y + p.h + pad) return i;
      } else {
        const ex = p.x2 - p.x1, ey = p.y2 - p.y1, L2 = ex * ex + ey * ey;
        let t = L2 > 0 ? ((vx - p.x1) * ex + (vy - p.y1) * ey) / L2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = p.x1 + ex * t, cy = p.y1 + ey * t;
        if (Math.hypot(vx - cx, vy - cy) < 16) return i;
      }
    }
    return -1;
  }
  function toVirtual(clientX, clientY) {
    const r = cv.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  }

  function init(canvas, endCb) {
    cv = canvas; ctx = cv.getContext('2d'); onEnd = endCb;
    cv.addEventListener('mousemove', e => {
      const v = toVirtual(e.clientX, e.clientY);
      hoverPin = pinHit(v.x, v.y);
      cv.style.cursor = hoverPin >= 0 ? 'pointer' : 'default';
    });
    cv.addEventListener('mouseleave', () => hoverPin = -1);
    cv.addEventListener('click', e => {
      const v = toVirtual(e.clientX, e.clientY);
      const i = pinHit(v.x, v.y);
      if (i >= 0) pull(i);
    });
    cv.addEventListener('touchstart', e => {
      const t = e.touches[0];
      const v = toVirtual(t.clientX, t.clientY);
      const i = pinHit(v.x, v.y);
      if (i >= 0) pull(i);
      e.preventDefault();
    }, { passive: false });
    window.addEventListener('resize', () => { if (cv.offsetParent) fit(); });
  }

  return {
    LEVELS, init, load, pull, step, draw, fit, snapshot, restore,
    get state() { return state; },
    get sinceAction() { return sinceAction; },
    get index() { return idx; },
    get level() { return lv; },
    get pins() { return pins; },
    get balls() { return balls; }
  };
})();
