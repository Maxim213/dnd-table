// D&D Table — the DM draws walls and doors on ANY map picture (for the vision fog in obr-vision.js).
// Two modes of the ⚔️ D&D tool (DM only):
//   🧱 Walls: click, click, click… = a chain of walls (points snap to half squares; hold Ctrl = no snap).
//            Enter / double-click / Escape = end the chain, Backspace = undo the last wall, Alt+click a wall = delete it.
//   🚪 Doors: click a wall = it becomes a door (closed); click a door = open / close it; Shift+click a door = a plain wall again.
// Storage (shared, the same carrier our generated maps use): an invisible item with metadata
//   'dndtable/walls' = { s: [x1, y1, x2, y2, …] in squares, cell: px per square, f: [0 wall | 1 door closed | 2 door open per segment], mode }
// While a mode is on, the DM sees the walls as coloured lines (local items, only on his screen).

const WALLS = 'dndtable/walls', DRAW = 'dndtable/walldraw';
const TOOL = 'dndtable/tool', MW = 'dndtable/walls-mode', MD = 'dndtable/doors-mode';

export function startWalls(OBR, opts) {
  const tr = opts.tr || ((en, ru) => ru);
  const B = () => window.OBR_SDK;
  const icon = n => new URL('assets/icons/' + n + '.svg', location.href).href;
  let chain = null; // the last point of the chain being drawn, in squares
  let active = '';

  // ---------- the carrier ----------
  async function carrier() {
    const L = await OBR.scene.items.getItems(it => it.metadata && it.metadata[WALLS] && Array.isArray(it.metadata[WALLS].s));
    return L[0] || null;
  }
  async function dpi() { try { return (await OBR.scene.grid.getDpi()) || 150; } catch (e) { return 150; } }
  async function edit(fn) { // fn(w) changes { s, f } in place
    let car = await carrier(); const cell = await dpi();
    if (!car) {
      const w = { s: [], f: [], cell, mode: '' }; fn(w);
      const item = B().buildCurve().points([{ x: 0, y: 0 }, { x: 1, y: 0 }]).position({ x: 0, y: 0 }).strokeOpacity(0).fillOpacity(0).strokeWidth(0).tension(0).closed(false)
        .layer('DRAWING').locked(true).disableHit(true).name('D&D Table: walls').metadata({ [WALLS]: w }).build();
      await OBR.scene.items.addItems([item]); return;
    }
    await OBR.scene.items.updateItems([car.id], items => items.forEach(it => {
      const w = Object.assign({}, it.metadata[WALLS]); w.s = (w.s || []).slice(); w.f = (w.f || []).slice(); w.cell = w.cell || cell;
      while (w.f.length < w.s.length / 4) w.f.push(0);
      fn(w); it.metadata[WALLS] = w;
    }));
  }

  // ---------- geometry ----------
  async function toSq(p, free) {
    const g = await dpi(); const k = free ? 100 : 2; // half squares, or (Ctrl) almost free
    return { x: Math.round(p.x / g * k) / k, y: Math.round(p.y / g * k) / k };
  }
  const distSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1e-9; let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  async function nearest(p) { // the segment under the click (within 0.35 squares)
    const car = await carrier(); if (!car) return -1; const w = car.metadata[WALLS]; const g = await dpi(); const q = { x: p.x / g, y: p.y / g };
    let best = -1, bd = 0.35;
    for (let i = 0; i + 3 < w.s.length; i += 4) { const d = distSeg(q, { x: w.s[i], y: w.s[i + 1] }, { x: w.s[i + 2], y: w.s[i + 3] }); if (d < bd) { bd = d; best = i / 4; } }
    return best;
  }

  // ---------- what the DM sees ----------
  async function clearDraw() { try { const L = await OBR.scene.local.getItems(it => it.metadata && it.metadata[DRAW]); if (L.length) await OBR.scene.local.deleteItems(L.map(it => it.id)); } catch (e) {} }
  async function draw() {
    await clearDraw(); if (!active) return;
    const car = await carrier(); const g = await dpi(); const add = [];
    const path = (cmds, color, width, dash) => { const b = B().buildPath().commands(cmds).strokeColor(color).strokeWidth(width).fillOpacity(0).strokeOpacity(0.95).layer('DRAWING').locked(true).disableHit(true).metadata({ [DRAW]: 1 }); if (dash && b.strokeDash) b.strokeDash([12, 8]); return b.build(); };
    if (car) {
      const w = car.metadata[WALLS]; const f = w.f || []; const c = w.cell || g; const groups = { 0: [], 1: [], 2: [] };
      for (let i = 0; i + 3 < w.s.length; i += 4) groups[f[i / 4] || 0].push([0, w.s[i] * c, w.s[i + 1] * c], [1, w.s[i + 2] * c, w.s[i + 3] * c]);
      if (groups[0].length) add.push(path(groups[0], '#ff4d4d', 8));
      if (groups[1].length) add.push(path(groups[1], '#ffb020', 12));
      if (groups[2].length) add.push(path(groups[2], '#3ddc84', 12, true));
    }
    if (chain) add.push(B().buildShape().shapeType('CIRCLE').width(g * 0.3).height(g * 0.3).position({ x: chain.x * g, y: chain.y * g }).fillColor('#ffd84d').strokeWidth(0).layer('DRAWING').locked(true).disableHit(true).metadata({ [DRAW]: 1 }).build());
    if (add.length) try { await OBR.scene.local.addItems(add); } catch (e) { console.warn('walls draw', e); }
  }
  const say = (t, v) => { try { OBR.notification.show(t, v || 'INFO'); } catch (e) {} };

  // ---------- 🧱 walls ----------
  async function wallClick(ev) {
    const p = ev.pointerPosition;
    if (ev.altKey) { const k = await nearest(p); if (k >= 0) { await edit(w => { w.s.splice(k * 4, 4); w.f.splice(k, 1); }); } chain = null; draw(); return; }
    const q = await toSq(p, ev.ctrlKey || ev.metaKey);
    if (chain && (chain.x !== q.x || chain.y !== q.y)) { const a = chain; await edit(w => { w.s.push(a.x, a.y, q.x, q.y); w.f.push(0); }); }
    chain = q; draw();
  }
  async function undo() { await edit(w => { if (w.s.length >= 4) { const n = w.s.length; chain = { x: w.s[n - 4], y: w.s[n - 3] }; w.s.splice(n - 4, 4); w.f.pop(); } }); draw(); }
  // ---------- 🚪 doors ----------
  async function doorClick(ev) {
    const k = await nearest(ev.pointerPosition); if (k < 0) { say(tr('Click right on a wall line.', 'Кликни прямо по линии стены.')); return; }
    await edit(w => { const v = w.f[k] || 0; w.f[k] = ev.shiftKey ? 0 : v === 0 ? 1 : v === 1 ? 2 : 1; });
    draw();
  }

  (async () => {
    try {
      await OBR.tool.createMode({
        id: MW, icons: [{ icon: icon('walls'), label: tr('Walls: click corners · Enter = end · Backspace = undo · Alt+click = delete', 'Стены: клик по углам · Enter — конец · Backspace — отмена · Alt+клик — удалить'), filter: { activeTools: [TOOL], roles: ['GM'] } }],
        cursors: [{ cursor: 'crosshair' }],
        onToolClick: (c, e) => { wallClick(e); return false; },
        onToolDoubleClick: () => { chain = null; draw(); return false; },
        onKeyDown: (c, e) => { if (e.key === 'Enter' || e.key === 'Escape') { chain = null; draw(); } else if (e.key === 'Backspace') undo(); },
        onActivate: () => { active = 'walls'; chain = null; draw(); say(tr('Walls: click the corners of a wall one by one. Enter ends the line.', 'Стены: кликай по углам стены по очереди. Enter — закончить линию.')); },
        onDeactivate: () => { active = ''; chain = null; clearDraw(); }
      });
      await OBR.tool.createMode({
        id: MD, icons: [{ icon: icon('doors'), label: tr('Doors: click a wall = door · click a door = open / close · Shift+click = wall', 'Двери: клик по стене — дверь · клик по двери — открыть / закрыть · Shift+клик — снова стена'), filter: { activeTools: [TOOL], roles: ['GM'] } }],
        cursors: [{ cursor: 'pointer' }],
        onToolClick: (c, e) => { doorClick(e); return false; },
        onActivate: () => { active = 'doors'; draw(); },
        onDeactivate: () => { active = ''; clearDraw(); }
      });
    } catch (e) { console.warn('walls tool', e); }
  })();
  try { OBR.scene.items.onChange(() => { if (active) draw(); }); } catch (e) {}
}
