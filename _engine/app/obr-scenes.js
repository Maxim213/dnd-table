// 🗺 Scenes for Owlbear (the DM, online only — index.html loads it after online.js).
//  • a battle-map maker: cave / dungeon / forest, drawn in the browser from a number ("seed": the same number = the same map)
//  • puts the monsters of a prepared fight on it (HIDDEN, in the far part of the map), the party's heroes at the entrance,
//    fog over everything (you reveal it), walls along the rock (Owlbear's dynamic fog can use them) — and uploads it into
//    your Owlbear as a new scene (Owlbear → Scenes). Token pictures: assets/tokens/*.png (made by _dev/make_tokens.ps1).
//  • 📁 a scenario folder: scenario.json + map pictures → monsters, prepared fights and scenes in one go (format: README)
//  • 🧙 the party's tokens onto the scene that is open now
(function (U) {
  if (!U || !window.ONLINE || !window.ONLINE.owlbear) return;
  const T = U.T, S = U.S, D = U.D, E = U.E, esc = U.esc;
  const OBR = window.OBR;
  const GD = 150; // Owlbear's scene grid: 150 px per square
  const tokURL = k => new URL('assets/tokens/' + k + '.png', document.baseURI).href;

  // ---------- which picture for which creature ----------
  const SPECIAL = [[/goblin|гоблин|hobgoblin|bugbear/i, 'goblin'], [/ogre|огр|orc|орк|troll|тролл/i, 'ogre'], [/zombie|зомби|ghoul|гул/i, 'zombie'], [/spider|паук/i, 'spider'],
    [/\brat\b|крыс/i, 'rat'], [/\bbat\b|летуч/i, 'bat'], [/snake|змея|serpent/i, 'snake'], [/bear|медвед/i, 'bear'], [/ghost|призрак|specter|wraith|banshee/i, 'ghost'],
    [/vampire|вампир/i, 'vampire'], [/mage|маг|priest|жрец|cultist|культист|warlock|колдун/i, 'mage'], [/wolf|волк|worg|ворг/i, 'wolf']];
  function monToken(m) {
    const s = (m.id || '') + ' ' + (m.name || '') + ' ' + (m.en || '');
    for (const [re, k] of SPECIAL) if (re.test(s)) return k;
    const ty = m.type || (D.MONSTERS[String(m.id || '').replace(/^srd:/, '')] || {}).type;
    return D.MON_TYPES && D.MON_TYPES[ty] ? ty : 'humanoid';
  }
  const heroToken = c => ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'].includes(c.classKey) ? c.classKey : 'hero';

  // ---------- the map maker ----------
  function rnd(seed) { let s = (Number(seed) >>> 0) || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const SIZES = { s: [20, 14], m: [28, 20], l: [36, 24] };
  // grid g[y][x]: 0 = rock / wall / tree (blocked), 1 = floor
  function carveCave(W, H, R) {
    let g;
    for (let tries = 0; tries < 12; tries++) {
      g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 0 : R() < 0.42 ? 0 : 1); }
      for (let it = 0; it < 5; it++) {
        const n = g.map(r => r.slice());
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { let walls = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!(dx || dy) ? false : g[y + dy][x + dx] === 0) walls++; n[y][x] = walls >= 5 ? 0 : walls <= 3 ? 1 : g[y][x]; }
        g = n;
      }
      keepBiggest(g, W, H);
      const floor = g.flat().filter(v => v).length; if (floor > W * H * 0.4) break;
    }
    return g;
  }
  function keepBiggest(g, W, H) {
    const id = g.map(r => r.map(() => 0)); let best = 0, bestN = 0, cur = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && !id[y][x]) {
      cur++; let n = 0; const st = [[x, y]]; id[y][x] = cur;
      while (st.length) { const [a, b] = st.pop(); n++; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const p = a + dx, q = b + dy; if (p >= 0 && q >= 0 && p < W && q < H && g[q][p] && !id[q][p]) { id[q][p] = cur; st.push([p, q]); } }); }
      if (n > bestN) { bestN = n; best = cur; }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && id[y][x] !== best) g[y][x] = 0;
  }
  function carveDungeon(W, H, R) {
    const g = []; for (let y = 0; y < H; y++) g.push(new Array(W).fill(0));
    const rooms = [];
    for (let t = 0; t < 200 && rooms.length < Math.round(W * H / 70); t++) {
      const w = 4 + Math.floor(R() * 5), h = 4 + Math.floor(R() * 4), x = 1 + Math.floor(R() * (W - w - 2)), y = 1 + Math.floor(R() * (H - h - 2));
      if (rooms.some(r => x < r.x + r.w + 1 && x + w + 1 > r.x && y < r.y + r.h + 1 && y + h + 1 > r.y)) continue;
      rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    }
    rooms.sort((a, b) => a.cx - b.cx);
    rooms.forEach(r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = 1; });
    const doors = [];
    for (let i = 1; i < rooms.length; i++) {
      const a = rooms[i - 1], b = rooms[i]; let x = a.cx, y = a.cy;
      const horizFirst = R() < 0.5;
      const step = (tx, ty) => { while (x !== tx) { x += Math.sign(tx - x); if (!g[y][x]) { g[y][x] = 2; } } while (y !== ty) { y += Math.sign(ty - y); if (!g[y][x]) { g[y][x] = 2; } } };
      if (horizFirst) { step(b.cx, a.cy); step(b.cx, b.cy); } else { step(a.cx, b.cy); step(b.cx, b.cy); }
    }
    // doors: corridor cells touching a room
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (g[y][x] === 2 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy][x + dx] === 1) && R() < 0.5) doors.push([x, y]);
    return { g, rooms, doors };
  }
  function carveForest(W, H, R) {
    const g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(1); }
    const trees = [];
    for (let c = 0; c < Math.round(W * H / 22); c++) { // clusters of trees
      const cx = Math.floor(R() * W), cy = Math.floor(R() * H), n = 2 + Math.floor(R() * 5);
      for (let i = 0; i < n; i++) { const x = Math.min(W - 1, Math.max(0, cx + Math.floor(R() * 4) - 2)), y = Math.min(H - 1, Math.max(0, cy + Math.floor(R() * 4) - 2)); g[y][x] = 0; }
    }
    // a winding path from left to right
    let y = Math.floor(H / 2); const path = [];
    for (let x = 0; x < W; x++) { if (R() < 0.35) y = Math.min(H - 2, Math.max(1, y + (R() < 0.5 ? -1 : 1))); [y - 1, y, y + 1].forEach(q => { if (q >= 0 && q < H) g[q][x] = 1; }); path.push([x, y]); }
    for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (!g[yy][x]) trees.push([x, yy]);
    return { g, path, trees };
  }
  // distances from the entrance (BFS over floor)
  function dist(g, W, H, sx, sy) {
    const d = g.map(r => r.map(() => -1)); const q = [[sx, sy]]; d[sy][sx] = 0;
    while (q.length) { const [x, y] = q.shift(); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && g[b][a] && d[b][a] < 0) { d[b][a] = d[y][x] + 1; q.push([a, b]); } }); }
    return d;
  }
  // free squares for the monsters: the far end, a few squares apart
  function farSpots(g, d, W, H, n, R) {
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && d[y][x] >= 0) cells.push([x, y, d[y][x]]);
    cells.sort((a, b) => b[2] - a[2]);
    const far = cells.slice(0, Math.max(n * 6, Math.ceil(cells.length * 0.25)));
    const out = [];
    for (const c of far.sort(() => R() - 0.5)) { if (out.length >= n) break; if (out.every(o => Math.max(Math.abs(o[0] - c[0]), Math.abs(o[1] - c[1])) >= 2)) out.push(c); }
    for (const c of far) { if (out.length >= n) break; if (!out.includes(c)) out.push(c); }
    return out.map(c => [c[0], c[1]]);
  }
  function nearSpots(g, d, W, H, n) {
    const cells = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] && d[y][x] >= 0) cells.push([x, y, d[y][x]]);
    return cells.sort((a, b) => a[2] - b[2]).slice(0, n).map(c => [c[0], c[1]]);
  }
  // walls between floor and rock (for Owlbear's dynamic fog), merged into long straight pieces, in squares
  function wallLines(g, W, H) {
    const L = []; const blk = (x, y) => x < 0 || y < 0 || x >= W || y >= H || !g[y][x];
    for (let y = 0; y <= H; y++) { let s = -1; for (let x = 0; x <= W; x++) { const e = x < W && ((blk(x, y - 1) !== blk(x, y)) && !(blk(x, y - 1) && blk(x, y))); if (e && s < 0) s = x; if (!e && s >= 0) { L.push([s, y, x, y]); s = -1; } } }
    for (let x = 0; x <= W; x++) { let s = -1; for (let y = 0; y <= H; y++) { const e = y < H && ((blk(x - 1, y) !== blk(x, y)) && !(blk(x - 1, y) && blk(x, y))); if (e && s < 0) s = y; if (!e && s >= 0) { L.push([x, s, x, y]); s = -1; } } }
    return L;
  }

  // ---------- drawing ----------
  function speckle(ctx, R, x0, y0, w, h, n, cols, rmax) { for (let i = 0; i < n; i++) { ctx.fillStyle = cols[Math.floor(R() * cols.length)]; ctx.globalAlpha = 0.08 + R() * 0.18; ctx.beginPath(); ctx.arc(x0 + R() * w, y0 + R() * h, 1 + R() * rmax, 0, 7); ctx.fill(); } ctx.globalAlpha = 1; }
  function glow(ctx, x, y, r, col) { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  function rock(ctx, x, y, r, R) { ctx.fillStyle = '#4a443d'; ctx.beginPath(); for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, rr = r * (0.75 + R() * 0.35); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.3, r * 0.35, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 2; ctx.stroke(); }
  function draw(map) {
    const { type, W, H, g, R, P } = map; const cv = document.createElement('canvas'); cv.width = W * P; cv.height = H * P; const ctx = cv.getContext('2d');
    if (type === 'forest') {
      ctx.fillStyle = '#3f5a2a'; ctx.fillRect(0, 0, cv.width, cv.height);
      speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 30, ['#5d7a35', '#2f4520', '#6f8a3f', '#4a6a2a'], P * 0.18);
      ctx.strokeStyle = '#7a6040'; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = P * 2.2; ctx.globalAlpha = 0.85; ctx.beginPath(); map.path.forEach(([x, y], i) => { const px = (x + 0.5) * P, py = (y + 0.5) * P; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); ctx.globalAlpha = 1;
      speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 3, ['#8a7050', '#5a4530'], P * 0.08);
      for (let i = 0; i < W * H / 25; i++) { const x = R() * cv.width, y = R() * cv.height; if (g[Math.floor(y / P)][Math.floor(x / P)]) rock(ctx, x, y, P * (0.12 + R() * 0.15), R); }
      map.trees.forEach(([x, y]) => { const cx = (x + 0.5) * P + (R() - 0.5) * P * 0.3, cy = (y + 0.5) * P + (R() - 0.5) * P * 0.3, r = P * (0.55 + R() * 0.3);
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.25, r, 0, 7); ctx.fill();
        const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, '#5f8f3a'); gr.addColorStop(1, '#1e3a18'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); });
      return cv;
    }
    if (type === 'dungeon') {
      ctx.fillStyle = '#121010'; ctx.fillRect(0, 0, cv.width, cv.height); speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 8, ['#2a2622', '#0a0808'], P * 0.2);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) {
        const v = 70 + Math.floor(R() * 25); ctx.fillStyle = 'rgb(' + v + ',' + (v - 6) + ',' + (v - 14) + ')'; ctx.fillRect(x * P, y * P, P, P);
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; ctx.strokeRect(x * P + 1, y * P + 1, P / 2 - 1, P / 2 - 1); ctx.strokeRect(x * P + P / 2, y * P + 1, P / 2 - 1, P / 2 - 1); ctx.strokeRect(x * P + 1, y * P + P / 2, P - 2, P / 2 - 1);
      }
      speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 6, ['#9a8a70', '#2a2018'], P * 0.06);
      // wall shading: a dark border where floor meets wall
      ctx.fillStyle = 'rgba(0,0,0,.55)'; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) { if (!g[y - 1] || !g[y - 1][x]) ctx.fillRect(x * P, y * P, P, P * 0.12); if (!g[y][x - 1]) ctx.fillRect(x * P, y * P, P * 0.08, P); }
      ctx.strokeStyle = '#3a342c'; ctx.lineWidth = P * 0.14; wallLines(g, W, H).forEach(([a, b, c, d]) => { ctx.beginPath(); ctx.moveTo(a * P, b * P); ctx.lineTo(c * P, d * P); ctx.stroke(); });
      map.doors.forEach(([x, y]) => { ctx.fillStyle = '#6a4424'; ctx.fillRect(x * P + P * 0.15, y * P + P * 0.15, P * 0.7, P * 0.7); ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 3; ctx.strokeRect(x * P + P * 0.15, y * P + P * 0.15, P * 0.7, P * 0.7); });
      map.rooms.forEach((r, i) => { // a little furniture and torches
        if (R() < 0.7) { const x = (r.x + 1 + R() * (r.w - 2)) * P, y = (r.y + 1 + R() * (r.h - 2)) * P; ctx.fillStyle = '#7a5a34'; ctx.beginPath(); ctx.arc(x, y, P * 0.32, 0, 7); ctx.fill(); ctx.strokeStyle = '#3a2614'; ctx.lineWidth = 4; ctx.stroke(); }
        if (R() < 0.6) { const x = (r.x + 0.2) * P, y = (r.y + 0.2) * P; ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x, y, P * 0.6, P * 0.6); ctx.strokeStyle = '#3a2614'; ctx.strokeRect(x, y, P * 0.6, P * 0.6); }
        glow(ctx, (r.x + r.w / 2) * P, (r.y + 0.2) * P, P * 1.8, 'rgba(255,170,70,.28)');
      });
      return cv;
    }
    // cave
    ctx.fillStyle = '#16120e'; ctx.fillRect(0, 0, cv.width, cv.height); speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 10, ['#2a241c', '#0c0a08', '#3a3024'], P * 0.25);
    // floor: overlapping blobs give round edges
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) { const v = 92 + Math.floor(R() * 18); ctx.fillStyle = 'rgb(' + v + ',' + (v - 14) + ',' + (v - 30) + ')'; ctx.beginPath(); ctx.arc((x + 0.5) * P, (y + 0.5) * P, P * 0.78, 0, 7); ctx.fill(); }
    speckle(ctx, R, 0, 0, cv.width, cv.height, W * H * 14, ['#a08a68', '#5a4a36', '#3a3024'], P * 0.1);
    // rock rim
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx])) {
      ctx.fillStyle = '#231d16'; ctx.beginPath(); ctx.arc((x + 0.5) * P + (R() - 0.5) * P * 0.2, (y + 0.5) * P + (R() - 0.5) * P * 0.2, P * 0.62, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (let i = 0; i < W * H / 14; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * H); if (g[y][x]) rock(ctx, (x + R()) * P, (y + R()) * P, P * (0.1 + R() * 0.16), R); }
    for (let i = 0; i < W * H / 60; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * H); if (g[y][x]) { ctx.fillStyle = 'rgba(70,110,140,.45)'; ctx.beginPath(); ctx.ellipse((x + 0.5) * P, (y + 0.5) * P, P * (0.4 + R() * 0.5), P * (0.25 + R() * 0.3), R() * 3, 0, 7); ctx.fill(); } }
    if (map.camp) { const [x, y] = map.camp; glow(ctx, (x + 0.5) * P, (y + 0.5) * P, P * 3, 'rgba(255,150,50,.35)'); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc((x + 0.5) * P, (y + 0.5) * P, P * 0.2, 0, 7); ctx.fill(); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo((x + 0.2) * P, (y + 0.8) * P); ctx.lineTo((x + 0.8) * P, (y + 0.2) * P); ctx.moveTo((x + 0.2) * P, (y + 0.2) * P); ctx.lineTo((x + 0.8) * P, (y + 0.8) * P); ctx.stroke(); }
    return cv;
  }
  // → { type, W, H, g, start: [x, y], spots(n), heroSpots(n), walls, canvas }
  U.makeMap = function (type, size, seed, P) {
    const [W, H] = SIZES[size] || SIZES.m; const R = rnd(seed); P = P || 80;
    let map = { type, W, H, R, P };
    if (type === 'dungeon') Object.assign(map, carveDungeon(W, H, R));
    else if (type === 'forest') Object.assign(map, carveForest(W, H, R));
    else map.g = carveCave(W, H, R);
    const g = map.g.map(r => r.map(v => (v ? 1 : 0))); map.g = g;
    let start = null; for (let x = 0; x < W && !start; x++) for (let y = 0; y < H; y++) if (g[y][x]) { start = [x, y]; break; }
    map.start = start || [1, 1]; const d = dist(g, W, H, map.start[0], map.start[1]);
    map.spots = n => farSpots(g, d, W, H, n, rnd(seed + 99));
    map.heroSpots = n => nearSpots(g, d, W, H, n);
    if (type === 'cave') { const s = farSpots(g, d, W, H, 1, rnd(seed + 5))[0]; map.camp = s; }
    map.walls = type === 'forest' ? [] : wallLines(g, W, H);
    map.canvas = draw(map);
    return map;
  };

  // ---------- build an Owlbear scene and upload it ----------
  const B = () => window.OBR_SDK;
  function tokenItem(name, key, cx, cy, hidden, meta) {
    return B().buildImage({ url: tokURL(key), mime: 'image/png', width: 256, height: 256 }, { dpi: 256, offset: { x: 128, y: 128 } })
      .position({ x: (cx + 0.5) * GD, y: (cy + 0.5) * GD }).layer('CHARACTER').name(name).plainText(name).visible(!hidden).locked(false).metadata(meta || {}).build();
  }
  // o: { name, mapBlob, cellPx, W, H, tokens: [{ name, key, x, y, hidden }], walls: [[x1, y1, x2, y2]…] (squares), fog }
  async function upload(o) {
    const b = B(); if (!b || !b.buildSceneUpload || !OBR || !OBR.assets) throw new Error(T('Owlbear does not allow uploads here.'));
    const base = b.buildImageUpload(o.mapBlob).dpi(o.cellPx).name(o.name).locked(true).build();
    const items = o.tokens.map(t => tokenItem(t.name, t.key, t.x, t.y, t.hidden));
    const walls = (o.walls || []).map(([x1, y1, x2, y2]) => b.buildWall().points([{ x: x1 * GD, y: y1 * GD }, { x: x2 * GD, y: y2 * GD }]).doubleSided(true).blocking(true).locked(true).build());
    const mk = withWalls => b.buildSceneUpload().name(o.name).baseMap(base).gridScale('5ft').gridType('SQUARE').gridMeasurement('CHEBYSHEV').fogFilled(!!o.fog).items(items.concat(withWalls ? walls : [])).build();
    try { await OBR.assets.uploadScenes([mk(true)]); return walls.length ? 'walls' : 'ok'; }
    catch (e) { if (!walls.length) throw e; console.warn('scene with walls', e); await OBR.assets.uploadScenes([mk(false)]); return 'nowalls'; }
  }
  // the monsters of a prepared fight → { name, key } × qty
  function encTokens(enc) {
    const out = [];
    ((enc && enc.monsters) || []).forEach(x => { const m = U.monById ? U.monById(x.mid) : null; if (!m) return; for (let i = 0; i < (Number(x.qty) || 1); i++) out.push({ name: m.name, key: monToken(m) }); });
    return out;
  }
  const party = () => (S.chars || []).filter(c => c.party !== false).slice(0, 8);

  // ---------- the window ----------
  const ST = { type: 'cave', size: 'm', seed: 1 + Math.floor(Math.random() * 9999), enc: '', heroes: true, fog: true, walls: true, name: '' };
  const TYPES = { cave: ['🕳', 'Cave'], dungeon: ['🏰', 'Dungeon'], forest: ['🌲', 'Forest'] };
  let lastMap = null;
  function preview() {
    lastMap = U.makeMap(ST.type, ST.size, ST.seed, 80);
    const pv = document.getElementById('scPrev'); if (!pv) return;
    const c = pv.getContext('2d'); const k = pv.width / lastMap.canvas.width; pv.height = Math.round(lastMap.canvas.height * k);
    c.drawImage(lastMap.canvas, 0, 0, pv.width, pv.height);
    const enc = S.encounters.find(e => e.id === ST.enc); const mons = encTokens(enc); const P = 80 * k;
    c.font = Math.round(P * 0.7) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    lastMap.spots(mons.length).forEach(([x, y]) => { c.fillStyle = 'rgba(200,40,40,.85)'; c.beginPath(); c.arc((x + 0.5) * P, (y + 0.5) * P, P * 0.42, 0, 7); c.fill(); });
    if (ST.heroes) lastMap.heroSpots(party().length).forEach(([x, y]) => { c.fillStyle = 'rgba(60,120,230,.9)'; c.beginPath(); c.arc((x + 0.5) * P, (y + 0.5) * P, P * 0.42, 0, 7); c.fill(); });
  }
  function scenesPop() {
    const pop = document.getElementById('pop'); if (!pop) return;
    if (!ST.name) ST.name = T(TYPES[ST.type][1]) + ' #' + ST.seed;
    pop.innerHTML = '<div class="popcard settings scenes" role="dialog"><div class="ph"><h2>🗺 ' + T('Scenes for Owlbear') + '</h2><button class="mini" data-act="closePop">✕</button></div>' +
      '<p class="hint">' + T('Make a battle map, put the monsters of a prepared fight on it (hidden) and the heroes at the entrance, and upload it into Owlbear as a new scene.') + '</p>' +
      '<p>' + Object.keys(TYPES).map(k => '<button class="mini' + (ST.type === k ? ' on' : '') + '" data-act="scType" data-v="' + k + '">' + TYPES[k][0] + ' ' + T(TYPES[k][1]) + '</button>').join(' ') + ' &nbsp; ' +
      [['s', T('small 20×14')], ['m', T('medium 28×20')], ['l', T('big 36×24')]].map(s => '<button class="mini' + (ST.size === s[0] ? ' on' : '') + '" data-act="scSize" data-v="' + s[0] + '">' + s[1] + '</button>').join(' ') + '</p>' +
      '<p>' + T('Map number') + ' <input id="scSeed" type="number" value="' + ST.seed + '" class="tiny" data-on="scSeed"> <button class="mini" data-act="scNew">🎲 ' + T('Another map') + '</button></p>' +
      '<canvas id="scPrev" width="520" height="360" style="width:100%;border-radius:8px;border:1px solid #5a4630;background:#111"></canvas>' +
      '<p class="hint">🔴 ' + T('monsters (hidden at first)') + ' · 🔵 ' + T('heroes') + '</p>' +
      '<p>' + T('Monsters from a prepared fight:') + ' <select data-on="scEnc"><option value="">' + T('— none —') + '</option>' + S.encounters.map(e => '<option value="' + esc(e.id) + '"' + (ST.enc === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('') + '</select></p>' +
      '<p><label class="inl"><input type="checkbox" data-on="scHeroes"' + (ST.heroes ? ' checked' : '') + '> 🧙 ' + T('the party\'s heroes at the entrance') + '</label> ' +
      '<label class="inl"><input type="checkbox" data-on="scFog"' + (ST.fog ? ' checked' : '') + '> 🌫 ' + T('fog over everything (you reveal it)') + '</label> ' +
      '<label class="inl"><input type="checkbox" data-on="scWalls"' + (ST.walls ? ' checked' : '') + '> 🧱 ' + T('walls (for dynamic fog)') + '</label></p>' +
      '<p>' + T('Scene name') + ' <input id="scName" value="' + esc(ST.name) + '" data-in="scName"></p>' +
      '<p class="btnrow"><button class="primary" data-act="scUpload">📦 ' + T('Upload into Owlbear') + '</button> <button data-act="scFolder">📁 ' + T('Scenario from a folder…') + '</button> <button data-act="scHeroes">🧙 ' + T('Heroes onto the open scene') + '</button></p>' +
      '<p class="hint" id="scMsg"></p></div>';
    pop.classList.add('show'); setTimeout(preview, 30);
  }
  const msg = h => { const m = document.getElementById('scMsg'); if (m) m.innerHTML = h; };
  U.ACT.scenes = () => scenesPop();
  U.ACT.scType = ds => { ST.type = ds.v; ST.name = ''; scenesPop(); };
  U.ACT.scSize = ds => { ST.size = ds.v; scenesPop(); };
  U.ACT.scNew = () => { ST.seed = 1 + Math.floor(Math.random() * 9999); ST.name = ''; scenesPop(); };
  U.ON.scSeed = el => { ST.seed = Math.max(1, Number(el.value) || 1); ST.name = ''; scenesPop(); };
  U.ON.scEnc = el => { ST.enc = el.value; preview(); };
  U.ON.scHeroes = el => { ST.heroes = el.checked; preview(); };
  U.ON.scFog = el => { ST.fog = el.checked; };
  U.ON.scWalls = el => { ST.walls = el.checked; };
  U.IN.scName = el => { ST.name = el.value; };
  U.ACT.scUpload = async () => {
    try {
      msg('⏳ ' + T('Uploading…'));
      const map = lastMap || U.makeMap(ST.type, ST.size, ST.seed, 80);
      const enc = S.encounters.find(e => e.id === ST.enc); const mons = encTokens(enc); const ms = map.spots(mons.length);
      const tokens = mons.map((m, i) => ({ name: m.name, key: m.key, x: ms[i][0], y: ms[i][1], hidden: true }));
      if (ST.heroes) { const hs = map.heroSpots(party().length); party().forEach((c, i) => { if (hs[i]) tokens.push({ name: c.name, key: heroToken(c), x: hs[i][0], y: hs[i][1], hidden: false }); }); }
      const blob = await new Promise(ok => map.canvas.toBlob(ok, 'image/jpeg', 0.9));
      const r = await upload({ name: ST.name || 'Scene', mapBlob: blob, cellPx: map.P, tokens, walls: ST.walls ? map.walls : [], fog: ST.fog });
      msg('✅ ' + T('Done! Owlbear → Scenes (top left) → open «{0}».', esc(ST.name)) + (r === 'nowalls' ? ' ' + T('(Owlbear did not take the walls — the scene is without them.)') : '') +
        (enc ? '<br>' + T('Then: ⚔️ Fight → Prepared fights → «{0}» → load it. The tokens link by their names.', esc(enc.name)) : ''));
    } catch (e) { msg('⚠️ ' + esc(e.message || e)); console.warn(e); }
  };
  // the party onto the scene that is open now (next to the middle of the screen)
  U.ACT.scHeroes = async () => {
    try {
      const list = party(); if (!list.length) { msg(T('No heroes in the party yet.')); return; }
      const have = new Set((await OBR.scene.items.getItems(it => it.layer === 'CHARACTER')).map(it => String(it.name || '').trim().toLowerCase()));
      const w = await OBR.viewport.getWidth(), h = await OBR.viewport.getHeight(), s = await OBR.viewport.getScale(), p = await OBR.viewport.getPosition();
      const cx = Math.floor(((w / 2 - p.x) / s) / GD), cy = Math.floor(((h / 2 - p.y) / s) / GD);
      const add = list.filter(c => !have.has(String(c.name || '').trim().toLowerCase())).map((c, i) => tokenItem(c.name, heroToken(c), cx + (i % 4), cy + Math.floor(i / 4), false));
      if (!add.length) { msg(T('All heroes are already on the scene.')); return; }
      await OBR.scene.items.addItems(add); msg('✅ ' + T('{0} heroes put on the scene. Each player can now move only his own.', add.length));
    } catch (e) { msg('⚠️ ' + esc(e.message || e)); }
  };

  // ---------- 📁 a scenario folder ----------
  // scenario.json: { name, monsters: [my monsters, the app's format], encounters: [{ name, monsters: [{ mid | name, qty }] }],
  //   scenes: [{ name, map: "maps/cave.jpg" | { gen: "cave|dungeon|forest", size: "s|m|l", seed }, cellPx (squares in the picture, px),
  //              encounter: "a fight's name", heroes: true, fog: true, walls: true, tokens: [{ name, token, x, y, hidden }] }] }
  U.ACT.scFolder = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.setAttribute('webkitdirectory', ''); inp.style.display = 'none';
    inp.onchange = () => importFolder([...inp.files]).catch(e => { msg('⚠️ ' + esc(e.message || e)); console.warn(e); }); document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  };
  async function importFolder(files) {
    const byPath = {}; files.forEach(f => { const p = (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name; byPath[p.toLowerCase()] = f; byPath[f.name.toLowerCase()] = byPath[f.name.toLowerCase()] || f; });
    const jf = byPath['scenario.json'] || files.find(f => /scenario\.json$/i.test(f.name)); if (!jf) throw new Error(T('No scenario.json in this folder.'));
    const sc = JSON.parse(await jf.text()); const log = [];
    // monsters
    (sc.monsters || []).forEach(m0 => { if (!m0 || !m0.name) return; if (S.monsters.some(m => m.name === m0.name)) return; const m = Object.assign({}, m0, { id: E.uid() }); S.monsters.unshift(m); log.push('👹 ' + esc(m.name)); });
    U.saveMonsters();
    const all = U.allMonsters ? U.allMonsters() : [];
    const findMon = x => (x.mid && all.find(m => m.id === x.mid)) || all.find(m => x.name && (m.name === x.name || m.en === x.name || (m.id || '').replace(/^srd:/, '') === String(x.name).toLowerCase().replace(/[^a-z]/g, '')));
    (sc.encounters || []).forEach(en => {
      if (!en || !en.name) return; const mons = (en.monsters || []).map(x => { const m = findMon(x); return m ? { mid: m.id, qty: Number(x.qty) || 1 } : null; }).filter(Boolean);
      const old = S.encounters.find(e => e.name === en.name); if (old) old.monsters = mons; else S.encounters.push({ id: E.uid(), name: en.name, notes: en.notes || '', monsters: mons });
      log.push('📋 ' + esc(en.name));
    });
    U.saveEncounters();
    for (const s of (sc.scenes || [])) {
      let blob, cellPx, map = null, W = 0, H = 0;
      if (s.map && typeof s.map === 'object') { map = U.makeMap(s.map.gen || 'cave', s.map.size || 'm', s.map.seed || 1, 80); blob = await new Promise(ok => map.canvas.toBlob(ok, 'image/jpeg', 0.9)); cellPx = 80; W = map.W; H = map.H; }
      else { const f = byPath[String(s.map || '').toLowerCase()] || byPath[String(s.map || '').split('/').pop().toLowerCase()]; if (!f) { log.push('⚠️ ' + T('no picture {0}', esc(s.map))); continue; } blob = f; cellPx = Number(s.cellPx) || 100; }
      // tokens: { monster: "srd:goblin" | a name, x, y (square), hidden } — the name comes from the app, so the token links to the fight by itself
      const tokens = (s.tokens || []).map(t => { const m = t.monster ? findMon({ mid: t.monster, name: t.monster }) : null; const name = t.name || (m ? m.name : '?');
        return { name, key: t.token || (m ? monToken(m) : monToken({ name })), x: Number(t.x) || 0, y: Number(t.y) || 0, hidden: t.hidden !== false }; });
      const enc = s.encounter ? S.encounters.find(e => e.name === s.encounter) : null;
      if (enc && map && !tokens.length) { const mons = encTokens(enc); const ms = map.spots(mons.length); mons.forEach((m, i) => tokens.push({ name: m.name, key: m.key, x: ms[i][0], y: ms[i][1], hidden: true })); }
      if (s.heroes !== false) {
        const n = party().length; const st = Array.isArray(s.heroStart) ? s.heroStart : null;
        const hs = map ? map.heroSpots(n) : st ? [[0, 0], [0, 1], [1, 0], [1, 1], [0, -1], [1, -1], [2, 0], [2, 1]].map(([dx, dy]) => [st[0] + dx, st[1] + dy]) : [];
        party().forEach((c, i) => { if (hs[i]) tokens.push({ name: c.name, key: heroToken(c), x: hs[i][0], y: hs[i][1], hidden: false }); });
      }
      const r = await upload({ name: s.name || sc.name || 'Scene', mapBlob: blob, cellPx, tokens, walls: map && s.walls !== false ? map.walls : [], fog: s.fog !== false });
      log.push('🗺 ' + esc(s.name || '') + (r === 'nowalls' ? ' ' + T('(no walls)') : ''));
    }
    U.render(); scenesPop(); msg('✅ ' + T('Scenario «{0}» loaded:', esc(sc.name || '')) + '<br>' + log.join('<br>'));
  }

  U._importScenario = importFolder; // (tests)
  // the 🗺 button in the DM's top bar
  const top0 = U.renderTop;
  U.renderTop = function () { top0(); const el = document.getElementById('topCtl'); if (el && U.DM) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="scenes" title="' + esc(T('Scenes for Owlbear: make a map, put the monsters and heroes, upload')) + '">🗺</button>'); };
  if (document.getElementById('topCtl')) U.renderTop();
})(window.UI);
