// The token window (card.html, an ES module). Two places show it:
//   • Owlbear's context menu (right click / select ONE token → "D&D Table")      → card.html            (what: the selected token)
//   • a window next to the click with the ⚔️ D&D tool (obr-bg.js opens it)       → card.html?pop=1      (what: obrPop = { id } token or { point } map)
// A token is linked to a hero or a fight entry through its metadata 'dndtable/link':
//   { k: 'pc', cid, n } — a hero (by id)          { k: 'mon', eid, n } — a monster in the fight (by entry id, or by name)
// In a fight a player sees what his hero can do RIGHT HERE:
//   click yourself → heals, buffs, Dash / Dodge / Disengage / Hide, spells around you, End my turn
//   click an ally  → heals, buffs, Help            click an enemy → attacks, spells, Grapple / Shove (with the distance check)
//   click the map  → area spells (Fireball, Burning Hands…): a preview shows who is inside before you cast
// Outside a fight: a short card (who it is, HP / health, 📜 open in the panel).
// The DM gets his tools: link / unlink, real numbers, damage / heal, make it the target of whoever acts now.
// Everything a player does goes to the DM's app (broadcast 'act'), which checks the rules, rolls and applies it.
export function startCard(OBR, opts) {
  opts = opts || {};
  const POP = !!opts.pop;
  const LINK = 'dndtable/link', CH = 'dndtable/v1', POP_ID = 'dndtable/pop', PREV = 'dndtable/preview';
  const ruOn = () => { try { return (localStorage.getItem('dnd.lang') || 'ru') === 'ru'; } catch (e) { return true; } };
  const tr = (en, ru) => (ruOn() ? ru : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ST = { ok: ['Unhurt', 'Цел', '🟢'], hurt: ['Hurt', 'Ранен', '🟡'], bloodied: ['Badly hurt', 'Сильно ранен', '🟠'], dying: ['Barely alive', 'Еле жив', '🔴'], down: ['Down', 'Повержен', '💀'] };
  const COST = { a: ['🗡', 'Action', 'Действие'], b: ['⚡', 'Bonus', 'Бонусное'], r: ['🛡', 'Reaction', 'Реакция'], '-': ['', 'free', 'бесплатно'] };
  const el = document.getElementById('card');
  OBR.onReady(async () => {
    const role = await OBR.player.getRole(); const DM = role === 'GM';
    const P = DM ? 'dndt.' : 'dndp.';
    const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} };
    const game = () => (DM ? get('curGame', null) : '');
    const gk = k => (DM ? 'g.' + game() + '.' + k : k);
    let item = null, point = null, mode = 'normal', note = '', view = null; // view: null | { multi: entry } | { area: entry, pt, picked }
    let busy = false, floor = false, askId = '';

    // ---------- what was clicked ----------
    async function load() {
      item = null; point = null; floor = false;
      try {
        if (POP) {
          const c = get('obrPop', null) || {}; askId = c.ask || '';
          if (c.id) item = (await OBR.scene.items.getItems([c.id]))[0] || null;
          point = c.point || null;
        } else {
          const sel = await OBR.player.getSelection(); item = sel && sel.length === 1 ? ((await OBR.scene.items.getItems(sel))[0] || null) : null;
        }
        if (item && item.layer !== 'CHARACTER' && item.attachedTo) item = (await OBR.scene.items.getItems([item.attachedTo]))[0] || item; // clicked a tag / ring
        if (item && item.layer !== 'CHARACTER') { item = null; floor = true; } // the map / a drawing = the floor
      } catch (e) { item = null; }
    }
    const linkOf = it => (it && it.metadata && it.metadata[LINK]) || null;
    const fightPub = () => get(DM ? 'obrdm' : 'obrstate', null);
    const combat = () => (DM ? get(gk('combat'), null) : null);
    const monEntry = lk => {
      if (DM) { const cb = combat(); const L = (cb && cb.list) || []; return L.find(x => x.id === lk.eid) || L.find(x => x.type === 'mon' && x.name === lk.n) || null; }
      const f = fightPub(); const L = (f && f.list) || []; return L.find(x => x.id === lk.eid) || L.find(x => x.k === 'mon' && x.n === lk.n) || null;
    };
    const entryOfLink = lk => { const f = fightPub(); const L = (f && f.list) || []; if (!lk) return null; return lk.k === 'pc' ? L.find(x => x.cid === lk.cid) || null : L.find(x => x.id === lk.eid) || L.find(x => x.k === 'mon' && x.n === lk.n) || null; };
    const heroInfo = cid => {
      const f = fightPub() || {}; const inFight = (f.list || []).find(x => x.cid === cid); const party = (f.party || []).find(x => x.id === cid);
      const own = get(gk('chars'), []).find(c => c.id === cid);
      return { n: (own && own.name) || (party && party.n) || (inFight && inFight.n) || '?', lvl: (own && own.level) || (party && party.lvl) || '', hp: (inFight || party || {}).hp, mx: (inFight || party || {}).mx, ac: (inFight || party || {}).ac, cond: (inFight || party || {}).cond || [], pic: own ? (own.portraitThumb || own.portrait || '') : '', mine: !DM && !!own };
    };
    const bar = (hp, mx) => '<div class="tc-bar"><i style="width:' + Math.max(0, Math.min(100, Math.round((hp / (mx || 1)) * 100))) + '%"></i></div>';
    const CRU = { Blinded: 'Ослеплён', Charmed: 'Очарован', Deafened: 'Оглох', Exhaustion: 'Истощение', Frightened: 'Напуган', Grappled: 'Схвачен', Incapacitated: 'Недееспособен', Invisible: 'Невидим', Paralyzed: 'Парализован', Petrified: 'Окаменел', Poisoned: 'Отравлен', Prone: 'Сбит с ног', Restrained: 'Опутан', Stunned: 'Ошеломлён', Unconscious: 'Без сознания', Concentrating: 'Концентрация' };
    const conds = cs => (cs && cs.length ? '<div class="tc-sub">⚠️ ' + cs.map(x => esc(ruOn() ? CRU[x] || x : x)).join(', ') + '</div>' : '');
    const head = (pic, name, sub) => '<div class="tc-head">' + (pic && !/^(data:|https?:|blob:)/.test(pic) ? '<div class="tc-pic">' + esc(pic) + '</div>' : pic ? '<img class="tc-pic" src="' + esc(pic) + '">' : '<div class="tc-pic">' + esc(Array.from(String(name || '?'))[0]) + '</div>') + '<div><div class="tc-name">' + esc(name) + '</div><div class="tc-sub">' + sub + '</div></div>' + (POP ? '<button class="tc-x" data-do="close" title="' + tr('Close', 'Закрыть') + '">✕</button>' : '') + '</div>';

    // ---------- the map: tokens, distances, shapes ----------
    const G = { dpi: 150, mult: 5 };
    async function grid() { try { G.dpi = (await OBR.scene.grid.getDpi()) || 150; const s = await OBR.scene.grid.getScale(); const m = s && s.parsed ? Number(s.parsed.multiplier) : NaN; G.mult = m > 0 ? m : 5; } catch (e) {} }
    const linkedTokens = async () => { try { return await OBR.scene.items.getItems(it => it.layer === 'CHARACTER' && !!linkOf(it)); } catch (e) { return []; } };
    const tokenOfEntry = (toks, e) => toks.find(t => { const l = linkOf(t); return e.k === 'pc' || e.cid ? l.k === 'pc' && l.cid === e.cid : l.k === 'mon' && (l.eid === e.id || l.n === e.n); }) || null;
    async function boundsOf(t) { try { return await OBR.scene.items.getItemBounds([t.id]); } catch (e) { return null; } }
    async function feet(b1, b2) { // edge to edge, like the DM's app
      if (!b1 || !b2) return null;
      try {
        const cells = await OBR.scene.grid.getDistance(b1.center, b2.center);
        const s1 = Math.max(1, Math.round(Math.max(b1.width, b1.height) / G.dpi)), s2 = Math.max(1, Math.round(Math.max(b2.width, b2.height) / G.dpi));
        return Math.max(1, Math.round(cells - (s1 - 1) / 2 - (s2 - 1) / 2)) * G.mult;
      } catch (e) { return null; }
    }
    async function feetTo(b, pt) { if (!b || !pt) return null; try { return Math.round(await OBR.scene.grid.getDistance(b.center, pt)) * G.mult; } catch (e) { return null; } }
    // an area as a polygon in map pixels: sphere / cylinder / aura = circle, cube / square, cone, line (5 ft wide)
    function shapePoly(area, origin, toward, originB) {
      const px = G.dpi / G.mult; const n = area.n * px; const P = [];
      let dx = (toward ? toward.x - origin.x : 1), dy = (toward ? toward.y - origin.y : 0); const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
      const half = originB ? Math.max(originB.width, originB.height) / 2 : 0; const nx = -dy, ny = dx;
      if (area.s === 'sphere' || area.s === 'cylinder' || area.s === 'aura') {
        const r = area.s === 'aura' ? n + half : n; const c = area.s === 'aura' || area.o === 's' && !toward ? origin : origin;
        for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; P.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r }); }
      } else if (area.s === 'cube' || area.s === 'square') {
        const c = area.o === 's' ? { x: origin.x + dx * (half + n / 2), y: origin.y + dy * (half + n / 2) } : origin; const h = n / 2;
        if (area.o === 's') [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([u, v]) => P.push({ x: c.x + dx * u + nx * v, y: c.y + dy * u + ny * v }));
        else [[-h, -h], [h, -h], [h, h], [-h, h]].forEach(([u, v]) => P.push({ x: c.x + u, y: c.y + v }));
      } else if (area.s === 'cone') {
        const a0 = { x: origin.x + dx * half, y: origin.y + dy * half }; const e = { x: a0.x + dx * n, y: a0.y + dy * n };
        P.push(a0, { x: e.x + nx * n / 2, y: e.y + ny * n / 2 }, { x: e.x - nx * n / 2, y: e.y - ny * n / 2 });
      } else { // line, 5 ft wide
        const w = 2.5 * px; const a0 = { x: origin.x + dx * half, y: origin.y + dy * half }; const e = { x: a0.x + dx * n, y: a0.y + dy * n };
        P.push({ x: a0.x + nx * w, y: a0.y + ny * w }, { x: e.x + nx * w, y: e.y + ny * w }, { x: e.x - nx * w, y: e.y - ny * w }, { x: a0.x - nx * w, y: a0.y - ny * w });
      }
      return P;
    }
    const inPoly = (p, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if (((a.y > p.y) !== (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)) ins = !ins; } return ins; };
    // a token is inside when the centre of any square it covers is inside (big monsters cover several squares)
    const tokenIn = (b, P) => {
      const k = Math.max(1, Math.round(Math.max(b.width, b.height) / G.dpi)); const s = b.width / k;
      for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (inPoly({ x: b.center.x - b.width / 2 + s * (i + 0.5), y: b.center.y - b.height / 2 + s * (j + 0.5) }, P)) return true;
      return false;
    };
    async function drawPreview(P) {
      await clearPreview();
      if (!window.OBR_SDK || !window.OBR_SDK.buildCurve) return;
      try {
        const o = P[0]; const pts = P.map(p => ({ x: p.x - o.x, y: p.y - o.y }));
        const cv = window.OBR_SDK.buildCurve().points(pts).position(o).fillColor('#e0662f').fillOpacity(0.28).strokeColor('#f2c96b').strokeWidth(4).strokeOpacity(0.9).tension(0).closed(true).layer('DRAWING').locked(true).disableHit(true).metadata({ [PREV]: true }).build();
        await OBR.scene.local.addItems([cv]);
      } catch (e) { console.warn('preview', e); }
    }
    async function clearPreview() { try { const L = await OBR.scene.local.getItems(it => it.metadata && it.metadata[PREV]); if (L.length) await OBR.scene.local.deleteItems(L.map(it => it.id)); } catch (e) {} }

    // ---------- render ----------
    async function render() {
      if (busy) return; busy = true;
      try { let h = await build() + (note ? '<p class="tc-msg">' + note + '</p>' : ''); if (POP && h.indexOf('data-do="close"') < 0) h = '<div class="tc-topx"><button data-do="close" title="' + tr('Close', 'Закрыть') + '">✕</button></div>' + h; el.innerHTML = h; }
      catch (e) { el.innerHTML = '<p class="tc-msg">⚠️ ' + esc(e.message || e) + '</p>'; console.warn(e); }
      finally { busy = false; }
    }
    async function build() {
      if (POP && askId) return askView(); // the DM's app asks me something (save / Shield / opportunity attack)
      const lk = linkOf(item);
      if (!item && !point && !floor) return '<p class="tc-msg">' + tr('Select one token.', 'Выдели один токен.') + '</p>';
      if (DM) return dmFight(lk) + dmCard(lk);
      const f = fightPub();
      if (f && f.on) { const w = await fightWindow(f, lk); if (w) return w; }
      if (!item) return '<p class="tc-msg">' + tr('No fight right now — nothing to cast here.', 'Сейчас нет боя — здесь нечего применять.') + '</p>';
      if (!lk) return '<p class="tc-msg">' + tr('This token is not linked. The DM can link it to a hero or a monster.', 'Этот токен не привязан. Мастер может привязать его к герою или монстру.') + '</p>';
      return lk.k === 'pc' ? heroCard(lk) : monCard(lk);
    }

    // ---------- outside a fight / the DM ----------
    function heroCard(lk) {
      const h = heroInfo(lk.cid);
      let out = head(h.pic, h.n, (h.lvl ? tr('Level', 'Уровень') + ' ' + h.lvl + ' · ' : '') + (h.ac != null ? tr('AC', 'КД') + ' ' + h.ac : ''));
      if (h.hp != null) out += bar(h.hp, h.mx) + '<div class="tc-sub">❤️ ' + h.hp + ' / ' + h.mx + '</div>';
      out += conds(h.cond);
      out += '<div class="tc-row">' + (h.mine || DM ? '<button data-do="sheet" data-id="' + esc(lk.cid) + '">📖 ' + tr('Open in the panel', 'Открыть в панели') + '</button>' : '') +
        (DM ? '<button data-do="target">🎯 ' + tr('Target', 'Цель') + '</button><button data-do="unlink">✂️ ' + tr('Unlink', 'Отвязать') + '</button>' : '') + '</div>';
      return out;
    }
    function monCard(lk) {
      const e = monEntry(lk);
      if (!e) return head('', lk.n || '?', tr('not in the fight now', 'сейчас не в бою')) + (DM ? '<div class="tc-row"><button data-do="openmon" data-n="' + esc(lk.n || '') + '">📖 ' + tr('Open in the panel', 'Открыть в панели') + '</button><button data-do="unlink">✂️ ' + tr('Unlink', 'Отвязать') + '</button></div>' : '');
      if (DM) {
        return head('', e.name, (e.cr ? tr('CR', 'ПО') + ' ' + esc(e.cr) + ' · ' : '') + tr('AC', 'КД') + ' ' + esc(e.ac)) + bar(e.hp, e.hpMax) + '<div class="tc-sub">❤️ ' + e.hp + ' / ' + e.hpMax + '</div>' + conds(e.conditions) +
          '<div class="tc-row"><input type="number" min="0" id="amt" placeholder="0"><button data-do="dmg">− ' + tr('Damage', 'Урон') + '</button><button data-do="heal">+ ' + tr('Heal', 'Лечить') + '</button></div>' +
          '<div class="tc-row"><button data-do="target">🎯 ' + tr('Target of the active one', 'Цель того, кто ходит') + '</button><button data-do="openmon" data-n="' + esc(e.name || '') + '">📖 ' + tr('Panel', 'Панель') + '</button><button data-do="unlink">✂️</button></div>';
      }
      const s = ST[e.st] || ST.ok;
      return head('', e.n, s[2] + ' ' + (ruOn() ? s[1] : s[0])) + conds(e.cond);
    }
    // the DM in a fight: whoever acts now (a monster, or the DM's own hero) → its attacks against the clicked creature, with the chance to hit
    function dmFight(lk) {
      const f = fightPub(); if (!f || !f.on) return '';
      const L = f.list || []; const act = L[f.turn]; if (!act) return '';
      let h = '<div class="tc-turn">⚔️ ' + tr('Now acts', 'Сейчас ходит') + ': <b>' + esc(act.n) + '</b></div>';
      const next = '<div class="tc-row"><button data-do="dmnext">⏭ ' + tr('Next turn', 'Следующий ход') + '</button></div>';
      if (!f.acts) return h + '<p class="tc-hint">' + tr('A player\'s hero — the player acts himself.', 'Это герой игрока — он ходит сам.') + '</p>' + next;
      const tgt = lk ? entryOfLink(lk) : null;
      const pct = (hit, ac) => { let p = Math.max(0.05, Math.min(0.95, (21 - (ac - hit)) / 20)); if (mode === 'adv') p = 1 - (1 - p) * (1 - p); if (mode === 'dis') p = p * p; return Math.round(p * 100); };
      const btn = (a, tid) => '<button data-dmact="' + esc(a.id) + '" data-tid="' + esc(tid) + '"' + (a.blocked ? ' disabled' : '') + '><b>' + esc(a.n) + (a.heal ? ' ❤️' : '') + '</b><small>' + esc(a.info || '') +
        (a.hit != null && tgt && tgt.ac != null ? ' · 🎯 ' + pct(a.hit, Number(tgt.ac)) + '%' : '') + (a.left != null ? ' · ' + tr('left', 'осталось') + ' ' + a.left : '') + (a.blocked ? ' · ' + tr('used', 'потрачено') : '') + '</small></button>';
      if (tgt && tgt.id !== act.id) {
        h += '<h4>🎯 ' + esc(act.n) + ' → ' + esc(tgt.n) + (tgt.ac != null ? ' (' + tr('AC', 'КД') + ' ' + esc(tgt.ac) + ')' : '') + '</h4>' +
          '<div class="tc-row tc-mode">' + [['normal', tr('Normal', 'Обычно')], ['adv', '⬆ ' + tr('Advantage', 'Преимущество')], ['dis', '⬇ ' + tr('Disadvantage', 'Помеха')]].map(m => '<button data-mode="' + m[0] + '" class="' + (mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>' +
          '<div class="tc-acts">' + f.acts.filter(a => !a.area).map(a => btn(a, tgt.id)).join('') + '</div>';
      } else if (tgt && tgt.id === act.id) {
        const self = f.acts.filter(a => a.heal); if (self.length) h += '<h4>❤️ ' + tr('On itself', 'На себя') + '</h4><div class="tc-acts">' + self.map(a => btn(a, act.id)).join('') + '</div>';
      }
      const area = f.acts.filter(a => a.area);
      if (area.length && (!item || tgt)) h += '<h4>💥 ' + tr('Areas — hits every hero', 'Области — по всем героям') + '</h4><div class="tc-acts">' + area.map(a => btn(a, '__all')).join('') + '</div>';
      return h + next;
    }
    function dmCard(lk) {
      if (!item) return (fightPub() || {}).on ? '' : '<p class="tc-msg">' + tr('Click a token.', 'Кликни по токену.') + '</p>';
      if (!lk) return linkChooser();
      return lk.k === 'pc' ? heroCard(lk) : monCard(lk);
    }
    function linkChooser() {
      const chars = get(gk('chars'), []); const cb = combat(); const mons = ((cb && cb.list) || []).filter(x => x.type === 'mon');
      if (!game()) return '<p class="tc-msg">' + tr('Open a game in D&D Table first.', 'Сначала открой игру в D&D Table.') + '</p>';
      return '<div class="tc-link"><h4>🔗 ' + tr('Link this token to…', 'Привязать токен к…') + '</h4>' +
        (chars.length ? chars.map(c => '<button data-l="pc" data-id="' + esc(c.id) + '" data-n="' + esc(c.name) + '">🧙 ' + esc(c.name || '?') + (c.obr ? ' <small>🦉 ' + esc(c.obr.name) + '</small>' : '') + '</button>').join('') : '') +
        (mons.length ? '<h4>⚔️ ' + tr('In the fight', 'В бою') + '</h4>' + mons.map(x => '<button data-l="mon" data-id="' + esc(x.id) + '" data-n="' + esc(x.name) + '">👹 ' + esc(x.name) + '</button>').join('') : '<p class="tc-msg">' + tr('Monsters appear here once they are in the fight.', 'Монстры появятся здесь, когда будут в бою.') + '</p>') + '</div>';
    }

    // ---------- a player in a fight: what can I do with what I clicked ----------
    let lastCtx = null; // for clicks: { f, meIn, hero, ft, tEntry, kind, myB, toks }
    async function fightWindow(f, lk) {
      const menu = get('obrmenu', []); const mine = new Set(menu.map(m => m.cid));
      // a player with several heroes: the one whose turn it is acts; off-turn — the one he clicked, else the first
      const mineIn = (f.list || []).filter(x => x.cid && mine.has(x.cid)); const cur = f.list[f.turn];
      const meIn = mineIn.find(x => cur && x.id === cur.id) || (lk && lk.k === 'pc' ? mineIn.find(x => x.cid === lk.cid) : null) || mineIn[0];
      if (!meIn) return '';
      const hero = menu.find(m => m.cid === meIn.cid); if (!hero) return '';
      await grid();
      const toks = await linkedTokens(); const myTok = tokenOfEntry(toks, meIn); const myB = myTok ? await boundsOf(myTok) : null;
      let kind = 'point', tEntry = null, ft = null, tb = null;
      if (item) {
        if (!lk) return '';
        tEntry = entryOfLink(lk);
        if (!tEntry) return '';
        kind = tEntry.cid && tEntry.cid === meIn.cid ? 'self' : tEntry.k === 'pc' ? 'ally' : 'enemy';
        tb = await boundsOf(item); ft = kind === 'self' ? 0 : await feet(myB, tb);
      } else if (point) ft = await feetTo(myB, point);
      const myTurn = f.list[f.turn] && f.list[f.turn].cid === meIn.cid; const ec = meIn.ec || { a: 0, b: 0, r: 0 }; const strict = f.strict !== false;
      const mvMax = meIn.mvMax || hero.speed || 30; const left = Math.max(0, mvMax - (meIn.mv || 0));
      lastCtx = { f, meIn, hero, ft, tEntry, kind, myB, toks, tb, myTok, left, myTurn };
      if (view && view.area) return areaView();
      if (view && view.multi) return multiView();
      // header
      let h;
      if (kind === 'point') h = head('📍', tr('A spot on the map', 'Точка на карте'), (ft != null ? '📏 ' + ft + ' ' + tr('ft from you', 'фт от тебя') : tr('your token is not on the map', 'твоего токена нет на карте')));
      else if (kind === 'self') h = head(heroInfo(meIn.cid).pic, hero.n + ' — ' + tr('you', 'ты'), '❤️ ' + meIn.hp + ' / ' + meIn.mx + ' · ' + tr('AC', 'КД') + ' ' + meIn.ac);
      else if (kind === 'ally') h = head(heroInfo(tEntry.cid).pic, tEntry.n, '❤️ ' + tEntry.hp + ' / ' + tEntry.mx + (ft != null ? ' · 📏 ' + ft + ' ' + tr('ft', 'фт') : ''));
      else { const s = ST[tEntry.st] || ST.ok; h = head('', tEntry.n, s[2] + ' ' + (ruOn() ? s[1] : s[0]) + (ft != null ? ' · 📏 ' + ft + ' ' + tr('ft', 'фт') : '')); }
      h += conds(kind === 'point' ? [] : tEntry.cond);
      h += '<div class="tc-turn">' + (myTurn ? '⚔️ <b>' + tr('Your turn', 'Твой ход') + '</b> — ' + esc(hero.n) : '⏳ ' + tr('Not your turn — reactions only', 'Не твой ход — только реакция')) + ' · ' +
        ['a', 'b', 'r'].map(k => '<span class="tc-ec' + (ec[k] ? ' used' : '') + '">' + COST[k][0] + '</span>').join('') +
        ' · 🚶 ' + tr('left', 'осталось') + ' ' + left + ' ' + tr('ft', 'фт') + (strict ? '' : ' · 🕊 ' + tr('free rules', 'свободные правила')) + '</div>';
      if (kind === 'self') h += '<div class="tc-move">🚶 ' + (myTurn ? tr('You can still walk', 'Можно пройти ещё') + ' <b>' + left + ' ' + tr('ft', 'фт') + '</b> (' + Math.floor(left / G.mult) + ' ' + tr('squares', 'клет.') + ') ' + tr('of', 'из') + ' ' + mvMax + '.<br><small>' +
        tr('Hold your token with the ⚔️ D&D tool and drag: a green zone shows where you can get, the line shows what it costs. Or click the floor → «Walk here».', 'Зажми свой токен инструментом ⚔️ D&D и тяни: зелёная зона покажет, куда можешь дойти, линия — сколько потратишь. Или кликни по полу → «Идти сюда».') + '</small>'
        : tr('You walk on your turn: speed', 'Ходить можно в свой ход: скорость') + ' ' + (hero.speed || 30) + ' ' + tr('ft', 'фт')) + '</div>';
      // which actions fit what was clicked
      const acts = hero.acts || [];
      const pick = kind === 'self' ? acts.filter(a => (['s', 'a', 'x'].includes(a.tk) && !a.area) || (a.area && a.area.o === 'u'))
        : kind === 'ally' ? acts.filter(a => ['a', 'x'].includes(a.tk) && !a.area)
          : kind === 'enemy' ? acts.filter(a => ['e', 'x'].includes(a.tk) && !a.area)
            : acts.filter(a => (a.area && a.area.o !== 'u') || a.tk === 'n');
      const groups = kind === 'self' ? [[tr('❤️ Heal and help yourself', '❤️ Лечение и усиления на себя'), pick.filter(a => !a.area && (a.heal || a.tk !== 'n'))], [tr('🌀 Around you', '🌀 Вокруг тебя'), pick.filter(a => a.area)]]
        : kind === 'point' ? [[tr('💥 Areas — click one to see who it hits', '💥 Области — нажми, чтобы увидеть, кого заденет'), pick.filter(a => a.area)], [tr('✨ Magic with no target', '✨ Магия без цели'), pick.filter(a => !a.area)]]
          : [[kind === 'enemy' ? tr('⚔️ Against this enemy', '⚔️ Против этого врага') : tr('❤️ For this ally', '❤️ Для союзника'), pick]];
      if (kind === 'enemy') h += '<div class="tc-row tc-mode">' + [['normal', tr('Normal', 'Обычно')], ['adv', '⬆ ' + tr('Advantage', 'Преимущество')], ['dis', '⬇ ' + tr('Disadvantage', 'Помеха')]].map(m => '<button data-mode="' + m[0] + '" class="' + (mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>';
      groups.forEach(([title, list]) => { if (list.length) h += '<h4>' + title + '</h4><div class="tc-acts">' + list.map(a => actBtn(a, kind, ft, myTurn, ec, strict)).join('') + '</div>'; });
      if (!groups.some(g => g[1].length) && kind !== 'self') h += '<p class="tc-msg">' + (kind === 'point' ? tr('No area spells or bombs.', 'Нет заклинаний по области и бомб.') : tr('Nothing to use on this one.', 'Нечего применить на эту цель.')) + '</p>';
      if (kind === 'point') {
        if (!point) h += '<p class="tc-hint">' + tr('To pick a spot: take the ⚔️ D&D tool (key Y) and click the floor.', 'Чтобы выбрать точку: возьми инструмент ⚔️ D&D (клавиша Y) и кликни по полу.') + '</p>';
        else if (myB) {
          const need = ft == null ? 0 : ft; const ok = myTurn && need <= left;
          h += '<h4>🚶 ' + tr('Move', 'Движение') + '</h4><div class="tc-acts"><button data-do="walk"' + (ok || !strict ? '' : ' disabled') + '><b>🚶 ' + tr('Walk here', 'Идти сюда') + ' — ' + need + ' ' + tr('ft', 'фт') + '</b><small>' +
            (myTurn ? (need <= left ? tr('left after', 'останется') + ' ' + (left - need) + ' ' + tr('ft', 'фт') : '⛔ ' + tr('not enough movement', 'не хватит движения') + ': ' + tr('left', 'осталось') + ' ' + left + ' ' + tr('ft', 'фт')) : '⛔ ' + tr('not your turn', 'не твой ход')) + '</small></button></div>';
        }
      }
      // basic actions
      const basic = (v, icon, en, ru, cost, help) => basicBtn(v, icon + ' ' + tr(en, ru), cost, myTurn, ec, strict, help);
      if (kind === 'self') {
        h += '<h4>🏃 ' + tr('Actions anyone can take', 'Обычные действия') + '</h4><div class="tc-acts">' +
          basic('dash', '🏃', 'Dash', 'Рывок', 'a', tr('Double movement this turn', 'Двойное движение в этом ходу')) + basic('dodge', '🛡', 'Dodge', 'Уклонение', 'a', tr('Attacks against you: Disadvantage', 'Атаки по тебе с помехой')) +
          basic('disengage', '🚪', 'Disengage', 'Отход', 'a', tr('Walk away with no opportunity attacks', 'Уходишь без провоцированных атак')) + basic('hide', '🫥', 'Hide', 'Спрятаться', 'a', tr('Stealth vs 15', 'Скрытность против 15')) +
          (hero.rogue ? basic('dash', '🏃', 'Dash (bonus)', 'Рывок (бонус)', 'b', tr('Cunning Action', 'Хитрое действие')) + basic('disengage', '🚪', 'Disengage (bonus)', 'Отход (бонус)', 'b', tr('Cunning Action', 'Хитрое действие')) + basic('hide', '🫥', 'Hide (bonus)', 'Спрятаться (бонус)', 'b', tr('Cunning Action', 'Хитрое действие')) : '') + '</div>';
        if (myTurn) h += '<div class="tc-row"><button class="primary" data-do="end">⏭ ' + tr('End my turn', 'Закончить ход') + '</button></div>';
      }
      if (kind === 'ally') h += '<div class="tc-acts">' + basic('help', '🤝', 'Help', 'Помощь', 'a', tr('Their next attack or check: Advantage', 'Его следующая атака или проверка — с преимуществом')) + '</div>';
      if (kind === 'enemy') h += '<h4>✊ ' + tr('Wrestle', 'Борьба') + '</h4><div class="tc-acts">' + basic('grapple', '✊', 'Grapple', 'Захват', 'a', tr('Within 5 ft. Fail → Grappled', 'Вплотную (5 фт). Провал → Схвачен')) + basic('shove', '💢', 'Shove', 'Толкнуть', 'a', tr('Within 5 ft. Fail → Prone', 'Вплотную (5 фт). Провал → Сбит с ног')) + '</div>';
      return h;
    }
    // can it be done now? → '' (yes) or the reason
    function why(a, kind, ft, myTurn, ec) {
      if (a.left === 0) return a.lvl ? tr('no spell slots left', 'нет ячеек заклинаний') : tr('no uses left', 'заряды кончились');
      if (myTurn) { if (a.cost !== '-' && ec[a.cost]) return tr('already used this turn', 'уже потрачено в этом ходу') + ' (' + COST[a.cost][0] + ')'; }
      else if (!(a.cost === 'r' || (a.k === 'weapon' && kind === 'enemy')) || ec.r) return tr('not your turn', 'не твой ход');
      const r = a.rng;
      if (r && ft != null && kind !== 'self' && kind !== 'point') {
        if (r.k === 'melee' && ft > r.n) return tr('too far', 'далеко') + ': ' + ft + ' ' + tr('ft', 'фт') + ' — ' + tr('walk', 'подойди ещё на') + ' ' + (ft - r.n) + ' ' + tr('ft closer', 'фт') + (lastCtx && lastCtx.myTurn ? ' (' + tr('you have', 'у тебя') + ' ' + lastCtx.left + ' ' + tr('ft of movement', 'фт движения') + ')' : '');
        if (r.k === 'ranged' && ft > r.l) return tr('too far even for a long shot', 'слишком далеко даже для дальнего выстрела') + ' (' + ft + ' > ' + r.l + ')';
        if (r.k === 'spell' && ft > r.n) return tr('too far for the spell', 'далеко для заклинания') + ': ' + ft + ' > ' + r.n + ' ' + tr('ft', 'фт');
      }
      if (kind === 'point' && a.area && a.area.o === 'p' && r && ft != null && ft > r.n) return tr('the spot is too far', 'точка слишком далеко') + ': ' + ft + ' > ' + r.n + ' ' + tr('ft', 'фт');
      return '';
    }
    function hintOf(a, kind, ft) {
      const r = a.rng; const out = [];
      if (r && ft != null && kind === 'enemy' && r.k === 'ranged') { if (ft > r.n && ft <= r.l) out.push('⬇ ' + tr('long range: Disadvantage', 'дальний выстрел: помеха')); }
      if (a.area) out.push((a.area.o === 'u' ? tr('around you', 'вокруг тебя') : '') + ' ' + shapeName(a.area));
      if (a.m > 1) out.push(tr('up to', 'до') + ' ' + a.m + ' ' + tr('targets', 'целей'));
      if (a.left != null) out.push(tr('left', 'осталось') + ': ' + a.left);
      return out.join(' · ');
    }
    const shapeName = ar => ({ sphere: tr('sphere', 'сфера'), cylinder: tr('cylinder', 'цилиндр'), cube: tr('cube', 'куб'), square: tr('square', 'квадрат'), cone: tr('cone', 'конус'), line: tr('line', 'линия'), aura: tr('aura', 'аура') }[ar.s] || ar.s) + ' ' + ar.n + ' ' + tr('ft', 'фт');
    function actBtn(a, kind, ft, myTurn, ec, strict) {
      const w = why(a, kind, ft, myTurn, ec); const off = !!w && strict;
      const cost = !myTurn && a.k === 'weapon' && kind === 'enemy' ? '🛡 ' + tr('opportunity attack', 'провоцированная атака') : COST[a.cost] ? COST[a.cost][0] + ' ' + tr(COST[a.cost][1], COST[a.cost][2]) : '';
      const hint = hintOf(a, kind, ft);
      return '<button data-act="' + esc(a.id) + '"' + (off ? ' disabled' : '') + ' title="' + esc(a.desc || '') + '"><b>' + esc(a.n) + (a.heal ? ' ❤️' : '') + (a.conc ? ' 🧠' : '') + '</b><small>' + esc(a.info || '') + (cost ? ' · ' + cost : '') + '</small>' +
        (hint ? '<small>' + esc(hint) + '</small>' : '') + (w ? '<small class="' + (strict ? 'tc-no' : 'tc-warn') + '">' + (strict ? '⛔ ' : '⚠️ ') + esc(w) + '</small>' : '') + '</button>';
    }
    function basicBtn(v, label, cost, myTurn, ec, strict, help) {
      const ft = lastCtx && lastCtx.ft; let w = !myTurn ? tr('not your turn', 'не твой ход') : ec[cost] ? tr('already used this turn', 'уже потрачено в этом ходу') : '';
      if (!w && (v === 'grapple' || v === 'shove') && ft != null && ft > 5) w = tr('too far', 'далеко') + ': ' + ft + ' ' + tr('ft', 'фт');
      return '<button data-basic="' + v + '" data-cost="' + cost + '"' + (w && strict ? ' disabled' : '') + ' title="' + esc(help || '') + '"><b>' + esc(label) + '</b><small>' + COST[cost][0] + ' ' + tr(COST[cost][1], COST[cost][2]) + (help ? ' · ' + esc(help) : '') + '</small>' + (w ? '<small class="' + (strict ? 'tc-no' : 'tc-warn') + '">' + esc(w) + '</small>' : '') + '</button>';
    }

    // several targets (Bless, Magic Missile): tick who
    async function multiView() {
      const { f, meIn, toks, myB } = lastCtx; const a = view.multi;
      const side = a.tk === 'e' ? 'mon' : a.tk === 'a' ? 'pc' : '';
      const alive = x => x.k === 'pc' ? x.hp > 0 || a.heal : x.st !== 'down';
      const cands = []; for (const x of (f.list || [])) { if (side && x.k !== side) continue; if (!alive(x)) continue; const t = tokenOfEntry(toks, x); const ftx = t ? (x.cid === meIn.cid ? 0 : await feet(myB, await boundsOf(t))) : null; cands.push({ x, ft: ftx }); }
      if (!view.picked) view.picked = lastCtx.tEntry ? [lastCtx.tEntry.id] : [];
      const r = a.rng;
      let h = head('', a.n, tr('Choose up to', 'Выбери до') + ' ' + a.m + ' ' + tr('targets', 'целей') + (a.count > 1 ? '' : ''));
      h += '<div class="tc-link">' + cands.map(c => { const far = r && c.ft != null && c.ft > r.n; const on = view.picked.includes(c.x.id);
        return '<label class="tc-pick' + (far ? ' far' : '') + '"><input type="checkbox" data-pick="' + esc(c.x.id) + '"' + (on ? ' checked' : '') + '> ' + esc(c.x.n) + (c.x.cid === meIn.cid ? ' (' + tr('you', 'ты') + ')' : '') + (c.ft != null ? ' <small>📏 ' + c.ft + ' ' + tr('ft', 'фт') + (far ? ' — ' + tr('too far', 'далеко') : '') + '</small>' : '') + '</label>'; }).join('') + '</div>';
      h += '<div class="tc-row"><button class="primary" data-do="multigo"' + (view.picked.length ? '' : ' disabled') + '>✨ ' + tr('Cast', 'Применить') + ' (' + view.picked.length + '/' + a.m + ')</button><button data-do="back">↩ ' + tr('Back', 'Назад') + '</button></div>';
      return h;
    }
    // an area: preview on the map + who is inside (tick off whom to spare for "creatures of your choice")
    async function areaView() {
      const { f, meIn, toks, myB } = lastCtx; const a = view.area; const ar = a.area;
      if (!myB) return head('', a.n, '') + '<p class="tc-msg">' + tr('Put your token on the map first (the DM links it).', 'Сначала поставь свой токен на карту (мастер привяжет его).') + '</p><div class="tc-row"><button data-do="back">↩ ' + tr('Back', 'Назад') + '</button></div>';
      const aim = get('obrAim', null); const pt = (aim && aim.point) || view.pt || point || (lastCtx.tb && lastCtx.tb.center) || null;
      if (ar.o !== 'u' && !pt) return head('', a.n, '') + '<p class="tc-msg">' + tr('Click a spot on the map with the ⚔️ D&D tool.', 'Кликни по точке на карте инструментом ⚔️ D&D.') + '</p>';
      const origin = ar.o === 'p' ? pt : myB.center; const toward = ar.o === 's' ? pt : null;
      const Pg = shapePoly(ar, origin, toward, ar.o === 'p' ? null : myB); await drawPreview(Pg);
      const inside = [];
      for (const x of (f.list || [])) { if (ar.o !== 'p' && x.cid === meIn.cid) continue; const t = tokenOfEntry(toks, x); if (!t) continue; const b = await boundsOf(t); if (b && tokenIn(b, Pg)) inside.push(x); } // the caster is never inside his own cone / aura
      const isHeal = !!a.heal;
      if (!view.picked || view.ptKey !== JSON.stringify(pt)) { view.ptKey = JSON.stringify(pt); view.picked = inside.filter(x => isHeal ? x.k === 'pc' : !(ar.o === 'u' && x.k === 'pc')).map(x => x.id); }
      const ft = ar.o === 'p' ? await feetTo(myB, pt) : null; const far = a.rng && ft != null && ft > a.rng.n;
      let h = head('', a.n, shapeName(ar) + (ft != null ? ' · 📏 ' + ft + ' ' + tr('ft', 'фт') : '') + (a.info ? ' · ' + esc(a.info) : ''));
      h += '<p class="tc-hint">' + (ar.o === 'u' ? tr('Around you. ', 'Вокруг тебя. ') : POP ? tr('Click another spot on the map to move it. ', 'Кликни в другое место на карте, чтобы сдвинуть. ') : '') + tr('Untick whom you spare.', 'Сними галочку с тех, кого щадишь.') + '</p>';
      if (far) h += '<p class="tc-no">⛔ ' + tr('Too far for this spell', 'Слишком далеко для заклинания') + ': ' + ft + ' > ' + a.rng.n + ' ' + tr('ft', 'фт') + '</p>';
      h += '<div class="tc-link">' + (inside.length ? inside.map(x => { const ally = x.k === 'pc'; const on = view.picked.includes(x.id);
        return '<label class="tc-pick' + (ally && !isHeal ? ' ally' : '') + '"><input type="checkbox" data-pick="' + esc(x.id) + '"' + (on ? ' checked' : '') + '> ' + (ally ? (isHeal ? '❤️ ' : '⚠️ ') : '👹 ') + esc(x.n) + (x.cid === meIn.cid ? ' (' + tr('you', 'ты') + ')' : '') + (ally && !isHeal ? ' <small>' + tr('ally!', 'союзник!') + '</small>' : '') + '</label>'; }).join('') : '<p class="tc-msg">' + tr('Nobody inside.', 'Внутри никого.') + '</p>') + '</div>';
      const strict = f.strict !== false;
      h += '<div class="tc-row"><button class="primary" data-do="areago"' + (far && strict ? ' disabled' : '') + '>🔥 ' + tr('Cast', 'Применить') + ' (' + view.picked.length + ')</button><button data-do="back">✕ ' + tr('Cancel', 'Отмена') + '</button></div>';
      view.pt = pt;
      return h;
    }

    // ---------- the DM's app asks me: roll my save / Shield? / hit the one running away ----------
    const ABN = { STR: ['STR', 'СИЛ'], DEX: ['DEX', 'ЛОВ'], CON: ['CON', 'ТЕЛ'], INT: ['INT', 'ИНТ'], WIS: ['WIS', 'МДР'], CHA: ['CHA', 'ХАР'] };
    const abn = k => (ABN[k] ? tr(ABN[k][0], ABN[k][1]) : k);
    const sgn = n => (n >= 0 ? '+' : '') + n;
    function askView() {
      const m = get('obrAsk', null);
      if (!m || m.id !== askId) return '<p class="tc-msg">' + tr('Nothing to answer now.', 'Сейчас отвечать не на что.') + '</p>';
      const hero = get('obrmenu', []).find(x => x.cid === m.cid) || { acts: [], saves: {} };
      if (m.done) return head('', hero.n || m.hero || '', '') + '<p class="tc-msg">' + m.done + '</p>';
      if (m.type === 'saveReq') {
        const b = (hero.saves || {})[m.abil] || 0;
        return head('🎲', tr('Saving throw', 'Спасбросок') + ' ' + abn(m.abil), esc(m.what || '') + (m.by ? ' — ' + esc(m.by) : '')) +
          '<p class="tc-hint">' + tr('Roll d20', 'Брось d20') + ' ' + sgn(b) + ' — ' + tr('you need', 'нужно') + ' <b>' + m.dc + '</b> ' + tr('or more', 'или больше') + '.' + (m.mode === 'adv' ? ' ⬆ ' + tr('Advantage', 'С преимуществом') : m.mode === 'dis' ? ' ⬇ ' + tr('Disadvantage', 'С помехой') : '') + '</p>' +
          '<div class="tc-row"><button class="primary big" data-ans="save">🎲 ' + tr('Roll', 'Бросить') + ' ' + abn(m.abil) + ' ' + sgn(b) + '</button></div>';
      }
      if (m.type === 'shieldReq') {
        return head('🛡', tr('You are hit!', 'По тебе попали!'), esc(m.by || '') + ' — ' + esc(m.what || '')) +
          '<p class="tc-hint">' + tr('Attack', 'Атака') + ' <b>' + m.total + '</b> ' + tr('vs your AC', 'против твоего КД') + ' ' + m.ac + '. ' + tr('Shield gives +5 AC until your next turn → this attack misses. Costs your reaction and a level 1 slot.', 'Щит даёт +5 КД до твоего следующего хода → эта атака промахнётся. Тратит реакцию и ячейку 1 уровня.') + '</p>' +
          '<div class="tc-row"><button class="primary" data-ans="shield-yes">🛡 ' + tr('Yes, Shield', 'Да, Щит') + '</button><button data-ans="shield-no">' + tr('No', 'Нет') + '</button></div>';
      }
      const melee = (hero.acts || []).filter(a => a.k === 'weapon' && (!a.rng || a.rng.k === 'melee'));
      return head('⚔️', esc(m.n || '') + ' ' + tr('runs away!', 'уходит!'), tr('Opportunity attack: one hit, costs your reaction', 'Провоцированная атака: один удар, тратит реакцию')) +
        '<div class="tc-acts">' + melee.map(a => '<button data-oa="' + esc(a.id) + '"><b>' + esc(a.n) + '</b><small>' + esc(a.info || '') + '</small></button>').join('') + '</div>' +
        '<div class="tc-row"><button data-ans="oa-no">' + tr('Let it go', 'Пусть уходит') + '</button></div>';
    }
    async function answer(msg, doneTxt) {
      const m = get('obrAsk', null); if (!m) return;
      try { if (msg) await OBR.broadcast.sendMessage(CH, Object.assign({ id: m.id }, msg)); } catch (e) {}
      m.done = doneTxt; set('obrAsk', m); render();
      setTimeout(() => { try { OBR.popover.close(POP_ID); } catch (e) {} }, 2200);
    }

    // ---------- send to the DM ----------
    async function send(req) {
      let player = ''; try { player = await OBR.player.getName(); } catch (er) {}
      const hero = lastCtx && lastCtx.hero;
      req = Object.assign({ id: Math.random().toString(36).slice(2, 10), t: Date.now(), cid: hero ? hero.cid : '', atok: lastCtx && lastCtx.myTok ? lastCtx.myTok.id : '', ttok: item && lastCtx && lastCtx.kind !== 'point' ? item.id : '', ft: lastCtx && lastCtx.kind !== 'point' && lastCtx.ft != null ? lastCtx.ft : undefined, mode, from: hero ? hero.n : '', player }, req);
      try { await OBR.broadcast.sendMessage(CH, { type: 'act', req }); note = '⏳ ' + tr('Sent to the DM — the result shows up in the roll log.', 'Отправлено мастеру — результат появится в журнале бросков.'); }
      catch (er) { note = '⚠️ ' + esc(er.message || er); }
      mode = 'normal'; view = null; set('obrAim', null); await clearPreview(); render();
      if (POP) setTimeout(() => { try { OBR.popover.close(POP_ID); } catch (e) {} }, 1400);
    }

    // ---------- clicks ----------
    el.addEventListener('change', ev => {
      const cbx = ev.target.closest('[data-pick]'); if (!cbx || !view) return;
      const id = cbx.dataset.pick; view.picked = (view.picked || []).filter(x => x !== id); if (cbx.checked) view.picked.push(id);
      if (view.multi && view.picked.length > view.multi.m) { view.picked.shift(); }
      render();
    });
    el.addEventListener('click', async ev => {
      const b = ev.target.closest('button'); if (!b) return; note = '';
      if (b.dataset.l) { // DM: link
        const link = b.dataset.l === 'pc' ? { k: 'pc', cid: b.dataset.id, n: b.dataset.n } : { k: 'mon', eid: b.dataset.id, n: b.dataset.n };
        await OBR.scene.items.updateItems([item.id], items => { items.forEach(it => { it.metadata[LINK] = link; }); });
        await load(); render(); return;
      }
      if (b.dataset.mode) { mode = b.dataset.mode; render(); return; }
      if (b.dataset.ans || b.dataset.oa) {
        const m = get('obrAsk', null); if (!m) return;
        if (b.dataset.ans === 'save') {
          const hero = get('obrmenu', []).find(x => x.cid === m.cid) || {}; const bn = (hero.saves || {})[m.abil] || 0;
          const d1 = 1 + Math.floor(Math.random() * 20), d2 = 1 + Math.floor(Math.random() * 20);
          const nat = m.mode === 'adv' ? Math.max(d1, d2) : m.mode === 'dis' ? Math.min(d1, d2) : d1;
          const tot = nat + bn;
          answer({ type: 'saveRes', nat }, '🎲 ' + (m.mode === 'adv' || m.mode === 'dis' ? d1 + ', ' + d2 + ' → ' : '') + nat + ' ' + sgn(bn) + ' = <b>' + tot + '</b> ' + (tot >= m.dc ? '≥ ' + m.dc + ' — ' + tr('looks like a success!', 'похоже, устоял!') : '&lt; ' + m.dc + ' — ' + tr('looks like a fail…', 'похоже, провал…')) + '<br><small>' + tr('The DM\'s app adds the rest (Bless…) and writes the result to the log.', 'Приложение мастера добавит остальное (Благословение…) и запишет итог в журнал.') + '</small>');
        } else if (b.dataset.ans === 'shield-yes') answer({ type: 'shieldRes', yes: true }, '🛡 ' + tr('Shield!', 'Щит!'));
        else if (b.dataset.ans === 'shield-no') answer({ type: 'shieldRes', yes: false }, tr('No Shield.', 'Без Щита.'));
        else if (b.dataset.ans === 'oa-no') answer(null, tr('You let it go.', 'Ты его отпустил.'));
        else if (b.dataset.oa) {
          const hero = get('obrmenu', []).find(x => x.cid === m.cid) || {};
          let player = ''; try { player = await OBR.player.getName(); } catch (er) {}
          try { await OBR.broadcast.sendMessage(CH, { type: 'act', req: { id: Math.random().toString(36).slice(2, 10), t: Date.now(), cid: m.cid, aid: b.dataset.oa, tid: m.tid, ttok: m.ttok, oa: 1, mode: 'normal', from: hero.n || '', player } }); } catch (er) {}
          answer(null, '⚔️ ' + tr('Sent — see the log.', 'Отправлено — смотри журнал.'));
        }
        return;
      }
      if (DM && (b.dataset.dmact || b.dataset.do === 'dmnext')) { // to the DM's panel (online.js → dmAct): it rolls and applies
        const Q = get('obrActQ', []); Q.push({ id: Math.random().toString(36).slice(2, 10), t: Date.now(), dm: 1, kind: b.dataset.dmact ? 'act' : 'next', aid: b.dataset.dmact || '', tid: b.dataset.tid || '', mode });
        set('obrActQ', Q.slice(-20)); mode = 'normal';
        note = b.dataset.dmact ? '🎲 ' + tr('Rolled — see the log.', 'Брошено — смотри журнал.') : '⏭ ' + tr('Next turn.', 'Следующий ход.');
        try { if (!(await OBR.action.isOpen())) await OBR.action.open(); } catch (e) {} // the panel does the roll: it must be open
        setTimeout(render, 700); return;
      }
      if (b.dataset.act && lastCtx) {
        const a = (lastCtx.hero.acts || []).find(x => x.id === b.dataset.act); if (!a) return;
        if (a.area) { view = { area: a, pt: point || null }; if (POP && a.area.o !== 'u') set('obrAim', { t: Date.now(), point: point || (lastCtx.tb && lastCtx.tb.center) || null }); render(); return; }
        if (a.m > 1 && a.tk !== 's' && a.tk !== 'n') { view = { multi: a }; render(); return; }
        const tid = lastCtx.kind === 'self' || a.tk === 's' || a.tk === 'n' ? (a.tk === 'n' ? '' : lastCtx.meIn.id) : lastCtx.tEntry ? lastCtx.tEntry.id : '';
        send({ aid: a.id, tid }); return;
      }
      if (b.dataset.basic && lastCtx) { send({ kind: 'basic', basic: b.dataset.basic, bonus: b.dataset.cost === 'b', tid: lastCtx.tEntry && lastCtx.kind !== 'self' ? lastCtx.tEntry.id : '' }); return; }
      const d = b.dataset.do; const lk = linkOf(item);
      if (d === 'close') { await clearPreview(); set('obrAim', null); try { await OBR.popover.close(POP_ID); } catch (e) {} return; }
      if (d === 'back') { view = null; set('obrAim', null); await clearPreview(); render(); return; }
      if (d === 'multigo' && view && view.multi) { send({ aid: view.multi.id, tids: view.picked.slice(0, view.multi.m), tid: view.picked[0] }); return; }
      if (d === 'areago' && view && view.area) { send({ aid: view.area.id, tids: view.picked.slice(), area: { point: view.pt || (lastCtx.myB && lastCtx.myB.center), o: view.area.area.o } }); return; }
      if (d === 'end') { send({ kind: 'end' }); return; }
      if (d === 'walk' && lastCtx && lastCtx.myTok && point) { // move my token to the clicked square (the DM's app counts the feet)
        let p = point; try { p = await OBR.scene.grid.snapPosition(point, 1, false, true); } catch (e) {}
        try { await OBR.scene.items.updateItems([lastCtx.myTok.id], L => { L.forEach(x => { x.position = p; }); }); note = '🚶 ' + tr('Moved.', 'Пошёл.'); } catch (e) { note = '⚠️ ' + tr('Owlbear did not let you move this token.', 'Owlbear не дал сдвинуть токен.'); }
        render(); if (POP) setTimeout(() => { try { OBR.popover.close(POP_ID); } catch (e) {} }, 900); return;
      }
      if (d === 'unlink') { await OBR.scene.items.updateItems([item.id], items => { items.forEach(it => { delete it.metadata[LINK]; }); }); await load(); render(); return; }
      if (d === 'sheet' || d === 'openmon') { // the panel (online.js) opens the hero's sheet / the monster's stat block
        set('obrOpen', d === 'sheet' ? { k: 'hero', id: b.dataset.id, t: Date.now() } : { k: 'mon', n: b.dataset.n, eid: (monEntry(lk) || {}).id || '', t: Date.now() });
        try { await OBR.action.open(); } catch (er) {} note = tr('Opened in the D&D Table panel.', 'Открыто в панели D&D Table.'); render(); return;
      }
      if (DM && (d === 'dmg' || d === 'heal')) {
        const n = Math.max(0, Number((document.getElementById('amt') || {}).value) || 0); if (!n) return;
        const cb = combat(); const e = cb && cb.list.find(x => x.id === (monEntry(lk) || {}).id); if (!e) return;
        e.hp = d === 'dmg' ? Math.max(0, (Number(e.hp) || 0) - n) : Math.min(Number(e.hpMax) || 999, (Number(e.hp) || 0) + n);
        set(gk('combat'), cb); render(); return;
      }
      if (DM && d === 'target') {
        const cb = combat(); if (!cb || cb.turn < 0) { note = tr('No fight right now.', 'Сейчас боя нет.'); render(); return; }
        const active = cb.list[cb.turn]; let tid = '';
        if (lk.k === 'pc') { const x = cb.list.find(y => y.type === 'pc' && y.charId === lk.cid); tid = x ? x.id : ''; } else tid = (monEntry(lk) || {}).id || '';
        if (!active || !tid) { note = tr('Not in the fight.', 'Не участвует в бою.'); render(); return; }
        cb.target = cb.target || {}; cb.target[active.id] = tid; set(gk('combat'), cb);
        note = '🎯 ' + tr('Target set for', 'Цель выбрана для') + ' ' + esc(active.name || ''); render(); return;
      }
    });
    document.addEventListener('keydown', async e => { if (e.key === 'Escape' && view) { view = null; set('obrAim', null); await clearPreview(); render(); } });
    window.addEventListener('pagehide', () => { clearPreview(); });

    // ---------- keep it fresh ----------
    let lastSel = '';
    if (!POP) OBR.player.onChange(async p => { const s = JSON.stringify(p.selection || []); if (s !== lastSel) { lastSel = s; note = ''; view = null; await clearPreview(); await load(); render(); } });
    let tT = 0; const soon = () => { clearTimeout(tT); tT = setTimeout(async () => { await load(); render(); }, 120); };
    try { OBR.scene.items.onChange(() => soon()); } catch (e) {}
    window.addEventListener('storage', e => {
      const k = e.key || '';
      if (POP && k === P + 'obrPop') { view = null; note = ''; clearPreview(); soon(); return; } // a new click with the tool
      if (POP && k === P + 'obrAsk') { soon(); return; }
      if (k === P + 'obrAim' && view && view.area) { soon(); return; } // the area moved
      if (/obrstate|obrdm|obrmenu|combat|chars/.test(k)) soon();
    });
    await load(); render();
  });
}
