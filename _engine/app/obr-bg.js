// Background sync for the Owlbear Rodeo extension (loaded by bg.html, an ES module).
// It runs as long as the room is open, even when the D&D Table panel is closed.
// The panel (index.html) and this page share the browser storage (same site), so they talk through localStorage:
//   the panel saves as usual → this page sees the "storage" event → tells the other players through Owlbear;
//   messages from the other players → this page writes them into storage → the panel sees the change and redraws.
// What goes through Owlbear:
//   • broadcast 'log'     — every roll / action line, to everyone (the DM can hide his: dnd.hideRolls = '1')
//   • broadcast 'heroSet' — the DM changed a player's hero (damage, conditions, level…) → the owner's copy updates
//   • player metadata     — each player's heroes (the DM's game picks them up automatically)
//   • room metadata       — the fight summary from the DM (who is in it, whose turn, HP / health of monsters)
// by = 'bg' (the background page) or 'panel' (the panel runs it itself when the background page is missing).
// In 'panel' mode the panel's own saves don't fire "storage" events here, so online.js calls window.__obrSync.key(fullKey).
export function startBackground(OBR, by) {
  by = by || 'bg';
  const CH = 'dndtable/v1', ROOM = 'dndtable/state', HEROES = 'dndtable/heroes';
  const ruOn = () => { try { return (localStorage.getItem('dnd.lang') || 'ru') === 'ru'; } catch (e) { return true; } };
  const tr = (en, ru) => (ruOn() ? ru : en);
  const uid = () => Math.random().toString(36).slice(2, 10);
  OBR.onReady(async () => {
    const role = await OBR.player.getRole();
    const DM = role === 'GM';
    const P = DM ? 'dndt.' : 'dndp.';
    const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    const set = (k, v) => {
      try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) { return false; }
      // inside the panel nobody else gets a "storage" event for this write → send one to the panel ourselves
      if (by === 'panel') setTimeout(() => window.dispatchEvent(new StorageEvent('storage', { key: P + k })), 0);
      return true;
    };
    const game = () => (DM ? get('curGame', null) : '');
    const gk = k => (DM ? 'g.' + game() + '.' + k : k); // the DM's data lives inside the open game
    const myName = async () => { try { return await OBR.player.getName(); } catch (e) { return ''; } };

    // ---------- the roll log ----------
    const plain = html => { const d = new DOMParser().parseFromString('<div>' + String(html || '').replace(/<\/(div|small|b)>/g, '$& ').replace(/<br\s*\/?>/g, ' ') + '</div>', 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };
    const ALLOWED = new Set(['B', 'I', 'U', 'S', 'SMALL', 'SPAN', 'DIV', 'BR', 'EM', 'STRONG']);
    const clean = html => { // never trust html from the network: keep only simple text tags and class names
      const d = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
      const walk = el => [...el.children].forEach(ch => {
        if (!ALLOWED.has(ch.tagName)) { ch.replaceWith(document.createTextNode(ch.textContent || '')); return; }
        [...ch.attributes].forEach(a => { if (a.name !== 'class') ch.removeAttribute(a.name); });
        walk(ch);
      });
      walk(d.body.firstChild); return d.body.firstChild.innerHTML.slice(0, 6000);
    };
    const sent = new Set((get('obrSent', []) || []).slice(0, 300));
    const sendNewLog = async () => {
      if (DM && !game()) return;
      const L = get(gk('log'), []); const fresh = L.filter(e => e && e.mine && e.id && !sent.has(e.id)).reverse();
      if (!fresh.length) return;
      if (DM && localStorage.getItem('dnd.hideRolls') === '1') { // hidden rolls stay hidden for good (players' own actions are always shown)
        fresh.filter(e => !e.share).forEach(e => sent.add(e.id)); set('obrSent', [...sent].slice(-300));
        if (!fresh.some(e => e.share)) return;
      }
      const name = await myName();
      for (const e of fresh.filter(x => !sent.has(x.id))) {
        sent.add(e.id);
        try { await OBR.broadcast.sendMessage(CH, { type: 'log', id: e.id, t: e.t, html: e.html, from: name, dm: DM }); } catch (err) { console.warn(err); }
      }
      set('obrSent', [...sent].slice(-300));
    };
    const takeLog = async m => {
      if (DM && !game()) return;
      const L = get(gk('log'), []); if (L.some(e => e && e.id === m.id)) return;
      const tag = '<small class="from">' + (m.dm ? '🎲 ' + tr('DM', 'Мастер') : '🦉 ' + clean(m.from || tr('player', 'игрок'))) + '</small>';
      L.unshift({ t: m.t || Date.now(), html: tag + clean(m.html), id: m.id, remote: 1 });
      set(gk('log'), L.slice(0, 150));
      let open = false; try { open = await OBR.action.isOpen(); } catch (e) {}
      if (!open) try { OBR.notification.show(plain(m.html).slice(0, 140), 'INFO'); } catch (e) {}
    };

    // ---------- heroes ----------
    const slim = c => { const x = Object.assign({}, c); delete x.portrait; return x; };
    const fit = list => { // keep the player metadata under ~14 KB: drop long texts first if needed
      let s = JSON.stringify(list); if (s.length < 14000) return list;
      list = list.map(c => Object.assign({}, c, { inventory: (c.inventory || []).map(it => Object.assign({}, it, { desc: '', cdesc: '' })), notes: '' }));
      s = JSON.stringify(list); return s.length < 15500 ? list : list.slice(0, 1);
    };
    const publishHeroes = async () => { // player → the DM sees them in his game
      if (DM) return;
      const list = fit(get('chars', []).map(slim));
      try { await OBR.player.setMetadata({ [HEROES]: list }); } catch (e) { console.warn('hero metadata', e); }
    };
    let lastParty = [];
    const mergeHeroes = players => { // DM: put the players' heroes into the open game
      lastParty = players || lastParty;
      if (!DM || !game()) return;
      const chars = get(gk('chars'), []); let changed = false;
      lastParty.forEach(p => {
        const list = (p.metadata && p.metadata[HEROES]) || [];
        list.forEach(h => {
          if (!h || !h.id) return;
          const i = chars.findIndex(c => c.id === h.id); const old = i >= 0 ? chars[i] : null;
          if (old && old.obr && (h.upd || 0) <= (old.upd || 0)) return; // ours is newer or the same
          const merged = Object.assign({}, h, { obr: { pid: p.id, name: p.name }, party: old ? old.party !== false : true });
          if (h.portraitThumb) merged.portrait = h.portraitThumb; // the player's picture (small copy)
          else if (old && old.portrait) merged.portrait = old.portrait;
          if (i >= 0) chars[i] = merged; else chars.push(merged);
          changed = true;
        });
      });
      if (changed) { set(gk('chars'), chars); seen = snapshot(chars); }
    };
    // DM edited a player's hero (damage in a fight, level, conditions…) → send it to its owner
    const snapshot = chars => { const m = {}; (chars || []).forEach(c => { if (c && c.obr) m[c.id] = c.upd || 0; }); return m; };
    let seen = snapshot(DM ? get(gk('chars'), []) : []);
    const sendHeroChanges = async () => {
      if (!DM || !game()) return;
      const chars = get(gk('chars'), []);
      for (const c of chars) {
        if (!c || !c.obr || (c.upd || 0) <= (seen[c.id] || 0)) continue;
        try { await OBR.broadcast.sendMessage(CH, { type: 'heroSet', to: c.obr.pid, hero: slim(c) }); } catch (e) { console.warn(e); }
      }
      seen = snapshot(chars);
    };
    const takeHero = async m => { // player: the DM changed my hero
      if (DM || !m.hero || m.to !== OBR.player.id) return;
      const chars = get('chars', []); const i = chars.findIndex(c => c.id === m.hero.id);
      if (i < 0 || (m.hero.upd || 0) <= (chars[i].upd || 0)) return;
      const h = Object.assign({}, m.hero); delete h.obr; ['portrait', 'portraitThumb', 'portraitThumbKey'].forEach(k => { if (chars[i][k]) h[k] = chars[i][k]; else delete h[k]; }); // my own picture stays
      chars[i] = h; set('chars', chars); publishHeroes();
    };

    // ---------- the fight summary (DM → room) and "your turn" (player) ----------
    let lastState = '';
    const publishState = async () => {
      if (!DM) return;
      const st = get('obrstate', null); const s = JSON.stringify(st || null);
      if (s === lastState) return; lastState = s;
      try { await OBR.room.setMetadata({ [ROOM]: st || null }); } catch (e) { console.warn('room metadata', e); }
    };
    let turnKey = get('obrTurnKey', '');
    const takeState = st => {
      if (DM) return;
      set('obrstate', st || null); drawReachSoon();
      const mine = new Set(get('chars', []).map(c => c.id));
      const a = st && st.on && st.list && st.list[st.turn];
      const key = st && st.on ? st.round + ':' + st.turn : '';
      if (a && a.cid && mine.has(a.cid) && key !== turnKey) {
        turnKey = key; set('obrTurnKey', key);
        try { OBR.notification.show('⚔️ ' + tr('Your turn!', 'Твой ход!') + ' — ' + a.n + '. ' + tr('Tool ⚔️ D&D is on: click yourself, an enemy or the floor.', 'Включён инструмент ⚔️ D&D: кликни на себя, врага или пол.'), 'WARNING'); } catch (e) {}
        try { OBR.action.setBadgeText('!'); OBR.action.setBadgeBackgroundColor('#d9a441'); } catch (e) {}
        try { OBR.tool.activateTool('dndtable/tool'); } catch (e) {} // your turn: the ⚔️ D&D tool is ready (click, drag)
      } else if (!(a && a.cid && mine.has(a.cid))) { try { OBR.action.setBadgeText(undefined); } catch (e) {} }
    };

    // ---------- table music: the DM picks (obrmusic) → room metadata → everybody's background page plays it ----------
    const MUSIC = 'dndtable/music';
    const musicLib = () => window.TableMusic ? Promise.resolve(window.TableMusic) : new Promise(ok => {
      const s = document.createElement('script'); s.src = new URL('_engine/app/table-music.js', location.href).href; s.onload = () => ok(window.TableMusic); s.onerror = () => ok(null); document.head.appendChild(s);
    });
    let lastMusic = '';
    const playMusic = async st => {
      const k = JSON.stringify(st || null); if (k === lastMusic) return; lastMusic = k;
      const TM = await musicLib(); if (!TM) return;
      TM.apply(st); set('musicNow', st || null);
      setTimeout(() => set('musicBlocked', !!(TM.blocked && TM.blocked())), 1500);
    };
    const publishMusic = async () => {
      if (!DM) return; const st = get('obrmusic', null);
      try { await OBR.room.setMetadata({ [MUSIC]: st }); } catch (e) { console.warn('music metadata', e); }
      playMusic(st);
    };

    // ---------- a player acts in the fight (DM side): queue it for the DM's panel, which rolls and applies it ----------
    const takeAct = async q => {
      const Q = get('obrActQ', []); if (Q.some(x => x.id === q.id)) return;
      Q.push(Object.assign({}, q, { t: q.t || Date.now() })); set('obrActQ', Q.slice(-20));
      let open = false; try { open = await OBR.action.isOpen(); } catch (e) {}
      if (!open) try { OBR.notification.show('🎯 ' + (q.from || tr('A player', 'Игрок')) + ': ' + tr('acts in the fight — open D&D Table to resolve it', 'действует в бою — открой D&D Table, чтобы бросок прошёл'), 'WARNING'); } catch (e) {}
    };

    // ---------- wire it up ----------
    OBR.broadcast.onMessage(CH, ev => {
      const m = (ev && ev.data) || {};
      if (m.type === 'log') takeLog(m);
      else if (m.type === 'heroSet') takeHero(m);
      else if (m.type === 'act' && DM && m.req) takeAct(m.req);
      else if (m.type === 'note' && m.to === OBR.player.id && m.text) { try { OBR.notification.show(String(m.text).slice(0, 160), 'WARNING'); } catch (e) {} }
      // the DM's app waits for a player's answer (a save he rolls himself, Shield yes / no)
      else if (DM && (m.type === 'saveRes' || m.type === 'shieldRes') && m.id) { const A = get('obrAns', []); A.push({ type: m.type, id: m.id, nat: m.nat, yes: m.yes }); set('obrAns', A.slice(-20)); }
      // a player: "roll your save", "Shield?", "it runs away — hit it?" → the token window opens with the buttons
      else if (!DM && m.to === OBR.player.id && (m.type === 'saveReq' || m.type === 'shieldReq' || m.type === 'oaOffer')) {
        set('obrAsk', Object.assign({ t: Date.now() }, m));
        const txt = m.type === 'saveReq' ? '🎲 ' + tr('Saving throw!', 'Спасбросок!') + ' ' + (m.abil || '') + ' ' + tr('DC', 'СЛ') + ' ' + m.dc + ' — ' + (m.what || '')
          : m.type === 'shieldReq' ? '🛡 ' + tr('You are hit — cast Shield?', 'По тебе попали — Щит?') : '⚔️ ' + (m.n || '') + ' ' + tr('runs away from you — hit it?', 'уходит от тебя — ударить?');
        say(txt, 'WARNING');
        (async () => { let c = { x: 600, y: 300 }; try { const w = await OBR.viewport.getWidth(); const h = await OBR.viewport.getHeight(); const s = await OBR.viewport.getScale(); const p = await OBR.viewport.getPosition(); c = { x: (w / 2 - 180 - p.x) / s, y: (h / 2 - p.y) / s }; } catch (e) {} openPop({ id: '', point: null, ask: m.id }, c); })();
      }
    });
    if (DM) {
      OBR.party.onChange(players => mergeHeroes(players));
      OBR.party.getPlayers().then(mergeHeroes).catch(() => {});
      publishState();
      playMusic(get('obrmusic', null));
    } else {
      OBR.room.onMetadataChange(md => { takeState((md || {})[ROOM]); playMusic((md || {})[MUSIC]); });
      OBR.room.getMetadata().then(md => { takeState((md || {})[ROOM]); playMusic((md || {})[MUSIC]); }).catch(() => {});
      publishHeroes();
    }
    window.addEventListener('storage', e => { if (e.key === 'dnd.tableVol' || e.key === 'dnd.tableMute') musicLib().then(TM => TM && TM.setVolume()); });
    const onKey = k => {
      k = k || '';
      if (!k.startsWith(P)) return;
      const rest = k.slice(P.length);
      if (DM && rest === 'curGame') { seen = snapshot(get(gk('chars'), [])); mergeHeroes(); return; }
      if (rest === gk('log')) sendNewLog();
      if (rest === gk('chars')) { if (DM) sendHeroChanges(); else publishHeroes(); }
      if (DM && rest === 'obrstate') publishState();
      if (DM && rest === 'obrmusic') publishMusic();
      if (rest === 'resyncReq' && by === 'bg') resync(); // the 🟢 button in the panel
    };
    window.addEventListener('storage', e => onKey(e.key));
    // "alive" mark: the panel checks it to know whether the background page works (🟢) or it must sync itself (🟡)
    const beat = () => { try { localStorage.setItem(P + 'syncAlive', JSON.stringify({ t: Date.now(), by })); } catch (e) {} };
    beat(); setInterval(beat, 4000);
    // resend everything (the 🟢 / 🟡 button in the panel)
    const resync = async () => {
      if (DM) { lastState = ''; await publishState(); try { mergeHeroes(await OBR.party.getPlayers()); } catch (e) {} }
      else { await publishHeroes(); try { takeState(((await OBR.room.getMetadata()) || {})[ROOM]); } catch (e) {} }
      await sendNewLog();
      return true;
    };
    window.__obrSync = { by, role, key: onKey, resync };
    // token card in Owlbear's context menu (one selected item): card.html; and "📖 open in the panel"
    const ICON = new URL('icon.svg', location.href).href, LINK = 'dndtable/link';
    try {
      OBR.contextMenu.create({
        id: 'dndtable/card',
        icons: [{ icon: ICON, label: 'D&D Table', filter: { max: 1 } }],
        embed: { url: new URL('card.html', location.href).href, height: 440 },
        onClick() {}
      });
      OBR.contextMenu.create({
        id: 'dndtable/open',
        icons: [{ icon: ICON, label: tr('D&D: open in the panel', 'D&D: открыть в панели'), filter: { max: 1 } }],
        onClick: async c => {
          const it = c && c.items && c.items[0]; const l = it && it.metadata && it.metadata[LINK];
          if (!l) { try { OBR.notification.show(tr('This token is not linked to a hero or a monster.', 'Этот токен не привязан к герою или монстру.'), 'WARNING'); } catch (e) {} return; }
          set('obrOpen', l.k === 'pc' ? { k: 'hero', id: l.cid, t: Date.now() } : { k: 'mon', n: l.n || '', eid: l.eid || '', t: Date.now() });
          try { await OBR.action.open(); } catch (e) {}
        }
      });
    } catch (e) { console.warn('context menu', e); }

    // ---------- ⚔️ the D&D tool (Owlbear toolbar): click a token / the map → the token window; drag your token → a ruler with your movement ----------
    const TOOL = 'dndtable/tool', MODE = 'dndtable/mode', POP_ID = 'dndtable/pop', RULER = 'dndtable/ruler';
    const G = { dpi: 150, mult: 5 };
    const gridInfo = async () => { try { G.dpi = (await OBR.scene.grid.getDpi()) || 150; const s = await OBR.scene.grid.getScale(); const m = s && s.parsed ? Number(s.parsed.multiplier) : NaN; G.mult = m > 0 ? m : 5; } catch (e) {} };
    const say = (t, v) => { try { OBR.notification.show(t, v || 'INFO'); } catch (e) {} };
    async function screenPos(pt) {
      try {
        const s = await OBR.viewport.getScale(); const p = await OBR.viewport.getPosition(); const w = await OBR.viewport.getWidth(); const h = await OBR.viewport.getHeight();
        return { left: Math.round(Math.max(20, Math.min(w - 380, pt.x * s + p.x + 30))), top: Math.round(Math.max(20, Math.min(h - 40, pt.y * s + p.y))) };
      } catch (e) { return { left: 420, top: 200 }; }
    }
    async function openPop(ctx, at) {
      set('obrPop', Object.assign({ t: Date.now() }, ctx));
      const pos = await screenPos(at);
      try { await OBR.popover.close(POP_ID); } catch (e) {}
      try { await OBR.popover.open({ id: POP_ID, url: new URL('card.html?pop=1', location.href).href, width: 370, height: 560, anchorReference: 'POSITION', anchorPosition: pos, anchorOrigin: { horizontal: 'LEFT', vertical: 'CENTER' }, transformOrigin: { horizontal: 'LEFT', vertical: 'CENTER' }, disableClickAway: true }); }
      catch (e) { console.warn('popover', e); }
    }
    async function toolClick(ctx, ev) {
      const aim = get('obrAim', null);
      if (aim && Date.now() - (aim.t || 0) < 15 * 60000) { set('obrAim', Object.assign({}, aim, { point: ev.pointerPosition, t: Date.now() })); return; } // placing an area: move it here
      let tg = ev.target || null;
      if (tg && tg.layer !== 'CHARACTER') tg = tg.attachedTo ? { id: tg.attachedTo } : null; // a ring / a tag → its token; the map → a point
      await openPop(tg ? { id: tg.id, point: null } : { id: '', point: ev.pointerPosition }, ev.pointerPosition);
    }
    // dragging: the token follows the mouse only on this screen (interaction); on release it really moves — if the move is allowed
    let drag = null;
    async function dragStart(ctx, ev) {
      const it = ev.target; if (!it || it.layer !== 'CHARACTER') return;
      const l = it.metadata && it.metadata[LINK];
      const st = get(DM ? 'obrdm' : 'obrstate', null); const strict = !st || st.strict !== false;
      if (!DM && strict) { const mine = new Set(get('chars', []).map(c => c.id)); if (!l || l.k !== 'pc' || !mine.has(l.cid)) { say(tr('This is not your token — only the DM moves it.', 'Это не твой токен — его двигает мастер.'), 'WARNING'); return; } }
      await gridInfo();
      const e = st && st.on && l ? (st.list || []).find(x => l.k === 'pc' ? x.cid === l.cid : x.id === l.eid || x.n === l.n) : null;
      let left = null;
      if (!DM && strict && e) { const myTurn = st.list[st.turn] && st.list[st.turn].id === e.id; left = myTurn ? Math.max(0, (e.mvMax || 30) - (e.mv || 0)) : 0; if (!myTurn) say(tr('Not your turn — you cannot move now.', 'Сейчас не твой ход — двигаться нельзя.'), 'WARNING'); }
      drag = { id: it.id, start: it.position, pos: it.position, off: { x: it.position.x - ev.pointerPosition.x, y: it.position.y - ev.pointerPosition.y }, left, ft: 0 };
      reachWant = null;
      if (left != null) { try { const b = await OBR.scene.items.getItemBounds([it.id]); reachWant = { c: b.center, w: Math.max(b.width, b.height), left }; drawReach(); } catch (e) {} }
      try { const [update, stop] = await OBR.interaction.startItemInteraction(it); if (drag && drag.id === it.id) { drag.update = update; drag.stop = stop; } else stop(); } catch (er) { console.warn('interaction', er); }
    }
    let rulerIds = null;
    async function drawRuler(a, b, text, ok) {
      const B = window.OBR_SDK; if (!B || !B.buildCurve || !B.buildLabel) return;
      try {
        const col = ok ? '#7bd389' : '#e05555';
        if (!rulerIds) {
          const line = B.buildCurve().points([{ x: 0, y: 0 }, { x: b.x - a.x, y: b.y - a.y }]).position(a).strokeColor(col).strokeWidth(6).strokeOpacity(0.9).fillOpacity(0).tension(0).closed(false).layer('RULER').disableHit(true).metadata({ [RULER]: 1 }).build();
          const lab = B.buildLabel().plainText(text).position(b).layer('RULER').disableHit(true).backgroundOpacity(0.85).fontSize(22).metadata({ [RULER]: 2 }).build();
          rulerIds = [line.id, lab.id]; await OBR.scene.local.addItems([line, lab]);
        } else {
          await OBR.scene.local.updateItems(rulerIds, L => { L.forEach(x => { if (x.metadata[RULER] === 1) { x.position = a; x.points = [{ x: 0, y: 0 }, { x: b.x - a.x, y: b.y - a.y }]; x.style.strokeColor = col; } else { x.position = b; x.text.plainText = text; } }); }, true);
        }
      } catch (e) { console.warn('ruler', e); }
    }
    async function clearRuler() { const ids = rulerIds; rulerIds = null; try { const L = await OBR.scene.local.getItems(it => it.metadata && it.metadata[RULER]); if (L.length) await OBR.scene.local.deleteItems(L.map(x => x.id)); else if (ids) await OBR.scene.local.deleteItems(ids); } catch (e) {} }
    async function dragMove(ctx, ev) {
      const d = drag; if (!d) return;
      let pos = { x: ev.pointerPosition.x + d.off.x, y: ev.pointerPosition.y + d.off.y };
      try { pos = await OBR.scene.grid.snapPosition(pos, 1, false, true); } catch (e) {}
      if (drag !== d) return;
      d.pos = pos; if (d.update) try { d.update(x => { x.position = pos; }); } catch (e) {}
      let ft = 0; try { ft = Math.round(await OBR.scene.grid.getDistance(d.start, pos)) * G.mult; } catch (e) {}
      d.ft = ft; const ok = d.left == null || ft <= d.left;
      await drawRuler(d.start, pos, (ok ? '🚶 ' : '⛔ ') + ft + (d.left != null ? ' / ' + d.left : '') + ' ' + tr('ft', 'фт'), ok);
    }
    async function dragEnd() {
      const d = drag; drag = null; if (!d) return;
      try { if (d.stop) d.stop(); } catch (e) {}
      await clearRuler(); reachWant = null; drawReach();
      if (!d.pos || (d.pos.x === d.start.x && d.pos.y === d.start.y)) return;
      if (d.left != null && d.ft > d.left) { say(d.left ? tr('Too far: you have {0} ft of movement left.', 'Слишком далеко: осталось {0} фт движения.').replace('{0}', d.left) : tr('No movement left (or not your turn).', 'Движения не осталось (или сейчас не твой ход).'), 'WARNING'); return; }
      try { await OBR.scene.items.updateItems([d.id], L => { L.forEach(x => { x.position = d.pos; }); }); } catch (e) { say(tr('Owlbear did not let you move this token.', 'Owlbear не дал сдвинуть этот токен.'), 'ERROR'); }
    }
    // ---------- while I drag my token: where I can still get (only I see it), "🚶 25 ft" above it ----------
    // Its shape follows the room's grid rule (Owlbear → grid settings → measurement):
    // Chebyshev (D&D 2024: a diagonal step = 5 ft) → a square · Euclidean → a circle · Manhattan → a diamond · 5-10-5 → an octagon
    var reachKey = '', reachT = 0, reachWant = null;
    async function drawReach() {
      try {
        const want = drag && reachWant ? reachWant : null;
        const k = JSON.stringify(want); if (k === reachKey) return; reachKey = k;
        const old = await OBR.scene.local.getItems(it => it.metadata && it.metadata['dndtable/reach']); if (old.length) await OBR.scene.local.deleteItems(old.map(x => x.id));
        const B = window.OBR_SDK; if (!want || !B || !B.buildCurve) return;
        let meas = 'CHEBYSHEV'; try { meas = (await OBR.scene.grid.getMeasurement()) || meas; } catch (e) {}
        const cells = Math.floor(want.left / G.mult); const R = want.w / 2 + cells * G.dpi; let pts;
        if (meas === 'EUCLIDEAN') { pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push({ x: Math.cos(a) * R, y: Math.sin(a) * R }); } }
        else if (meas === 'MANHATTAN') pts = [{ x: 0, y: -R }, { x: R, y: 0 }, { x: 0, y: R }, { x: -R, y: 0 }];
        else if (meas === 'ALTERNATING') { const D = want.w / 2 + Math.floor(cells * 2 / 3) * G.dpi; pts = [{ x: R, y: 0 }, { x: D, y: D }, { x: 0, y: R }, { x: -D, y: D }, { x: -R, y: 0 }, { x: -D, y: -D }, { x: 0, y: -R }, { x: D, y: -D }]; }
        else pts = [{ x: -R, y: -R }, { x: R, y: -R }, { x: R, y: R }, { x: -R, y: R }];
        const sh = B.buildCurve().points(pts).position(want.c).fillColor('#5cb85c').fillOpacity(0.08).strokeColor('#7bd389').strokeWidth(3).strokeOpacity(0.7).strokeDash([18, 10]).tension(0).closed(true).layer('DRAWING').locked(true).disableHit(true).metadata({ 'dndtable/reach': 1 }).build();
        const top = Math.min(...pts.map(p => p.y));
        const lab = B.buildLabel().plainText('🚶 ' + tr('you can walk', 'можно пройти') + ' ' + want.left + ' ' + tr('ft', 'фт')).position({ x: want.c.x, y: want.c.y + top }).layer('DRAWING').locked(true).disableHit(true).backgroundOpacity(0.6).fontSize(20).metadata({ 'dndtable/reach': 2 }).build();
        await OBR.scene.local.addItems([sh, lab]);
      } catch (e) { console.warn('reach', e); }
    }
    function drawReachSoon() { clearTimeout(reachT); reachT = setTimeout(drawReach, 150); }
    async function dragCancel() { const d = drag; drag = null; if (d && d.stop) try { d.stop(); } catch (e) {} await clearRuler(); reachWant = null; drawReach(); }
    try {
      await OBR.tool.create({ id: TOOL, icons: [{ icon: ICON, label: tr('D&D: actions and movement', 'D&D: действия и ход') }], defaultMode: MODE, shortcut: 'Y' });
      await OBR.tool.createMode({
        id: MODE, icons: [{ icon: ICON, label: tr('Click a token or the map · drag your token', 'Клик по токену или карте · тяни свой токен'), filter: { activeTools: [TOOL] } }],
        cursors: [{ cursor: 'pointer', filter: { target: [{ key: 'layer', value: 'CHARACTER' }] } }, { cursor: 'crosshair' }],
        onToolClick: (c, e) => { toolClick(c, e); return false; },
        onToolDragStart: dragStart, onToolDragMove: dragMove, onToolDragEnd: dragEnd, onToolDragCancel: dragCancel,
        onKeyDown: (c, e) => { if (e.key === 'Escape') set('obrAim', null); },
        onDeactivate: () => { set('obrAim', null); }
      });
    } catch (e) { console.warn('tool', e); }

    sendNewLog();
    console.log('D&D Table sync ready:', role, by);
  });
}
