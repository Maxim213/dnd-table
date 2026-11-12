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
      if (DM && localStorage.getItem('dnd.hideRolls') === '1') { // hidden rolls stay hidden for good
        fresh.forEach(e => sent.add(e.id)); set('obrSent', [...sent].slice(-300)); return;
      }
      const name = await myName();
      for (const e of fresh) {
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
          if (old && old.portrait && !h.portrait) merged.portrait = old.portrait;
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
      const h = Object.assign({}, m.hero); delete h.obr; if (chars[i].portrait) h.portrait = chars[i].portrait;
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
      set('obrstate', st || null);
      const mine = new Set(get('chars', []).map(c => c.id));
      const a = st && st.on && st.list && st.list[st.turn];
      const key = st && st.on ? st.round + ':' + st.turn : '';
      if (a && a.cid && mine.has(a.cid) && key !== turnKey) {
        turnKey = key; set('obrTurnKey', key);
        try { OBR.notification.show('⚔️ ' + tr('Your turn!', 'Твой ход!') + ' — ' + a.n, 'WARNING'); } catch (e) {}
        try { OBR.action.setBadgeText('!'); OBR.action.setBadgeBackgroundColor('#d9a441'); } catch (e) {}
      } else if (!(a && a.cid && mine.has(a.cid))) { try { OBR.action.setBadgeText(undefined); } catch (e) {} }
    };

    // ---------- wire it up ----------
    OBR.broadcast.onMessage(CH, ev => {
      const m = (ev && ev.data) || {};
      if (m.type === 'log') takeLog(m);
      else if (m.type === 'heroSet') takeHero(m);
    });
    if (DM) {
      OBR.party.onChange(players => mergeHeroes(players));
      OBR.party.getPlayers().then(mergeHeroes).catch(() => {});
      publishState();
    } else {
      OBR.room.onMetadataChange(md => takeState((md || {})[ROOM]));
      OBR.room.getMetadata().then(md => takeState((md || {})[ROOM])).catch(() => {});
      publishHeroes();
    }
    const onKey = k => {
      k = k || '';
      if (!k.startsWith(P)) return;
      const rest = k.slice(P.length);
      if (DM && rest === 'curGame') { seen = snapshot(get(gk('chars'), [])); mergeHeroes(); return; }
      if (rest === gk('log')) sendNewLog();
      if (rest === gk('chars')) { if (DM) sendHeroChanges(); else publishHeroes(); }
      if (DM && rest === 'obrstate') publishState();
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
    sendNewLog();
    console.log('D&D Table sync ready:', role, by);
  });
}
