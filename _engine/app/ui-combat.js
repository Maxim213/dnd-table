// DM combat: fight tracker, monster workshop (custom monsters with special abilities, CR balance), prepared fights.
(function (U) {
  'use strict';
  if (U.PLAYER) return; // players don't get the combat screens
  const D = U.D, E = U.E, esc = U.esc, sign = U.sign, S = U.S, ib = U.ib, opt = U.opt, T = U.T, t = D.t;
  const AB = a => D.AB[a] || a;

  // ---------- monster library ----------
  function normMon(m) {
    m.abil = m.abil || { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
    m.attacks = m.attacks || []; m.abilities = m.abilities || [];
    m.abilities.forEach(a => { a.id = a.id || E.uid(); });
    return m;
  }
  function allMonsters() {
    const built = Object.keys(D.MONSTERS).map(k => normMon(Object.assign({ id: 'srd:' + k, builtin: true }, E.clone(D.MONSTERS[k]))));
    return S.monsters.map(normMon).concat(built);
  }
  const monById = id => allMonsters().find(m => m.id === id);
  const crInfo = cr => D.CR_TABLE[String(cr)] || null;
  // "CR 1/2 (0.5)" + what it means for the heroes
  const crDec = cr => (String(cr).indexOf('/') > 0 ? ' (' + D.crNum(cr) + ')' : '');
  const crShort = cr => (cr === '' || cr == null ? '' : T('CR') + ' ' + cr + crDec(cr));
  const crHint = cr => {
    const n = D.crNum(cr);
    if (n === 0) return T('harmless');
    if (n < 1) return T('weak: use several, or a warm-up for level 1');
    if (n > 20) return T('epic: stronger than level 20 heroes');
    return T('a fair fight for 4 heroes of level {0}', n);
  };
  const crExamples = cr => Object.values(D.MONSTERS).filter(m => String(m.cr) === String(cr)).slice(0, 3).map(m => m.name).join(', ');
  const crLabel = cr => crShort(cr) + ' — ' + crHint(cr) + (crExamples(cr) ? ' · ' + crExamples(cr) : '');
  U.crShort = crShort; U.crHint = crHint;
  const crSort = (a, b) => D.crNum(a.cr) - D.crNum(b.cr) || String(a.name).localeCompare(String(b.name));
  // the same monster made stronger / weaker (a copy, the original stays)
  const atCr = (m, cr) => { if (!cr || String(cr) === String(m.cr)) return m; const x = normMon(E.clone(m)); balance(x, cr); x.name = m.name + ' [' + crShort(cr) + ']'; return x; };

  // set AC, HP, to-hit, damage and DCs to typical numbers for a CR (keeps the dice type of each attack)
  function balance(m, cr) {
    const R = crInfo(cr); if (!R) return;
    if (m.baseCr == null && m.cr != null && m.cr !== '') m.baseCr = String(m.cr); // remember the D&D default
    m.cr = String(cr); m.ac = R.ac; m.hp = R.hp;
    const atkCount = Math.max(1, Number(m.multi) || 1);
    const per = R.dpr / atkCount;
    const dice = (d, target, mod) => {
      const x = (String(d || '').match(/d(\d+)/) || [0, 6])[1] * 1 || 6; const avg = (x + 1) / 2;
      const n = Math.max(1, Math.round((target - (mod || 0)) / avg));
      return n + 'd' + x + (mod ? '+' + mod : '');
    };
    if (!m.attacks.length && !m.abilities.some(a => a.kind === 'attack')) m.attacks.push({ n: T('Attack'), hit: R.hit, d: '1d6', t: 'slashing' });
    m.attacks.forEach(a => { a.hit = R.hit; a.d = dice(a.d, per, R.mod); });
    m.abilities.forEach(ab => {
      if (ab.kind === 'attack') { ab.hit = R.hit; ab.d = dice(ab.d, per, R.mod); }
      if (ab.kind === 'save') { ab.dc = R.dc; if (ab.d) ab.d = dice(ab.d, R.dpr, 0); }
      if (ab.kind === 'heal') ab.d = dice(ab.d || '1d8', Math.round(R.hp / 4), 0);
    });
    const main = Math.min(20, 10 + R.mod * 2 + 1); // strongest ability so the saves feel right
    const best = D.ABIL.reduce((b, a) => ((m.abil[a] || 10) > (m.abil[b] || 10) ? a : b), 'STR');
    if ((m.abil[best] || 10) < main) m.abil[best] = main;
  }
  U.balanceMonster = balance;

  // XP difficulty of a list of {m, qty} for the party (2024 rules)
  function difficulty(items) {
    const party = S.chars.filter(c => c.party);
    if (!party.length) return { txt: T('Mark heroes as “In party” on the Characters page to see the difficulty.'), cls: '' };
    let xp = 0, unknown = 0;
    items.forEach(x => { const R = x.m && crInfo(x.m.cr); if (R) xp += R.xp * x.qty; else unknown += x.qty; });
    const b = [0, 0, 0]; party.forEach(c => { const B = D.XP_BUDGET[Math.min(20, c.level)] || D.XP_BUDGET[1]; b[0] += B[0]; b[1] += B[1]; b[2] += B[2]; });
    const lvl = party.map(c => c.level).join(', ');
    let name, cls;
    if (xp <= b[0]) { name = T('Low — an easy warm-up'); cls = 'easy'; }
    else if (xp <= b[1]) { name = T('Moderate — a normal fight'); cls = 'mid'; }
    else if (xp <= b[2]) { name = T('High — dangerous, heroes may fall'); cls = 'hard'; }
    else { name = T('Above High — could be deadly!'); cls = 'deadly'; }
    return {
      cls,
      txt: '<b>' + name + '</b><br><small>' + T('Monsters: {0} XP. Your party ({1} heroes, level {2}): low {3} · moderate {4} · high {5}.', xp, party.length, lvl, b[0], b[1], b[2]) +
        (unknown ? ' ' + T('{0} monster(s) without a CR are not counted.', unknown) : '') + '</small>'
    };
  }

  // ---------- monster filter: CR from–to, type, source (D&D / scenario / mine), search ----------
  // one filter for the fight, the prepared fights and the workshop (S.mf)
  const monSrc = m => (!m.builtin ? 'mine' : m.scenario ? 'scn' : 'dnd');
  const typeIcon = m => (D.MON_TYPES && D.MON_TYPES[m.type] ? D.MON_TYPES[m.type].icon + ' ' : '');
  const mf = () => (S.mf = S.mf || { q: '', from: '', to: '', type: '', src: '' });
  const mfOk = m => {
    const f = mf(); const n = D.crNum(m.cr);
    if (f.q && !(m.name + ' ' + (m.en || '')).toLowerCase().includes(f.q.trim().toLowerCase())) return false;
    if (f.from !== '' && !(n >= D.crNum(f.from))) return false;
    if (f.to !== '' && !(n <= D.crNum(f.to))) return false;
    if (f.type && (m.type || '') !== f.type) return false;
    if (f.src && monSrc(m) !== f.src) return false;
    return true;
  };
  U.monFilterBar = function (mons) {
    const f = mf(); const n = mons.filter(mfOk).length; const scn = mons.filter(m => monSrc(m) === 'scn').length;
    return '<div class="monfilter">🔎 <input class="mfq" data-in="mfQ" value="' + esc(f.q) + '" placeholder="' + esc(T('Search…')) + '">' +
      '<label class="inl">' + T('CR from') + ' <select data-on="mf" data-f="from">' + opt('', '—', f.from) + D.CR_LIST.map(cr => opt(cr, cr + crDec(cr), f.from)).join('') + '</select></label>' +
      '<label class="inl">' + T('to') + ' <select data-on="mf" data-f="to">' + opt('', '—', f.to) + D.CR_LIST.map(cr => opt(cr, cr + crDec(cr), f.to)).join('') + '</select></label>' +
      '<select data-on="mf" data-f="type">' + opt('', T('Any type'), f.type) + Object.keys(D.MON_TYPES || {}).map(k => opt(k, D.MON_TYPES[k].icon + ' ' + D.MON_TYPES[k].name, f.type)).join('') + '</select>' +
      '<select data-on="mf" data-f="src">' + opt('', T('All sources'), f.src) + opt('dnd', '📖 ' + T('Standard D&D'), f.src) + opt('scn', '📜 ' + T('Scenario') + (SCN.active ? ': ' + (SCN.active.title || SCN.active.name) : '') + ' (' + scn + ')', f.src) + opt('mine', '★ ' + T('My monsters'), f.src) + '</select>' +
      '<small>' + T('{0} found', n) + '</small>' + (f.q || f.from || f.to || f.type || f.src ? ' <button class="mini" data-act="mfReset">↺ ' + T('Reset') + '</button>' : '') + '</div>';
  };
  // a <select> of all monsters: mine first, then the standard ones grouped by CR (only those that pass the filter, plus the chosen one)
  function monSelect(id, mons, first, sel, extra) {
    mons = mons.filter(m => mfOk(m) || (sel && m.id === sel));
    const mine = mons.filter(m => !m.builtin); const std = mons.filter(m => m.builtin).sort(crSort);
    const groups = {}; std.forEach(m => { (groups[m.cr] = groups[m.cr] || []).push(m); });
    const line = m => opt(m.id, typeIcon(m) + m.name + (m.scenario ? ' 📜' : '') + ' — ' + (m.cr !== '' && m.cr != null ? crShort(m.cr) + ', ' : '') + T('AC') + ' ' + m.ac + ', ' + T('HP') + ' ' + m.hp, sel || '');
    return '<select id="' + id + '"' + (extra || '') + '>' + (first ? '<option value="">' + esc(first) + '</option>' : '') +
      (mine.length ? '<optgroup label="★ ' + esc(T('My monsters')) + '">' + mine.map(line).join('') + '</optgroup>' : '') +
      D.CR_LIST.filter(cr => groups[cr]).map(cr => '<optgroup label="' + esc(crShort(cr) + ' — ' + crHint(cr)) + '">' + groups[cr].map(line).join('') + '</optgroup>').join('') + '</select>';
  }

  // ---------- combatants ----------
  function cbView(cb) {
    if (cb.type === 'pc') {
      const c = U.byId(cb.charId); if (!c) return null; const d = E.compute(c);
      return { ac: d.ac, hp: d.hpCur, hpMax: d.hpMax, temp: Number(c.hp.temp) || 0, holder: U.holder(c), name: c.name || T('Unnamed'), c, d };
    }
    return { ac: cb.ac, hp: cb.hp, hpMax: cb.hpMax, temp: Number(cb.temp) || 0, holder: U.holder(cb), name: cb.name };
  }
  const sortCombat = () => S.combat.list.sort((a, b) => (Number(b.init) || -99) - (Number(a.init) || -99) || (b.dex || 0) - (a.dex || 0));
  const isOut = cb => { const v = cbView(cb); return !v || (cb.type === 'mon' && v.hp <= 0); };
  function addPc(id) { if (S.combat.list.some(x => x.charId === id)) return; S.combat.list.push({ id: E.uid(), type: 'pc', charId: id, init: null }); }
  function addMon(m, q) {
    const same = S.combat.list.filter(x => x.srcId === m.id).length;
    for (let i = 0; i < q; i++) {
      const n = same + i + 1;
      S.combat.list.push({ id: E.uid(), type: 'mon', srcId: m.id, name: m.name + (same + q > 1 ? ' ' + n : ''), ac: Number(m.ac) || 10, hp: Number(m.hp) || 1, hpMax: Number(m.hp) || 1, temp: 0,
        abil: E.clone(m.abil), attacks: E.clone(m.attacks), abilities: E.clone(m.abilities), multi: m.multi || 0, traits: m.traits || '', speed: m.speed || '', cr: m.cr || '', conditions: [], condDur: {}, used: {}, spent: {}, init: null });
    }
  }
  function monActions(cb) {
    const acts = (cb.attacks || []).map((a, i) => ({ id: 'a' + i, kind: 'monster', name: a.n + (a.range ? ' (' + a.range + ')' : ''), hit: Number(a.hit), dmg: a.d, dtype: a.t, plus: a.plus, mult: 1, critRange: 20, count: 1 }));
    (cb.abilities || []).forEach(ab => {
      const base = { id: 'b' + ab.id, abId: ab.id, kind: 'ability', name: ab.n || T('Ability'), desc: ab.desc || '', mult: 1, critRange: 20, count: 1, cond: ab.cond || '', condRounds: Number(ab.condRounds) || 0 };
      const usedN = (cb.used || {})[ab.id] || 0;
      base.blocked = (Number(ab.uses) > 0 && usedN >= Number(ab.uses)) || !!(cb.spent || {})[ab.id];
      base.left = Number(ab.uses) > 0 ? Number(ab.uses) - usedN : null;
      if (ab.kind === 'attack') Object.assign(base, { hit: Number(ab.hit) || 0, dmg: ab.d || '1d6', dtype: ab.t || '' });
      else if (ab.kind === 'save') Object.assign(base, { save: { abil: ab.s || 'DEX', dc: Number(ab.dc) || 12 }, dmg: ab.d || null, dtype: ab.t || '', half: !!ab.half, area: !!ab.area });
      else if (ab.kind === 'heal') Object.assign(base, { heal: true, dmg: ab.d || '1d8', self: true });
      else Object.assign(base, { plain: true, dmg: ab.d || '' });
      acts.push(base);
    });
    return acts;
  }
const ECON_NAME = U.ECON_NAME; // turn economy helpers live in ui-core.js (players need them too)

  function startTurn(cb) {
    cb.econ = U.econNew(); cb.move = { ft: 0 }; // a new turn: action, bonus action, reaction and movement are back
    const v = cbView(cb); if (!v) return;
    const ended = U.tickConds(v.holder); const lines = [];
    if (ended.length) lines.push(T('no longer {0}', ended.map(x => esc(t(x))).join(', ')));
    if (cb.type === 'mon') (cb.abilities || []).forEach(ab => {
      if (cb.spent && cb.spent[ab.id] && Number(ab.recharge) > 0) {
        const r = E.rollDie(6);
        if (r >= Number(ab.recharge)) { delete cb.spent[ab.id]; lines.push('🔋 ' + T('{0} recharged (d6: {1})', esc(ab.n), r)); }
        else lines.push(T('{0} not recharged (d6: {1}, needs {2}+)', esc(ab.n), r, ab.recharge));
      }
    });
    if (cb.type === 'pc') U.saveChars();
    if (lines.length) U.logAdd(v.name, lines);
  }
  function defaultTarget(active) {
    const e = S.combat.list.find(x => x.id !== active.id && !isOut(x) && (active.type === 'pc' ? x.type === 'mon' : x.type === 'pc'));
    return e ? e.id : '';
  }
  const modsOf = abil => { const m = {}; D.ABIL.forEach(a => { m[a] = E.modOf((abil || {})[a] || 10); }); return m; };
  const saveBonusOf = (cb, abil) => { if (cb.type === 'pc') { const c = U.byId(cb.charId); return c ? E.compute(c).saves[abil].val : 0; } return E.modOf((cb.abil || {})[abil] || 10); };

  // one line under an action button: "+4 vs AC 15 → 50% · ≈5 damage"
  function oddsLine(a, active, tcb, enemies, ctx) {
    const parts = [];
    const avg = a.dmg ? Math.round(U.avgExpr(a.dmg, ctx) * (a.count || 1) * (a.mult || 1) + (a.plus ? U.avgExpr(a.plus.d) : 0)) : 0;
    if (a.hit != null) {
      const tv0 = tcb && cbView(tcb); if (tv0) { const tv = tv0; const p = U.hitPct(a.hit, tv.ac, S.mode); parts.push(T('{0} to hit vs AC {1}', sign(a.hit), tv.ac) + ' → ' + U.oddsTag(p, T('chance to hit')) + ' ' + T('to hit')); }
      else parts.push(T('{0} to hit', sign(a.hit)));
    }
    if (a.save) {
      const list = tcb ? [tcb] : (a.area || !tcb) ? enemies : [];
      let txt = T('{0} save DC {1}', AB(a.save.abil), a.save.dc) + (a.area ? ' · ' + T('area') : '');
      if (list.length) { const p = Math.round(list.reduce((s, x) => s + U.failPct(saveBonusOf(x, a.save.abil), a.save.dc), 0) / list.length); txt += ' → ' + U.oddsTag(p, T('chance the target fails')) + ' ' + T('fail'); }
      parts.push(txt);
    }
    if (a.dmg) parts.push((a.heal ? '❤️ ' : '💥 ') + esc(a.dmg) + ' ' + esc(t(a.dtype || '')) + (avg ? ' ≈' + avg : '') + (a.heal ? ' ' + T('(heal)') : ''));
    if (a.cond) parts.push('⚠️ ' + esc(t(a.cond)));
    if (a.mult && a.mult !== 1) parts.push('×' + a.mult);
    if (a.level) parts.push(T('level {0} slot', a.level));
    if (a.plain && !a.dmg) parts.push(T('special'));
    return parts.join(' · ');
  }

  // ======================================================================
  //  VIEW
  // ======================================================================
  U.views.combat = function () {
    const tabs = [['fight', T('⚔️ Fight')], ['monsters', T('👹 Monsters')], ['prep', T('📋 Prepared fights')]]
      .map(x => '<button class="tab' + (S.combatTab === x[0] ? ' on' : '') + '" data-act="cTab" data-v="' + x[0] + '">' + x[1] + '</button>').join('');
    const body = S.combatTab === 'monsters' ? viewMonsters() : S.combatTab === 'prep' ? viewPrep() : viewFight();
    return '<div class="page combat"><div class="tabs big">' + tabs + '</div>' + body + '</div>';
  };

  function viewFight() {
    const cb = S.combat; const list = cb.list; const active = cb.turn >= 0 ? list[cb.turn] : null;
    const mons = allMonsters();
    let h = '<div class="ph"><h1>' + T('Fight') + ' ' + ib('combat') + '</h1><div class="btnrow">' +
      (cb.turn < 0 ? '<button class="primary" data-act="cbStart">' + T('▶ Start combat') + '</button>' : '<button class="primary" data-act="cbNext">' + T('Next turn ▶') + '</button><span class="round">' + T('Round') + ' <b>' + cb.round + '</b></span>') +
      '<button data-act="cbRollInit">' + T('🎲 Roll initiative') + '</button><button data-act="cbSavePrep" title="' + esc(T('Save these monsters as a prepared fight')) + '">' + T('📋 Save as prepared') + '</button><button data-act="cbPractice">' + T('Practice fight') + '</button><button class="danger" data-act="cbClear">' + T('Clear') + '</button></div></div>';
    h += U.monFilterBar(mons) + '<div class="addrow cbadd">' +
      '<select data-on="cbAddPc"><option value="">' + T('＋ Add character…') + '</option>' + S.chars.filter(c => !list.some(x => x.charId === c.id)).map(c => opt(c.id, c.name || T('Unnamed'), '')).join('') + '</select>' +
      monSelect('monSel', mons, T('Monster…')) +
      '<select id="monCr" title="' + esc(T('Make it stronger or weaker (the numbers balance themselves)')) + '">' + opt('', T('CR as in D&D'), '') + D.CR_LIST.map(cr => opt(cr, crShort(cr) + ' — ' + crHint(cr), '')).join('') + '</select>' +
      '<input id="monQty" type="number" min="1" max="20" value="1" class="tiny" title="' + esc(T('How many')) + '"><button data-act="cbAddMon">' + T('＋ Add') + '</button>' +
      '<button data-act="cTab" data-v="monsters">' + T('✎ Make a custom monster') + '</button></div>';

    const monsIn = list.filter(x => x.type === 'mon');
    if (monsIn.length) { const df = difficulty(monsIn.map(x => ({ m: { cr: x.cr || (monById(x.srcId) || {}).cr }, qty: 1 }))); h += '<div class="diffline ' + df.cls + '">' + T('Difficulty') + ' ' + ib('difficulty') + ': ' + df.txt + '</div>'; }

    h += '<div class="cbwrap"><div class="cblist">' + (list.length ? list.map((x, i) => {
      const v = cbView(x); if (!v) return '';
      const pct = Math.max(0, Math.min(100, Math.round(v.hp / (v.hpMax || 1) * 100)));
      const out = isOut(x); const down = x.type === 'pc' && v.hp === 0;
      return '<div class="cb' + (i === cb.turn ? ' active' : '') + (out ? ' out' : '') + ' ' + x.type + '">' +
        '<input class="init" type="number" data-on="cbInit" data-id="' + x.id + '" value="' + (x.init == null ? '' : x.init) + '" title="' + esc(T('Initiative')) + '" placeholder="–">' +
        '<div class="cbmain"><div class="cbn">' + (x.type === 'pc' ? '🧑 ' : '👹 ') + '<b>' + esc(v.name) + '</b> <span class="acb">' + T('AC') + ' ' + v.ac + '</span>' + (x.type === 'mon' && x.cr !== '' && x.cr != null ? ' <span class="crb" title="' + esc(crHint(x.cr)) + '">' + crShort(x.cr) + '</span>' : '') + (down ? ' <span class="fail">' + T('DOWN — death saves') + '</span>' : '') + (out ? ' <span class="fail">' + T('defeated') + '</span>' : '') + '</div>' +
        '<div class="hpbar"><span style="width:' + pct + '%"></span></div><div class="cbhp">' + v.hp + ' / ' + v.hpMax + ' ' + T('HP') + (v.temp ? ' (+' + v.temp + ' ' + T('temp') + ')' : '') + '</div>' +
        '<div class="chips">' + U.condChips(v.holder, 'cbCondDel', 'data-id="' + x.id + '"') + U.condAdder('cbCondAdd', 'data-id="' + x.id + '"') + '</div></div>' +
        '<div class="cbctl"><input type="number" class="tiny" id="amt-' + x.id + '" placeholder="' + esc(T('amt')) + '"><button class="mini dmgb" data-act="cbDmg" data-id="' + x.id + '">' + T('Dmg') + '</button><button class="mini healb" data-act="cbHeal" data-id="' + x.id + '">' + T('Heal') + '</button>' +
        (down ? '<button class="mini" data-act="cbDeath" data-id="' + x.id + '">' + T('Death save') + '</button>' : '') +
        '<button class="mini" data-act="cbTurn" data-i="' + i + '" title="' + esc(T('Make it this creature\'s turn')) + '">▶</button><button class="mini danger" data-act="cbDel" data-id="' + x.id + '">✕</button></div></div>';
    }).join('') : '<div class="emptybig">' + T('<p>No one in the fight yet.</p><p>Add characters and monsters above, start a <b>📋 Prepared fight</b>, or click <b>Practice fight</b>.</p>') + '</div>') + '</div>';

    h += '<div class="cbactive">';
    if (active && !cbView(active)) h += '<p class="warn">⚠️ ' + T('This hero is not in the game any more — remove the row or press Next turn.') + '</p>';
    else if (active) {
      const v = cbView(active);
      const allT = list.filter(x => !isOut(x) || x.type === 'pc');
      let tgt = cb.target[active.id];
      if (!tgt || (tgt !== '__all' && !list.some(x => x.id === tgt))) tgt = defaultTarget(active);
      const acts = active.type === 'pc' ? v.d.actions.filter(a => a.kind !== 'weapon' || a.equipped) : monActions(active);
      const hasArea = acts.some(a => a.save);
      const tcb = tgt && tgt !== '__all' ? list.find(x => x.id === tgt) : null;
      const enemies = list.filter(x => x.id !== active.id && !isOut(x) && (active.type === 'pc' ? x.type === 'mon' : x.type === 'pc'));
      const ctx = active.type === 'pc' ? v.d.x : { lvl: 1, pb: 2, mod: modsOf(active.abil) };
      h += '<h2>' + (active.type === 'pc' ? '🧑 ' : '👹 ') + T('{0}\'s turn', esc(v.name)) + '</h2>' +
        '<p class="hint">' + T('Move · 1 Action · 1 Bonus Action (if it has one) · 1 Reaction per round.') + '</p>' +
        '<label class="blk">' + T('Target') + ' <select data-on="cbTarget" data-id="' + active.id + '">' + opt('', T('— nobody (just roll) —'), tgt) +
        (hasArea ? opt('__all', active.type === 'pc' ? T('⚡ All monsters (area — saves only)') : T('⚡ All characters (area — saves only)'), tgt) : '') +
        allT.filter(x => x.id !== active.id && cbView(x)).map(x => { const tv = cbView(x); return opt(x.id, tv.name + ' (' + T('AC') + ' ' + tv.ac + ', ' + tv.hp + ' ' + T('HP') + ')', tgt); }).join('') + opt(active.id, T('Self'), tgt) + '</select></label>' +
        '<p class="hint">' + T('Each button shows the chance to hit (or that the target fails its save) and the average damage ≈.') + ' ' + ib('hitchance') + ' ' + ib('savechance') + '</p>';
      h += U.econChips(active.econ) + '<div class="actlist">' + acts.map(a => '<button class="actb ' + a.kind + '"' + (a.blocked ? ' disabled' : '') + ' data-act="cbAct" data-aid="' + esc(a.id) + '"><b>' + esc(a.name) + (a.left != null ? ' ' + T('({0} left)', a.left) : '') + (a.blocked ? ' — ' + T('used') : '') + '</b><small>' +
        oddsLine(a, active, tcb, enemies, ctx) + '</small></button>').join('') + '</div>';
      if (active.type === 'mon') {
        if (active.multi) h += '<p class="hint">' + T('Multiattack: {0} attacks per turn.', active.multi) + '</p>';
        (active.abilities || []).filter(ab => ab.desc).forEach(ab => { h += '<p class="traits"><b>' + esc(ab.n) + ':</b> ' + esc(ab.desc) + '</p>'; });
        if (active.traits) h += '<p class="traits">' + esc(active.traits) + '</p>';
      } else h += '<p class="hint">' + T('Resources are spent automatically.') + ' <button class="link" data-act="openSheet" data-id="' + active.charId + '">' + T('Open {0}\'s sheet', esc(v.name)) + '</button></p>';
    } else {
      h += '<h2>' + T('How it works') + '</h2><ol class="howto">' + [
        'Add characters and monsters (or start a 📋 prepared fight).',
        '<b>Roll initiative</b> — or type what players rolled.',
        '<b>Start combat</b>. The active creature glows.',
        'Pick a <b>target</b>. Each action shows the chance to hit and the average damage.',
        'Click the action. The log explains it: roll + bonus = total, compared with the AC → hit or miss → damage → new HP.',
        'Players rolled themselves? Type the damage in the box → <b>Dmg</b>.',
        'Conditions: pick one + how many rounds. It counts down by itself.',
        '<b>Next turn ▶</b>'
      ].map(x => '<li>' + T(x) + '</li>').join('') + '</ol>';
    }
    h += '</div></div>';
    return h;
  }

  // ---------- monster workshop ----------
  function viewMonsters() {
    const mons = allMonsters(); const sel = S.monSel === '__new' ? null : (monById(S.monSel) || null);
    let h = '<div class="ph"><h1>' + T('Monster workshop') + '</h1><div class="btnrow"><button class="primary" data-act="monNewOpen">' + T('＋ New monster') + '</button></div></div>' +
      '<p class="lead">' + T('Make your own enemies: start from a ready monster or from scratch, pick how strong it should be (CR), then add attacks and special abilities.') + '</p>';
    const ok = mfOk;
    const item = m => '<button class="monitem' + (S.monSel === m.id ? ' on' : '') + '" data-act="monSel" data-id="' + m.id + '"><b>' + typeIcon(m) + esc(m.name) + (m.scenario ? ' 📜' : '') + '</b><small>' + (m.cr !== '' && m.cr != null ? '<span class="crb">' + crShort(m.cr) + '</span> ' : '') + T('AC') + ' ' + m.ac + ' · ' + T('HP') + ' ' + m.hp + '</small></button>';
    const std = mons.filter(m => m.builtin && ok(m)).sort(crSort);
    const groups = {}; std.forEach(m => { (groups[m.cr] = groups[m.cr] || []).push(m); });
    h += '<div class="monwrap"><div class="monlist">' +
      U.monFilterBar(mons) +
      '<h4>★ ' + T('My monsters') + '</h4>' + (S.monsters.filter(ok).length ? S.monsters.filter(ok).map(item).join('') : '<p class="hint">' + T('None yet.') + '</p>') +
      '<h4>' + T('Standard monsters') + ' <small>(' + std.length + ')</small></h4>' +
      D.CR_LIST.filter(cr => groups[cr]).map(cr => '<div class="crhead" title="' + esc(crHint(cr)) + '">' + crShort(cr) + ' <small>' + esc(crHint(cr)) + '</small></div>' + groups[cr].map(item).join('')).join('') + '</div>';
    let right;
    if (S.monSel === '__new') right = newMonsterForm(mons);
    else if (sel) right = sel.builtin ? builtinView(sel) : monEditor(sel);
    else right = '<div class="emptybig">' + T('<p>Pick a monster on the left, or click <b>＋ New monster</b>.</p>') + '</div>';
    h += '<div class="moned">' + right + '</div></div>';
    return h;
  }
  function crSelect(id, sel, extra) {
    return '<select id="' + id + '"' + (extra || '') + '>' + D.CR_LIST.map(cr => opt(cr, crLabel(cr), sel)).join('') + '</select>';
  }
  const partyLevel = () => { const party = S.chars.filter(c => c.party); return party.length ? Math.max(...party.map(c => c.level)) : 1; };
  // a ready monster: its D&D stats, or the same monster at another CR — then add it or copy it
  function builtinView(m) {
    const cr = S.monPrevCr && S.monPrevCr !== m.cr ? S.monPrevCr : m.cr; const shown = atCr(m, cr);
    return '<div class="detail balrow"><b>⚖️ ' + T('Strength (CR)') + '</b> ' + ib('cr') + ' ' + crSelect('prevCr', cr, ' data-on="monPrevCr"') +
      '<br><small>' + T('In D&D this monster is {0}. Pick any other CR: the numbers below balance themselves (your party: level {1}).', crShort(m.cr), partyLevel()) + '</small></div>' +
      statBlock(shown) +
      '<p class="btnrow"><button class="primary" data-act="monToFight" data-id="' + m.id + '">' + T('＋ Add to fight') + (cr !== m.cr ? ' (' + crShort(cr) + ')' : '') + '</button>' +
      '<button data-act="monCopy" data-id="' + m.id + '">' + T('Copy to my monsters & edit') + '</button></p>';
  }
  function newMonsterForm(mons) {
    const lvl = partyLevel(); const sugg = String(Math.max(1, Math.min(20, lvl)));
    const N = S.newMon = S.newMon || { from: '', cr: sugg, bal: true, name: '' };
    const src = N.from ? monById(N.from) : null;
    let prev = src ? normMon(E.clone(src)) : normMon({ name: N.name || T('New monster'), ac: 12, hp: 15, speed: '30 ft', cr: N.cr, multi: 0, attacks: [{ n: T('Claw'), hit: 4, d: '1d6+2', t: 'slashing' }], abilities: [], traits: '' });
    if (N.bal || !src) balance(prev, N.cr); if (N.name) prev.name = N.name;
    return '<div class="detail"><h2>' + T('＋ New monster') + '</h2>' +
      '<p><b>' + T('1. Start from') + '</b><br>' + monSelect('newFrom', mons, T('— blank monster —'), N.from, ' data-on="newMon" data-f="from"') + '</p>' +
      '<p><b>' + T('2. How strong? (Challenge Rating)') + '</b> ' + ib('cr') + '<br>' + crSelect('newCr', N.cr, ' data-on="newMon" data-f="cr"') +
      '<br><small>' + T('Tip: for your party (level {0}) one monster of CR {1} is a fair fight; use more weaker monsters for a crowd.', lvl, sugg) + (src ? ' ' + T('In D&D this monster is {0}.', crShort(src.cr)) : '') + '</small></p>' +
      '<p><label class="inl"><input type="checkbox" id="newBal" data-on="newMon" data-f="bal"' + (N.bal ? ' checked' : '') + '> ' + T('Balance the numbers for this CR (AC, HP, to hit, damage, DC)') + '</label></p>' +
      '<p><b>' + T('3. Name') + '</b><br><input id="newName" data-on="newMon" data-f="name" value="' + esc(N.name) + '" placeholder="' + esc(T('e.g. Quarry Wraith')) + '"></p>' +
      '<div class="btnrow"><button class="primary" data-act="monCreate">' + T('Create and edit') + '</button><button data-act="monSel" data-id="">' + T('Cancel') + '</button></div>' +
      '<p class="hint">' + T('After that you can add special abilities (breath, poison, healing…) and change any number.') + '</p></div>' +
      '<h4>' + T('Preview') + '</h4>' + statBlock(prev);
  }
  function statBlock(m) {
    return '<div class="detail statblock"><h2>' + typeIcon(m) + esc(m.name) + '</h2>' + (m.type && D.MON_TYPES[m.type] ? '<p class="hint">' + esc(D.MON_TYPES[m.type].name) + (m.scenario ? ' · 📜 ' + T('Scenario') : '') + '</p>' : '') + (m.cr !== '' && m.cr != null ? '<p class="crline"><span class="crb">' + crShort(m.cr) + '</span> ' + esc(crHint(m.cr)) + (crInfo(m.cr) ? ' · ' + T('{0} XP', crInfo(m.cr).xp) : '') + (m.baseCr && m.baseCr !== m.cr ? ' · <small>' + T('in D&D: {0}', crShort(m.baseCr)) + '</small>' : '') + '</p>' : '') +
      '<p><b>' + T('AC') + '</b> ' + m.ac + ' · <b>' + T('HP') + '</b> ' + m.hp + ' · <b>' + T('Speed') + '</b> ' + esc(m.speed || '30 ft') + '</p>' +
      '<div class="abline">' + D.ABIL.map(a => '<span><b>' + AB(a) + '</b> ' + m.abil[a] + ' (' + sign(E.modOf(m.abil[a])) + ')</span>').join('') + '</div>' +
      '<h4>' + T('Attacks') + (m.multi ? ' — ' + T('{0} per turn', m.multi) : '') + '</h4><ul>' + m.attacks.map(a => '<li><b>' + esc(a.n) + '</b>: ' + T('{0} to hit', sign(Number(a.hit))) + ', ' + esc(a.d) + ' ' + esc(t(a.t)) + ' (≈' + Math.round(U.avgExpr(a.d)) + ')' + (a.plus ? ' + ' + esc(a.plus.d) + ' ' + esc(t(a.plus.t)) : '') + (a.range ? ' (' + esc(a.range) + ')' : '') + '</li>').join('') + '</ul>' +
      (m.abilities.length ? '<h4>' + T('Special abilities') + '</h4><ul>' + m.abilities.map(ab => '<li><b>' + esc(ab.n) + '</b> — ' + esc(ab.desc || ab.kind) + '</li>').join('') + '</ul>' : '') +
      (m.traits ? '<p class="traits">' + esc(m.traits) + '</p>' : '') + '</div>';
  }
  function monEditor(m) {
    const f = (k, label, type, w) => '<label class="inl">' + label + ' <input ' + (type ? 'type="' + type + '" ' : '') + (w ? 'style="width:' + w + '" ' : '') + 'data-on="monSet" data-id="' + m.id + '" data-f="' + k + '" value="' + esc(m[k] == null ? '' : m[k]) + '"></label>';
    let h = '<div class="detail"><div class="ph"><h2>✎ ' + esc(m.name) + '</h2><div class="btnrow"><button class="primary" data-act="monToFight" data-id="' + m.id + '">' + T('＋ Add to fight') + '</button><button data-act="monDup" data-id="' + m.id + '">' + T('Copy') + '</button><button class="danger" data-act="monDel" data-id="' + m.id + '">' + T('Delete') + '</button></div></div>' +
      '<p class="hint">' + T('Changes save automatically.') + '</p>' +
      f('name', T('Name'), '', '14em') + f('ac', T('AC'), 'number', '4em') + f('hp', T('HP'), 'number', '5em') + f('speed', T('Speed'), '', '7em') + f('multi', T('Attacks per turn'), 'number', '4em') +
      '<label class="inl">' + T('Type') + ' <select data-on="monSet" data-id="' + m.id + '" data-f="type">' + opt('', '—', m.type || '') + Object.keys(D.MON_TYPES || {}).map(k => opt(k, D.MON_TYPES[k].icon + ' ' + D.MON_TYPES[k].name, m.type || '')).join('') + '</select></label>' +
      '<div class="balrow"><b>⚖️ ' + T('Strength') + '</b> ' + ib('cr') + ' ' + crSelect('balCr', m.cr || '1') + ' <button data-act="monBalance" data-id="' + m.id + '">' + T('Balance to this CR') + '</button>' +
      (m.cr && crInfo(m.cr) ? '<small> ' + T('Now: CR {0} — typical AC {1}, HP {2}, +{3} to hit, ~{4} damage per round, save DC {5}.', esc(m.cr), crInfo(m.cr).ac, crInfo(m.cr).hp, crInfo(m.cr).hit, crInfo(m.cr).dpr, crInfo(m.cr).dc) + '</small>' : '') + '</div>' +
      '<h4>' + T('Ability scores') + ' <small>' + T('(10 = average; DEX sets initiative; used for saving throws)') + '</small></h4><div class="abline">' +
      D.ABIL.map(a => '<label class="inl">' + AB(a) + ' <input type="number" class="tiny" data-on="monAbil" data-id="' + m.id + '" data-a="' + a + '" value="' + m.abil[a] + '"></label>').join('') + '</div>';
    h += '<h4>' + T('Attacks') + '</h4>' + m.attacks.map((a, i) => '<div class="fxrow"><input placeholder="' + esc(T('Name')) + '" data-on="monAtk" data-id="' + m.id + '" data-i="' + i + '" data-f="n" value="' + esc(a.n) + '">' +
      '<label class="inl">' + T('to hit') + ' <input type="number" class="tiny" data-on="monAtk" data-id="' + m.id + '" data-i="' + i + '" data-f="hit" value="' + esc(a.hit) + '"></label>' +
      '<label class="inl">' + T('damage') + ' <input style="width:6em" data-on="monAtk" data-id="' + m.id + '" data-i="' + i + '" data-f="d" value="' + esc(a.d) + '"></label>' +
      '<input style="width:7em" placeholder="' + esc(T('type')) + '" data-on="monAtk" data-id="' + m.id + '" data-i="' + i + '" data-f="t" value="' + esc(a.t) + '">' +
      '<input style="width:7em" placeholder="' + esc(T('range (opt.)')) + '" data-on="monAtk" data-id="' + m.id + '" data-i="' + i + '" data-f="range" value="' + esc(a.range || '') + '">' +
      '<small>≈' + Math.round(U.avgExpr(a.d)) + '</small>' +
      '<button class="mini danger" data-act="monAtkDel" data-id="' + m.id + '" data-i="' + i + '">✕</button></div>').join('') + '<button class="mini" data-act="monAtkAdd" data-id="' + m.id + '">' + T('＋ Add attack') + '</button>';
    h += '<h4>' + T('Special abilities') + ' ' + ib('monsterability') + '</h4>' + m.abilities.map((ab, i) => {
      const g = (k, label, type, w, ph) => '<label class="inl">' + label + ' <input ' + (type ? 'type="' + type + '" ' : '') + (w ? 'style="width:' + w + '" ' : '') + 'placeholder="' + esc(ph || '') + '" data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="' + k + '" value="' + esc(ab[k] == null ? '' : ab[k]) + '"></label>';
      const chk = (k, label) => '<label class="inl"><input type="checkbox" data-on="monAbChk" data-id="' + m.id + '" data-i="' + i + '" data-f="' + k + '"' + (ab[k] ? ' checked' : '') + '> ' + label + '</label>';
      let fields = '';
      if (ab.kind === 'attack') fields = g('hit', T('to hit'), 'number', '4em') + g('d', T('damage'), '', '6em', '2d6+2') + g('t', T('type'), '', '6em', 'poison');
      if (ab.kind === 'save') fields = '<label class="inl">' + T('save') + ' <select data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="s">' + D.ABIL.map(a => opt(a, AB(a), ab.s || 'DEX')).join('') + '</select></label>' + g('dc', T('DC'), 'number', '4em') + g('d', T('damage'), '', '6em', '4d6') + g('t', T('type'), '', '6em', 'fire') + chk('half', T('half on save')) + chk('area', T('area (hits everyone)'));
      if (ab.kind === 'heal') fields = g('d', T('heals'), '', '6em', '2d8+2');
      if (ab.kind === 'text') fields = g('d', T('dice to roll (opt.)'), '', '6em', '');
      if (ab.kind === 'attack' || ab.kind === 'save') fields += '<label class="inl">' + T('condition') + ' <select data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="cond">' + opt('', T('none'), ab.cond || '') + Object.keys(D.CONDITIONS).filter(k => !['Concentrating', 'Raging', 'Hidden'].includes(k)).map(k => opt(k, t(k), ab.cond)).join('') + '</select></label>' + (ab.cond ? g('condRounds', T('for rounds'), 'number', '4em') : '');
      return '<div class="abed"><div class="fxrow"><input placeholder="' + esc(T('Ability name')) + '" data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="n" value="' + esc(ab.n || '') + '">' +
        '<select data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="kind">' + opt('attack', T('⚔️ Attack (hits AC)'), ab.kind) + opt('save', T('🛡️ Saving throw'), ab.kind) + opt('heal', T('❤️ Heal itself'), ab.kind) + opt('text', T('📜 Text only'), ab.kind) + '</select>' +
        '<button class="mini danger" data-act="monAbDel" data-id="' + m.id + '" data-i="' + i + '">✕</button></div><div class="fxrow">' + fields + '</div><div class="fxrow">' +
        g('uses', T('uses per fight (0 = unlimited)'), 'number', '4em') + '<label class="inl">' + T('recharge') + ' ' + ib('recharge') + ' <select data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="recharge">' + opt(0, T('no'), ab.recharge || 0) + opt(5, '5–6', ab.recharge) + opt(6, '6', ab.recharge) + opt(4, '4–6', ab.recharge) + '</select></label></div>' +
        '<textarea placeholder="' + esc(T('Describe it in a few words (you read this out loud)')) + '" data-on="monAb" data-id="' + m.id + '" data-i="' + i + '" data-f="desc">' + esc(ab.desc || '') + '</textarea></div>';
    }).join('') + '<button class="mini" data-act="monAbAdd" data-id="' + m.id + '">' + T('＋ Add special ability') + '</button>';
    h += '<label class="blk">' + T('Other traits / notes') + '<textarea data-on="monSet" data-id="' + m.id + '" data-f="traits">' + esc(m.traits || '') + '</textarea></label></div>';
    h += '<h4>' + T('Preview') + '</h4>' + statBlock(m);
    return h;
  }

  // ---------- prepared fights ----------
  function viewPrep() {
    const mons = allMonsters();
    let h = '<div class="ph"><h1>' + T('Prepared fights') + ' ' + ib('encounters') + '</h1><div class="btnrow"><button class="primary" data-act="encNew">' + T('＋ New prepared fight') + '</button></div></div>' +
      '<p class="lead">' + T('Plan your fights before the session. When it\'s time, click <b>▶ Start</b>: the monsters and your party (characters marked “In party”) go into the tracker.') + '</p>';
    if (!S.encounters.length) return h + '<div class="emptybig"><p>' + T('No prepared fights yet.') + '</p></div>';
    h += '<div class="enclist">' + S.encounters.map(en => {
      const editing = S.editing['enc:' + en.id];
      const items = (en.monsters || []).map(x => ({ m: monById(x.mid), qty: Math.max(1, Number(x.qty) || 1) }));
      const summary = items.map(x => x.qty + '× ' + (x.m ? esc(x.m.name) + (x.m.cr ? ' <small>(' + T('CR') + ' ' + esc(x.m.cr) + ')</small>' : '') : '<span class="fail">' + T('missing') + '</span>')).join(', ') || '<i>' + T('no monsters') + '</i>';
      const df = difficulty(items);
      let card = '<div class="detail enc"><div class="ph"><h3>' + esc(en.name || T('Unnamed fight')) + '</h3><div class="btnrow"><button class="primary" data-act="encStart" data-id="' + en.id + '">' + T('▶ Start') + '</button>' +
        '<button data-act="encEdit" data-id="' + en.id + '">' + (editing ? T('Done') : T('✎ Edit')) + '</button><button class="danger" data-act="encDel" data-id="' + en.id + '">✕</button></div></div>' +
        '<p>' + summary + '</p><div class="diffline ' + df.cls + '">' + T('Difficulty') + ' ' + ib('difficulty') + ': ' + df.txt + '</div>' + (en.notes && !editing ? '<p class="traits">' + esc(en.notes) + '</p>' : '');
      if (editing) {
        card += '<label class="blk">' + T('Name') + '<input data-on="encSet" data-id="' + en.id + '" data-f="name" value="' + esc(en.name || '') + '"></label>' +
          '<label class="blk">' + T('Notes (map, tactics, loot)') + '<textarea data-on="encSet" data-id="' + en.id + '" data-f="notes" placeholder="' + esc(T('Map: Practice cave. Goblin flees at 5 HP. Loot: Gravemaw.')) + '">' + esc(en.notes || '') + '</textarea></label>' +
          '<h4>' + T('Monsters') + '</h4>' + U.monFilterBar(mons) +
          (en.monsters || []).map((x, i) => '<div class="fxrow">' + monSelect('encm-' + en.id + '-' + i, mons, '', x.mid, ' data-on="encMon" data-id="' + en.id + '" data-i="' + i + '" data-f="mid"') +
            '<label class="inl">× <input type="number" min="1" class="tiny" data-on="encMon" data-id="' + en.id + '" data-i="' + i + '" data-f="qty" value="' + (x.qty || 1) + '"></label><button class="mini danger" data-act="encMonDel" data-id="' + en.id + '" data-i="' + i + '">✕</button></div>').join('') +
          '<button class="mini" data-act="encMonAdd" data-id="' + en.id + '">' + T('＋ Add monster') + '</button>';
      }
      return card + '</div>';
    }).join('') + '</div>';
    return h;
  }

  // ======================================================================
  //  ACTIONS
  // ======================================================================
  const enc = id => S.encounters.find(e => e.id === id);
  const myMon = id => S.monsters.find(m => m.id === id);
  const commitMon = () => { U.saveMonsters(); U.render(); };
  Object.assign(U.ACT, {
    cTab: ds => { S.combatTab = ds.v; U.render(); },
    addToCombat: ds => { addPc(ds.id); U.saveCombat(); S.combatTab = 'fight'; U.go('combat'); },
    cbAddMon: () => {
      const id = document.getElementById('monSel').value; if (!id) { U.toast(T('Choose a monster first.')); return; }
      const q = Math.max(1, Math.min(20, Number(document.getElementById('monQty').value) || 1)); const cr = (document.getElementById('monCr') || {}).value || ''; addMon(atCr(monById(id), cr), q); U.saveCombat(); U.render();
    },
    cbRollInit: () => {
      const lines = [];
      S.combat.list.forEach(x => {
        if (x.init != null && x.init !== '') return;
        let b = 0; if (x.type === 'pc') { const c = U.byId(x.charId); if (!c) return; b = E.compute(c).init; } else b = E.modOf((x.abil || {}).DEX || 10);
        const r = E.rollD20(b, 'normal'); x.init = r.total; x.dex = b; lines.push(esc(cbView(x).name) + ': <b>' + r.total + '</b> <small>' + r.text + '</small>');
      });
      sortCombat(); U.saveCombat(); if (lines.length) U.logAdd(T('Initiative'), lines); U.render();
    },
    cbStart: () => {
      if (!S.combat.list.length) { U.toast(T('Add someone first.')); return; }
      if (S.combat.list.some(x => x.init == null || x.init === '')) U.ACT.cbRollInit();
      sortCombat(); S.combat.round = 1; S.combat.turn = 0; S.combat.list.forEach(x => { x.econ = U.econNew(); x.move = { ft: 0 }; });
      while (S.combat.turn < S.combat.list.length - 1 && isOut(S.combat.list[S.combat.turn])) S.combat.turn++;
      U.saveCombat(); U.logAdd(T('Combat'), ['⚔️ ' + T('Round 1 begins. {0} goes first.', esc((cbView(S.combat.list[S.combat.turn]) || {}).name || '?'))]); U.render();
    },
    cbNext: () => {
      const L = S.combat.list; if (!L.length) return; let tt = S.combat.turn; let guard = 0;
      do { tt++; if (tt >= L.length) { tt = 0; S.combat.round++; U.logAdd(T('Combat'), ['— ' + T('Round {0}', S.combat.round) + ' —']); } guard++; } while (isOut(L[tt]) && guard < L.length * 2);
      S.combat.turn = tt; startTurn(L[tt]); U.saveCombat(); U.render();
    },
    cbTurn: ds => { S.combat.turn = Number(ds.i); if (!S.combat.round) S.combat.round = 1; U.saveCombat(); U.render(); },
    cbClear: () => { if (!confirm(T('Remove everyone from the fight?'))) return; S.combat = { list: [], round: 0, turn: -1, target: {} }; U.saveCombat(); U.render(); },
    cbDel: ds => { const L = S.combat.list; const i = L.findIndex(x => x.id === ds.id); L.splice(i, 1); if (S.combat.turn >= L.length) S.combat.turn = L.length ? 0 : -1; else if (i < S.combat.turn) S.combat.turn--; U.saveCombat(); U.render(); },
    cbDmg: ds => { const x = S.combat.list.find(y => y.id === ds.id); const n = Number(document.getElementById('amt-' + ds.id).value) || 0; if (!n) return; const tg = U.cbTarget(x); const before = tg.hpNow(); const notes = tg.damage(n); U.logAdd(tg.name, [T('takes {0} damage', '<b class="big dmg">' + n + '</b>') + ' · ' + T('HP {0} → {1}', before, tg.hpNow()) + U.notesTxt(notes)]); U.render(); },
    cbHeal: ds => { const x = S.combat.list.find(y => y.id === ds.id); const n = Number(document.getElementById('amt-' + ds.id).value) || 0; if (!n) return; const tg = U.cbTarget(x); const before = tg.hpNow(); tg.heal(n); U.logAdd(tg.name, [T('heals {0}', '<b class="big heal">' + n + '</b>') + ' · ' + T('HP {0} → {1}', before, tg.hpNow())]); U.render(); },
    cbDeath: ds => { const x = S.combat.list.find(y => y.id === ds.id); U.deathSave(U.byId(x.charId)); U.saveChars(); U.render(); },
    cbCondDel: ds => { const x = S.combat.list.find(y => y.id === ds.id); U.delCond(cbView(x).holder, ds.v); U.saveChars(); U.saveCombat(); U.render(); },
    cbAct: ds => {
      const cb = S.combat; const active = cb.list[cb.turn]; if (!active) return;
      const tid = cb.target[active.id] != null && cb.target[active.id] !== '' ? cb.target[active.id] : defaultTarget(active);
      const enemies = cb.list.filter(x => x.id !== active.id && !isOut(x) && (active.type === 'pc' ? x.type === 'mon' : x.type === 'pc'));
      const tcb = tid === '__all' ? null : cb.list.find(x => x.id === tid);
      const target = tcb ? U.cbTarget(tcb) : null;
      let lines, who;
      const pick = a => {
        if ((a.heal || a.temp) && (a.self || !tcb || (active.type === 'pc' ? tcb.type !== 'pc' : tcb.type !== 'mon'))) return U.cbTarget(active); // heal self / never heal enemies
        if (tid === '__all' || (a.area && !tcb)) { if (a.save) return enemies.map(U.cbTarget); return enemies[0] ? U.cbTarget(enemies[0]) : null; }
        return target;
      };
      // turn economy: what this costs; the DM may still click it (only a warning), players' requests are checked before (online.js)
      const econ = active.econ = active.econ || U.econNew();
      const spend = a => { const k = ds.cost || U.actCost(a); if (k !== '-' && econ[k] >= 1 && !ds.remote) U.toast('⚠️ ' + T('Already used this turn: {0}. (You are the DM — it still works.)', T(ECON_NAME[k]))); if (k !== '-') econ[k] = (econ[k] || 0) + 1; };
      // several chosen targets (Bless, Magic Missile darts split between them, an area placed on the map): ds.tids
      const tl = Array.isArray(ds.tids) ? ds.tids.map(id => cb.list.find(x => x.id === id)).filter(Boolean).map(U.cbTarget).filter(Boolean) : null;
      const res = (a, att) => {
        if (!tl) return U.resolve(a, att, pick(a));
        if (a.save || (!tl.length)) return U.resolve(a, att, a.save ? tl : null);
        const n = tl.length, cnt = a.count > 1 ? a.count : 0;
        return tl.flatMap((tg, i) => { const k = cnt ? Math.floor(cnt / n) + (i < cnt % n ? 1 : 0) : 1; return k ? U.resolve(cnt ? Object.assign({}, a, { count: k }) : a, att, tg) : []; });
      };
      if (active.type === 'pc') {
        const c = U.byId(active.charId); const d = E.compute(c); let a = d.actions.find(x => x.id === ds.aid); if (!a) return;
        if (ds.one) a = Object.assign({}, a, { count: 1 }); // a reaction attack (opportunity attack) is ONE attack
        const w = U.spendFor(c, d, a); who = c.name;
        if (/⚠️/.test(w)) { U.toast(w); return; }
        spend(a); // only when it really happens (not when out of slots / uses)
        lines = ['<b>' + esc(a.name) + '</b>' + (w ? ' <small>(' + w + ')</small>' : '')].concat(res(a, U.attackerOf(c)));
        U.saveChars();
      } else {
        const a = monActions(active).find(x => x.id === ds.aid); if (!a || a.blocked) return; who = active.name; spend(a);
        if (a.abId) {
          const ab = active.abilities.find(x => x.id === a.abId);
          active.used = active.used || {}; active.used[ab.id] = (active.used[ab.id] || 0) + 1;
          if (Number(ab.recharge) > 0) { active.spent = active.spent || {}; active.spent[ab.id] = true; }
        }
        lines = ['<b>' + esc(a.name) + '</b>' + (a.desc && !a.plain ? ' <i>' + esc(a.desc) + '</i>' : '')].concat(res(a, { name: active.name, ctx: { lvl: 1, pb: 2, mod: modsOf(active.abil) } }));
      }
      U.saveCombat(); U.logAdd(who, lines); U.render();
    },
    cbSavePrep: () => {
      const mons = S.combat.list.filter(x => x.type === 'mon' && x.srcId); if (!mons.length) { U.toast(T('No monsters in the fight to save.')); return; }
      const name = prompt(T('Name for this prepared fight?'), T('New fight')); if (!name) return;
      const counts = {}; mons.forEach(x => { counts[x.srcId] = (counts[x.srcId] || 0) + 1; });
      S.encounters.push({ id: E.uid(), name, notes: '', monsters: Object.keys(counts).map(mid => ({ mid, qty: counts[mid] })) });
      U.saveEncounters(); U.toast(T('Saved in 📋 Prepared fights.'));
    },
    cbPractice: () => {
      let bran = S.chars.find(c => c.name === 'Bran Ashford');
      if (!bran) { U.ACT.loadSample(); bran = S.chars.find(c => c.name === 'Bran Ashford'); }
      addPc(bran.id); addMon(monById('srd:goblin'), 1); addMon(monById('srd:giantrat'), 1); U.saveCombat(); U.render(); U.toast(T('Practice fight ready. Click “Roll initiative”.'));
    },

    // monsters
    monNewOpen: () => { S.monSel = '__new'; S.newMon = null; U.render(); },
    monCreate: () => {
      const N = S.newMon || {}; const from = N.from || ''; const cr = N.cr || '1'; const bal = N.bal !== false; const name = String(N.name || '').trim();
      let m;
      if (from) { const src = monById(from); m = normMon(E.clone(src)); delete m.builtin; m.name = name || src.name + ' ' + T('(mine)'); }
      else m = normMon({ name: name || T('New monster'), ac: 12, hp: 15, speed: '30 ft', cr, multi: 0, attacks: [{ n: T('Claw'), hit: 4, d: '1d6+2', t: 'slashing' }], abilities: [], traits: '' });
      m.id = E.uid();
      if (bal || !from) balance(m, cr);
      S.monsters.unshift(m); S.monSel = m.id; S.newMon = null; commitMon();
      U.toast(T('Created. CR {0}: AC {1}, HP {2}. Now add special abilities if you like.', m.cr, m.ac, m.hp));
    },
    monBalance: ds => { const m = myMon(ds.id); const cr = document.getElementById('balCr').value; balance(m, cr); commitMon(); U.toast(T('Balanced to CR {0}.', cr)); },
    monSel: ds => { S.monSel = ds.id || null; S.monPrevCr = null; U.render(); },
    mfReset: () => { S.mf = { q: '', from: '', to: '', type: '', src: '' }; U.render(); },
    monCopy: ds => { const src0 = monById(ds.id); const src = src0.builtin ? atCr(src0, S.monPrevCr) : src0; const m = normMon(E.clone(src)); m.id = E.uid(); delete m.builtin; m.name = src.name + ' ' + T('(mine)'); S.monPrevCr = null; S.monsters.unshift(m); S.monSel = m.id; commitMon(); },
    monDup: ds => { const m = E.clone(myMon(ds.id)); m.id = E.uid(); m.name += ' ' + T('(copy)'); S.monsters.unshift(m); S.monSel = m.id; commitMon(); },
    monDel: ds => { if (!confirm(T('Delete this monster?'))) return; S.monsters = S.monsters.filter(m => m.id !== ds.id); S.monSel = null; commitMon(); },
    monToFight: ds => { const m0 = monById(ds.id); addMon(m0.builtin ? atCr(m0, S.monPrevCr) : m0, 1); U.saveCombat(); U.toast(T('Added to the fight.')); },
    monAtkAdd: ds => { myMon(ds.id).attacks.push({ n: T('Attack'), hit: 3, d: '1d6+1', t: 'slashing' }); commitMon(); },
    monAtkDel: ds => { myMon(ds.id).attacks.splice(Number(ds.i), 1); commitMon(); },
    monAbAdd: ds => { myMon(ds.id).abilities.push({ id: E.uid(), n: T('Special ability'), kind: 'save', s: 'DEX', dc: 12, d: '2d6', t: 'fire', half: true, area: false, uses: 0, recharge: 0, desc: '' }); commitMon(); },
    monAbDel: ds => { myMon(ds.id).abilities.splice(Number(ds.i), 1); commitMon(); },

    // prepared fights
    encNew: () => { const en = { id: E.uid(), name: T('New fight'), notes: '', monsters: [{ mid: 'srd:goblin', qty: 2 }] }; S.encounters.unshift(en); S.editing['enc:' + en.id] = true; U.saveEncounters(); U.render(); },
    encEdit: ds => { S.editing['enc:' + ds.id] = !S.editing['enc:' + ds.id]; U.render(); },
    encDel: ds => { if (!confirm(T('Delete this prepared fight?'))) return; S.encounters = S.encounters.filter(e => e.id !== ds.id); U.saveEncounters(); U.render(); },
    encMonAdd: ds => { const first = allMonsters().filter(mfOk).sort(crSort)[0]; enc(ds.id).monsters.push({ mid: first ? first.id : 'srd:goblin', qty: 1 }); U.saveEncounters(); U.render(); },
    encMonDel: ds => { enc(ds.id).monsters.splice(Number(ds.i), 1); U.saveEncounters(); U.render(); },
    encStart: ds => {
      const en = enc(ds.id);
      if (S.combat.list.length && !confirm(T('Replace the current fight with “{0}”?', en.name))) return;
      S.combat = { list: [], round: 0, turn: -1, target: {} };
      S.chars.filter(c => c.party).forEach(c => addPc(c.id));
      (en.monsters || []).forEach(x => { const m = monById(x.mid); if (m) addMon(m, Math.max(1, Number(x.qty) || 1)); });
      U.saveCombat(); S.combatTab = 'fight'; U.render();
      U.logAdd(T('Combat'), ['📋 ' + T('Loaded {0}', '<b>' + esc(en.name) + '</b>') + (en.notes ? ' — <i>' + esc(en.notes) + '</i>' : '')]);
    }
  });

  Object.assign(U.ON, {
    newMon: el => { S.newMon = S.newMon || {}; const f = el.dataset.f; S.newMon[f] = f === 'bal' ? el.checked : el.value; if (f === 'from' && el.value) { const m = monById(el.value); if (m && m.cr) S.newMon.cr = String(m.cr); } U.render(); },
    monPrevCr: el => { S.monPrevCr = el.value; U.render(); },
    monQ: el => { S.monQ = el.value; U.render(); const i = document.querySelector('.monq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    mf: el => { mf()[el.dataset.f] = el.value; U.render(); },

    monCrF: el => { S.monCrF = el.value; U.render(); },
    cbAddPc: el => { if (!el.value) return; addPc(el.value); U.saveCombat(); U.render(); },
    cbInit: el => { const x = S.combat.list.find(y => y.id === el.dataset.id); const activeId = S.combat.turn >= 0 ? S.combat.list[S.combat.turn].id : null; x.init = el.value === '' ? null : Number(el.value); sortCombat(); if (activeId) S.combat.turn = S.combat.list.findIndex(y => y.id === activeId); U.saveCombat(); U.render(); },
    cbTarget: el => { S.combat.target[el.dataset.id] = el.value; U.saveCombat(); U.render(); },
    cbCondAdd: el => { if (!el.value) return; const x = S.combat.list.find(y => y.id === el.dataset.id); U.addCond(cbView(x).holder, el.value, U.durOf(el)); U.saveChars(); U.saveCombat(); U.render(); },
    monSet: el => { const m = myMon(el.dataset.id); const f = el.dataset.f; m[f] = ['ac', 'hp', 'multi'].includes(f) ? Number(el.value) || 0 : el.value; commitMon(); },
    monAbil: el => { myMon(el.dataset.id).abil[el.dataset.a] = Number(el.value) || 10; commitMon(); },
    monAtk: el => { const a = myMon(el.dataset.id).attacks[Number(el.dataset.i)]; a[el.dataset.f] = el.dataset.f === 'hit' ? Number(el.value) || 0 : el.value; commitMon(); },
    monAb: el => { const ab = myMon(el.dataset.id).abilities[Number(el.dataset.i)]; const f = el.dataset.f; ab[f] = ['hit', 'dc', 'uses', 'recharge', 'condRounds'].includes(f) ? Number(el.value) || 0 : el.value; commitMon(); },
    monAbChk: el => { myMon(el.dataset.id).abilities[Number(el.dataset.i)][el.dataset.f] = el.checked; commitMon(); },
    encSet: el => { enc(el.dataset.id)[el.dataset.f] = el.value; U.saveEncounters(); U.render(); },
    encMon: el => { const x = enc(el.dataset.id).monsters[Number(el.dataset.i)]; x[el.dataset.f] = el.dataset.f === 'qty' ? Math.max(1, Number(el.value) || 1) : el.value; U.saveEncounters(); U.render(); }
  });
  // live search in the monster filter (keeps the cursor in the box)
  U.IN.mfQ = el => { mf().q = el.value; U.render(); const i = document.querySelector('.mfq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } };
})(window.UI);
