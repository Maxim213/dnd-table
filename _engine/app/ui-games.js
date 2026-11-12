// Games = save slots (DM only). Each game has its own characters, monsters, prepared fights, current fight and roll log.
(function (U) {
  'use strict';
  if (U.PLAYER) return;
  const E = U.E, esc = U.esc, raw = U.raw, T = U.T;

  const saveList = () => raw.set('games', U.games);
  const dateTxt = ts => { if (!ts) return '—'; const d = new Date(ts); const loc = U.LANG === 'ru' ? 'ru-RU' : 'en-GB'; return d.toLocaleDateString(loc, { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }); };
  const gget = (id, k, def) => raw.get('g.' + id + '.' + k, def);

  function stats(g) {
    const chars = gget(g.id, 'chars', []), mons = gget(g.id, 'monsters', []), enc = gget(g.id, 'encounters', []), cb = gget(g.id, 'combat', null);
    const parts = [T('{0} heroes', chars.length), T('{0} own monsters', mons.length), T('{0} prepared fights', enc.length)];
    const fight = cb && cb.list && cb.list.length ? (cb.round > 0 ? '⚔️ ' + T('fight in progress — round {0}', cb.round) : '⚔️ ' + T('fight set up, not started')) : '';
    return { txt: parts.join(' · '), fight, names: chars.map(c => c.name).filter(Boolean).slice(0, 6).join(', ') };
  }

  U.gameFile = function (id) {
    const g = U.games.find(x => x.id === id);
    return {
      app: 'dnd-table', kind: 'game', version: 1, date: new Date().toISOString(),
      game: { id: g.id, name: g.name, created: g.created },
      chars: gget(id, 'chars', []), monsters: gget(id, 'monsters', []), encounters: gget(id, 'encounters', []),
      combat: gget(id, 'combat', null), log: gget(id, 'log', []), shops: gget(id, 'shops', []), itemEdits: gget(id, 'itemEdits', {}),
      scenario: gget(id, 'scenario', '') ? (window.SCN.all()[gget(id, 'scenario', '')] || null) : null
    };
  };

  U.openGame = function (id, view) {
    const g = U.games.find(x => x.id === id); if (!g) return;
    U.game = g; raw.set('curGame', id);
    // another scenario → reload the page so its content is laid on top
    if ((raw.get('g.' + id + '.scenario', '') || '') !== ((window.SCN.active && window.SCN.active.id) || '')) { raw.set('g.' + id + '.view', view || 'home'); location.reload(); return; }
    U.loadState(); U.go(view || 'home');
  };

  function writeGame(id, obj) {
    raw.set('g.' + id + '.chars', (obj.chars || []).map(E.normalize));
    raw.set('g.' + id + '.monsters', obj.monsters || []);
    raw.set('g.' + id + '.encounters', obj.encounters || []);
    raw.set('g.' + id + '.combat', obj.combat && Array.isArray(obj.combat.list) ? obj.combat : { list: [], round: 0, turn: -1, target: {} });
    raw.set('g.' + id + '.log', obj.log || []);
    raw.set('g.' + id + '.shops', obj.shops || []); raw.set('g.' + id + '.itemEdits', obj.itemEdits || {});
    if (obj.scenario && window.SCN.valid(obj.scenario)) { window.SCN.save(obj.scenario); raw.set('g.' + id + '.scenario', obj.scenario.id); } else raw.set('g.' + id + '.scenario', '');
    raw.del('g.' + id + '.view'); raw.del('g.' + id + '.charId');
  }

  // load a game file (or an old "backup everything" file) → new game, or replace the same game
  U.loadGameFile = function (obj, fileName) {
    const isGame = obj.kind === 'game' && obj.game;
    const fid = isGame ? obj.game.id : null;
    const same = fid && U.games.find(g => g.id === fid);
    if (same) {
      if (!confirm(T('The game "{0}" is already here.\n\nReplace it with the version from the file?\n(What is in the browser now for this game will be overwritten.)', same.name))) return;
      writeGame(same.id, obj); same.updated = Date.now(); saveList();
      U.openGame(same.id); U.toast(T('Loaded "{0}" from the file.', esc(same.name))); return;
    }
    const name = isGame ? obj.game.name : (String(fileName || T('Loaded game')).replace(/\.json$/i, '').replace(/[_.]+/g, ' ').trim() || T('Loaded game'));
    const g = { id: fid || E.uid(), name, created: (isGame && obj.game.created) || Date.now(), updated: Date.now() };
    U.games.push(g); saveList(); writeGame(g.id, obj);
    U.openGame(g.id); U.toast(T('Game "{0}" loaded.', esc(g.name)));
  };

  // ======================================================================
  U.views.games = function () {
    const cards = U.games.slice().sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(g => {
      const st = stats(g); const open = U.game && U.game.id === g.id;
      return '<div class="gcard' + (open ? ' open' : '') + '">' +
        '<div class="gc-name">' + esc(g.name) + (open ? ' <span class="tag">' + T('open now') + '</span>' : '') + '</div>' +
        '<div class="gc-sub">' + st.txt + (st.fight ? '<br>' + st.fight : '') + (st.names ? '<br><small>' + esc(st.names) + '</small>' : '') + '</div>' +
        '<div class="gc-date">' + T('Last played:') + ' ' + dateTxt(g.updated) + '</div>' +
        '<div class="cc-btns">' +
        '<button class="primary" data-act="gameOpen" data-id="' + g.id + '">' + (open ? T('▶ Continue') : T('▶ Open')) + '</button>' +
        '<button data-act="gameSave" data-id="' + g.id + '" title="' + esc(T('Download the whole game as one file')) + '">' + T('💾 Save file') + '</button>' +
        '<button data-act="gameRename" data-id="' + g.id + '">' + T('✎ Rename') + '</button>' +
        '<button data-act="gameCopy" data-id="' + g.id + '" title="' + esc(T('Make a copy of this game')) + '">' + T('Copy') + '</button>' +
        '<button class="danger" data-act="gameDel" data-id="' + g.id + '">' + T('🗑 Delete') + '</button>' +
        '</div></div>';
    }).join('');
    return '<div class="page"><div class="ph"><h1>' + T('🎲 Your games') + '</h1></div>' +
      '<p class="lead">' + T('A <b>game</b> is one campaign — one group of friends, one story, many evenings. Each game keeps its <b>own</b> characters, monsters, prepared fights, the fight in progress and the roll log. Nothing mixes between games.') + '</p>' +
      (cards ? '<div class="ggrid">' + cards + '</div>' : '<div class="emptybig">' + T('<p>No games yet.</p><p>Type a name below and click <b>＋ New game</b>.</p>') + '</div>') +
      '<form class="newgame" data-form="gameNew"><input name="n" placeholder="' + esc(T('Name, e.g. Friends campaign')) + '" autocomplete="off" maxlength="40"><button class="primary">' + T('＋ New game') + '</button>' +
      '<button type="button" data-act="gameLoad">' + T('📥 Load game from file') + '</button></form>' +
      '<div class="tipbox"><b>' + T('How saving works') + '</b><br>' +
      '• ' + T('<b>Automatic:</b> every click is saved right away inside this browser on this computer. Close it, open it tomorrow — everything is still there, even a fight in the middle of a turn.') + '<br>' +
      '• ' + T('<b>💾 Save file:</b> downloads the whole game as one file (<code>Name.game.json</code>). Move it from Downloads to <code>Campaigns/&lt;game name&gt;/</code>. That is your real backup — if the browser data is cleared or you change computer, <b>📥 Load game from file</b> brings everything back. Do it at the end of every evening.') + '<br>' +
      '• ' + T('<b>🗑 Delete</b> removes a whole game from the browser (save a file first if you might want it back). Then <b>＋ New game</b> starts clean.') + '</div>' +
      '</div>';
  };

  Object.assign(U.ACT, {
    gameOpen: ds => U.openGame(ds.id),
    gameSave: ds => {
      const g = U.games.find(x => x.id === ds.id);
      U.download(U.fileName(g.name) + '.game.json', U.gameFile(g.id));
      U.toast(T('💾 Saved to Downloads as <b>{0}.game.json</b> — move it to <code>Campaigns/{0}/</code>.', esc(U.fileName(g.name))));
      U.markSaved(g.id);
    },
    gameRename: ds => {
      const g = U.games.find(x => x.id === ds.id); const n = prompt(T('New name for this game:'), g.name);
      if (!n || !n.trim()) return; g.name = n.trim().slice(0, 40); saveList(); U.render();
    },
    gameCopy: ds => {
      const g = U.games.find(x => x.id === ds.id); const obj = U.gameFile(g.id);
      const c = { id: E.uid(), name: g.name + ' ' + T('(copy)'), created: Date.now(), updated: Date.now() };
      U.games.push(c); saveList(); writeGame(c.id, obj); U.render(); U.toast(T('Copied.'));
    },
    gameDel: ds => {
      const g = U.games.find(x => x.id === ds.id); const st = stats(g);
      if (!confirm(T('Delete the whole game "{0}"?\n\n{1}\n\nThis cannot be undone. (If you might want it back, click 💾 Save file first.)', g.name, st.txt))) return;
      U.GAME_KEYS.forEach(k => raw.del('g.' + g.id + '.' + k));
      U.games.splice(U.games.indexOf(g), 1); saveList();
      if (U.game && U.game.id === g.id) { U.game = null; raw.del('curGame'); U.loadState(); }
      U.go('games'); U.toast(T('Game deleted.'));
    },
    gameLoad: () => document.getElementById('gameFile').click()
  });

  U.FORMS.gameNew = f => {
    const name = (f.n.value || '').trim().slice(0, 40) || T('New game');
    const g = { id: E.uid(), name, created: Date.now(), updated: Date.now() };
    U.games.push(g); saveList(); U.openGame(g.id); U.toast(T('New game "{0}" — start by adding characters.', esc(name)));
  };

  const inp = document.getElementById('gameFile');
  if (inp) inp.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      let obj = null; try { obj = JSON.parse(rd.result); } catch (err) { /* below */ }
      if (!obj || obj.app !== 'dnd-table' || (obj.kind !== 'game' && obj.kind !== 'backup')) { U.toast(T('⚠️ {0} is not a game file. (Character files go in 🧙 Characters → 📥 Import.)', esc(file.name))); return; }
      U.loadGameFile(obj, file.name);
    };
    rd.readAsText(file); e.target.value = '';
  });

  // ---------- reminder to save the game to a file (DM): once an hour if something changed ----------
  // "Save now" downloads the file, "In an hour" waits, "auto" saves by itself every hour (dnd.autoSave = '1').
  const SAVED = 'dnd.saved.', SNOOZE = 'dnd.saveSnooze', AUTO = 'dnd.autoSave', HOUR = 60 * 60 * 1000;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} } };
  const opened = Date.now();
  U.markSaved = id => { ls.set(SAVED + id, Date.now()); ls.set(SNOOZE, 0); };
  U.saveReminder = function (force) {
    if (!U.DM || !U.game) return;
    const g = U.game; const saved = Number(ls.get(SAVED + g.id)) || 0; const now = Date.now();
    const changed = (g.updated || 0) > saved;
    const due = now - Math.max(saved, opened) >= HOUR && now >= (Number(ls.get(SNOOZE)) || 0);
    if (!force && !(changed && due)) return;
    if (ls.get(AUTO) === '1') { U.ACT.gameSave({ id: g.id }); U.toast('💾 ' + T('Autosave: the game was saved to Downloads.')); return; }
    const pop = document.getElementById('pop'); if (!pop || pop.classList.contains('show')) return; // don't cover another window
    const mins = Math.round((now - Math.max(saved, opened)) / 60000);
    pop.innerHTML = '<div class="popcard" role="dialog"><h3>⏰ ' + T('Time to save the game') + '</h3>' +
      '<p>' + T('{0} min since the last save of “{1}”. Save the game to a file so nothing is lost if the browser data is cleared.', mins, esc(g.name)) + '</p>' +
      '<p class="btnrow"><button class="primary" data-act="saveNow">💾 ' + T('Save now') + '</button><button data-act="saveLater">⏰ ' + T('In an hour') + '</button></p>' +
      '<p><label class="inl"><input type="checkbox" data-on="autoSave"' + (ls.get(AUTO) === '1' ? ' checked' : '') + '> ' + T('Save by itself every hour (no question)') + '</label></p></div>';
    pop.classList.add('show');
  };
  U.ACT.saveNow = () => { document.getElementById('pop').classList.remove('show'); if (U.game) U.ACT.gameSave({ id: U.game.id }); };
  U.ACT.saveLater = () => { ls.set(SNOOZE, Date.now() + HOUR); document.getElementById('pop').classList.remove('show'); U.toast('⏰ ' + T('OK, I will remind you in an hour.')); };
  U.ON.autoSave = el => { ls.set(AUTO, el.checked ? '1' : '0'); U.toast(el.checked ? '💾 ' + T('Autosave is on: every hour the game file downloads by itself.') : T('Autosave is off.')); };
  setInterval(() => U.saveReminder(false), 60 * 1000);
})(window.UI);
