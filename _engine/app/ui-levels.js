// Experience (XP), level up 1-20, Ability Score Improvements / feats.
(function (U) {
  'use strict';
  const D = U.D, E = U.E, esc = U.esc, sign = U.sign, S = U.S, ib = U.ib, pill = U.pill, T = U.T;
  const AN = a => D.ABIL_NAME[a];
  const XP = D.XP_LEVELS;

  // ---------- XP box on the sheet ----------
  U.xpBox = function (c, d) {
    const lvl = c.level; const xp = Number(c.xp) || 0;
    const max = lvl >= D.MAX_LEVEL;
    const from = XP[lvl - 1] || 0, to = XP[lvl] || from;
    const pct = max ? 100 : Math.max(0, Math.min(100, Math.round((xp - from) / Math.max(1, to - from) * 100)));
    const ready = !max && xp >= to;
    return '<div class="xpbox' + (ready ? ' ready' : '') + '"><div class="xpl">⭐ <b>' + T('Experience') + '</b> ' + ib('xp') + ' <span class="xpn">' + xp.toLocaleString() + (max ? '' : ' / ' + to.toLocaleString()) + ' XP</span>' +
      (max ? ' <small>' + T('max level') + '</small>' : ' <small>' + T('to level {0}', lvl + 1) + '</small>') + '</div>' +
      '<div class="xpbar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="xpctl"><input type="number" id="xpAmt" min="0" placeholder="' + esc(T('XP')) + '"><button class="mini" data-act="addXp">＋ ' + T('Add XP') + '</button>' +
      (ready ? '<button class="primary lvlbtn" data-act="levelUp">⬆ ' + T('Level up to {0}!', lvl + 1) + '</button>' : '') +
      (U.DM && !max && !ready ? '<button class="mini" data-act="levelUp" data-force="1" title="' + esc(T('Level up without XP (the DM decides)')) + '">⬆ ' + T('Level {0}', lvl + 1) + '</button>' : '') + '</div></div>';
  };

  // ---------- what changes between two levels ----------
  function preview(c, from, to) {
    const a = E.compute(Object.assign(E.clone(c), { level: from })); const b = E.compute(c);
    const C = b.C; const sub = E.subclass(c);
    const feats = (C ? C.features.filter(f => f.lvl > from && f.lvl <= to) : []).concat(sub ? sub.features.filter(f => f.lvl > from && f.lvl <= to) : []);
    const ch = [];
    ch.push('❤️ ' + T('Max HP') + ': <b>' + a.hpMax + ' → ' + b.hpMax + '</b> <small>(' + T('+{0}: average of d{1} + CON', b.hpMax - a.hpMax, C ? C.hitDie : 8) + ')</small>');
    if (a.pb !== b.pb) ch.push('🎯 ' + T('Proficiency bonus') + ': <b>' + sign(a.pb) + ' → ' + sign(b.pb) + '</b> ' + T('(all trained rolls get better)'));
    const slots = x => (x.casting.pact ? T('{0} pact slots of level {1}', x.casting.pact.count, x.casting.pact.level) : x.casting.slots.map((n, i) => T('lvl {0}: {1}', i + 1, n)).join(', '));
    if (slots(a) !== slots(b)) ch.push('✨ ' + T('Spell slots') + ': <b>' + (slots(b) || '—') + '</b>');
    if (b.casting.cantripsN > a.casting.cantripsN) ch.push('🔮 ' + T('Cantrips: {0} → {1}', a.casting.cantripsN, b.casting.cantripsN));
    if (b.casting.preparedN > a.casting.preparedN) ch.push('📖 ' + T('Prepared spells: {0} → {1}', a.casting.preparedN, b.casting.preparedN));
    if (b.casting.maxLevel > a.casting.maxLevel) ch.push('🌟 ' + T('New spell level unlocked: {0}', b.casting.maxLevel));
    const na = D.attacksOf ? D.attacksOf(C, from) : 1, nb = D.attacksOf ? D.attacksOf(C, to) : 1;
    if (nb > na) ch.push('⚔️ ' + T('Attacks per Attack action: {0} → {1}', na, nb));
    if (C && C.asi && C.asi.some(l => l > from && l <= to)) ch.push('💪 ' + T('Ability Score Improvement: +2 to abilities or a feat'));
    if (from < 3 && to >= 3 && C && C.subclasses) ch.push('🏷️ ' + T('Choose your subclass'));
    return { ch, feats };
  }

  U.views.levelup = function () {
    const c = U.cur(); if (!c || !c.lvlUp) { S.view = 'sheet'; return U.views.sheet(); }
    const { from, to } = c.lvlUp; const p = preview(c, from, to);
    const todo = U.steps(c).filter(s => !s.done && ['skills', 'features', 'spells'].includes(s.k));
    let h = '<div class="page levelup"><div class="lvlhero"><div class="lvlbig">' + to + '</div><div><h1>🎉 ' + T('{0} reached level {1}!', esc(c.name || T('Hero')), to) + '</h1>' +
      '<p class="lead">' + T('Here is everything that got better. Things you must choose are at the bottom.') + '</p></div></div>';
    h += '<div class="detail"><h3>📈 ' + T('What changed') + '</h3><ul class="lvlch">' + p.ch.map(x => '<li>' + x + '</li>').join('') + '</ul></div>';
    if (p.feats.length) h += '<div class="detail"><h3>🆕 ' + T('New powers') + '</h3><ul class="flist">' + p.feats.map(f => '<li><b>' + esc(f.name) + '</b> <small>' + T('level {0}', f.lvl) + '</small><br>' + esc(f.desc) + '</li>').join('') + '</ul></div>';
    h += '<div class="detail"><h3>✋ ' + T('Your choices') + '</h3>' + (todo.length
      ? '<p>' + T('Open each one and pick — the builder explains everything:') + '</p><div class="btnrow">' + todo.map(s => '<button class="primary" data-act="lvlChoose" data-k="' + s.k + '">' + esc(s.t) + ' →</button>').join('') + '</div>'
      : '<p class="ok">✓ ' + T('Nothing left to choose. 👍') + '</p>') + '</div>';
    h += '<div class="btnrow">' + '<button class="' + (todo.length ? '' : 'primary') + '" data-act="lvlDone">✓ ' + (todo.length ? T('Later — open sheet') : T('Done — open sheet')) + '</button>' +
      '<button data-act="lvlUndo">↩ ' + T('Undo this level up') + '</button></div>';
    if (U.PLAYER) h += '<div class="tipbox">' + T('When you are done, click <b>📤 Send to DM</b> on your sheet and send the file, so the DM has the same character.') + '</div>';
    else h += '<div class="tipbox">' + T('Level up a player\'s hero here, then <b>📤 Export for player</b>. Or let them level up themselves and <b>📥 Import</b> their file — it replaces your copy.') + '</div>';
    return h + '</div>';
  };

  // ---------- Ability Score Improvement section for the builder (Class options step) ----------
  U.asiSection = function (c) {
    const lv = E.asiLevels(c); if (!lv.length) return '';
    const sc = E.abilityScores(c);
    let h = '';
    lv.forEach(l => {
      const s = (c.asi || {})[l] || {}; const epic = l >= 19;
      const ab = (f, cur, list) => '<select data-on="asiAbil" data-l="' + l + '" data-f="' + f + '"><option value="">— ' + T('ability') + ' —</option>' + (list || D.ABIL).map(a => '<option value="' + a + '"' + (cur === a ? ' selected' : '') + '>' + AN(a) + ' (' + sc[a] + ')</option>').join('') + '</select>';
      h += '<div class="detail asi"><h4>💪 ' + T('Level {0}', l) + ': ' + (epic ? T('Epic Boon') : T('Ability Score Improvement')) + ' ' + ib('asi') + (E.asiDone(Object.assign({ lvl: l }, s)) ? ' <span class="ok">✓</span>' : '') + '</h4>' +
        '<div class="opts">' + pill(s.k === 'plus2', 'asiKind', 'data-l="' + l + '" data-v="plus2"', T('+2 to one ability'), T('The simplest choice: make your main ability bigger.')) +
        pill(s.k === 'plus11', 'asiKind', 'data-l="' + l + '" data-v="plus11"', T('+1 to two abilities'), T('Spread it out.')) +
        pill(s.k === 'feat', 'asiKind', 'data-l="' + l + '" data-v="feat"', epic ? T('Epic Boon or feat') : T('A feat'), T('A special power (most also give +1 to an ability).')) + '</div>';
      if (s.k === 'plus2') h += '<p>' + ab('a', s.a) + ' <small>' + T('max 20') + '</small></p>';
      if (s.k === 'plus11') h += '<p>' + ab('a', s.a) + ' ' + ab('b', s.b) + '</p>';
      if (s.k === 'feat') {
        const list = Object.keys(D.GENERAL_FEATS || {}).filter(k => (U.srcOk(D.GENERAL_FEATS[k]) || s.f === k) && (epic || !D.GENERAL_FEATS[k].boon) && (!D.GENERAL_FEATS[k].fs || (E.hasFightingStyle(c) && (s.f === k || !E.styles(c).has(D.GENERAL_FEATS[k].fs))))).map(k => [k, D.GENERAL_FEATS[k]])
          .concat(Object.keys(D.FEATS).filter(k => k !== 'magicinitiate').map(k => [k, D.FEATS[k]]));
        list.sort((x, y) => (y[1].boon ? 1 : 0) - (x[1].boon ? 1 : 0));
        h += '<div class="opts">' + list.map(([k, F]) => pill(s.f === k, 'asiFeat', 'data-l="' + l + '" data-f="' + k + '"', (F.boon ? '🌟 ' : '') + esc(F.name), esc(F.desc) + (F.abil && F.abil.length ? '<br><i>' + T('+1 to: {0}', F.abil.map(AN).join(' / ')) + '</i>' : ''))).join('') + '</div>';
        const G = D.GENERAL_FEATS && D.GENERAL_FEATS[s.f];
        if (G && G.abil.length) h += '<p>' + T('+1 to which ability?') + ' ' + ab('a', s.a, G.abil) + '</p>';
      }
      h += '</div>';
    });
    return h;
  };

  Object.assign(U.ACT, {
    addXp: () => {
      const c = U.cur(); const el = document.getElementById('xpAmt'); const n = Math.round(Number(el && el.value) || 0); if (!n) return;
      const before = D.levelForXp(Number(c.xp) || 0);
      c.xp = Math.max(0, (Number(c.xp) || 0) + n); U.saveChars();
      U.logAdd(c.name || T('Hero'), ['⭐ ' + T('{0} XP', (n > 0 ? '+' : '') + n) + ' → <b>' + c.xp.toLocaleString() + ' XP</b>']);
      const now = D.levelForXp(c.xp);
      if (now > c.level && now > before) U.toast('🎉 ' + T('Enough XP for level {0}! Click “Level up”.', c.level + 1));
      U.render();
    },
    levelUp: ds => {
      const c = U.cur(); if (c.level >= D.MAX_LEVEL) return;
      if (!ds.force && (Number(c.xp) || 0) < XP[c.level]) { U.toast(T('Not enough XP yet.')); return; }
      const before = E.compute(c);
      const from = c.level; c.level = from + 1;
      if (ds.force) c.xp = Math.max(Number(c.xp) || 0, XP[from]);
      const after = E.compute(c);
      if (c.hp.cur != null) c.hp.cur = Math.max(0, before.hpCur + (after.hpMax - before.hpMax));
      c.lvlUp = { from, to: c.level, at: Date.now() }; c.lvlOpen = true;
      U.saveChars(); U.logAdd(c.name || T('Hero'), ['⬆ <b>' + T('Level {0}!', c.level) + '</b>']); U.go('levelup');
    },
    lvlChoose: ds => { const c = U.cur(); const st = U.builderSteps(c); const i = st.findIndex(s => s.k === ds.k); S.step = Math.max(0, i); S.fromLevelUp = true; U.go('builder'); },
    lvlDone: () => { const c = U.cur(); delete c.lvlUp; c.lvlOpen = U.steps(c).some(s => !s.done && ['skills', 'features', 'spells'].includes(s.k)); U.saveChars(); U.go('sheet'); },
    lvlUndo: () => {
      const c = U.cur(); if (!c.lvlUp || !confirm(T('Go back to level {0}?', c.lvlUp.from))) return;
      const before = E.compute(c); c.level = c.lvlUp.from; const after = E.compute(c);
      if (c.hp.cur != null) c.hp.cur = Math.max(0, Math.min(after.hpMax, before.hpCur - (before.hpMax - after.hpMax)));
      Object.keys(c.asi || {}).forEach(l => { if (Number(l) > c.level) delete c.asi[l]; });
      delete c.lvlUp; c.lvlOpen = false; U.saveChars(); U.go('sheet');
    },
    asiKind: ds => { const c = U.cur(); c.asi = c.asi || {}; const old = c.asi[ds.l] || {}; c.asi[ds.l] = { k: ds.v, a: ds.v === 'feat' ? '' : old.a || '' }; U.commit(); },
    asiFeat: ds => { const c = U.cur(); const s = c.asi[ds.l] = c.asi[ds.l] || { k: 'feat' }; s.f = ds.f; const G = D.GENERAL_FEATS && D.GENERAL_FEATS[ds.f]; s.a = G && G.abil.length === 1 ? G.abil[0] : (G && G.abil.includes(s.a) ? s.a : ''); U.commit(); }
  });
  U.ON.asiAbil = el => { const c = U.cur(); const s = c.asi[el.dataset.l] = c.asi[el.dataset.l] || {}; s[el.dataset.f] = el.value; U.commit(); };
})(window.UI);
