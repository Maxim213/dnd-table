// Online bridge: runs only in index.html (the hosted version). Offline files never load it.
//  • role tag + ⇤/⇥ narrow / wide panel (inside Owlbear Rodeo)
//  • SYNC (with bg.html / obr-bg.js, the extension's background page):
//      the panel just saves as usual; this file marks what changed (log lines get an id, heroes get "upd" = time of change),
//      the DM's panel also writes a short fight summary (obrstate). The background page sends it all through Owlbear
//      and writes what comes from the others back into storage → we see the "storage" event here and redraw.
//  • players get a read-only ⚔️ Fight view (whose turn, health of the monsters, HP of the heroes)
(function (U) {
  const ON = window.ONLINE || {}; const OBR = window.OBR || null; const T = U.T, S = U.S, D = U.D, E = U.E, esc = U.esc;
  const SIZES = { narrow: { w: 440, h: 760 }, wide: { w: 1180, h: 820 } };
  const getSize = () => { try { return localStorage.getItem('dnd.panel') === 'wide' ? 'wide' : 'narrow'; } catch (e) { return 'narrow'; } };
  const applySize = async s => {
    try { localStorage.setItem('dnd.panel', s); } catch (e) {}
    if (OBR) { try { await OBR.action.setWidth(SIZES[s].w); await OBR.action.setHeight(SIZES[s].h); } catch (e) { console.warn(e); } }
    document.body.classList.toggle('panel-narrow', s === 'narrow');
  };
  const hideRolls = () => { try { return localStorage.getItem('dnd.hideRolls') === '1'; } catch (e) { return false; } };
  U.ONLINE = ON;
  U.obrNotify = (text, variant) => { if (OBR) try { OBR.notification.show(String(text).replace(/<[^>]+>/g, '').slice(0, 140), variant || 'DEFAULT'); } catch (e) {} };

  // ---------- top bar: Owlbear tag, narrow / wide, DM: rolls visible / hidden ----------
  const baseTop = U.renderTop;
  U.renderTop = function () {
    baseTop();
    const el = document.getElementById('topCtl'); if (!el) return;
    const s = getSize();
    if (ON.owlbear && U.DM) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="hideRolls" title="' + esc(hideRolls() ? T('Your rolls are hidden from the players — click to show them') : T('Players see your rolls — click to hide them')) + '">' + (hideRolls() ? '🙈' : '👁') + '</button>');
    if (ON.owlbear && U.DM) { const st = !U.strict || U.strict(); el.insertAdjacentHTML('beforeend', '<button class="tb' + (st ? '' : ' freerules') + '" data-act="strictRules" title="' + esc(st ? T('Strict rules: the app refuses what breaks the rules (turns, distance, movement, slots). Click for free rules.') : T('Free rules: players may do anything, the log only says what broke the rules. Click for strict rules.')) + '">' + (st ? '⚖️' : '🕊') + '</button>'); }
    if (ON.owlbear) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="tableMusic" title="' + esc(T('Table music')) + '">🎼</button>');
    if (ON.owlbear) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="panelSize" title="' + esc(s === 'wide' ? T('Make the panel narrow (see the map)') : T('Make the panel wide')) + '">' + (s === 'wide' ? '⇥' : '⇤') + '</button>');
    const tag = document.getElementById('modeTag');
    if (tag && ON.owlbear && !tag.querySelector('.obrtag')) tag.insertAdjacentHTML('beforeend', ' <span class="obrtag" title="Owlbear Rodeo">🦉 ' + (ON.role === 'GM' ? T('Owlbear: DM') : T('Owlbear: player')) + '</span>');
  };
  U.ACT.panelSize = () => { applySize(getSize() === 'wide' ? 'narrow' : 'wide').then(() => U.renderTop()); };
  U.ACT.strictRules = () => {
    const on = !U.strict(); try { localStorage.setItem('dnd.strict', on ? '1' : '0'); } catch (e) {}
    U.renderTop(); if (U.saveCombat) U.saveCombat();
    U.toast(on ? '⚖️ ' + T('Strict rules: the app refuses what breaks the rules (turns, distance, movement, slots). Click for free rules.') : '🕊 ' + T('Free rules: players may do anything, the log only says what broke the rules. Click for strict rules.'));
  };
  U.ACT.hideRolls = () => { try { localStorage.setItem('dnd.hideRolls', hideRolls() ? '0' : '1'); } catch (e) {} U.renderTop(); U.toast(hideRolls() ? '🙈 ' + T('Your rolls are hidden from the players.') : '👁 ' + T('Players see your rolls.')); };

  if (!ON.owlbear) {
    if (ON.noSync) { // inside Owlbear but no connection: say it loudly
      const t0 = U.renderTop; U.renderTop = function () { t0(); const el = document.getElementById('topCtl'); if (el) el.insertAdjacentHTML('afterbegin', '<button class="tb sync-off" data-act="reconnect" title="' + esc(T('No connection to Owlbear: nothing syncs. Click to reconnect.')) + '">⚠️</button>'); };
      U.ACT.reconnect = () => location.reload();
    }
    window.ONLINE_START = () => { document.body.classList.add('online-direct'); U.renderTop(); if (ON.noSync) U.toast('⚠️ ' + T('No connection to Owlbear: nothing syncs. Click to reconnect.')); };
    return;
  }

  // ---------- 1. log lines get an id (so the background page sends each one once) ----------
  const baseSaveLog = U.saveLog;
  U.saveLog = function () { (S.log || []).forEach(e => { if (e && !e.id) { e.id = E.uid(); if (!e.remote) e.mine = 1; } }); const r = baseSaveLog(); local('log'); return r; };
  // when the panel itself runs the sync (no background page), tell it about our own saves (no "storage" event for them)
  const local = k => { const s = window.__obrSync; if (s && s.by === 'panel') setTimeout(() => s.key(P + (k === 'obrstate' || k === 'obrmusic' ? k : gk(k))), 0); };

  // ---------- 2. heroes get "upd" when they change (newest copy wins between DM and player) ----------
  const sig = c => { const x = Object.assign({}, c); delete x.upd; delete x.portrait; delete x.obr; return JSON.stringify(x); };
  let sigs = {};
  const remember = () => { sigs = {}; (S.chars || []).forEach(c => { sigs[c.id] = sig(c); }); };
  const baseSaveChars = U.saveChars;
  U.saveChars = function () {
    const now = Date.now();
    (S.chars || []).forEach(c => { const s = sig(c); if (sigs[c.id] !== s) { c.upd = now; sigs[c.id] = s; } });
    const r = baseSaveChars(); local('chars'); queueState(); thumbs(); saveMenu(); return r;
  };
  // portraits are too big for Owlbear (16 KB per message): my heroes carry a small 96×96 copy (portraitThumb, ~4 KB)
  const pKey = src => src ? src.length + ':' + src.slice(-32) : '';
  const makeThumb = src => new Promise(ok => {
    const img = new Image();
    img.onload = () => { try { const s = 96, cv = document.createElement('canvas'); cv.width = cv.height = s; const r = Math.min(img.width, img.height); cv.getContext('2d').drawImage(img, (img.width - r) / 2, (img.height - r) / 2, r, r, 0, 0, s, s); ok(cv.toDataURL('image/jpeg', 0.72)); } catch (e) { ok(''); } };
    img.onerror = () => ok(''); img.src = src;
  });
  let thumbBusy = false;
  async function thumbs() {
    if (thumbBusy) return; thumbBusy = true;
    try {
      let changed = false;
      for (const c of (S.chars || [])) {
        if (U.DM && c.obr) continue; // a player's hero: its picture comes from the player
        const k = pKey(c.portrait);
        if (!k && c.portraitThumb) { delete c.portraitThumb; delete c.portraitThumbKey; changed = true; continue; }
        if (k && c.portraitThumbKey !== k) { const t = await makeThumb(c.portrait); if (t) { c.portraitThumb = t; c.portraitThumbKey = k; changed = true; } }
      }
      if (changed) U.saveChars();
    } finally { thumbBusy = false; }
  }

  // ---------- 3. DM: a short fight summary for the players (room metadata, through the background page) ----------
  const health = (hp, mx) => (hp <= 0 ? 'down' : !mx || hp >= mx ? 'ok' : hp / mx > 0.5 ? 'hurt' : hp / mx > 0.25 ? 'bloodied' : 'dying');
  // priv = true → the DM's own copy (token cards): monsters with their real numbers. Never sent to the players.
  function summary(priv) {
    if (!U.DM || !U.game) return null;
    const cb = S.combat || { list: [] };
    const list = (cb.list || []).map(x => {
      if (x.type === 'pc') {
        const c = U.byId(x.charId); if (!c) return { id: x.id, n: '?', k: 'pc' };
        let d = null; try { d = E.compute(c); } catch (e) {}
        return { id: x.id, n: c.name || T('Unnamed'), k: 'pc', cid: c.id, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, sp: d ? d.speed : 0, mv: (x.move && x.move.ft) || 0, mvMax: (d ? d.speed : 30) * (x.econ && x.econ.dash ? 2 : 1), rogue: c.classKey === 'rogue' && c.level >= 2, init: x.init, cond: (c.conditions || []).slice(0, 6), ec: x.econ || { a: 0, b: 0, r: 0 }, pic: priv ? c.portraitThumb || '' : undefined };
      }
      const m = { id: x.id, n: x.name, k: 'mon', st: health(Number(x.hp) || 0, Number(x.hpMax) || 0), init: x.init, cond: (x.conditions || []).slice(0, 6) };
      if (priv) Object.assign(m, { hp: Number(x.hp) || 0, mx: Number(x.hpMax) || 0, ac: x.ac, cr: x.cr || '' });
      return m;
    });
    const party = (S.chars || []).filter(c => c.party).slice(0, 8).map(c => {
      let d = null; try { d = E.compute(c); } catch (e) {}
      return { id: c.id, n: c.name || T('Unnamed'), cls: c.classKey || '', lvl: c.level, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, cond: (c.conditions || []).slice(0, 6) };
    });
    // the DM's token window: what the one who acts now can do (attacks of a monster, or of the DM's own hero)
    let acts;
    if (priv && cb.turn >= 0 && cb.list[cb.turn]) {
      const x = cb.list[cb.turn];
      try {
        let A = [], ctx = null;
        if (x.type === 'mon') A = U.monActions ? U.monActions(x) : [];
        else { const c = U.byId(x.charId); if (c && !c.obr) { const d = E.compute(c); ctx = d.x; A = d.actions.filter(a => (a.kind !== 'weapon' || a.equipped || a.id === 'unarmed') && (a.hit != null || a.save || a.heal || a.dmg)); } }
        const sub = s => ctx ? String(s).replace(/@(STR|DEX|CON|INT|WIS|CHA|LVL|PB)/gi, (m0, k) => { k = k.toUpperCase(); return k === 'LVL' ? ctx.lvl : k === 'PB' ? ctx.pb : ctx.mod[k]; }) : String(s);
        acts = A.slice(0, 30).map(a => ({ id: a.id, n: a.name, hit: a.hit != null ? a.hit : null, save: a.save || null, heal: !!(a.heal || a.temp), area: !!(a.area || (a.save && a.hit == null && x.type === 'pc')), blocked: !!a.blocked, left: a.left != null ? a.left : null, info: (a.hit != null ? U.sign(a.hit) + ' ' : '') + (a.save ? T('DC') + ' ' + a.save.dc + ' ' + (D.AB[a.save.abil] || a.save.abil) + ' ' : '') + (a.dmg ? sub(a.dmg) : '') + (a.count > 1 ? ' ×' + a.count : '') }));
        if (x.type === 'pc' && U.byId(x.charId) && U.byId(x.charId).obr) acts = null; // a player's hero: the player acts himself
      } catch (e) { acts = []; }
    }
    let L2 = list, turn = cb.turn; // the players never learn about monsters whose tokens the DM hid
    if (!priv && hiddenMon.size) { const act = list[cb.turn]; L2 = list.filter(x => !(x.k === 'mon' && hiddenMon.has(x.id))); turn = act ? L2.indexOf(act) : -1; }
    return { on: (cb.turn >= 0 && list.length > 0), round: cb.round || 0, turn, list: L2.slice(0, 40), party, game: U.game.name, strict: U.strict ? U.strict() : true, acts: acts || undefined, mode: priv ? S.mode : undefined };
  }
  let stT = 0, lastSt = '', lastPriv = '';
  function queueState() {
    if (!U.DM) return;
    clearTimeout(stT);
    stT = setTimeout(() => {
      const st = summary(); const s = JSON.stringify(st); if (s !== lastSt) { lastSt = s; U.raw.set('obrstate', st); local('obrstate'); }
      const pv = summary(true); const p = JSON.stringify(pv); if (p !== lastPriv) { lastPriv = p; U.raw.set('obrdm', pv); if (U.obrTurnRing) U.obrTurnRing(pv); }
    }, 250);
  }
  const baseSaveCombat = U.saveCombat;
  U.saveCombat = function () { const r = baseSaveCombat(); queueState(); return r; };

  // ---------- 3c. DM: tokens on the map — a gold ring around whoever acts now; tokens named like a hero / monster link themselves ----------
  const LINK = 'dndtable/link', RING = 'dndtable/ring';
  let ringKey = '', namesKey = '', hiddenKey = '', hiddenMon = new Set();
  U.obrTurnRing = async function (pv) {
    if (!U.DM || !OBR || !OBR.scene) return;
    try { if (!(await OBR.scene.isReady())) return; } catch (e) { return; }
    const list = (pv && pv.list) || [];
    const norm = s => String(s || '').trim().toLowerCase();
    // 1. auto-link: an unlinked token with the same name as a hero or a monster in the fight
    const nk = list.map(x => x.n).join('|') + '#' + (S.chars || []).map(c => c.name).join('|');
    if (nk !== namesKey || true) { // every time: a token may be added or renamed later
      namesKey = nk;
      try {
        const byName = {}; (S.chars || []).forEach(c => { if (c.name) byName[norm(c.name)] = { k: 'pc', cid: c.id, n: c.name }; });
        list.filter(x => x.k === 'mon').forEach(x => { byName[norm(x.n)] = { k: 'mon', eid: x.id, n: x.n }; });
        const need = it => it.layer === 'CHARACTER' && !(it.metadata && it.metadata[LINK]) && !!byName[norm(it.name)];
        if ((await OBR.scene.items.getItems(need)).length) await OBR.scene.items.updateItems(need, items => { items.forEach(it => { it.metadata[LINK] = byName[norm(it.name)]; }); });
        // copied tokens carry the same link ("Goblin 1" three times) → give each copy its own free monster of the same kind;
        // a token named "Goblin" (no number) → the first free "Goblin 1 / 2 / 3"
        const base = s => norm(s).replace(/\s*#?\d+$/, '');
        const monToks = await OBR.scene.items.getItems(it => it.layer === 'CHARACTER' && (!(it.metadata && it.metadata[LINK]) || it.metadata[LINK].k === 'mon'));
        const used = new Set(), extra = [];
        monToks.forEach(t => { const l = t.metadata && t.metadata[LINK]; if (!l) { extra.push(t); return; } const key = l.eid || l.n; if (used.has(key)) extra.push(t); else used.add(key); });
        const free = list.filter(x => x.k === 'mon' && !used.has(x.id)); const assign = {};
        extra.forEach(t => { const l = t.metadata && t.metadata[LINK]; const nm = base(l ? l.n : t.name); if (!nm) return; const i = free.findIndex(x => base(x.n) === nm); if (i < 0) return; const x = free.splice(i, 1)[0]; assign[t.id] = { k: 'mon', eid: x.id, n: x.n }; });
        if (Object.keys(assign).length) await OBR.scene.items.updateItems(Object.keys(assign), items => { items.forEach(it => { it.metadata[LINK] = assign[it.id]; }); });
        // monsters whose tokens are hidden (the DM's 👁 "Hide") are not shown to the players
        const hid = (await OBR.scene.items.getItems(it => it.layer === 'CHARACTER' && it.visible === false && !!(it.metadata && it.metadata[LINK]) && it.metadata[LINK].k === 'mon')).map(it => it.metadata[LINK].eid).filter(Boolean);
        const hk = hid.slice().sort().join(','); if (hk !== hiddenKey) { hiddenKey = hk; hiddenMon = new Set(hid); queueState(); }
      } catch (e) { console.warn('auto-link', e); }
    }
    ensureOwners(); tokenTags(pv);
    // 2. the ring follows the active combatant
    const a = pv && pv.on ? list[pv.turn] : null;
    const key = a ? a.id + ':' + pv.round : '';
    if (key === ringKey) return; ringKey = key;
    try {
      const old = await OBR.scene.items.getItems(it => it.metadata && it.metadata[RING]);
      if (old.length) await OBR.scene.items.deleteItems(old.map(it => it.id));
      if (!a || !window.OBR_SDK || !window.OBR_SDK.buildShape) return;
      const toks = await OBR.scene.items.getItems(it => { const l = it.metadata && it.metadata[LINK]; return !!l && (a.k === 'pc' ? l.k === 'pc' && l.cid === a.cid : l.k === 'mon' && (l.eid === a.id || l.n === a.n)); });
      for (const tk of toks) {
        const b = await OBR.scene.items.getItemBounds([tk.id]); const w = Math.max(b.width, b.height) * 1.2;
        const ring = window.OBR_SDK.buildShape().shapeType('CIRCLE').width(w).height(w).position({ x: b.center.x, y: b.center.y })
          .strokeColor('#f2c96b').strokeWidth(5).strokeOpacity(0.95).fillOpacity(0).attachedTo(tk.id).layer('ATTACHMENT').locked(true).disableHit(true).metadata({ [RING]: true }).build();
        await OBR.scene.items.addItems([ring]);
      }
    } catch (e) { console.warn('turn ring', e); }
  };

  // a small tag under each linked token in a fight: monsters "🟡 Hurt" (no numbers, like at a real table), heroes "❤️ 25/40", + conditions
  const TAG = 'dndtable/tag'; let tagKey = '';
  const STW = { ok: ['🟢', 'Unhurt'], hurt: ['🟡', 'Hurt'], bloodied: ['🟠', 'Badly hurt'], dying: ['🔴', 'Barely alive'], down: ['💀', 'Down'] };
  async function tokenTags(pv) {
    if (!U.DM || !OBR || !OBR.scene || !window.OBR_SDK || !window.OBR_SDK.buildLabel) return;
    try {
      const list = (pv && pv.on && pv.list) || []; const want = {};
      const toks = await OBR.scene.items.getItems(it => it.layer === 'CHARACTER' && !!(it.metadata && it.metadata[LINK]));
      toks.forEach(tk => {
        const l = tk.metadata[LINK]; const e = l.k === 'pc' ? list.find(x => x.k === 'pc' && x.cid === l.cid) : list.find(x => x.k === 'mon' && (x.id === l.eid || x.n === l.n)); if (!e) return;
        const cs = (e.cond || []).filter(x => x !== 'Concentrating').map(x => D.t ? D.t(x) : x).slice(0, 2).join(', ');
        const s = STW[e.st] || STW.ok;
        want[tk.id] = (l.k === 'pc' ? '❤️ ' + e.hp + '/' + e.mx : s[0] + ' ' + T(s[1])) + ((e.cond || []).includes('Concentrating') ? ' 🧠' : '') + (cs ? ' · ' + cs : '');
      });
      const k = JSON.stringify(want); if (k === tagKey) return; tagKey = k;
      const old = await OBR.scene.items.getItems(it => it.metadata && it.metadata[TAG]);
      const byTok = {}; old.forEach(it => { byTok[it.metadata[TAG]] = it; });
      const gone = old.filter(it => !want[it.metadata[TAG]] || it.metadata['dndtable/tagv'] !== 2).map(it => it.id); if (gone.length) await OBR.scene.items.deleteItems(gone); // v2: below the token
      gone.forEach(id => { const o = old.find(x => x.id === id); if (o) delete byTok[o.metadata[TAG]]; });
      const change = old.filter(it => !gone.includes(it.id) && want[it.metadata[TAG]] && (it.text || {}).plainText !== want[it.metadata[TAG]]).map(it => it.id);
      if (change.length) await OBR.scene.items.updateItems(change, L => { L.forEach(it => { it.text.plainText = want[it.metadata[TAG]]; }); });
      const add = [];
      for (const tk of toks) {
        if (!want[tk.id] || byTok[tk.id]) continue;
        const b = await OBR.scene.items.getItemBounds([tk.id]);
        add.push(window.OBR_SDK.buildLabel().plainText(want[tk.id]).position({ x: b.center.x, y: b.center.y + b.height / 2 + 6 }).attachedTo(tk.id).layer('ATTACHMENT').pointerDirection('UP')
          .locked(true).disableHit(true).backgroundOpacity(0.45).fontSize(15).pointerHeight(0).pointerWidth(0).metadata({ [TAG]: tk.id, 'dndtable/tagv': 2 }).build());
      }
      if (add.length) await OBR.scene.items.addItems(add);
    } catch (e) { console.warn('token tags', e); }
  }

  // ---------- 3b. players act in the DM's fight: "who, with what, at whom" → the DM's app rolls and applies it ----------
  // A request: { id, cid (hero), aid (action id from E.compute(hero).actions), tid (fight entry id or '__all'), mode, from }.
  // Players send it through Owlbear; the DM's background page puts it into obrActQ; the DM's open panel resolves it here.
  // rules checked here: only on your own turn (off-turn: reactions only — a weapon attack becomes ONE opportunity attack),
  // each turn 1 action / 1 bonus action / 1 reaction, slots and uses (U.spendFor), "end my turn"
  const refuse = (q, msg) => { U.logAdd(q.from || '?', ['⚠️ ' + msg]); if (S.log[0]) { S.log[0].share = 1; U.saveLog(); } U.render(); return ''; };
  const shareLog = () => { if (S.log[0]) { S.log[0].share = 1; U.saveLog(); } };

  // ---------- 3d. distance on the Owlbear map: who is linked to which token, how many feet between them ----------
  const GRID = { dpi: 150, mult: 5 };
  async function gridInfo() {
    try { GRID.dpi = (await OBR.scene.grid.getDpi()) || 150; const s = await OBR.scene.grid.getScale(); const m = s && s.parsed ? Number(s.parsed.multiplier) : NaN; GRID.mult = m > 0 ? m : 5; } catch (e) {}
  }
  const linkOfIt = it => (it && it.metadata && it.metadata[LINK]) || null;
  // the token of a fight entry; pref = the token the player really clicked / stands on (copied tokens can share a link)
  async function tokenOf(entry, pref) {
    if (!OBR || !OBR.scene || !entry) return null;
    const match = it => { const l = linkOfIt(it); return !!l && (entry.type === 'pc' ? l.k === 'pc' && l.cid === entry.charId : l.k === 'mon' && (l.eid === entry.id || l.n === entry.name)); };
    try {
      if (pref) { const p = (await OBR.scene.items.getItems([pref]))[0]; if (p && match(p)) return p; }
      const L = await OBR.scene.items.getItems(match);
      return L.find(it => linkOfIt(it).eid === entry.id) || L[0] || null;
    } catch (e) { return null; }
  }
  // feet between two fight entries, edge to edge (big creatures take more squares); null = no tokens on the map
  async function feetBetween(e1, e2, p1, p2) {
    const [t1, t2] = [await tokenOf(e1, p1), await tokenOf(e2, p2)]; if (!t1 || !t2) return null;
    try {
      await gridInfo();
      const [b1, b2] = [await OBR.scene.items.getItemBounds([t1.id]), await OBR.scene.items.getItemBounds([t2.id])];
      const cells = await OBR.scene.grid.getDistance(b1.center, b2.center);
      const s1 = Math.max(1, Math.round(Math.max(b1.width, b1.height) / GRID.dpi)), s2 = Math.max(1, Math.round(Math.max(b2.width, b2.height) / GRID.dpi));
      return Math.max(1, Math.round(cells - (s1 - 1) / 2 - (s2 - 1) / 2)) * GRID.mult; // next to each other = 5 ft
    } catch (e) { return null; }
  }
  // how far an action reaches: melee reach, ranged normal/long, spell range (null = not checked)
  function spellRange(sp) {
    const r = String((sp && sp.r) || ''); const n = r.match(/(\d+)\s*(?:ft|фт)/i);
    if (/touch|касан/i.test(r)) return { k: 'spell', n: 5 };
    if (/^\s*(self|на себя)\s*$/i.test(r)) return null;
    if (/mile|мил/i.test(r)) return { k: 'spell', n: 5280 };
    return n ? { k: 'spell', n: +n[1] } : null;
  }
  function rangeOf(a) {
    if (!a) return null;
    if (a.kind === 'weapon') {
      if (/beast|зверя/i.test(a.name || '')) return null; // the beast companion strikes from its own place
      const pr = (a.props || []).join(' '); const m = pr.match(/\((\d+)\s*\/\s*(\d+)\)/);
      if (a.scope === 'ranged') return m ? { k: 'ranged', n: +m[1], l: +m[2] } : { k: 'ranged', n: 60, l: 60 };
      return { k: 'melee', n: /\breach\b|досягаем/i.test(pr) ? 10 : 5 };
    }
    if (a.kind === 'spell') { const sp = D.SPELLS.find(s => 'sp:' + s.n === a.id || 'u:sp:' + s.n === a.id); const tg = sp ? U.spellTgt(sp) : null; return tg && tg.area && tg.area.o !== 'p' ? null : spellRange(sp); }
    return null;
  }
  U.actRange = rangeOf;
  // who / where a spell is aimed at (data/targets.js): tk e enemy · a ally (or me) · x anyone · s only me · n no target · A area
  U.spellTgt = function (sp) {
    const guess = sp.a === 'heal' || sp.a === 'temp' ? 'a' : sp.a ? 'e' : /^\s*(self|на себя)/i.test(sp.r || '') ? 's' : 'n';
    const p = String((D.SPELL_TGT || {})[sp.n] || guess).split(/\s+/); const o = { tk: p[0], m: 1 };
    if (p[0] === 'A') o.area = { s: p[1], n: +p[2] || 5, o: p[3] || 'p' };
    p.forEach(x => { if (/^m\d+$/.test(x)) o.m = +x.slice(1); });
    return o;
  };
  U.strict = () => { try { return localStorage.getItem('dnd.strict') !== '0'; } catch (e) { return true; } };
  // → { ok, mode, note } — refuse when too far; ranged: long range or an enemy next to you = Disadvantage
  async function checkRange(q, a, actor, tid, rIn) {
    if (!OBR || !tid || tid === '__all') return { ok: true, mode: q.mode };
    const cb = S.combat; const target = cb.list.find(x => x.id === tid); const r = rIn || rangeOf(a);
    if (!target || !r || target.id === actor.id) return { ok: true, mode: q.mode };
    const ft = await feetBetween(actor, target, q.atok, tid === (q.tids && q.tids.length > 1 ? null : q.tid) ? q.ttok : null);
    if (ft == null) return { ok: true, mode: q.mode, note: T('(distance not checked: put both tokens on the map and link them)') };
    const tn = U.cbTarget(target) ? U.cbTarget(target).name : target.name || '';
    if (r.k === 'melee' && ft > r.n) return { ok: false, msg: T('Too far: {0} is {1} ft away, you reach {2} ft. Walk closer first.', tn, ft, r.n) };
    if (r.k === 'spell' && ft > r.n) return { ok: false, msg: T('Too far for this spell: {0} ft, the spell reaches {1} ft.', ft, r.n) + ' (' + tn + ')' };
    let dis = '';
    if (r.k === 'ranged' || (r.k === 'spell' && a && a.hit != null && r.n > 5)) { // shooting (a bow or a spell attack like Fire Bolt)
      if (r.l && ft > r.l) return { ok: false, msg: T('Too far even for a long shot: {0} ft (max {1} ft).', ft, r.l) };
      if (r.k === 'ranged' && ft > r.n) dis = T('long range ({0} ft > {1} ft)', ft, r.n);
      if (!dis) { // shooting with an enemy right next to you
        const foes = cb.list.filter(x => x.type === 'mon' && (Number(x.hp) || 0) > 0);
        for (const f of foes) { const d0 = await feetBetween(actor, f, q.atok); if (d0 != null && d0 <= 5) { dis = T('an enemy is right next to you'); break; } }
      }
    }
    let mode = q.mode;
    if (dis) mode = q.mode === 'adv' ? 'normal' : 'dis';
    return { ok: true, mode, ft, note: '📏 ' + ft + ' ' + T('ft') + (dis ? ' · ' + T('Disadvantage: {0}', dis) : '') };
  }
  // feet from a fight entry's token to a point on the map (an area spell's centre)
  async function feetToPoint(entry, pt, pref) {
    const t = await tokenOf(entry, pref); if (!t || !pt) return null;
    try { await gridInfo(); const b = await OBR.scene.items.getItemBounds([t.id]); return Math.round(await OBR.scene.grid.getDistance(b.center, pt)) * GRID.mult; } catch (e) { return null; }
  }

  // A player's request, resolved by the DM's app. q: { kind?, cid, aid, tid, tids?, area?: { point, o }, mode, basic?, bonus? }
  // Strict rules (default) refuse what breaks the rules; free rules (⚖️ in the top bar) let it happen and only write why in the log.
  U.remoteAct = async function (q) {
    const cb = S.combat; if (!cb || cb.turn < 0) return T('No fight right now.');
    const ai = cb.list.findIndex(x => x.type === 'pc' && x.charId === q.cid); if (ai < 0) return T('{0} is not in the fight.', q.from || '?');
    const actor = cb.list[ai]; const own = cb.turn === ai; const strict = U.strict();
    const soft = [];
    const bad = (cond, msg) => { if (!cond) return false; if (strict) { refuse(q, msg); return true; } soft.push(msg); return false; };
    const stamp = (top, note) => {
      if (!S.log[0] || S.log[0] === top) return;
      S.log[0].share = 1;
      S.log[0].html = '<small class="from">🦉 ' + esc(q.player || q.from || '') + '</small>' + (note ? '<small class="dist">' + esc(note) + '</small>' : '') +
        (soft.length ? '<small class="dist">⚖️ ' + esc(T('Free rules: allowed anyway')) + ' — ' + esc(soft.join(' · ')) + '</small>' : '') + S.log[0].html;
      U.saveLog();
    };
    const c = U.byId(q.cid); let d = null; try { d = c && E.compute(c); } catch (e) {}
    if (!c || !d) return refuse(q, T('This action is not on the hero any more.'));
    const ec = actor.econ = actor.econ || U.econNew();
    const tids = (Array.isArray(q.tids) && q.tids.length ? q.tids : q.tid ? [q.tid] : []).filter(id => id === '__all' || cb.list.some(x => x.id === id)).slice(0, 20);
    const tgOf = id => { const x = cb.list.find(y => y.id === id); return x ? U.cbTarget(x) : null; };

    if (q.kind === 'end') {
      if (!own) return refuse(q, T('It is not your turn, so there is nothing to end.'));
      U.logAdd(q.from || '?', ['⏭ ' + T('ends the turn.')]); shareLog();
      U.ACT.cbNext(); return '';
    }

    // ----- Dash / Dodge / Disengage / Hide / Help / Grapple / Shove -----
    if (q.kind === 'basic') {
      const b = q.basic; const k = q.bonus ? 'b' : 'a';
      if (bad(!own, T('Only on your own turn.'))) return '';
      if (bad(ec[k] >= 1, T('{0} is already used this turn.', T(U.ECON_NAME[k])))) return '';
      const tcb = tids[0] ? cb.list.find(x => x.id === tids[0]) : null; const tg = tcb ? U.cbTarget(tcb) : null;
      if ((b === 'grapple' || b === 'shove' || b === 'help') && !tg) return refuse(q, T('Choose a target first.'));
      let note = '';
      if (b === 'grapple' || b === 'shove') {
        const ft = await feetBetween(actor, tcb, q.atok, q.ttok); if (ft != null) note = '📏 ' + ft + ' ' + T('ft');
        if (ft != null && bad(ft > 5, T('Too far: {0} is {1} ft away, you reach {2} ft. Walk closer first.', tg.name, ft, 5))) return '';
      }
      ec[k]++; const top = S.log[0];
      if (b === 'dash') { ec.dash = true; U.logAdd(q.from, ['🏃 ' + T('Dash: you can move {0} ft this turn.', d.speed * 2)]); }
      else if (b === 'dodge') { ec.dodge = true; U.addCond(c, 'Dodging', 1); U.logAdd(q.from, ['🛡 ' + T('Dodge: until your next turn attacks against you have Disadvantage, your DEX saves have Advantage.')]); }
      else if (b === 'disengage') { ec.disengage = true; U.logAdd(q.from, ['🚪 ' + T('Disengage: moving away provokes no opportunity attacks this turn.')]); }
      else if (b === 'hide') {
        const sk = d.skills && d.skills.Stealth ? d.skills.Stealth.val : d.mod.DEX; const r = E.rollD20(sk, 'normal'); const ok = r.total >= 15; if (ok) U.addCond(c, 'Hidden');
        U.logAdd(q.from, ['🫥 ' + T('Hide: Stealth check') + ' 🎲 ' + r.nat + ' ' + U.sign(sk) + ' = <b class="big">' + r.total + '</b> ' + (ok ? '≥' : '&lt;') + ' 15 → ' + (ok ? '<b class="ok">' + T('hidden (enemies must find you)') + '</b>' : '<b class="fail">' + T('not hidden') + '</b>')]);
      } else if (b === 'help') { if (tg.holder) U.addCond(tg.holder, 'Helped', 2); U.logAdd(q.from, ['🤝 ' + T('Help') + ' → <b>' + esc(tg.name) + '</b>: ' + T('the next attack roll or check of this ally (before your next turn) has Advantage.')]); }
      else if (b === 'grapple' || b === 'shove') {
        const dc = 8 + d.mod.STR + d.pb; const ab = tg.saveMod('STR') >= tg.saveMod('DEX') ? 'STR' : 'DEX'; const sm = tg.saveMod(ab); const r = E.rollD20(sm, 'normal'); const ok = r.total >= dc;
        const cond = b === 'grapple' ? 'Grappled' : 'Prone';
        if (!ok) tg.cond(cond);
        U.logAdd(q.from, [(b === 'grapple' ? '✊ ' + T('Grapple') : '💢 ' + T('Shove')) + ' → <b>' + esc(tg.name) + '</b>: ' + T('{0} save', D.AB[ab] || ab) + ' 🎲 ' + r.nat + ' ' + U.sign(sm) + ' = <b class="big">' + r.total + '</b> ' + (ok ? '≥' : '&lt;') + ' ' + T('DC') + ' ' + dc + ' → ' +
          (ok ? '<b class="ok">' + T('RESISTED') + '</b>' : '<b class="fail">' + T('FAILED') + '</b> · ' + esc(D.t ? D.t(cond) : cond))]);
      }
      stamp(top, note); U.saveCombat(); U.render(); return '';
    }

    // ----- a spell or feature with no dice (Bless, Shield of Faith, Rage, Action Surge…): spend it, switch it on, tell everyone -----
    if (String(q.aid || '').startsWith('u:')) {
      const id = q.aid.slice(2); let sp = null, f = null;
      if (id.startsWith('sp:')) { const e0 = d.casting.list.find(e => 'sp:' + e.sp.n === id); sp = e0 && e0.sp; }
      else if (id.startsWith('f:')) f = d.feats.find(x => 'f:' + x.id === id);
      if (!sp && !f) return refuse(q, T('This action is not on the hero any more.'));
      const t0 = sp ? String(sp.t || '') : (f.desc || '') + ' ' + f.name;
      const cost = /bonus|бонус/i.test(t0) ? 'b' : /reaction|реакц/i.test(t0) ? 'r' : sp && !/action|действ/i.test(t0) ? '-' : 'a';
      if (bad(!own && cost !== 'r', T('Not your turn: only a reaction now (an opportunity attack or a reaction spell like Shield).'))) return '';
      if (bad(cost !== '-' && ec[cost] >= 1, T('{0} is already used this turn.', T(U.ECON_NAME[cost] || 'Action')))) return '';
      const r = sp ? spellRange(sp) : null; let note = '';
      for (const tid of tids) { const rg = await checkRange(q, null, actor, tid, r); if (!rg.ok && bad(true, rg.msg)) return ''; if (rg.note && !note) note = rg.note; }
      const w = sp ? (sp.l >= 1 ? U.spendFor(c, d, { kind: 'spell', level: sp.l }) : '') : (f.uses ? U.spendFor(c, d, { res: f.id }) : '');
      if (/⚠️/.test(w)) return refuse(q, w.replace('⚠️', '').trim());
      if (cost !== '-') ec[cost] = (ec[cost] || 0) + 1;
      // who gets it: a spell with an effect (Shield of Faith +2 AC…) goes on the chosen heroes, Bless marks every target (+1d4)
      const tgE = tids.filter(x => x !== '__all').map(id => cb.list.find(x => x.id === id)).filter(Boolean);
      const gave = [];
      if (sp && sp.conc) { if (c.conditions.includes('Concentrating')) U.endConc(c); U.addCond(c, 'Concentrating'); } // a new concentration spell ends the old one
      if (sp && (sp.fx || sp.mageArmor || (sp.a === 'dmg' && sp.conc))) {
        const heroes = (sp.a === 'dmg' || !tgE.length) ? [c] : tgE.filter(x => x.type === 'pc').map(x => U.byId(x.charId)).filter(Boolean);
        heroes.forEach(h => { h.toggles['spell:' + sp.n] = true; });
        if (sp.conc) gave.push({ toggle: 'spell:' + sp.n, cids: heroes.map(h => h.id) });
      }
      if (sp && sp.n === 'Bless') {
        tgE.forEach(x => { const hd = x.type === 'pc' ? U.byId(x.charId) : x; if (hd) U.addCond(hd, 'Blessed', 10); });
        gave.push({ cond: 'Blessed', cids: tgE.filter(x => x.type === 'pc').map(x => x.charId), eids: tgE.filter(x => x.type === 'mon').map(x => x.id) });
      }
      if (gave.length) c.concGave = gave;
      if (f && f.toggle) c.toggles[f.id] = true;
      const names = tids.filter(x => x !== '__all').map(tgOf).filter(Boolean).map(t => '<b>' + esc(t.name) + '</b>');
      const top = S.log[0];
      U.logAdd(q.from, ['✨ <b>' + esc(sp ? sp.name || sp.n : f.name) + '</b>' + (w ? ' <small>(' + w + ')</small>' : '') + (names.length ? ' → ' + names.join(', ') : '') + (sp && sp.conc ? ' · 🧠 ' + T('Concentration') : ''), '<i>' + esc((sp ? sp.desc : f.desc) || '') + '</i>']);
      U.saveChars(); stamp(top, note); U.saveCombat(); U.render(); return '';
    }

    // ----- an attack, a spell with dice, a feature with dice -----
    let a = null; try { a = d.actions.find(x => x.id === q.aid); } catch (e) {}
    if (!a) return refuse(q, T('This action is not on the hero any more.'));
    let cost = U.actCost(a), one = false;
    if (!own) {
      if (cost === 'r') { /* a reaction spell: fine */ } else if (a.kind === 'weapon') { cost = 'r'; one = true; } // opportunity attack
      else if (bad(true, T('Not your turn: only a reaction now (an opportunity attack or a reaction spell like Shield).'))) return '';
    }
    if (cost !== '-' && bad(ec[cost] >= 1, T('{0} is already used this turn.', T(U.ECON_NAME[cost])) + (cost === 'r' ? ' ' + T('It comes back at the start of your turn.') : ''))) return '';
    let mode = q.mode, note = '', near = null;
    if (q.area && q.area.point) { // an area: its centre must be within the spell's range
      const r = rangeOf(a); const ft = r ? await feetToPoint(actor, q.area.point, q.atok) : null;
      if (ft != null) { note = '📏 ' + ft + ' ' + T('ft'); if (bad(ft > r.n, T('Too far for this spell: {0} ft, the spell reaches {1} ft.', ft, r.n))) return ''; }
    } else {
      if (!(q.oa && !own)) for (const tid of tids) { const rg = await checkRange(q, a, actor, tid); if (!rg.ok && bad(true, rg.msg)) return ''; if (rg.ok && tids.length === 1) { mode = rg.mode; near = rg.ft != null ? rg.ft <= 5 : null; } if (rg.note && !note) note = rg.note; } // an opportunity attack: the enemy just stepped away, it was in reach
    }
    const turn0 = cb.turn; const t0 = cb.target[actor.id]; const top = S.log[0];
    cb.turn = ai; if (tids.length === 1) cb.target[actor.id] = tids[0]; S.mode = mode === 'adv' || mode === 'dis' ? mode : 'normal'; S.near = q.oa ? true : near;
    const toast0 = U.toast; let why = ''; U.toast = h => { why = h; }; // a refusal (no slots / uses) comes as a toast: catch it
    try { U.ACT.cbAct({ aid: q.aid, remote: 1, cost, one, tids: tids.length > 1 || q.area ? tids.filter(x => x !== '__all') : null }); }
    finally { U.toast = toast0; cb.turn = turn0; if (t0 === undefined) delete cb.target[actor.id]; else cb.target[actor.id] = t0; S.mode = 'normal'; S.near = null; U.saveCombat(); }
    if (!S.log[0] || S.log[0] === top) { U.logAdd(q.from || '?', ['⚠️ ' + (why || T('This action did not work.'))]); if (S.log[0]) { S.log[0].share = 1; U.saveLog(); } } // tell everyone why nothing happened
    else stamp(top, note);
    U.render(); return '';
  };
  // ---------- 3g. the players roll their own saves, decide on Shield, get offered opportunity attacks ----------
  // DM side: the roll waits (the log says "the player rolls it himself…"); the answer comes back through the background page (obrAns).
  // No answer in 40 s (Shield: 20 s) → the app decides for him.
  const pend = {};
  const sendTo = (pid, msg) => { try { OBR.broadcast.sendMessage('dndtable/v1', Object.assign({ to: pid }, msg)); } catch (e) {} };
  const playerSaves = () => { try { return localStorage.getItem('dnd.playerSaves') !== '0'; } catch (e) { return true; } };
  const shareTop = () => { if (S.log[0]) { S.log[0].share = 1; U.saveLog(); } };
  U.askSave = function (tg, o) {
    if (!U.DM || !OBR || !playerSaves()) return false;
    const c = tg.pc; const id = E.uid();
    const finish = (nat, by) => {
      if (!pend[id]) return; clearTimeout(pend[id].timer); delete pend[id];
      const bonus = tg.saveMod(o.abil); const bl = U.blessDie(c);
      const roll = nat == null ? E.rollD20(bonus, o.smode) : { nat, total: nat + bonus };
      const total = roll.total + bl.v; const ok = !o.autoFail && total >= o.dc;
      const fin = o.dm ? (ok ? (o.half ? Math.floor(o.dm / 2) : 0) : o.dm) : 0;
      const before = tg.hpNow(); let notes = []; if (fin > 0) notes = tg.damage(fin);
      if (!ok && o.cond) { tg.cond(o.cond, o.condRounds); notes.push(esc(D.t ? D.t(o.cond) : o.cond)); }
      const now = tg.hpNow();
      U.logAdd(c.name, ['🛡 ' + T('{0} save', D.AB[o.abil] || o.abil) + ' — ' + esc(o.what || '') + ': 🎲 ' + roll.nat + ' ' + U.sign(bonus) + bl.txt + ' = <b class="big">' + total + '</b> ' + (ok ? '≥' : '&lt;') + ' ' + T('DC') + ' ' + o.dc + ' → ' +
        (ok ? '<b class="ok">' + T('RESISTED') + '</b>' : '<b class="fail">' + T('FAILED') + '</b>') + (o.dm ? ' · ' + T('takes {0}', '<b class="dmg">' + fin + '</b>') + ' ' + esc(D.t ? D.t(o.dtype || '') : '') : '') +
        (before !== now ? ' <span class="hpchg">' + T('HP {0} → {1}', before, now) + '</span>' : '') + (notes.length ? ' <small>' + notes.join(' · ') + '</small>' : '') +
        ' <small>(' + (by === 'player' ? T('rolled by the player') : T('no answer — the app rolled')) + ')</small>']);
      shareTop(); U.saveCombat(); U.render();
    };
    pend[id] = { finish, timer: setTimeout(() => finish(null, 'auto'), 40000) };
    sendTo(c.obr.pid, { type: 'saveReq', id, cid: c.id, hero: c.name, abil: o.abil, dc: o.dc, what: o.what, by: o.by, mode: o.smode || 'normal' });
    return true;
  };
  U.canShield = c => {
    try {
      const d = E.compute(c); if (!d.casting.list.some(e => e.sp.n === 'Shield') || c.toggles['spell:Shield']) return false;
      if (!d.resources.some(r => r.slot && E.left(c, r) > 0)) return false;
      const e = ((S.combat && S.combat.list) || []).find(x => x.type === 'pc' && x.charId === c.id); return !(e && e.econ && e.econ.r);
    } catch (e) { return false; }
  };
  U.askShield = function (tg, o) {
    if (!U.DM || !OBR || !U.canShield(tg.pc)) return false;
    const c = tg.pc; const id = E.uid();
    const finish = (yes, by) => {
      if (!pend[id]) return; clearTimeout(pend[id].timer); delete pend[id];
      if (yes && U.canShield(c)) {
        const w = U.spendFor(c, E.compute(c), { kind: 'spell', level: 1 }); c.toggles['spell:Shield'] = true;
        const e = S.combat.list.find(x => x.type === 'pc' && x.charId === c.id); if (e) { e.econ = e.econ || U.econNew(); e.econ.r = 1; }
        U.logAdd(c.name, ['🛡 <b>' + T('Shield!') + '</b> ' + T('AC {0} → {1}: the attack of {2} misses.', o.ac, o.ac + 5, esc(o.by)) + ' <small>(' + w + ')</small>']);
        U.saveChars();
      } else {
        const before = tg.hpNow(); const notes = tg.damage(o.dm.total); if (o.cond) { tg.cond(o.cond, o.condRounds); notes.push(esc(D.t ? D.t(o.cond) : o.cond)); }
        U.logAdd(o.by, ['💥 ' + esc(o.what || '') + ' → <b>' + esc(c.name) + '</b>: <b class="big dmg">' + o.dm.total + '</b> ' + (o.dtype || '') + ' <small>' + (o.dm.text || '') + '</small> <span class="hpchg">' + T('HP {0} → {1}', before, tg.hpNow()) + '</span>' +
          (notes.length ? ' <small>' + notes.join(' · ') + '</small>' : '') + ' <small>(' + (by === 'player' ? T('no Shield') : T('no answer — no Shield')) + ')</small>']);
      }
      shareTop(); U.saveCombat(); U.render();
    };
    pend[id] = { finish, timer: setTimeout(() => finish(false, 'auto'), 20000) };
    sendTo(c.obr.pid, { type: 'shieldReq', id, cid: c.id, hero: c.name, total: o.total, ac: o.ac, by: o.by, what: o.what });
    return true;
  };
  function takeAnswers() {
    const A = U.raw.get('obrAns', []); if (!A.length) return; U.raw.set('obrAns', []);
    A.forEach(m => { const p = pend[m.id]; if (!p) return; if (m.type === 'saveRes') p.finish(Math.max(1, Math.min(20, Number(m.nat) || 1)), 'player'); else if (m.type === 'shieldRes') p.finish(!!m.yes, 'player'); });
  }
  // a monster the DM moves away from a hero → that hero's player is offered an opportunity attack (his reaction)
  async function offerOA(it, prev, cur) {
    const cb = S.combat; if (!U.DM || !cb || cb.turn < 0 || !U.strict()) return;
    const l = linkOfIt(it); if (!l || l.k !== 'mon') return;
    const mon = cb.list.find(x => x.id === l.eid) || cb.list.find(x => x.type === 'mon' && x.name === l.n); if (!mon || (mon.econ && mon.econ.disengage) || !(Number(mon.hp) > 0)) return;
    try {
      await gridInfo();
      const b = await OBR.scene.items.getItemBounds([it.id]); const s1 = Math.max(1, Math.round(Math.max(b.width, b.height) / GRID.dpi));
      const was = { x: b.center.x - (cur.x - prev.x), y: b.center.y - (cur.y - prev.y) };
      const pcs = await OBR.scene.items.getItems(t => { const k = linkOfIt(t); return t.layer === 'CHARACTER' && !!k && k.k === 'pc'; });
      for (const t of pcs) {
        const c = U.byId(linkOfIt(t).cid); if (!c || !c.obr) continue;
        const e = cb.list.find(x => x.type === 'pc' && x.charId === c.id); if (!e || (e.econ && e.econ.r) || E.compute(c).hpCur <= 0) continue;
        const tb = await OBR.scene.items.getItemBounds([t.id]); const s2 = Math.max(1, Math.round(Math.max(tb.width, tb.height) / GRID.dpi));
        const ftAt = async p => Math.max(1, Math.round((await OBR.scene.grid.getDistance(p, tb.center)) - (s1 - 1) / 2 - (s2 - 1) / 2)) * GRID.mult;
        if ((await ftAt(was)) <= 5 && (await ftAt(b.center)) > 5) sendTo(c.obr.pid, { type: 'oaOffer', id: E.uid(), cid: c.id, hero: c.name, tid: mon.id, ttok: it.id, n: mon.name });
      }
    } catch (e) { console.warn('opportunity', e); }
  }

  // the DM clicked in his own token window on the map: the one who acts now (a monster or his own hero) does it to the clicked target
  function dmAct(q) {
    const cb = S.combat; if (!U.DM || !cb || cb.turn < 0) return '';
    if (q.kind === 'next') { U.ACT.cbNext(); return ''; }
    const active = cb.list[cb.turn]; if (!active) return '';
    if (q.tid) cb.target[active.id] = q.tid;
    S.mode = q.mode === 'adv' || q.mode === 'dis' ? q.mode : 'normal';
    U.ACT.cbAct({ aid: q.aid }); S.mode = 'normal'; U.saveCombat(); U.render(); return '';
  }
  let actBusy = false;
  async function runActQueue() {
    if (!U.DM || !U.game || actBusy) return;
    const Q = U.raw.get('obrActQ', []); if (!Q.length) return;
    U.raw.set('obrActQ', []); actBusy = true;
    try { for (const q of Q.filter(x => x && Date.now() - (x.t || 0) < 5 * 60000)) { const err = q.dm ? dmAct(q) : await U.remoteAct(q); if (err) U.toast('⚠️ ' + err); } }
    finally { actBusy = false; }
    if (U.raw.get('obrActQ', []).length) runActQueue(); // more came while we were busy
  }

  // ---------- 3e. movement: in a fight a hero's token moves only on its own turn and not farther than its speed ----------
  // (the DM can always move any token — his moves are never checked). Too far / not your turn → the token jumps back.
  let posCache = {}, moveBusy = false;
  const notifyPlayer = (c, text) => { if (c && c.obr && c.obr.pid) try { OBR.broadcast.sendMessage('dndtable/v1', { type: 'note', to: c.obr.pid, text }); } catch (e) {} };
  async function watchMoves(items) {
    ownersSoon();
    if (!U.DM || moveBusy) { (items || []).forEach(it => { if (it.layer === 'CHARACTER') posCache[it.id] = it.position; }); return; }
    moveBusy = true;
    try {
      const cb = S.combat; let me = ''; try { me = OBR.player.id; } catch (e) {}
      const strict = U.strict();
      for (const it of items || []) {
        if (it.layer !== 'CHARACTER') continue;
        const prev = posCache[it.id], cur = it.position; posCache[it.id] = cur;
        if (!prev || !cur || (prev.x === cur.x && prev.y === cur.y)) continue;
        if (it.lastModifiedUserId === me) { offerOA(it, prev, cur); continue; } // the DM moved it: always fine (a monster walking away → opportunity attack offers)
        if (!it.lastModifiedUserId) continue;
        const l = linkOfIt(it); const who = it.lastModifiedUserId;
        const back0 = async (msg, to) => { posCache[it.id] = prev; await OBR.scene.items.updateItems([it.id], L => { L.forEach(x => { x.position = prev; }); }); try { OBR.broadcast.sendMessage('dndtable/v1', { type: 'note', to, text: msg }); } catch (e) {} };
        // a player may move only the token of his own hero (strict rules)
        const owner = l && l.k === 'pc' ? (U.byId(l.cid) || {}).obr : null;
        if (strict && !(owner && owner.pid === who)) { await back0(T('This is not your token — only the DM moves it.'), who); continue; }
        if (!l || l.k !== 'pc' || !cb || cb.turn < 0) continue;
        const ei = cb.list.findIndex(x => x.type === 'pc' && x.charId === l.cid); if (ei < 0) continue; // not in this fight: free
        const e = cb.list[ei]; const c = U.byId(l.cid); const name = c ? c.name : l.n;
        const back = async msg => { await back0(msg, c && c.obr ? c.obr.pid : who); U.toast('🚶 ' + esc(name) + ': ' + msg); };
        await gridInfo();
        const ft = Math.round((await OBR.scene.grid.getDistance(prev, cur)) * GRID.mult);
        const speed = c ? E.compute(c).speed : 30; e.econ = e.econ || U.econNew();
        const max = speed * (e.econ.dash ? 2 : 1); e.move = e.move || { ft: 0 };
        if (ei !== cb.turn) { if (strict) { await back(T('Not your turn — your token went back.')); continue; } }
        else if (e.move.ft + ft > max && strict) { await back(T('Too far: you have {0} ft of movement left this turn (Dash doubles it).', Math.max(0, max - e.move.ft))); continue; }
        if (ei === cb.turn) { e.move.ft += ft; U.saveCombat(); }
      }
    } catch (e) { console.warn('moves', e); }
    finally { moveBusy = false; }
  }
  // the token of a player's hero belongs to that player (Owlbear: "owner only" lets him move just his own token)
  let ownT = 0;
  function ownersSoon() { if (!U.DM) return; clearTimeout(ownT); ownT = setTimeout(() => { U.obrTurnRing(U.raw.get('obrdm', null)); }, 600); } // link new tokens, owners, tags
  async function ensureOwners() {
    if (!U.DM || !OBR || !OBR.scene) return;
    try {
      if (!(await OBR.scene.isReady())) return;
      const own = {}; (S.chars || []).forEach(c => { if (c.obr && c.obr.pid) own[c.id] = c.obr.pid; });
      const need = it => { const l = linkOfIt(it); return it.layer === 'CHARACTER' && !!l && l.k === 'pc' && !!own[l.cid] && it.createdUserId !== own[l.cid]; };
      if ((await OBR.scene.items.getItems(need)).length) await OBR.scene.items.updateItems(need, L => { L.forEach(it => { it.createdUserId = own[linkOfIt(it).cid]; }); });
    } catch (e) { console.warn('owners', e); }
  }
  U.obrOwners = ensureOwners;  U.obrWatchMoves = async function () {
    if (!U.DM || !OBR || !OBR.scene || !OBR.scene.items.onChange) return;
    try { if (!(await OBR.scene.isReady())) return; (await OBR.scene.items.getItems(it => it.layer === 'CHARACTER')).forEach(it => { posCache[it.id] = it.position; }); OBR.scene.items.onChange(watchMoves); } catch (e) { console.warn(e); }
  };
  U.runActQueue = runActQueue;

  // players: what my heroes can do (the token card reads this list too)
  // Each entry: id, n name, k kind, cost a|b|r|-, info, tk (e enemy · a ally or me · x anyone · s only me · n no target · A area),
  // area { s shape, n ft, o p point | s from me | u around me }, m max targets, rng { k melee|ranged|spell, n, l }, heal, util, lvl, left, conc, desc
  function actMenu() {
    return (S.chars || []).map(c => {
      let d = null; try { d = E.compute(c); } catch (e) { return null; }
      const subst = s => String(s).replace(/@(STR|DEX|CON|INT|WIS|CHA|LVL|PB)/gi, (m0, k) => { k = k.toUpperCase(); return k === 'LVL' ? d.x.lvl : k === 'PB' ? d.x.pb : d.x.mod[k]; });
      const slotsLeft = lvl => d.resources.filter(r => r.slot && r.slot >= lvl).reduce((n, r) => n + E.left(c, r), 0);
      const resLeft = id => { const r = d.resources.find(x => x.id === id); return r ? E.left(c, r) : null; };
      const short = s => { s = String(s || ''); return s.length > 170 ? s.slice(0, 167) + '…' : s; };
      const costOf = t0 => /bonus|бонус/i.test(t0) ? 'b' : /reaction|реакц/i.test(t0) ? 'r' : 'a';
      const spOf = id => { const n = String(id).replace(/^(u:)?sp:/, ''); const e = d.casting.list.find(x => x.sp.n === n); return e ? e.sp : D.SPELLS.find(x => x.n === n); };
      const out = []; const have = new Set();
      const weapons = d.actions.filter(a => a.kind === 'weapon'); const anyEq = weapons.some(a => a.equipped);
      d.actions.forEach(a => {
        if (a.kind === 'weapon' && anyEq && !a.equipped && a.id !== 'unarmed') return;
        if (a.kind === 'item' && !a.heal && !a.temp && !a.dmg) return;
        have.add(a.id);
        const o = { id: a.id, n: a.name, k: a.kind, cost: U.actCost(a), heal: !!(a.heal || a.temp), m: 1, rng: rangeOf(a), lvl: a.level || 0, conc: !!a.conc, desc: short(a.desc),
          info: (a.hit != null ? U.sign(a.hit) + ' ' : '') + (a.save ? T('DC') + ' ' + a.save.dc + ' ' + (D.AB[a.save.abil] || a.save.abil) + ' ' : '') + (a.dmg ? subst(a.dmg) : '') + (a.count > 1 ? ' ×' + a.count : '') + (a.level ? ' · ' + T('lvl {0}', a.level) : '') };
        if (a.kind === 'weapon') o.tk = 'e';
        else if (a.kind === 'spell') { const sp = spOf(a.id); const tg = sp ? U.spellTgt(sp) : { tk: a.heal ? 'a' : 'e', m: 1 }; o.tk = a.extra ? 'e' : tg.tk; o.area = a.extra ? null : tg.area || null; o.m = tg.m; if (sp) o.desc = short(sp.desc); }
        else if (a.kind === 'feature') {
          const txt = (a.desc || '') + ' ' + a.name;
          if (a.save && a.res && /breath|дыхан/i.test(txt + a.id)) { o.tk = 'A'; o.area = { s: 'cone', n: 15, o: 's' }; }
          else if (a.heal || a.temp) o.tk = /creature|ally|touch|существ|союзн|касан/i.test(txt) ? 'a' : 's';
          else if (a.extra) o.tk = 'e';
          else o.tk = /creature|существ/i.test(txt) ? 'x' : 's';
        } else o.tk = a.heal || a.temp ? 'a' : 'e';
        if (a.level >= 1) o.left = slotsLeft(a.level); else if (a.res) o.left = resLeft(a.res);
        out.push(o);
      });
      // spells with no dice (Bless, Shield of Faith, Misty Step…) and the "cast it" half of Hex / Hunter's Mark
      d.casting.list.forEach(e => {
        const sp = e.sp; const rider = sp.a === 'dmg' && sp.conc; if (sp.a && !rider) return;
        const tg = U.spellTgt(sp); const id = 'u:sp:' + sp.n; if (have.has(id)) return;
        out.push({ id, n: (sp.name || sp.n) + (rider ? ' ' + T('(cast)') : ''), k: 'spell', util: 1, cost: /action|действ|bonus|бонус|reaction|реакц/i.test(sp.t || '') ? costOf(sp.t || '') : '-', tk: rider ? 'e' : tg.tk, area: tg.area || null, m: tg.m, rng: spellRange(sp), lvl: sp.l, conc: !!sp.conc, left: sp.l >= 1 ? slotsLeft(sp.l) : null, desc: short(sp.desc), info: (sp.l ? T('lvl {0}', sp.l) : T('cantrip')) + (sp.conc ? ' · 🧠' : '') });
      });
      // class features you switch on or spend (Rage, Action Surge, Wild Shape, Channel Divinity…)
      d.feats.forEach(f => {
        if (!(f.uses || f.toggle) || have.has('f:' + f.id)) return;
        const txt = (f.desc || '') + ' ' + f.name;
        out.push({ id: 'u:f:' + f.id, n: f.name, k: 'feature', util: 1, cost: costOf(txt), tk: /another creature|a creature|an ally|ally|союзник|другое существо/i.test(f.desc || '') ? 'x' : 's', m: 1, rng: null, left: f.uses ? resLeft(f.id) : null, desc: short(f.desc), info: f.uses ? T('uses') : '' });
      });
      const saves = {}; Object.keys(d.saves || {}).forEach(k => { saves[k] = d.saves[k].val; });
      return { cid: c.id, n: c.name || T('Unnamed'), speed: d.speed, rogue: c.classKey === 'rogue' && c.level >= 2, saves, acts: out.slice(0, 90) };
    }).filter(Boolean);
  }
  U.obrActMenu = actMenu;
  function saveMenu() { if (U.PLAYER) U.raw.set('obrmenu', actMenu()); }
  U.obrSendAct = async function (q) {
    q = Object.assign({ id: E.uid(), t: Date.now(), from: '' }, q);
    try { q.from = (OBR && await OBR.player.getName()) || ''; } catch (e) {}
    const hero = (S.chars || []).find(c => c.id === q.cid); q.player = q.from; if (hero) q.from = hero.name;
    try { await OBR.broadcast.sendMessage('dndtable/v1', { type: 'act', req: q }); U.toast('⏳ ' + T('Sent to the DM — the result shows up in the roll log.')); }
    catch (e) { U.toast('⚠️ ' + T('Could not send: {0}', String(e.message || e))); }
  };

  // ---------- 4. changes from the other players (written by the background page) ----------
  let pending = false;
  const typing = () => { const a = document.activeElement; return a && document.getElementById('main').contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
  const redraw = () => { if (typing()) { pending = true; return; } pending = false; U.render(); };
  document.addEventListener('focusout', () => { if (pending) setTimeout(() => { if (!typing()) redraw(); }, 50); });
  const P = U.PLAYER ? 'dndp.' : 'dndt.';
  const gk = k => (U.DM ? 'g.' + (U.game ? U.game.id : '_none') + '.' + k : k);
  window.addEventListener('storage', e => {
    const k = e.key || ''; if (!k.startsWith(P)) return; const rest = k.slice(P.length);
    if (rest === gk('log')) {
      const top0 = S.log[0] && S.log[0].id; S.log = U.store.get('log', []); U.renderSide();
      const n = S.log[0]; if (n && n.remote && n.id !== top0) U.toast(n.html); // someone else's roll: show it for a moment
      return;
    }
    if (rest === gk('chars')) { S.chars = U.store.get('chars', []).map(E.normalize); remember(); if (U.DM) queueState(); saveMenu(); redraw(); return; }
    if (rest === gk('combat') && U.DM) { S.combat = U.store.get('combat', S.combat); queueState(); redraw(); return; } // changed from a token card
    if (U.DM && rest === 'obrActQ') { runActQueue(); return; }
    if (U.DM && rest === 'obrAns') { takeAnswers(); return; } // a player rolled his save / answered Shield
    if (rest === 'obrOpen') { // "📖 Open in the panel" on a token window
      const o = U.raw.get('obrOpen', null); if (!o || Date.now() - (o.t || 0) > 20000) return;
      if (o.k === 'hero' && U.byId(o.id)) { U.go('sheet', o.id); return; }
      if (o.k === 'mon' && U.DM) {
        const e = (S.combat && S.combat.list || []).find(x => x.id === o.eid) || (S.combat && S.combat.list || []).find(x => x.type === 'mon' && x.name === o.n);
        S.combatTab = 'monsters'; S.monSel = e && e.srcId ? e.srcId : S.monSel; U.go('combat');
      }
      return;
    }
    if (U.PLAYER && (rest === 'view' || rest === 'charId')) { S.view = U.store.get('view', S.view); S.charId = U.store.get('charId', S.charId); redraw(); return; } // "My sheet" on a token card
    if (U.PLAYER && rest === 'obrstate') { if (S.view === 'obrfight') redraw(); markFightNav(); }
  });

  // ---------- 5. players: ⚔️ Fight (read only) ----------
  const ST = { ok: ['Unhurt', '🟢'], hurt: ['Hurt', '🟡'], bloodied: ['Badly hurt', '🟠'], dying: ['Barely alive', '🔴'], down: ['Down', '💀'] };
  const condTxt = cs => (cs && cs.length ? ' <small class="conds">' + cs.map(x => esc(D.t ? D.t(x) : x)).join(', ') + '</small>' : '');
  U.views.obrfight = function () {
    const st = U.raw.get('obrstate', null); const mine = new Set((S.chars || []).map(c => c.id));
    let h = '<div class="page"><div class="ph"><h1>⚔️ ' + T('Fight') + '</h1>' + (st && st.on ? '<span class="round">' + T('Round') + ' <b>' + st.round + '</b></span>' : '') + '</div>';
    if (!st || !st.on) {
      h += '<div class="emptybig"><p>' + T('No fight right now. When the DM starts one, the order of turns shows up here.') + '</p></div>';
    } else {
      // my hero in this fight (the first one) acts; the clicked row is the target
      const meIn = st.list.find(x => x.cid && mine.has(x.cid));
      const actor = meIn ? (S.chars || []).find(c => c.id === (S.obrActor && mine.has(S.obrActor) ? S.obrActor : meIn.cid)) : null;
      const alive = x => x.k === 'pc' ? x.hp > 0 : x.st !== 'down';
      if (!st.list.some(x => x.id === S.obrTgt)) { const firstFoe = st.list.find(x => x.k === 'mon' && alive(x)); S.obrTgt = firstFoe ? firstFoe.id : ''; }
      h += '<p class="hint">' + T('Click a row to choose the target.') + '</p><div class="obrlist">' + st.list.map((x, i) => {
        const act = i === st.turn, me = x.cid && mine.has(x.cid), tg = x.id && x.id === S.obrTgt;
        const bar = x.k === 'pc' ? '<div class="hpbar"><i style="width:' + Math.max(0, Math.min(100, Math.round((x.hp / (x.mx || 1)) * 100))) + '%"></i></div><small>' + T('HP') + ' ' + x.hp + ' / ' + x.mx + ' · ' + T('AC') + ' ' + x.ac + '</small>'
          : '<small>' + (ST[x.st] || ST.ok)[1] + ' ' + T((ST[x.st] || ST.ok)[0]) + '</small>';
        return '<div class="obrrow pick' + (act ? ' act' : '') + (me ? ' me' : '') + (tg ? ' tgt' : '') + (x.k === 'mon' ? ' mon' : '') + '" data-act="obrTgt" data-id="' + esc(x.id || '') + '"><span class="ini">' + (x.init != null && x.init !== '' ? esc(x.init) : '–') + '</span><div class="who"><b>' + (act ? '▶ ' : '') + esc(x.n) + (me ? ' <span class="tag">' + T('you') + '</span>' : '') + (tg ? ' <span class="tag tgtag">🎯 ' + T('target') + '</span>' : '') + '</b>' + condTxt(x.cond) + bar + '</div></div>';
      }).join('') + '</div>';
      const a = st.list[st.turn]; const myTurn = !!(a && a.cid && mine.has(a.cid));
      if (actor) {
        const menu = actMenu().find(m => m.cid === actor.id) || { acts: [] };
        const tgt = st.list.find(x => x.id === S.obrTgt);
        const ec = (meIn && meIn.ec) || { a: 0, b: 0, r: 0 };
        const can = x => myTurn ? (x.cost === '-' || !ec[x.cost]) : ((x.cost === 'r' || x.k === 'weapon') && !ec.r);
        const costTag = x => x.cost === '-' ? T('free (extra damage)') : !myTurn && x.k === 'weapon' ? '🛡 ' + T('opportunity attack (1 hit, your reaction)') : U.ECON_ICON[x.cost] + ' ' + T(U.ECON_NAME[x.cost]);
        const mode = S.obrMode || 'normal';
        h += '<div class="detail obract">' +
          (myTurn ? '<p class="warn">⚔️ <b>' + T('Your turn!') + '</b> ' + T('1. Click the target in the list above. 2. Click what you do. 3. When you are done — End my turn.') + '</p>'
            : '<p class="hint">⏳ ' + T('Not your turn. You can only react: hit an enemy that runs away from you (opportunity attack) or cast a reaction spell.') + '</p>') +
          '<h3>' + esc(actor.name) + (tgt ? ' → 🎯 ' + esc(tgt.n) : '') + '</h3>' +
          '<p>' + T('This turn:') + ' ' + U.econChips(ec) + '</p>' +
          '<p class="move">🚶 ' + T('Movement: {0} / {1} ft', (meIn && meIn.mv) || 0, (meIn && meIn.mvMax) || 30) + ' <small>' + T('(move your token on the map; it stops at your speed)') + '</small></p>' +
          '<p class="hint">🗺 ' + T('On the map: pick the ⚔️ D&D tool in the Owlbear toolbar (key Y). Click a token or an empty spot — the window shows what you can do there. Drag your token — a ruler shows your movement.') + '</p>' +
          (myTurn ? '<p class="basics">' + [['dash', '🏃 ' + T('Dash')], ['dodge', '🛡 ' + T('Dodge')], ['disengage', '🚪 ' + T('Disengage')]].map(b => '<button class="mini" data-act="obrBasic" data-v="' + b[0] + '" data-cid="' + esc(actor.id) + '"' + (ec.a ? ' disabled' : '') + ' title="' + esc(T(BASIC_HELP[b[0]])) + '">' + b[1] + '</button>').join('') +
            (meIn && meIn.rogue ? ' <small>' + T('Rogue: the same as a bonus action →') + '</small> ' + [['dash', '🏃'], ['disengage', '🚪']].map(b => '<button class="mini" data-act="obrBasic" data-bonus="1" data-v="' + b[0] + '" data-cid="' + esc(actor.id) + '"' + (ec.b ? ' disabled' : '') + '>' + b[1] + ' ⚡</button>').join('') : '') + '</p>' : '') +
          '<p class="modepick">' + T('Roll:') + ' ' + [['normal', T('Normal')], ['adv', '⬆ ' + T('With advantage')], ['dis', '⬇ ' + T('With disadvantage')]].map(m => '<button class="mini' + (mode === m[0] ? ' on' : '') + '" data-act="obrMode" data-v="' + m[0] + '">' + m[1] + '</button>').join('') +
          ' ' + U.ib('advantage') + '</p>' +
          (menu.acts.some(x => x.area) ? '<p><label class="inl"><input type="checkbox" data-on="obrAll"' + (S.obrAll ? ' checked' : '') + '> 🌋 ' + T('Hit all enemies at once (only for area spells like Fireball)') + '</label></p>' : '') +
          '<div class="actlist">' + menu.acts.map(x => '<button class="actb ' + esc(x.k) + '"' + (can(x) ? '' : ' disabled title="' + esc(T('Already used this turn')) + '"') + ' data-act="obrDo" data-cid="' + esc(actor.id) + '" data-aid="' + esc(x.id) + '"><b>' + esc(x.n) + '</b><small>' + esc(x.info) + (x.heal ? ' · ❤️' : '') + '</small><small class="cost">' + costTag(x) + '</small></button>').join('') + '</div>' +
          '<p class="btnrow">' + (myTurn ? '<button class="primary" data-act="obrEnd" data-cid="' + esc(actor.id) + '">⏭ ' + T('End my turn') + '</button>' : '') +
          '<button data-act="openSheet" data-id="' + esc(actor.id) + '">📜 ' + T('My character sheet') + '</button></p></div>';
      }
    }
    if (st && st.party && st.party.length) h += '<h3>' + T('The party') + '</h3><div class="obrlist">' + st.party.map(p => '<div class="obrrow' + (mine.has(p.id) ? ' me' : '') + '"><div class="who"><b>' + esc(p.n) + '</b> <small>' + T('lvl {0}', p.lvl) + '</small>' + condTxt(p.cond) + '<div class="hpbar"><i style="width:' + Math.max(0, Math.min(100, Math.round((p.hp / (p.mx || 1)) * 100))) + '%"></i></div><small>' + T('HP') + ' ' + p.hp + ' / ' + p.mx + ' · ' + T('AC') + ' ' + p.ac + '</small></div></div>').join('') + '</div>';
    return h + '</div>';
  };
  U.ACT.obrTgt = ds => { if (!U.PLAYER || !ds.id) return; S.obrTgt = ds.id; U.render(); };
  U.ON.obrAll = el => { S.obrAll = el.checked; };
  U.ACT.obrDo = ds => {
    const st = U.raw.get('obrstate', null); if (!st || !st.on) { U.toast(T('No fight right now.')); return; }
    const tid = S.obrAll ? '__all' : S.obrTgt;
    if (!tid) { U.toast(T('Click a row to choose the target.')); return; }
    U.obrSendAct({ cid: ds.cid, aid: ds.aid, tid, mode: S.obrMode || 'normal' }); S.obrMode = 'normal'; U.render();
  };
  U.ACT.obrMode = ds => { S.obrMode = ds.v; U.render(); };
  const BASIC_HELP = { dash: 'Dash: double your movement this turn. Costs your action.', dodge: 'Dodge: until your next turn attacks against you have Disadvantage. Costs your action.', disengage: 'Disengage: walk away from enemies without opportunity attacks. Costs your action.' };
  U.ACT.obrBasic = ds => { U.obrSendAct({ kind: 'basic', basic: ds.v, bonus: !!ds.bonus, cid: ds.cid }); };
  U.ACT.obrEnd = ds => { U.obrSendAct({ kind: 'end', cid: ds.cid }); };
  function markFightNav() {
    const b = document.querySelector('[data-v="obrfight"]'); if (!b) return;
    const st = U.raw.get('obrstate', null); const mine = new Set((S.chars || []).map(c => c.id));
    const a = st && st.on && st.list[st.turn];
    b.classList.toggle('live', !!(st && st.on)); b.classList.toggle('myturn', !!(a && a.cid && mine.has(a.cid)));
  }

  // ---------- 5b. 🎼 table music: the DM picks a mood or a YouTube link, it plays for everyone; everyone sets their own volume ----------
  const tvol = () => { try { const v = localStorage.getItem('dnd.tableVol'); return v == null ? 0.6 : Number(v); } catch (e) { return 0.6; } };
  const tmute = () => { try { return localStorage.getItem('dnd.tableMute') === '1'; } catch (e) { return false; } };
  const moodName = k => { const M = window.TableMusic && window.TableMusic.MOODS[k]; return M ? M.icon + ' ' + (U.LANG === 'ru' ? M.ru : M.en) : k; };
  const loadTM = () => window.TableMusic ? Promise.resolve(window.TableMusic) : new Promise(ok => { const s = document.createElement('script'); s.src = new URL('_engine/app/table-music.js', document.baseURI).href; s.onload = () => ok(window.TableMusic); s.onerror = () => ok(null); document.head.appendChild(s); });
  function nowTxt() {
    const st = U.raw.get('musicNow', null);
    if (!st || !st.on) return T('Silence');
    return st.kind === 'yt' ? '▶️ YouTube' : moodName(st.mood);
  }
  async function musicPop() {
    const TM = await loadTM(); const pop = document.getElementById('pop'); if (!pop || !TM) return;
    const st = U.raw.get(U.DM ? 'obrmusic' : 'musicNow', null);
    let h = '<div class="popcard settings music" role="dialog"><div class="ph"><h2>🎼 ' + T('Table music') + '</h2><button class="mini" data-act="closePop">✕</button></div>' +
      '<p>' + T('Now playing:') + ' <b>' + esc(nowTxt()) + '</b></p>';
    if (U.DM) {
      h += '<p class="hint">' + T('You choose — it plays for everyone in the room (even with the panel closed).') + '</p><div class="moodgrid">' +
        Object.keys(TM.MOODS).map(k => '<button class="mood' + (st && st.on && st.kind === 'mood' && st.mood === k ? ' on' : '') + '" data-act="tmMood" data-v="' + k + '">' + esc(moodName(k)) + '</button>').join('') + '</div>' +
        '<p><input id="tmYt" placeholder="' + esc(T('YouTube link (music, ambience…)')) + '" value="' + esc(st && st.kind === 'yt' ? 'https://youtu.be/' + st.yt : '') + '"> <button data-act="tmYt">▶️ YouTube</button></p>' +
        '<p><button class="danger" data-act="tmStop">⏹ ' + T('Stop for everyone') + '</button></p>';
    }
    h += '<h4>🔊 ' + T('My volume') + '</h4><p><input type="range" min="0" max="100" value="' + Math.round(tvol() * 100) + '" data-in="tvol"> <span class="setv">' + Math.round(tvol() * 100) + '%</span> ' +
      '<label class="inl"><input type="checkbox" data-on="tmute"' + (tmute() ? ' checked' : '') + '> ' + T('Mute the table music for me') + '</label></p>' +
      (U.raw.get('musicBlocked', false) ? '<p class="warn">🔈 ' + T('Your browser blocked the sound.') + ' <button class="primary" data-act="tmLocal">🔊 ' + T('Play it here') + '</button></p>' : '') +
      '<p class="hint">' + T('🎵 in the top bar is your own quiet background music; the table music is separate.') + '</p></div>';
    pop.innerHTML = h; pop.classList.add('show');
  }
  const setMusic = st => { U.raw.set('obrmusic', st); local('obrmusic'); setTimeout(musicPop, 400); };
  U.ACT.tableMusic = () => musicPop();
  U.ACT.tmMood = ds => setMusic({ on: true, kind: 'mood', mood: ds.v, t: Date.now() });
  U.ACT.tmYt = async () => { const TM = await loadTM(); const id = TM.ytIdOf((document.getElementById('tmYt') || {}).value); if (!id) { U.toast(T('That is not a YouTube link.')); return; } setMusic({ on: true, kind: 'yt', yt: id, t: Date.now() }); };
  U.ACT.tmStop = () => setMusic({ on: false, t: Date.now() });
  U.ACT.tmLocal = async () => { const TM = await loadTM(); TM.resume(); TM.apply(U.raw.get('musicNow', null) || U.raw.get('obrmusic', null)); U.raw.set('musicBlocked', false); U.toast('🔊 ' + T('Playing here while this panel is open.')); musicPop(); };
  U.IN.tvol = el => { try { localStorage.setItem('dnd.tableVol', String(Number(el.value) / 100)); } catch (e) {} const b = el.parentNode.querySelector('.setv'); if (b) b.textContent = el.value + '%'; if (window.TableMusic) window.TableMusic.setVolume(); };
  U.ON.tmute = el => { try { localStorage.setItem('dnd.tableMute', el.checked ? '1' : '0'); } catch (e) {} if (window.TableMusic) window.TableMusic.setVolume(); };

  // ---------- 6. is the background page alive? If not, the panel syncs itself (while it is open) ----------
  let syncMode = 'wait'; // 'bg' 🟢 | 'panel' 🟡 | 'wait' ⏳ | 'off' 🔴
  const bgAlive = () => { const a = U.raw.get('syncAlive', null); return !!(a && a.by === 'bg' && Date.now() - a.t < 12000); };
  async function checkSync() {
    if (bgAlive()) { syncMode = 'bg'; U.renderTop(); return; }
    await new Promise(r => setTimeout(r, 3000));
    if (bgAlive()) { syncMode = 'bg'; U.renderTop(); return; }
    try { const m = await import(new URL('_engine/app/obr-bg.js', document.baseURI).href); /* absolute: a classic script resolves import() from its own folder */ m.startBackground(OBR, 'panel'); syncMode = 'panel'; }
    catch (e) { console.warn('sync', e); syncMode = 'off'; }
    U.renderTop();
  }
  const SYNC = { bg: ['🟢', 'Sync is on (background page). Click to send everything again.'], panel: ['🟡', 'Sync works only while this panel is open: reinstall the extension (manifest.json?v=…) to get the background page. Click to send everything again.'], wait: ['⏳', 'Connecting…'], off: ['🔴', 'Sync is off. Reload the page.'] };
  const topWithSync = U.renderTop;
  U.renderTop = function () {
    topWithSync();
    const el = document.getElementById('topCtl'); if (!el) return;
    const s = SYNC[syncMode] || SYNC.wait;
    el.insertAdjacentHTML('afterbegin', '<button class="tb sync-' + syncMode + '" data-act="resync" title="' + esc(T(s[1])) + '">' + s[0] + '</button>');
  };
  U.ACT.resync = async () => {
    const s = window.__obrSync;
    if (syncMode === 'bg') U.raw.set('resyncReq', Date.now()); // the background page does it
    else if (s) await s.resync();
    else { U.toast(T(SYNC[syncMode][1])); return; } U.toast('🔄 ' + T('Sent everything again.') + (syncMode === 'panel' ? '<br><small>' + esc(T(SYNC.panel[1])) + '</small>' : ''));
  };

  window.ONLINE_START = function () {
    document.body.classList.add('in-obr');
    applySize(getSize());
    remember();
    checkSync(); setTimeout(thumbs, 500); // heroes that already have a picture
    saveMenu(); if (U.DM) setTimeout(runActQueue, 1500); // requests that came while the panel was closed
    if (U.DM) { U.obrWatchMoves(); try { OBR.scene.onReadyChange(r => { if (r) U.obrWatchMoves(); }); } catch (e) {} } // movement rules on the map
    if (U.PLAYER) {
      const nav = document.querySelector('header.top nav');
      if (nav && !nav.querySelector('[data-v="obrfight"]')) nav.insertAdjacentHTML('afterbegin', '<button data-act="nav" data-v="obrfight">⚔️ ' + esc(T('Fight')) + '</button>');
      markFightNav();
      try { if (OBR) OBR.action.setBadgeText(undefined); } catch (e) {}
    } else queueState();
    const baseRender = U.render; U.render = function () { baseRender(); if (U.PLAYER) markFightNav(); };
    U.renderTop();
  };
})(window.UI);
