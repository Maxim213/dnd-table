// 🗺 Campaign scenes for Owlbear (DM, online only).
// Import a campaign folder with maps, encounters and tokens. The generator below supports older saved packs.
(function (U) {
  if (!U || !window.ONLINE || !window.ONLINE.owlbear) return;
  const T = U.T, S = U.S, D = U.D, E = U.E, esc = U.esc;
  const OBR = window.OBR;
  const GD = 150; // Owlbear's scene grid: 150 px per square
  const tokURL = k => /^(https?:|data:|blob:)/.test(k) ? k : new URL('assets/tokens/' + k + (/\.[a-z0-9]+$/i.test(k) ? '' : '.png'), document.baseURI).href;

  // ---------- custom token pictures ----------
  // 1) a picture link on the hero / monster (c.token / the game's token list: 🖼 button), 2) a file in assets/tokens/custom/ named like the creature
  //    ("Серафина.png", "Skeleton.webp" — the list is assets/tokens/custom/index.json, made by _engine/make_token_index.ps1), 3) our round default
  const norm = s => String(s || '').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+\d+$/, ''); // "Скелет 2" → "скелет"
  let customFiles = {};
  fetch(new URL('assets/tokens/custom/index.json', document.baseURI).href, { cache: 'no-store' }).then(r => r.ok ? r.json() : []).then(L => { (Array.isArray(L) ? L : []).forEach(f => { customFiles[norm(String(f).replace(/\.[a-z0-9]+$/i, ''))] = 'custom/' + f; }); }).catch(() => {});
  const tokenLinks = () => (U.store && U.store.get('tokenLinks', {})) || {}; // the DM's links per monster name
  const customOf = (...names) => { const L = tokenLinks(); for (const n of names) { const k = norm(n); if (!k) continue; if (L[k]) return L[k]; if (customFiles[k]) return customFiles[k]; } return ''; };
  U.tokenOfName = n => customOf(n);
  // ---------- which picture for which creature ----------
  const SPECIAL = [[/goblin|гоблин|hobgoblin|bugbear/i, 'goblin'], [/ogre|огр|orc|орк|troll|тролл/i, 'ogre'], [/zombie|зомби|ghoul|гул/i, 'zombie'], [/spider|паук/i, 'spider'],
    [/\brat\b|крыс/i, 'rat'], [/\bbat\b|летуч/i, 'bat'], [/snake|змея|serpent/i, 'snake'], [/bear|медвед/i, 'bear'], [/ghost|призрак|specter|wraith|banshee/i, 'ghost'],
    [/vampire|вампир/i, 'vampire'], [/mage|маг|priest|жрец|cultist|культист|warlock|колдун/i, 'mage'], [/wolf|волк|worg|ворг/i, 'wolf']];
  function monToken(m) {
    // also the short name: «Серафина, Палач Церкви» → «Серафина», «Атаманша «Чёрная Ирма»» → «Чёрная Ирма», «Гоблин [ПО 2]» → «Гоблин»
    const nm = String(m.name || '').replace(/\s*\[[^\]]*\]/g, '').trim(); const quoted = (nm.match(/«([^»]+)»/) || [])[1];
    const own = m.token || customOf(m.name, nm, nm.replace(/\s*[,(].*$/, ''), quoted, m.en, String(m.id || '').replace(/^srd:/, '')); if (own) return own;
    const s = (m.id || '') + ' ' + (m.name || '') + ' ' + (m.en || '');
    for (const [re, k] of SPECIAL) if (re.test(s)) return k;
    const ty = m.type || (D.MONSTERS[String(m.id || '').replace(/^srd:/, '')] || {}).type;
    return D.MON_TYPES && D.MON_TYPES[ty] ? ty : 'humanoid';
  }
  const heroToken = c => c.token || customOf(c.name) || ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'].includes(c.classKey) ? c.classKey : 'hero';

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
  // o: { dense (more trees), clearing (an open circle in the middle, a camp fire), oak (a meadow below, a huge oak), noPath }
  function carveForest(W, H, R, o) {
    o = o || {};
    const g = []; for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) g[y].push(1); }
    const trees = [];
    const clusters = Math.round(W * H / (o.dense ? 11 : 22));
    for (let c = 0; c < clusters; c++) { // clusters of trees
      const cx = Math.floor(R() * W), cy = Math.floor(R() * (o.oak ? H * 0.45 : H)), n = 2 + Math.floor(R() * 5);
      for (let i = 0; i < n; i++) { const x = Math.min(W - 1, Math.max(0, cx + Math.floor(R() * 4) - 2)), y = Math.min(H - 1, Math.max(0, cy + Math.floor(R() * 4) - 2)); g[y][x] = 0; }
    }
    if (o.oak) for (let y = Math.floor(H * 0.75); y < H; y++) for (let x = 0; x < W; x++) if (R() < 0.12) g[y][x] = 0; // a few trees at the bottom edge
    const mid = [Math.floor(W / 2), Math.floor(H / 2)];
    if (o.clearing) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.hypot(x - mid[0], y - mid[1]) < 6.5) g[y][x] = 1;
    // a winding path from left to right
    let y = Math.floor(H / 2); const path = [];
    if (!o.noPath) for (let x = 0; x < W; x++) { if (R() < 0.35) y = Math.min(H - 2, Math.max(1, y + (R() < 0.5 ? -1 : 1))); [y - 1, y, y + 1].forEach(q => { if (q >= 0 && q < H) g[q][x] = 1; }); path.push([x, y]); }
    else for (let k = 0; k < 6; k++) { const cx = 3 + Math.floor(R() * (W - 6)), cy = 3 + Math.floor(R() * (H - 6)); for (let yy = cy - 2; yy <= cy + 2; yy++) for (let xx = cx - 2; xx <= cx + 2; xx++) if (g[yy] && g[yy][xx] !== undefined) g[yy][xx] = 1; } // small clearings
    let oak = null;
    if (o.oak) { oak = [mid[0], Math.floor(H * 0.55)]; for (let yy = oak[1] - 1; yy <= oak[1] + 1; yy++) for (let xx = oak[0] - 1; xx <= oak[0] + 1; xx++) g[yy][xx] = 0; }
    for (let yy = 0; yy < H; yy++) for (let x = 0; x < W; x++) if (!g[yy][x] && !(oak && Math.abs(x - oak[0]) <= 1 && Math.abs(yy - oak[1]) <= 1)) trees.push([x, yy]);
    return { g, path, trees, camp: o.clearing ? mid : null, oak };
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
      if (map.camp) { const [x, y] = map.camp; glow(ctx, (x + 0.5) * P, (y + 0.5) * P, P * 3.5, 'rgba(255,150,50,.4)'); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc((x + 0.5) * P, (y + 0.5) * P, P * 0.25, 0, 7); ctx.fill(); for (let i = 0; i < 4; i++) rock(ctx, (x + 0.5) * P + Math.cos(i * 1.6) * P * 1.6, (y + 0.5) * P + Math.sin(i * 1.6) * P * 1.6, P * 0.25, R); }
      if (map.oak) { const cx = (map.oak[0] + 0.5) * P, cy = (map.oak[1] + 0.5) * P, r = P * 1.9; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.arc(cx + r * 0.2, cy + r * 0.25, r, 0, 7); ctx.fill(); const gr = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r); gr.addColorStop(0, '#7aa04a'); gr.addColorStop(1, '#203d16'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
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
  U.makeMap = function (type, size, seed, P, opts) {
    const [W, H] = SIZES[size] || SIZES.m; const R = rnd(seed); P = P || 80;
    let map = { type, W, H, R, P };
    if (type === 'dungeon') Object.assign(map, carveDungeon(W, H, R));
    else if (type === 'forest') Object.assign(map, carveForest(W, H, R, opts));
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
  // a custom picture can be any size: learn it first (one square = its longer side)
  const SIZE = {};
  const sized = keys => Promise.all([...new Set(keys)].filter(k => k && !SIZE[k] && (/^(https?:|data:|blob:|custom\/)/.test(k))).map(k => new Promise(ok => {
    const im = new Image(); im.onload = () => { SIZE[k] = [im.naturalWidth || 256, im.naturalHeight || 256]; ok(); }; im.onerror = () => { SIZE[k] = [256, 256]; ok(); }; im.src = tokURL(k);
  })));
  const mimeOf = k => /\.jpe?g(\?|$)/i.test(k) ? 'image/jpeg' : /\.webp(\?|$)/i.test(k) ? 'image/webp' : /\.gif(\?|$)/i.test(k) ? 'image/gif' : /^data:([^;]+)/.test(k) ? k.match(/^data:([^;]+)/)[1] : 'image/png';
  function tokenItem(name, key, cx, cy, hidden, meta) {
    const [w, h] = SIZE[key] || [256, 256]; const dpi = Math.max(w, h);
    return B().buildImage({ url: tokURL(key), mime: mimeOf(key), width: w, height: h }, { dpi, offset: { x: w / 2, y: h / 2 } })
      .position({ x: (cx + 0.5) * GD, y: (cy + 0.5) * GD }).layer('CHARACTER').name(name).plainText(name).visible(!hidden).locked(false).metadata(meta || {}).build();
  }
  // o: { name, mapBlob, cellPx, W, H, tokens: [{ name, key, x, y, hidden }], walls: [[x1, y1, x2, y2]…] (squares), fog }
  const safeName = n => String(n || '').replace(/[^\p{L}\p{N} .,'()-]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Scene';
  async function stdImage(blob, type) { // webp / anything else → JPEG (maps) or PNG (tokens, keeps transparency)
    if (!blob) throw new Error(T('The map image is empty.'));
    // Files selected from disk must be copied before postMessage to Owlbear's frame.
    // https://docs.owlbear.rodeo/extensions/apis/assets/#uploadscenes
    blob = new Blob([await blob.arrayBuffer()], { type: blob.type });
    if (/^image\/(png|jpeg)$/.test(blob.type)) return blob;
    const url = URL.createObjectURL(blob); try { const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0);
      return await new Promise(ok => c.toBlob(ok, type === 'png' ? 'image/png' : 'image/jpeg', 0.9)); } catch (e) { return blob; } finally { URL.revokeObjectURL(url); }
  }
  // Owlbear asks the DM ONE «Select folder → Upload scenes» question per uploadScenes() call — so many scenes go in one call
  async function uploadMany(list) {
    if (!list.length) return 0;
    try { await OBR.assets.uploadScenes(list.map(x => x.full)); return list.length; }
    catch (e) { console.warn('all scenes in one go', e); }
    try { await OBR.assets.uploadScenes(list.map(x => x.plain)); return list.length; } // without Owlbear's own walls
    catch (e) { console.warn('all scenes without walls', e); }
    let n = 0; for (let i = 0; i < list.length; i += 10) { await OBR.assets.uploadScenes(list.slice(i, i + 10).map(x => x.plain)); n += Math.min(10, list.length - i); } // too big at once → by ten
    return n;
  }
  async function buildScene(o) {
    const b = B(); if (!b || !b.buildSceneUpload || !OBR || !OBR.assets) throw new Error(T('Owlbear does not allow uploads here.'));
    const base = b.buildImageUpload(await stdImage(o.mapBlob, 'jpeg')).dpi(o.cellPx).name(safeName(o.name)).locked(true).build();
    await sized(o.tokens.map(t => t.key));
    const items = o.tokens.map(t => tokenItem(t.name, t.key, t.x, t.y, t.hidden));
    // Owlbear's own WALL items (its Dynamic Fog extension can use them) — optional extras, dropped if Owlbear refuses them
    const extra = (o.walls || []).filter(w => !w[4]).map(([x1, y1, x2, y2]) => b.buildWall().points([{ x: x1 * GD, y: y1 * GD }, { x: x2 * GD, y: y2 * GD }]).doubleSided(true).blocking(true).locked(true).build());
    // our own vision fog (obr-vision.js) reads the walls from this invisible carrier, and the scene's starting light (mode)
    const flat = [], fl = []; (o.walls || []).forEach(w => { flat.push(w[0], w[1], w[2], w[3]); fl.push(Number(w[4]) || 0); }); // [x1, y1, x2, y2, 0 wall | 1 door | 2 open door]
    if (flat.length || o.vision) items.push(b.buildCurve().points([{ x: 0, y: 0 }, { x: 1, y: 0 }]).position({ x: 0, y: 0 }).strokeOpacity(0).fillOpacity(0).strokeWidth(0).tension(0).closed(false)
      .layer('DRAWING').locked(true).disableHit(true).name('D&D Table: walls').metadata({ 'dndtable/walls': { s: flat, f: fl, cell: GD, mode: o.vision || '' } }).build());
    // no Owlbear fog fill: the fog comes from our vision (the DM picks the light with 🔦)
    const mk = full => b.buildSceneUpload().name(safeName(o.name)).baseMap(base).gridScale('5ft').gridType('SQUARE').gridMeasurement('CHEBYSHEV').fogFilled(false).items(items.concat(full ? extra : [])).build();
    return { full: mk(true), plain: mk(false), walls: extra.length };
  }
  const party = () => (S.chars || []).filter(c => c.party !== false).slice(0, 8);
  // Older packs can still place a prepared encounter on a generated map.
  function encTokens(enc) {
    const out = [];
    ((enc && enc.monsters) || []).forEach(x => { const m = U.monById ? U.monById(x.mid) : null; if (!m) return; for (let i = 0; i < (Number(x.qty) || 1); i++) out.push({ name: m.name, key: monToken(m) }); });
    return out;
  }

  // put tokens next to the middle of the screen of the scene that is open now
  async function toScene(list) {
    const w = await OBR.viewport.getWidth(), h = await OBR.viewport.getHeight(), s = await OBR.viewport.getScale(), p = await OBR.viewport.getPosition();
    const cx = Math.floor(((w / 2 - p.x) / s) / GD), cy = Math.floor(((h / 2 - p.y) / s) / GD);
    await sized(list.map(t => t.key));
    const add = list.map((t, i) => tokenItem(t.name, t.key, cx + (i % 5) - 2, cy + Math.floor(i / 5), !!t.hidden, t.meta));
    if (add.length) await OBR.scene.items.addItems(add);
    return add.length;
  }
  // "🗺 Onto the scene" in the fight and on a monster's card: its token on the open scene (it remembers which monster it is)
  U.obrToScene = async (m, q) => {
    try {
      const list = []; for (let i = 0; i < (q || 1); i++) list.push({ name: m.name, key: monToken(m), hidden: ST.hide, meta: { 'dndtable/mon': { mid: m.id, cr: m.cr || '' } } });
      await toScene(list);
      U.toast('🗺 ' + T('{0} is on the scene ({1}). Then ⚔️ «Fight with everyone on the scene».', esc(m.name) + (q > 1 ? ' ×' + q : ''), ST.hide ? T('hidden — right click → Show') : T('visible')));
      readSoon();
    } catch (e) { U.toast('⚠️ ' + esc(e.message || e)); }
  };

  // "🗺 Onto the scene" on a hero's card in 🧙 Characters (linked to the hero at once)
  U.obrHeroToScene = true;
  U.ACT.heroToScene = async ds => {
    const c = U.byId(ds.id); if (!c) return;
    try {
      const on = (await OBR.scene.items.getItems(it => it.layer === 'CHARACTER' && it.metadata && it.metadata['dndtable/link'] && it.metadata['dndtable/link'].cid === c.id)).length;
      if (on && !confirm(T('{0} is already on the scene. Put one more?', c.name))) return;
      await toScene([{ name: c.name, key: heroToken(c), meta: { 'dndtable/link': { k: 'pc', cid: c.id, n: c.name } } }]);
      U.toast('🗺 ' + T('{0} is on the scene (middle of your screen).', esc(c.name))); readSoon();
    } catch (e) { U.toast('⚠️ ' + esc(e.message || e)); }
  };

  // ---------- who is on the open scene (the fight screen shows it) → "⚔️ Fight with everyone on the scene" ----------
  let sceneToks = [];
  async function readScene() {
    try {
      if (!(await OBR.scene.isReady())) { sceneToks = []; return; }
      sceneToks = (await OBR.scene.items.getItems(it => it.layer === 'CHARACTER')).map(it => ({ id: it.id, name: it.name || '?', visible: it.visible !== false, link: (it.metadata || {})['dndtable/link'] || null, mon: (it.metadata || {})['dndtable/mon'] || null }));
    } catch (e) { sceneToks = []; }
  }
  let rT = 0;
  function readSoon() { clearTimeout(rT); rT = setTimeout(async () => { const k = JSON.stringify(sceneToks); await readScene(); if (JSON.stringify(sceneToks) !== k && S.view === 'combat' && (S.combatTab || 'fight') === 'fight') U.render(); }, 400); }
  try { OBR.scene.items.onChange(readSoon); OBR.scene.onReadyChange(readSoon); } catch (e) {}
  readSoon();
  U.sceneBox = function () {
    if (!U.DM) return '';
    const L = (S.combat && S.combat.list) || [];
    const inFight = t => !!t.link && (t.link.k === 'pc' ? L.some(x => x.charId === t.link.cid) : L.some(x => x.id === t.link.eid));
    return '<div class="scenebox"><p><b>🗺 ' + T('On the Owlbear scene now') + ' (' + sceneToks.length + '):</b> ' +
      (sceneToks.length ? sceneToks.map(t => '<span class="chip small' + (t.visible ? '' : ' dim') + '">' + (t.link && t.link.k === 'pc' ? '🧙 ' : '👹 ') + esc(t.name) + (t.visible ? '' : ' 🙈') + (inFight(t) ? ' ⚔️' : '') +
        ' <button class="x" data-act="scVis" data-id="' + esc(t.id) + '" title="' + esc(t.visible ? T('Hide from the players') : T('Show to the players')) + '">' + (t.visible ? '🙈' : '👁') + '</button><button class="x" data-act="scDel" data-id="' + esc(t.id) + '" title="' + esc(T('Remove from the scene')) + '">✕</button></span>').join(' ')
        : '<small>' + T('Nobody yet. Use 🗺 Onto the scene on a monster or character card.') + '</small>') + '</p>' +
      (sceneToks.length ? '<p><button class="primary" data-act="cbFromScene">⚔️ ' + T('Fight with everyone on the scene') + '</button> <small class="hint">' + T('heroes and monsters on the scene (hidden too) go into the fight, initiative is rolled') + '</small></p>' : '') + '</div>';
  };
  U.ACT.scVis = async ds => { try { await OBR.scene.items.updateItems([ds.id], L => { L.forEach(x => { x.visible = !(x.visible !== false); }); }); readSoon(); } catch (e) { U.toast('⚠️ ' + esc(e.message || e)); } };
  U.ACT.scDel = async ds => { if (!confirm(T('Remove this token from the scene?'))) return; try { await OBR.scene.items.deleteItems([ds.id]); readSoon(); } catch (e) { U.toast('⚠️ ' + esc(e.message || e)); } };
  U.ACT.cbFromScene = async () => {
    await readScene();
    const toks = await OBR.scene.items.getItems(it => it.layer === 'CHARACTER');
    if (!toks.length) { U.toast(T('Nobody on the scene.')); return; }
    if (S.combat.list.length && !confirm(T('Start a new fight with everyone on the scene? The current fight list is replaced.'))) return;
    S.combat = { list: [], round: 0, turn: -1, target: {} };
    const norm = s => String(s || '').trim().toLowerCase(); const base = s => norm(s).replace(/\s*#?\d+$/, '');
    const all = U.allMonsters ? U.allMonsters() : []; const links = {}; const skipped = [];
    for (const t of toks) {
      const md = t.metadata || {}; const l = md['dndtable/link'];
      const hero = l && l.k === 'pc' ? U.byId(l.cid) : (S.chars || []).find(c => norm(c.name) === norm(t.name));
      if (hero) { if (!S.combat.list.some(x => x.charId === hero.id)) S.combat.list.push({ id: E.uid(), type: 'pc', charId: hero.id, init: null }); links[t.id] = { k: 'pc', cid: hero.id, n: hero.name }; continue; }
      const mm = md['dndtable/mon']; let m = mm && U.monById ? U.monById(mm.mid) : null;
      if (m && mm.cr && String(mm.cr) !== String(m.cr) && U.atCr) m = U.atCr(m, mm.cr);
      if (!m) m = all.find(x => base(x.name) === base(t.name) || base(x.en || '') === base(t.name) || base(x.n || '') === base(t.name));
      if (!m) { skipped.push(t.name); continue; }
      U.addMonEntry(m, 1); const e = S.combat.list[S.combat.list.length - 1];
      links[t.id] = { k: 'mon', eid: e.id, n: e.name };
    }
    // number the monsters of the same kind (Goblin 1, Goblin 2…) and write it on their tokens
    const cnt = {}; S.combat.list.filter(x => x.type === 'mon').forEach(x => { cnt[x.srcId] = (cnt[x.srcId] || 0) + 1; });
    const idx = {}; S.combat.list.filter(x => x.type === 'mon').forEach(x => { if (cnt[x.srcId] > 1) { idx[x.srcId] = (idx[x.srcId] || 0) + 1; x.name = x.name.replace(/\s+\d+$/, '') + ' ' + idx[x.srcId]; } });
    Object.keys(links).forEach(id => { const l = links[id]; if (l.k === 'mon') { const e = S.combat.list.find(x => x.id === l.eid); if (e) l.n = e.name; } });
    await OBR.scene.items.updateItems(Object.keys(links), L => { L.forEach(it => { const l = links[it.id]; it.metadata['dndtable/link'] = l; it.name = l.n; if (it.text) it.text.plainText = l.n; }); });
    U.saveCombat(); S.combatTab = 'fight'; U.ACT.cbStart();
    U.toast('⚔️ ' + T('Fight: {0} heroes, {1} monsters. Initiative rolled.', S.combat.list.filter(x => x.type === 'pc').length, S.combat.list.filter(x => x.type === 'mon').length) + (skipped.length ? '<br>' + T('Not a known monster (skipped): {0}', esc(skipped.join(', '))) : ''));
    readSoon();
  };

  // ---------- campaign scene import ----------
  const ST = { hide: true };
  function scenesPop() {
    const pop = document.getElementById('pop'); if (!pop) return;
    pop.innerHTML = '<div class="popcard settings scenes" role="dialog"><div class="ph"><h2>🗺 ' + T('Campaign scenes') + '</h2><button class="mini" data-act="closePop">✕</button></div>' +
      '<p>' + T('Choose the Last Kingdom Owlbear_Pack folder to import its maps, encounters and campaign content.') + '</p>' +
      '<p class="btnrow"><button class="primary" data-act="scFolder">📁 ' + T('Scenario from a folder…') + '</button></p>' +
      '<p class="hint">' + T('Then choose the destination in Owlbear and click Upload scenes. Open the imported scene from Assets → Scenes.') + '</p>' +
      '<div id="scMsg" role="status" aria-live="polite"></div></div>';
    pop.classList.add('show');
  }
  const msg = h => { const m = document.getElementById('scMsg'); if (m) m.innerHTML = h; };
  U.ACT.scenes = () => scenesPop();

  // ---------- 📁 a scenario folder ----------
  // scenario.json: { name, monsters: [my monsters, the app's format], encounters: [{ name, monsters: [{ mid | name, qty }] }],
  //   scenes: [{ name, map: "maps/cave.jpg" | { gen: "cave|dungeon|forest", size: "s|m|l", seed }, cellPx (squares in the picture, px),
  //              encounter: "a fight's name", heroes: true, fog: true, walls: true, tokens: [{ name, token, x, y, hidden }] }] }
  U.ACT.scFolder = () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.multiple = true; inp.setAttribute('webkitdirectory', ''); inp.style.display = 'none';
    inp.onchange = () => { const files = [...inp.files]; inp.remove(); if (files.length) importFolder(files).catch(e => { const h = '⚠️ ' + esc(e.message || e); msg(h); U.toast(h); console.warn(e); }); };
    inp.oncancel = () => inp.remove();
    document.body.appendChild(inp); inp.click();
  };
  async function importFolder(files) {
    msg('⏳ ' + T('Reading the campaign folder…'));
    const byPath = {}; files.forEach(f => { const p = (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name; byPath[p.toLowerCase()] = f; byPath[f.name.toLowerCase()] = byPath[f.name.toLowerCase()] || f; });
    const jf = byPath['scenario.json'] || files.find(f => /scenario\.json$/i.test(f.name)); if (!jf) throw new Error(T('No scenario.json in this folder.'));
    const sc = JSON.parse(await jf.text()); const log = [];
    // the app scenario (monsters, items, shops, sides) can ride along in the same folder: "appScenario": "file.scenario.json" or any *.scenario.json
    const af = (sc.appScenario && byPath[String(sc.appScenario).toLowerCase()]) || files.find(f => /\.scenario\.json$/i.test(f.name) && f !== jf);
    if (af && window.SCN && SCN.installNow) {
      try { const p = JSON.parse(await af.text()); if (SCN.installNow(p)) { log.push('📜 ' + T('App scenario: {0}', esc((Array.isArray(p.ru) ? p.ru[0] : p.name) || p.id)) + ' (' + Object.keys(p.monsters || {}).length + ' 👹, ' + ((p.shops || []).length + (p.shop ? 1 : 0)) + ' 🛒)'); U.render(); } }
      catch (e) { log.push('⚠️ ' + esc(af.name) + ': ' + esc(e.message || e)); }
    }
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
    const scs = sc.scenes || []; let nOk = 0; const fails = []; const built = [];
    for (const [si, s] of scs.entries()) {
      msg('⏳ ' + T('Preparing the scenes…') + ' ' + (si + 1) + ' / ' + scs.length + ' — ' + esc(s.name || ''));
      try {
      let blob, cellPx, map = null, W = 0, H = 0;
      if (s.map && typeof s.map === 'object') { map = U.makeMap(s.map.gen || 'cave', s.map.size || 'm', s.map.seed || 1, 80); blob = await new Promise(ok => map.canvas.toBlob(ok, 'image/jpeg', 0.9)); cellPx = 80; W = map.W; H = map.H; }
      else { const f = byPath[String(s.map || '').toLowerCase()] || byPath[String(s.map || '').split('/').pop().toLowerCase()]; if (!f) throw new Error(T('no picture {0}', s.map)); blob = f; cellPx = Number(s.cellPx) || 100; }
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
      built.push(await buildScene({ name: s.name || sc.name || 'Scene', mapBlob: blob, cellPx, tokens, walls: Array.isArray(s.walls) ? s.walls : (map && s.walls !== false ? map.walls : []), vision: s.vision || (s.fog ? 'dusk' : '') }));
      log.push('🗺 ' + esc(s.name || ''));
      } catch (e) { console.warn('scene upload', s.name, e); fails.push(esc(s.name || '?') + ': ' + esc((e && (e.message || e.error || JSON.stringify(e))) || e)); }
    }
    if (built.length) { msg('⏳ ' + T('Owlbear asks where to put the scenes: pick a folder (Default is fine) → «Upload scenes». Then wait — {0} maps are uploading.', built.length)); try { nOk = await uploadMany(built); } catch (e) { fails.push(esc((e && (e.message || e.error)) || String(e))); } }
    if (fails.length) log.unshift('⚠️ ' + T('Import errors:') + '<br>' + fails.slice(0, 8).join('<br>'));
    if (scs.length) log.unshift('🗺 ' + T('Scenes uploaded: {0} of {1}. Owlbear → Scenes (top left).', nOk, scs.length));
    U.render(); scenesPop();
    const failed = fails.length > 0 || nOk < scs.length;
    msg((failed ? '⚠️ ' + T('Scenario «{0}»: import incomplete.', esc(sc.name || '')) : '✅ ' + T('Scenario «{0}» loaded:', esc(sc.name || ''))) + '<br>' + log.join('<br>'));
    if (failed) U.toast('⚠️ ' + T('Scenes uploaded: {0} of {1}. Owlbear → Scenes (top left).', nOk, scs.length) + '<br>' + fails.slice(0, 3).join('<br>'));
  }

  U._importScenario = importFolder; // (tests)
  // the 🗺 button in the DM's top bar
  const top0 = U.renderTop;
  U.renderTop = function () { top0(); const el = document.getElementById('topCtl'); const ps = el && el.querySelector('[data-act="panelSize"]'); if (el && U.DM) (ps || el).insertAdjacentHTML(ps ? 'beforebegin' : 'beforeend', '<button class="tb" data-act="scenes" title="' + esc(T('Campaign scenes')) + '">🗺</button>'); };
  if (document.getElementById('topCtl')) U.renderTop();
})(window.UI);
