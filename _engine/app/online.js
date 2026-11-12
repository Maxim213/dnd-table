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
  const local = k => { const s = window.__obrSync; if (s && s.by === 'panel') setTimeout(() => s.key(P + (k === 'obrstate' ? k : gk(k))), 0); };

  // ---------- 2. heroes get "upd" when they change (newest copy wins between DM and player) ----------
  const sig = c => { const x = Object.assign({}, c); delete x.upd; delete x.portrait; delete x.obr; return JSON.stringify(x); };
  let sigs = {};
  const remember = () => { sigs = {}; (S.chars || []).forEach(c => { sigs[c.id] = sig(c); }); };
  const baseSaveChars = U.saveChars;
  U.saveChars = function () {
    const now = Date.now();
    (S.chars || []).forEach(c => { const s = sig(c); if (sigs[c.id] !== s) { c.upd = now; sigs[c.id] = s; } });
    const r = baseSaveChars(); local('chars'); queueState(); thumbs(); return r;
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
  function summary() {
    if (!U.DM || !U.game) return null;
    const cb = S.combat || { list: [] };
    const list = (cb.list || []).map(x => {
      if (x.type === 'pc') {
        const c = U.byId(x.charId); if (!c) return { n: '?', k: 'pc' };
        let d = null; try { d = E.compute(c); } catch (e) {}
        return { n: c.name || T('Unnamed'), k: 'pc', cid: c.id, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, init: x.init, cond: (c.conditions || []).slice(0, 6) };
      }
      return { n: x.name, k: 'mon', st: health(Number(x.hp) || 0, Number(x.hpMax) || 0), init: x.init, cond: (x.conditions || []).slice(0, 6) };
    });
    const party = (S.chars || []).filter(c => c.party).slice(0, 8).map(c => {
      let d = null; try { d = E.compute(c); } catch (e) {}
      return { id: c.id, n: c.name || T('Unnamed'), cls: c.classKey || '', lvl: c.level, hp: d ? d.hpCur : 0, mx: d ? d.hpMax : 0, ac: d ? d.ac : 0, cond: (c.conditions || []).slice(0, 6) };
    });
    return { on: (cb.turn >= 0 && list.length > 0), round: cb.round || 0, turn: cb.turn, list: list.slice(0, 40), party, game: U.game.name };
  }
  let stT = 0, lastSt = '';
  function queueState() {
    if (!U.DM) return;
    clearTimeout(stT);
    stT = setTimeout(() => { const st = summary(); const s = JSON.stringify(st); if (s !== lastSt) { lastSt = s; U.raw.set('obrstate', st); local('obrstate'); } }, 250);
  }
  const baseSaveCombat = U.saveCombat;
  U.saveCombat = function () { const r = baseSaveCombat(); queueState(); return r; };

  // ---------- 4. changes from the other players (written by the background page) ----------
  let pending = false;
  const typing = () => { const a = document.activeElement; return a && document.getElementById('main').contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
  const redraw = () => { if (typing()) { pending = true; return; } pending = false; U.render(); };
  document.addEventListener('focusout', () => { if (pending) setTimeout(() => { if (!typing()) redraw(); }, 50); });
  const P = U.PLAYER ? 'dndp.' : 'dndt.';
  const gk = k => (U.DM ? 'g.' + (U.game ? U.game.id : '_none') + '.' + k : k);
  window.addEventListener('storage', e => {
    const k = e.key || ''; if (!k.startsWith(P)) return; const rest = k.slice(P.length);
    if (rest === gk('log')) { S.log = U.store.get('log', []); U.renderSide(); return; }
    if (rest === gk('chars')) { S.chars = U.store.get('chars', []).map(E.normalize); remember(); if (U.DM) queueState(); redraw(); return; }
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
      h += '<div class="obrlist">' + st.list.map((x, i) => {
        const act = i === st.turn, me = x.cid && mine.has(x.cid);
        const bar = x.k === 'pc' ? '<div class="hpbar"><i style="width:' + Math.max(0, Math.min(100, Math.round((x.hp / (x.mx || 1)) * 100))) + '%"></i></div><small>' + T('HP') + ' ' + x.hp + ' / ' + x.mx + ' · ' + T('AC') + ' ' + x.ac + '</small>'
          : '<small>' + (ST[x.st] || ST.ok)[1] + ' ' + T((ST[x.st] || ST.ok)[0]) + '</small>';
        return '<div class="obrrow' + (act ? ' act' : '') + (me ? ' me' : '') + (x.k === 'mon' ? ' mon' : '') + '"><span class="ini">' + (x.init != null && x.init !== '' ? esc(x.init) : '–') + '</span><div class="who"><b>' + (act ? '▶ ' : '') + esc(x.n) + (me ? ' <span class="tag">' + T('you') + '</span>' : '') + '</b>' + condTxt(x.cond) + bar + '</div></div>';
      }).join('') + '</div>';
      const a = st.list[st.turn]; if (a && a.cid && mine.has(a.cid)) h += '<p class="warn">⚔️ <b>' + T('Your turn!') + '</b> ' + T('Open your sheet to attack or cast.') + ' <button class="primary" data-act="openSheet" data-id="' + esc(a.cid) + '">' + T('Open sheet →') + '</button></p>';
    }
    if (st && st.party && st.party.length) h += '<h3>' + T('The party') + '</h3><div class="obrlist">' + st.party.map(p => '<div class="obrrow' + (mine.has(p.id) ? ' me' : '') + '"><div class="who"><b>' + esc(p.n) + '</b> <small>' + T('lvl {0}', p.lvl) + '</small>' + condTxt(p.cond) + '<div class="hpbar"><i style="width:' + Math.max(0, Math.min(100, Math.round((p.hp / (p.mx || 1)) * 100))) + '%"></i></div><small>' + T('HP') + ' ' + p.hp + ' / ' + p.mx + ' · ' + T('AC') + ' ' + p.ac + '</small></div></div>').join('') + '</div>';
    return h + '</div>';
  };
  function markFightNav() {
    const b = document.querySelector('[data-v="obrfight"]'); if (!b) return;
    const st = U.raw.get('obrstate', null); const mine = new Set((S.chars || []).map(c => c.id));
    const a = st && st.on && st.list[st.turn];
    b.classList.toggle('live', !!(st && st.on)); b.classList.toggle('myturn', !!(a && a.cid && mine.has(a.cid)));
  }

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
