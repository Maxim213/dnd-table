// 👁 Vision fog for Owlbear (an ES module, started by obr-bg.js on every computer).
// The DM sets the light of the open scene (🔦 in his top bar → scene metadata 'dndtable/vision'):
//   off — no fog · day — the heroes see everything they have a line of sight to · dusk — 60 ft (or more with darkvision / a light)
//   dark — only their light (torch 40 ft, lantern 60 ft) or darkvision (60 / 120 ft); nothing at all: just the square they stand on
// Each player's computer draws its own fog (a LOCAL item only it sees, on Owlbear's FOG layer, above the tokens):
//   squares the party sees now are open, squares seen before are dim ("explored"), the rest is black.
// The party shares its sight (what one hero sees, all see). Walls block it: the walls of our generated maps
// (a carrier item with metadata 'dndtable/walls', in squares) and any WALL items (Owlbear's Dynamic Fog walls).
// The DM sees no fog (unless he turns on "show me the players' fog" — localStorage dnd.visionPreview = '1').
export function startVision(OBR, o) {
  const DM = o.DM, get = o.get;
  const VIS = 'dndtable/vision', LINK = 'dndtable/link', WALLS = 'dndtable/walls', FOG = 'dndtable/visfog';
  const LIGHT_FT = { torch: 40, lantern: 60, light: 40, daylight: 60 };
  let mode = 'off', epoch = 0, sceneKey = '', explored = new Set(), busy = false, again = false, T = 0;
  const preview = () => { try { return localStorage.getItem('dnd.visionPreview') === '1'; } catch (e) { return false; } };
  const exKey = () => 'dnd.explored.' + sceneKey + '.' + epoch;
  const loadEx = () => { try { explored = new Set(JSON.parse(localStorage.getItem(exKey()) || '[]')); } catch (e) { explored = new Set(); } };
  const saveEx = () => { try { localStorage.setItem(exKey(), JSON.stringify([...explored].slice(-6000))); } catch (e) {} };

  // segment–segment intersection (proper crossing; touching at an end does not block)
  function cross(ax, ay, bx, by, cx, cy, dx, dy) {
    const r1 = bx - ax, r2 = by - ay, s1 = dx - cx, s2 = dy - cy; const den = r1 * s2 - r2 * s1; if (!den) return false;
    const t = ((cx - ax) * s2 - (cy - ay) * s1) / den, u = ((cx - ax) * r2 - (cy - ay) * r1) / den;
    return t > 0.0001 && t < 0.9999 && u > 0.0001 && u < 0.9999;
  }
  function blocked(ax, ay, bx, by, walls) {
    const minx = Math.min(ax, bx), maxx = Math.max(ax, bx), miny = Math.min(ay, by), maxy = Math.max(ay, by);
    for (const w of walls) { if (w[5] < minx || w[4] > maxx || w[7] < miny || w[6] > maxy) continue; /* boxes do not touch: skip */ if (cross(ax, ay, bx, by, w[0], w[1], w[2], w[3])) return true; }
    return false;
  }

  async function recompute() {
    if (busy) { again = true; return; } busy = true;
    try {
      if (!(await OBR.scene.isReady())) { await clear(); return; }
      const md = (await OBR.scene.getMetadata()) || {}; let v = md[VIS];
      // the DM opens one of our dungeon scenes for the first time: it starts dark by itself (the scene carries its default)
      if (!v && DM) { const car = (await OBR.scene.items.getItems(it => it.metadata && it.metadata[WALLS] && it.metadata[WALLS].mode))[0]; if (car) { v = { mode: car.metadata[WALLS].mode, epoch: 0 }; await OBR.scene.setMetadata({ [VIS]: v }); } }
      v = v || {};
      mode = v.mode || 'off'; if ((v.epoch || 0) !== epoch) { epoch = v.epoch || 0; sceneKey = ''; }
      if (mode === 'off' || (DM && !preview())) { await clear(); return; }
      const dpi = (await OBR.scene.grid.getDpi()) || 150; const sc = await OBR.scene.grid.getScale(); const mult = (sc && sc.parsed && Number(sc.parsed.multiplier)) || 5;
      const all = await OBR.scene.items.getItems(() => true);
      const maps = all.filter(it => it.layer === 'MAP');
      if (!maps.length) { await clear(); return; }
      // the area to cover: the map pictures, in squares
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const m of maps) { try { const b = await OBR.scene.items.getItemBounds([m.id]); x0 = Math.min(x0, b.min.x); y0 = Math.min(y0, b.min.y); x1 = Math.max(x1, b.max.x); y1 = Math.max(y1, b.max.y); } catch (e) {} }
      if (!isFinite(x0)) { await clear(); return; }
      const cx0 = Math.floor(x0 / dpi), cy0 = Math.floor(y0 / dpi), cx1 = Math.ceil(x1 / dpi), cy1 = Math.ceil(y1 / dpi);
      const key = maps.map(m => m.id).sort().join(',');
      if (key !== sceneKey) { sceneKey = key; loadEx(); }
      // walls, in map pixels: [x1, y1, x2, y2, minx, maxx, miny, maxy]
      const walls = [];
      const addW = (a, b, c, d) => walls.push([a, b, c, d, Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)]);
      all.forEach(it => {
        const w = it.metadata && it.metadata[WALLS];
        if (w && Array.isArray(w.s)) { const g = w.cell || dpi; const f = w.f || []; for (let i = 0; i + 3 < w.s.length; i += 4) { if (f[i / 4] === 2) continue; /* an open door */ addW(w.s[i] * g, w.s[i + 1] * g, w.s[i + 2] * g, w.s[i + 3] * g); } }
        if (it.type === 'WALL' && Array.isArray(it.points)) { const p = it.position || { x: 0, y: 0 }; for (let i = 0; i + 1 < it.points.length; i++) addW(p.x + it.points[i].x, p.y + it.points[i].y, p.x + it.points[i + 1].x, p.y + it.points[i + 1].y); }
      });
      // the party's eyes: every hero token on the map
      const st = get(DM ? 'obrdm' : 'obrstate', null) || {}; const party = st.party || [];
      const eyes = [];
      for (const it of all) {
        const l = it.layer === 'CHARACTER' && it.metadata && it.metadata[LINK]; if (!l || l.k !== 'pc') continue;
        const h = party.find(p => p.id === l.cid) || {};
        const dv = Number(h.dv) || 0, lt = Number(h.lt) || 0;
        const vr = Number(h.vr) || 0; // the DM typed how far this hero sees (🔦): exactly that, in dusk and dark
        const ft = mode === 'day' ? Infinity : vr ? Math.max(vr, mult) : mode === 'dusk' ? Math.max(60, dv, lt) : Math.max(dv, lt, mult); // in the dark with nothing: just the squares next to you
        let c; try { c = (await OBR.scene.items.getItemBounds([it.id])).center; } catch (e) { c = it.position; }
        eyes.push({ x: c.x, y: c.y, cells: ft === Infinity ? 1e9 : Math.floor(ft / mult) });
      }
      // which squares the party sees now
      const vis = new Set();
      const samples = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
      for (let gy = cy0; gy < cy1; gy++) for (let gx = cx0; gx < cx1; gx++) {
        for (const e of eyes) {
          const ex = Math.floor(e.x / dpi), ey = Math.floor(e.y / dpi);
          if (Math.max(Math.abs(gx - ex), Math.abs(gy - ey)) > e.cells) continue;
          if (gx === ex && gy === ey) { vis.add(gx + ',' + gy); break; }
          if (samples.some(([sx, sy]) => !blocked(e.x, e.y, (gx + sx) * dpi, (gy + sy) * dpi, walls))) { vis.add(gx + ',' + gy); break; }
        }
      }
      vis.forEach(k => explored.add(k)); saveEx();
      window.__visionLast = { mode, eyes: eyes.length, walls: walls.length, seen: vis.size, area: [cx0, cy0, cx1, cy1] }; // (to check it)
      // the fog: runs of squares per row, black (never seen) and dim (seen before)
      const dark = [], dim = [];
      for (let gy = cy0; gy < cy1; gy++) {
        let run = null;
        const flush = () => { if (run) { (run.k === 'dark' ? dark : dim).push([run.a, gy, run.b, gy + 1]); run = null; } };
        for (let gx = cx0; gx <= cx1; gx++) {
          const k = gx === cx1 || vis.has(gx + ',' + gy) ? null : explored.has(gx + ',' + gy) ? 'dim' : 'dark';
          if (run && run.k === k) { run.b = gx + 1; continue; }
          flush(); if (k) run = { k, a: gx, b: gx + 1 };
        }
        flush();
      }
      await draw('dark', dark, dpi, DM ? 0.55 : 1);
      await draw('dim', dim, dpi, DM ? 0.3 : 0.62);
    } catch (e) { console.warn('vision', e); }
    finally { busy = false; if (again) { again = false; soon(); } }
  }
  const ids = {};
  async function draw(kind, rects, dpi, op) {
    const B = window.OBR_SDK;
    const cmds = []; rects.forEach(([a, b, c, d]) => { cmds.push([0, a * dpi, b * dpi], [1, c * dpi, b * dpi], [1, c * dpi, d * dpi], [1, a * dpi, d * dpi], [5]); });
    if (!cmds.length) cmds.push([0, 0, 0], [5]);
    try {
      const have = await OBR.scene.local.getItems(it => it.metadata && it.metadata[FOG] === kind);
      if (have.length) { await OBR.scene.local.updateItems(have.map(x => x.id), L => { L.forEach(x => { x.commands = cmds; x.style.fillOpacity = op; }); }, true); return; }
      if (!B || !B.buildPath) return;
      const p = B.buildPath().commands(cmds).fillRule('nonzero').fillColor('#050407').fillOpacity(op).strokeOpacity(0).strokeWidth(0).position({ x: 0, y: 0 }).layer('FOG').locked(true).disableHit(true).metadata({ [FOG]: kind }).build();
      ids[kind] = p.id; await OBR.scene.local.addItems([p]);
    } catch (e) { console.warn('vision draw', e); }
  }
  async function clear() { try { const L = await OBR.scene.local.getItems(it => it.metadata && it.metadata[FOG]); if (L.length) await OBR.scene.local.deleteItems(L.map(x => x.id)); } catch (e) {} }
  function soon() { clearTimeout(T); T = setTimeout(recompute, 150); }

  try { OBR.scene.items.onChange(soon); } catch (e) {}
  try { OBR.scene.onMetadataChange(soon); } catch (e) {}
  try { OBR.scene.onReadyChange(() => { sceneKey = ''; soon(); }); } catch (e) {}
  try { OBR.scene.grid.onChange(soon); } catch (e) {}
  window.addEventListener('storage', e => { if (/obrstate|obrdm|visionPreview/.test(e.key || '')) soon(); });
  soon();
  window.__vision = { recompute, soon };
  return { soon };
}
