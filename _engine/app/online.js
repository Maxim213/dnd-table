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
    if (ON.owlbear) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="tableMusic" title="' + esc(T('Table music')) + '">🎼</button>');
    if (ON.owlbear) el.insertAdjacentHTML('beforeend', '<button class="tb" data-act="panelSize" title="' + esc(s === 'wide' ? T('Make the panel narrow (see the map)') : T('Make the panel wide')) + '">' + (s === 'wide' ? '⇥' : '⇤') + '</button>');
    const tag = document.getElementById('modeTag');
    if (tag && ON.owlbear && !tag.querySelector('.obrtag')) tag.insertAdjacentHTML('beforeend', ' <span class="obrtag" title="Owlbear Rodeo">🦉 ' + (ON.role === 'GM' ? T('Owlbear: DM') : T('Owlbear: player')) + '</span>');
  };
  U.ACT.panelSize = () => { applySize(getSize() === 'wide' ? 'narrow' : 'wide').then(() => U.renderTop()); };
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
        return { id: x.id, n: c.name || T('Unnamed'), k: 'pc', cid: c.id, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, init: x.init, cond: (c.conditions || []).slice(0, 6), pic: priv ? c.portraitThumb || '' : undefined };
      }
      const m = { id: x.id, n: x.name, k: 'mon', st: health(Number(x.hp) || 0, Number(x.hpMax) || 0), init: x.init, cond: (x.conditions || []).slice(0, 6) };
      if (priv) Object.assign(m, { hp: Number(x.hp) || 0, mx: Number(x.hpMax) || 0, ac: x.ac, cr: x.cr || '' });
      return m;
    });
    const party = (S.chars || []).filter(c => c.party).slice(0, 8).map(c => {
      let d = null; try { d = E.compute(c); } catch (e) {}
      return { id: c.id, n: c.name || T('Unnamed'), cls: c.classKey || '', lvl: c.level, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, cond: (c.conditions || []).slice(0, 6) };
    });
    return { on: (cb.turn >= 0 && list.length > 0), round: cb.round || 0, turn: cb.turn, list: list.slice(0, 40), party, game: U.game.name };
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
  let ringKey = '', namesKey = '';
  U.obrTurnRing = async function (pv) {
    if (!U.DM || !OBR || !OBR.scene) return;
    try { if (!(await OBR.scene.isReady())) return; } catch (e) { return; }
    const list = (pv && pv.list) || [];
    const norm = s => String(s || '').trim().toLowerCase();
    // 1. auto-link: an unlinked token with the same name as a hero or a monster in the fight
    const nk = list.map(x => x.n).join('|') + '#' + (S.chars || []).map(c => c.name).join('|');
    if (nk !== namesKey) {
      namesKey = nk;
      try {
        const byName = {}; (S.chars || []).forEach(c => { if (c.name) byName[norm(c.name)] = { k: 'pc', cid: c.id, n: c.name }; });
        list.filter(x => x.k === 'mon').forEach(x => { byName[norm(x.n)] = { k: 'mon', eid: x.id, n: x.n }; });
        await OBR.scene.items.updateItems(it => it.layer === 'CHARACTER' && !(it.metadata && it.metadata[LINK]) && !!byName[norm(it.name)], items => { items.forEach(it => { it.metadata[LINK] = byName[norm(it.name)]; }); });
      } catch (e) { console.warn('auto-link', e); }
    }
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

  // ---------- 3b. players act in the DM's fight: "who, with what, at whom" → the DM's app rolls and applies it ----------
  // A request: { id, cid (hero), aid (action id from E.compute(hero).actions), tid (fight entry id or '__all'), mode, from }.
  // Players send it through Owlbear; the DM's background page puts it into obrActQ; the DM's open panel resolves it here.
  U.remoteAct = function (q) {
    const cb = S.combat; if (!cb || cb.turn < 0) return T('No fight right now.');
    const ai = cb.list.findIndex(x => x.type === 'pc' && x.charId === q.cid); if (ai < 0) return T('{0} is not in the fight.', q.from || '?');
    const actor = cb.list[ai]; const turn0 = cb.turn; const t0 = cb.target[actor.id]; const top = S.log[0];
    cb.turn = ai; if (q.tid) cb.target[actor.id] = q.tid; S.mode = q.mode === 'adv' || q.mode === 'dis' ? q.mode : 'normal';
    const toast0 = U.toast; let why = ''; U.toast = h => { why = h; }; // a refusal (no slots / uses) comes as a toast: catch it
    try { U.ACT.cbAct({ aid: q.aid }); }
    finally { U.toast = toast0; cb.turn = turn0; if (t0 === undefined) delete cb.target[actor.id]; else cb.target[actor.id] = t0; S.mode = 'normal'; U.saveCombat(); }
    if (!S.log[0] || S.log[0] === top) U.logAdd(q.from || '?', ['⚠️ ' + (why || T('This action did not work.'))]); // tell everyone why nothing happened
    if (S.log[0] && S.log[0] !== top) { S.log[0].share = 1; S.log[0].html = '<small class="from">🦉 ' + esc(q.player || q.from || '') + '</small>' + S.log[0].html; U.saveLog(); }
    U.render(); return '';
  };
  function runActQueue() {
    if (!U.DM || !U.game) return;
    const Q = U.raw.get('obrActQ', []); if (!Q.length) return;
    U.raw.set('obrActQ', []);
    Q.filter(q => q && Date.now() - (q.t || 0) < 5 * 60000).forEach(q => { const err = U.remoteAct(q); if (err) U.toast('⚠️ ' + err); });
  }
  U.runActQueue = runActQueue;

  // players: what my heroes can do (the token card reads this list too)
  function actMenu() {
    return (S.chars || []).map(c => {
      let d = null; try { d = E.compute(c); } catch (e) { return null; }
      const acts = d.actions.filter(a => a.kind !== 'item' || a.heal || a.temp).filter(a => a.hit != null || a.save || a.heal || a.temp || (a.dmg && a.extra)).slice(0, 24).map(a => ({
        id: a.id, n: a.name, k: a.kind, heal: !!(a.heal || a.temp), area: !!(a.save && !a.hit),
        info: (a.hit != null ? U.sign(a.hit) + ' ' : '') + (a.save ? T('DC') + ' ' + a.save.dc + ' ' + (D.AB[a.save.abil] || a.save.abil) + ' ' : '') + (a.dmg ? String(a.dmg).replace(/@(STR|DEX|CON|INT|WIS|CHA|LVL|PB)/gi, (m0, k) => { k = k.toUpperCase(); return k === 'LVL' ? d.x.lvl : k === 'PB' ? d.x.pb : d.x.mod[k]; }) : '') + (a.count > 1 ? ' ×' + a.count : '') + (a.level ? ' · ' + T('lvl {0}', a.level) : '')
      }));
      return { cid: c.id, n: c.name || T('Unnamed'), acts };
    }).filter(Boolean);
  }
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
      if (myTurn) h += '<p class="warn">⚔️ <b>' + T('Your turn!') + '</b> ' + T('Pick a target and an action below.') + '</p>';
      if (actor) {
        const menu = actMenu().find(m => m.cid === actor.id) || { acts: [] };
        const tgt = st.list.find(x => x.id === S.obrTgt);
        h += '<div class="detail obract"><h3>🎯 ' + esc(actor.name) + (tgt ? ' → ' + esc(tgt.n) : '') + '</h3>' +
          (!myTurn ? '<p class="hint">' + T('Not your turn: use this only for reactions (e.g. an opportunity attack) or when the DM says so.') + '</p>' : '') +
          '<p class="hint">' + T('Advantage / Disadvantage: pick it in the dice panel first.') + (S.mode !== 'normal' ? ' <b>' + (S.mode === 'adv' ? T('Advantage') : T('Disadvantage')) + '</b>' : '') + '</p>' +
          '<p><label class="inl"><input type="checkbox" data-on="obrAll"' + (S.obrAll ? ' checked' : '') + '> ' + T('All enemies at once (area spells: Fireball, Thunderwave…)') + '</label></p>' +
          '<div class="actlist">' + menu.acts.map(x => '<button class="actb ' + esc(x.k) + '" data-act="obrDo" data-cid="' + esc(actor.id) + '" data-aid="' + esc(x.id) + '"><b>' + esc(x.n) + '</b><small>' + esc(x.info) + (x.heal ? ' · ❤️' : '') + '</small></button>').join('') + '</div>' +
          '<p><button data-act="openSheet" data-id="' + esc(actor.id) + '">' + T('Open sheet →') + '</button></p></div>';
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
    U.obrSendAct({ cid: ds.cid, aid: ds.aid, tid, mode: U.takeMode() }); U.renderSide();
  };
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
