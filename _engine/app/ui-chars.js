// Home (character list), character builder, help page, import / export.
(function (U) {
  'use strict';
  const D = U.D, E = U.E, esc = U.esc, sign = U.sign, S = U.S, ib = U.ib, pill = U.pill, opt = U.opt, T = U.T, t = D.t;
  const AN = a => D.ABIL_NAME[a];

  // ======================================================================
  //  HOME
  // ======================================================================
  U.views.home = function () {
    const cards = S.chars.map(c => {
      const d = E.compute(c);
      const sub = [d.Sp && d.Sp.name, d.C && d.C.name].filter(Boolean).join(' ');
      const btns = U.PLAYER
        ? '<button class="primary" data-act="openSheet" data-id="' + c.id + '">' + T('Open sheet') + '</button>' +
          (c.dmLocked ? '' : '<button data-act="openBuilder" data-id="' + c.id + '">' + T('Edit build') + '</button>') +
          '<button data-act="exportChar" data-id="' + c.id + '">' + T('📤 Send to DM') + '</button>' +
          '<button class="danger" data-act="delChar" data-id="' + c.id + '">' + T('Delete') + '</button>'
        : '<button class="primary" data-act="openSheet" data-id="' + c.id + '">' + T('Open sheet') + '</button>' +
          '<button data-act="openBuilder" data-id="' + c.id + '">' + T('Edit build') + '</button>' +
          '<button data-act="exportChar" data-id="' + c.id + '">' + T('📤 Export for player') + '</button>' +
          '<button class="' + (c.party ? 'on' : '') + '" data-act="toggleParty" data-id="' + c.id + '" title="' + esc(T('Added automatically when you start a prepared fight')) + '">' + (c.party ? T('✓ In party') : T('Not in party')) + '</button>' +
          '<button data-act="dupChar" data-id="' + c.id + '">' + T('Copy') + '</button>' +
          '<button class="danger" data-act="delChar" data-id="' + c.id + '">' + T('Delete') + '</button>' + (U.obrHeroToScene ? '<button data-act="heroToScene" data-id="' + c.id + '">🗺 ' + T('Onto the scene') + '</button>' : '');
      return '<div class="ccard">' + U.portrait(c, d, 'sm') +
        '<div class="cc-body"><div class="cc-name">' + esc(c.name || T('Unnamed hero')) + (c.dmLocked && U.PLAYER ? ' <span class="tag">' + T('from DM') + '</span>' : '') + '</div>' +
        '<div class="cc-sub">' + T('Level {0}', c.level) + ' ' + esc(sub || T('(not finished)')) + '</div>' +
        '<div class="cc-stats">❤️ ' + d.hpCur + '/' + d.hpMax + ' · 🛡️ ' + T('AC') + ' ' + d.ac + '</div>' +
        '<div class="cc-btns">' + btns + '</div></div></div>';
    }).join('');
    const head = U.PLAYER
      ? '<h1>' + T('My characters') + '</h1><div class="btnrow"><button class="primary" data-act="newChar">' + T('＋ New character') + '</button><button data-act="importChar">' + T('📥 Import file from DM') + '</button></div>'
      : '<h1>' + T('Characters') + '</h1><div class="btnrow"><button class="primary" data-act="newChar">' + T('＋ New character') + '</button><button data-act="importChar">' + T('📥 Import file(s)') + '</button>' +
        '<button data-act="loadSample">' + T('Load practice hero (Bran)') + '</button><button data-act="backup">' + T('💾 Save game file') + '</button></div>';
    const tip = U.PLAYER
      ? '<div class="tipbox">' + T('<b>How it works:</b> 1) Create your character. 2) Click <b>📤 Send to DM</b> and send the file on Discord. 3) When the DM sends you an updated file (level up, new items), click <b>📥 Import file from DM</b>.<br>💾 Your character is saved automatically in this browser on this computer. The exported file is your backup.') + '</div>'
      : '<div class="tipbox">' + T('<b>Saving:</b> everything in this game saves automatically in this browser. At the end of an evening click <b>💾 Save game file</b> and keep the file in <code>Campaigns/{0}/</code>. Your other games: the <b>🎲</b> button at the top.', esc(U.fileName(U.game ? U.game.name : 'game'))) + '<br>' +
        T('<b>Players:</b> they send you their character file → Import. After you change it (loot, level up), click <b>📤 Export for player</b> and send it back — their copy becomes "managed by DM".') + '</div>';
    return '<div class="page"><div class="ph">' + head + '</div>' +
      (cards ? '<div class="cgrid">' + cards + '</div>' :
        '<div class="emptybig">' + T('<p>No characters yet.</p><p>Click <b>＋ New character</b> — the builder explains every step.</p>') + '</div>') + tip + '</div>';
  };

  // ======================================================================
  //  BUILDER
  // ======================================================================
  function isCaster(c, d) { return !!(d.casting.ability || d.featKeys.includes('magicinitiate')); }
  function steps(c) {
    const d = E.compute(c); const Sp = D.SPECIES[c.speciesKey]; const bg = D.BACKGROUNDS[c.backgroundKey];
    const sg = E.skillGroups(c);
    const skillsDone = sg.groups.every(g => (c.picks[g.id] || []).length >= g.count) && (c.picks.expertise || []).length >= E.expertiseCount(c);
    const C = d.C;
    let featDone = !!C;
    if (C) {
      if (E.hasFightingStyle(c) && !c.opts.fightingStyle) featDone = false;
      if (C.orders && !c.opts.order) featDone = false;
      if (C.masteries && (c.picks.masteries || []).length < C.masteries) featDone = false;
      if (c.level >= 3 && C.subclasses && !c.opts.subclass) featDone = false;
      if (C.invocations && (c.picks.invocations || []).length < C.invocations[c.level - 1]) featDone = false;
      if (c.classKey === 'sorcerer' && c.level >= 2 && (c.picks.metamagic || []).length < D.METAMAGIC_COUNT(c.level)) featDone = false;
      if (E.asiList(c).some(s => !E.asiDone(s))) featDone = false;
      if (E.subclass(c) && c.classKey === 'druid' && c.opts.subclass === 'land' && !c.opts.land) featDone = false;
      if (E.subclass(c) && c.classKey === 'fighter' && c.opts.subclass === 'battlemaster' && D.MANEUVERS_COUNT && (c.picks.maneuvers || []).length < D.MANEUVERS_COUNT(c.level)) featDone = false;
    }
    let spellsDone = true;
    if (d.casting.ability) spellsDone = (c.picks.cantrips || []).length >= d.casting.cantripsN && (c.picks.prepared || []).length >= d.casting.preparedN;
    if (d.featKeys.includes('magicinitiate')) spellsDone = spellsDone && (c.picks.miCantrips || []).length >= 2 && (c.picks.miSpell || []).length >= 1;
    const out = [
      { k: 'class', t: T('Class'), done: !!c.classKey },
      { k: 'species', t: T('Species'), done: !!Sp && (!Sp.options || !!c.speciesOpt) && (c.speciesKey !== 'human' || !!c.opts.humanFeat) },
      { k: 'background', t: T('Background'), done: !!bg && (c.bgMode === '111' || (c.bgPlus2 && c.bgPlus1)) },
      { k: 'abilities', t: T('Abilities'), done: D.ABIL.every(a => c.base[a] != null && c.base[a] !== '') },
      { k: 'skills', t: T('Skills'), done: !!C && skillsDone },
      { k: 'features', t: T('Class options'), done: featDone }
    ];
    if (isCaster(c, d)) out.push({ k: 'spells', t: T('Spells'), done: spellsDone });
    out.push({ k: 'equipment', t: T('Equipment'), done: c.inventory.length > 0 || c.kit === 'gold' });
    out.push({ k: 'details', t: T('Name & story'), done: !!c.name });
    return out;
  }
  U.steps = steps;
  // a "managed by DM" hero can still make the choices of a new level (skills, class options, spells)
  U.builderSteps = c => (U.locked(c) ? steps(c).filter(s => ['skills', 'features', 'spells'].includes(s.k)) : steps(c));

  // source switch for builder lists when a scenario is active: '' everything, 'dnd' standard only, 'scn' scenario only
  U.srcOk = x => !S.bsrc || (S.bsrc === 'scn' ? !!(x && x.scenario) : !(x && x.scenario));
  U.views.builder = function () {
    const c = U.cur(); if (!c) { S.view = 'home'; return U.views.home(); }
    if (U.locked(c) && !c.lvlOpen) return '<div class="page"><div class="detail"><h2>🔒 ' + T('Managed by your DM') + ' ' + ib('dmlocked') + '</h2><p>' + esc(D.HELP.dmlocked[1]) + '</p><button class="primary" data-act="openSheet" data-id="' + c.id + '">' + T('Open sheet') + '</button></div></div>';
    const st = U.builderSteps(c); S.step = Math.max(0, Math.min(S.step, st.length - 1));
    const step = st[S.step];
    const nav = st.map((s, i) => '<button class="step' + (i === S.step ? ' on' : '') + (s.done ? ' done' : '') + '" data-act="step" data-i="' + i + '"><span>' + (s.done ? '✓' : i + 1) + '</span>' + s.t + '</button>').join('');
    const body = ({ class: bClass, species: bSpecies, background: bBackground, abilities: bAbilities, skills: bSkills, features: bFeatures, spells: bSpells, equipment: bEquipment, details: bDetails })[step.k](c);
    const lvl = U.DM ? '<label class="inl">' + T('Level') + ' ' + ib('level') + ' <select data-on="bindNum" data-path="level">' + Array.from({ length: D.MAX_LEVEL }, (_, i) => i + 1).map(l => opt(l, l, c.level)).join('') + '</select></label>' : '<span class="tag">' + T('Level {0}', c.level) + '</span>';
    return '<div class="page builder">' +
      '<div class="ph"><h1>' + T('Character builder') + '</h1><div class="btnrow"><span class="building">' + T('Building:') + ' <b>' + esc(c.name || T('New hero')) + '</b></span>' + lvl +
      (c.lvlUp ? '<button class="primary" data-act="nav" data-v="levelup">' + T('← Back to level up') + '</button>' : '<button class="primary" data-act="openSheet" data-id="' + c.id + '">' + T('Open sheet →') + '</button>') + '</div></div>' +
      '<div class="steps">' + nav + '</div>' +
      (SCN.active ? '<div class="scnbar">📜 ' + T('Scenario:') + ' <b>' + esc(SCN.active.title || SCN.active.name) + '</b> · ' + T('Show:') + ' <select data-on="bsrc">' +
        opt('', T('Everything'), S.bsrc || '') + opt('dnd', '📖 ' + T('Only standard D&D'), S.bsrc || '') + opt('scn', '📜 ' + T('Only from the scenario'), S.bsrc || '') + '</select> <small>' + T('(species, backgrounds, subclasses, spells, feats)') + '</small></div>' : '') +
      '<div class="stepbody">' + body + '</div>' +
      '<div class="stepfoot">' + (S.step > 0 ? '<button data-act="step" data-i="' + (S.step - 1) + '">' + T('← Back') + '</button>' : '<span></span>') +
      (S.step < st.length - 1 ? '<button class="primary" data-act="step" data-i="' + (S.step + 1) + '">' + T('Next: {0} →', st[S.step + 1].t) + '</button>' :
        (c.lvlUp ? '<button class="primary" data-act="nav" data-v="levelup">' + T('← Back to level up') + '</button>' : '<button class="primary" data-act="openSheet" data-id="' + c.id + '">' + T('Finish → open character sheet') + '</button>')) + '</div></div>';
  };

  const armorTxt = C => (C.armor.length ? C.armor.map(x => t(x)).join(', ') : T('none'));
  // right under the cards: what you picked + a big "Next" button (the long details come after it)
  function nextBar(c, kind) {
    const X = kind === 'class' ? D.CLASSES[c.classKey] : kind === 'species' ? D.SPECIES[c.speciesKey] : D.BACKGROUNDS[c.backgroundKey];
    if (!X) return '';
    const st = U.builderSteps(c); const nx = st[S.step + 1];
    return '<div class="pickbar" id="pickbar"><div><b>✅ ' + T('Chosen:') + ' ' + (X.icon ? X.icon + ' ' : '') + esc(X.name) + '</b><small>' + esc(X.blurb || '') + '</small></div>' +
      (nx ? '<button class="primary" data-act="step" data-i="' + (S.step + 1) + '">' + T('Next: {0} →', nx.t) + '</button>' : '') + '</div>' +
      '<p class="hint">' + T('More about it below ↓') + '</p>';
  }
  U.toPickbar = () => setTimeout(() => { const b = document.getElementById('pickbar'); if (b) b.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 30);

  function bClass(c) {
    const cards = Object.keys(D.CLASSES).map(k => {
      const C = D.CLASSES[k];
      return '<button class="card pick' + (c.classKey === k ? ' sel' : '') + '" data-act="setClass" data-k="' + k + '">' +
        '<div class="ic">' + C.icon + '</div><div class="t">' + C.name + '</div><div class="diff ' + C.difficulty.toLowerCase() + '">' + t(C.difficulty) + '</div>' +
        '<div class="s">' + esc(C.blurb) + '</div><div class="meta">' + T('Hit die d{0}', C.hitDie) + ' · ' + T('Main:') + ' ' + C.primary.map(AN).join(' / ') + (C.casting ? ' · ✨ ' + T('Magic') : '') + '</div></button>';
    }).join('');
    let det = '';
    const C = D.CLASSES[c.classKey];
    if (C) {
      // every level 1-20 written out: class powers, subclass powers, ability score improvements, extra attacks, spell levels
      const li = f => '<li><b>' + esc(f.name) + '</b> — ' + esc(f.desc) + '</li>';
      const subs = Object.values(C.subclasses || {});
      const slotLvl = l => (C.casting ? (C.casting.type === 'pact' ? (D.PACT[l - 1] || {}).level : ((D.SLOTS[C.casting.type] || [])[l - 1] || []).length) : 0);
      const feats = Array.from({ length: 20 }, (_, i) => i + 1).map(l => {
        const fs = C.features.filter(f => f.lvl === l);
        let extra = '';
        if (l === 3 && subs.length) {
          extra += '<li><b>' + T('Subclass') + '</b> ' + ib('subclass') + ' — ' + T('choose one:') + '</li>' + subs.map(s =>
            '<li class="subli"><b>' + esc(s.name) + '</b> — ' + esc(s.desc) + '<ul>' + s.features.filter(f => f.lvl === 3).map(li).join('') + '</ul></li>').join('');
        } else subs.forEach(s => s.features.filter(f => f.lvl === l).forEach(f => { extra += '<li class="subli"><b>' + esc(f.name) + '</b> <small>(' + esc(s.name) + ')</small> — ' + esc(f.desc) + '</li>'; }));
        if ((C.asi || []).includes(l)) extra += '<li><b>💪 ' + (l >= 19 ? T('Epic Boon') : T('Ability Score Improvement')) + '</b> — ' + T('+2 to one ability, +1 to two, or a feat') + ' ' + ib('asi') + '</li>';
        if (slotLvl(l) > slotLvl(l - 1) && l > 1) extra += '<li>✨ ' + T('New spell level unlocked: {0}', slotLvl(l)) + '</li>';
        if (l === 5 || l === 11 || l === 17) if (C.casting && C.casting.cantrips[l - 1] > 0) extra += '<li>🔮 ' + T('Cantrips deal more damage') + '</li>';
        const pbUp = l > 1 && D.pb(l) > D.pb(l - 1) ? '<li>🎯 ' + T('Proficiency bonus {0}', sign(D.pb(l))) + '</li>' : '';
        const body = fs.map(li).join('') + extra + pbUp;
        return '<div class="lvlcol' + (l <= c.level ? '' : ' dim') + '"><h4>' + T('Level {0}', l) + (l > c.level ? ' <small>' + T('later') + '</small>' : ' <small class="ok">✓</small>') + '</h4><ul>' + (body || '<li class="hint">' + T('More hit points (+{0} + CON).', C.hitDie / 2 + 1) + '</li>') + '</ul></div>';
      }).join('');
      const road = '';
      det = '<div class="detail"><h3>' + C.icon + ' ' + C.name + '</h3>' +
        '<p><b>' + T('Good at saving against:') + '</b> ' + C.saves.map(AN).join(', ') + ' ' + ib('saves') + ' · <b>' + T('Armor:') + '</b> ' + armorTxt(C) +
        ' · <b>' + T('Weapons:') + '</b> ' + T('simple') + (C.martial === true ? ' + ' + T('martial') : C.martial === 'finesse-light' ? ' + ' + T('light/finesse martial') : C.martial === 'light' ? ' + ' + T('light martial') : '') +
        (C.casting ? ' · <b>' + T('Magic from:') + '</b> ' + AN(C.casting.ability) : '') + ' · <b>' + T('Hit points:') + '</b> ' + T('{0} + CON at level 1, then +{1} + CON per level', C.hitDie, C.hitDie / 2 + 1) + '</p>' +
        '<div class="lvlgrid">' + feats + '</div>' +
        (road ? '<h4>' + T('Levels 4–20 (hover a name to read it)') + ' ' + ib('later') + '</h4><ul class="roadmap">' + road + '</ul>' : '') + '</div>';
    }
    return '<h2>' + T('1. Choose a class') + ' ' + ib('class') + '</h2><p class="lead">' + T('Your class is what you <b>do</b> in the group: fight, sneak, heal or cast spells. First game? Pick an <span class="diff easy">Easy</span> one.') + '</p><div class="cards">' + cards + '</div>' + nextBar(c, 'class') + det;
  }

  function bSpecies(c) {
    const cards = Object.keys(D.SPECIES).filter(k => U.srcOk(D.SPECIES[k]) || c.speciesKey === k).map(k => {
      const Sp = D.SPECIES[k];
      return '<button class="card pick' + (c.speciesKey === k ? ' sel' : '') + '" data-act="setSpecies" data-k="' + k + '"><div class="ic">' + Sp.icon + '</div><div class="t">' + Sp.name + '</div>' +
        '<div class="s">' + esc(Sp.blurb) + '</div><div class="meta">' + T('Speed {0} ft', Sp.speed) + ' · ' + Sp.size + (Sp.darkvision ? ' · ' + T('sees in the dark') : '') + '</div></button>';
    }).join('');
    let det = ''; const Sp = D.SPECIES[c.speciesKey];
    if (Sp) {
      let opts = '';
      if (Sp.options) {
        const what = c.speciesKey === 'dragonborn' ? T('dragon ancestry') : c.speciesKey === 'goliath' ? T('giant ancestry') : c.speciesKey === 'tiefling' ? T('fiendish legacy') : T('lineage');
        opts = '<h4>' + T('Choose your {0}', what) + '</h4><div class="opts">' +
          Object.keys(Sp.options).map(k => pill(c.speciesOpt === k, 'setSpOpt', 'data-k="' + k + '"', esc(Sp.options[k].name), esc(Sp.options[k].desc || ''))).join('') + '</div>';
      }
      let feat = '';
      if (c.speciesKey === 'human') {
        feat = '<h4>' + T('Humans get one extra Origin feat') + ' ' + ib('feat') + '</h4><div class="opts">' + Object.keys(D.FEATS).map(k => pill(c.opts.humanFeat === k, 'setOpt', 'data-k="humanFeat" data-v="' + k + '"', D.FEATS[k].name, esc(D.FEATS[k].desc))).join('') + '</div>';
        if (c.opts.humanFeat === 'magicinitiate') feat += '<h4>' + T('Magic Initiate list') + '</h4><div class="opts">' + Object.keys(D.MI_LISTS).map(k => pill(E.miList(c) === k, 'setOpt', 'data-k="miList" data-v="' + k + '"', D.MI_LISTS[k].name, '')).join('') + '</div>';
      }
      const hasCantrip = (Sp.options && Object.values(Sp.options).some(o => o.cantrip)) || c.speciesKey === 'tiefling';
      const ab = hasCantrip ? '<h4>' + T('Which ability powers your species magic?') + '</h4><p class="hint">' + T('Pick the same one your class uses for magic, or your highest of these three.') + '</p><div class="opts">' + ['INT', 'WIS', 'CHA'].map(a => pill((c.opts.speciesAbility || '') === a, 'setOpt', 'data-k="speciesAbility" data-v="' + a + '"', AN(a), '')).join('') + '</div>' : '';
      det = '<div class="detail"><h3>' + Sp.icon + ' ' + Sp.name + '</h3><ul>' + Sp.traits.map(x => '<li><b>' + esc(x.name) + '</b> — ' + esc(x.desc) + '</li>').join('') + '</ul>' + opts + feat + ab + '</div>';
    }
    return '<h2>' + T('2. Choose a species') + ' ' + ib('species') + '</h2><p class="lead">' + T('What kind of person are you? It gives small special traits. Pick the one you like the look and feel of — there is no wrong choice.') + '</p><div class="cards">' + cards + '</div>' + nextBar(c, 'species') + det;
  }

  function bBackground(c) {
    const cards = Object.keys(D.BACKGROUNDS).filter(k => U.srcOk(D.BACKGROUNDS[k]) || c.backgroundKey === k).map(k => {
      const B = D.BACKGROUNDS[k];
      return '<button class="card pick small' + (c.backgroundKey === k ? ' sel' : '') + '" data-act="setBg" data-k="' + k + '"><div class="t">' + B.name + '</div><div class="s">' + esc(B.blurb) + '</div>' +
        '<div class="meta">' + T('Raises:') + ' ' + B.abil.map(AN).join(', ') + '<br>' + T('Skills:') + ' ' + B.skills.map(t).join(', ') + '<br>' + T('Feat:') + ' ' + D.FEATS[B.feat].name + (B.miList ? ' (' + T('{0} magic', D.MI_LISTS[B.miList].name) + ')' : '') + '</div></button>';
    }).join('');
    let det = ''; const B = D.BACKGROUNDS[c.backgroundKey];
    if (B) {
      const modeBtns = pill(c.bgMode === '21', 'setBgMode', 'data-v="21"', T('+2 and +1'), T('Recommended: boost your main ability')) + pill(c.bgMode === '111', 'setBgMode', 'data-v="111"', '+1 / +1 / +1', T('Spread evenly'));
      let pick = '';
      const C = D.CLASSES[c.classKey];
      if (c.bgMode === '21') {
        const main = a => (C && C.primary.includes(a) ? ' ⭐ ' + T('main for {0}', C.name) : '');
        pick = '<div class="row2"><div><h4>' + T('+2 to') + '</h4><div class="opts">' + B.abil.map(a => pill(c.bgPlus2 === a, 'setBgPlus', 'data-w="2" data-v="' + a + '"', AN(a), main(a))).join('') + '</div></div>' +
          '<div><h4>' + T('+1 to') + '</h4><div class="opts">' + B.abil.map(a => pill(c.bgPlus1 === a, 'setBgPlus', 'data-w="1" data-v="' + a + '"', AN(a), c.bgPlus2 === a ? T('already +2') : main(a), c.bgPlus2 === a)).join('') + '</div></div></div>';
      }
      const fk = B.feat;
      det = '<div class="detail"><h3>' + B.name + '</h3><p><b>' + T('Skills you get:') + '</b> ' + B.skills.map(t).join(', ') + ' ' + ib('skills') + '</p><p><b>' + T('Origin feat:') + '</b> ' + D.FEATS[fk].name + ' ' + ib(fk === 'magicinitiate' ? 'magicinitiate' : 'feat') + ' — ' + esc(D.FEATS[fk].desc) + '</p>' +
        '<h4>' + T('Raise your abilities') + ' ' + ib('bgbonus') + '</h4><div class="opts">' + modeBtns + '</div>' + pick + '</div>';
    }
    return '<h2>' + T('3. Choose a background') + ' ' + ib('background') + '</h2><p class="lead">' + T('What did you do before adventuring? It raises your ability scores, gives <b>2 skills</b> and a small special talent (<b>feat</b>).') + '</p><div class="cards">' + cards + '</div>' + nextBar(c, 'background') + det;
  }

  function bgBonusOf(c, a) {
    const B = D.BACKGROUNDS[c.backgroundKey]; if (!B || !B.abil.includes(a)) return 0;
    if (c.bgMode === '111') return 1; return c.bgPlus2 === a ? 2 : c.bgPlus1 === a ? 1 : 0;
  }
  function bAbilities(c) {
    const C = D.CLASSES[c.classKey]; const sc = E.abilityScores(c); const B = D.BACKGROUNDS[c.backgroundKey];
    const methods = U.PLAYER ? [['standard', T('Standard array')], ['pointbuy', T('Point buy')]] : [['standard', T('Standard array')], ['pointbuy', T('Point buy')], ['roll', T('Roll dice')], ['manual', T('Manual')]];
    const helpKey = { standard: 'standard', pointbuy: 'pointbuy', roll: 'rollstats', manual: 'abilities' };
    const tabs = methods.map(x => '<button class="tab' + (c.method === x[0] ? ' on' : '') + '" data-act="setMethod" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + ' ' + ib(helpKey[c.method]);
    let spent = 0; if (c.method === 'pointbuy') D.ABIL.forEach(a => { spent += D.POINT_COST[c.base[a]] || 0; });
    const owner = {}; if (c.method === 'standard') D.ABIL.forEach(a => { if (c.base[a] != null) owner[c.base[a]] = a; });
    const rows = D.ABIL.map(a => {
      let ctl = '';
      if (c.method === 'standard') {
        ctl = '<select data-on="setBase" data-a="' + a + '"><option value="">—</option>' + D.STANDARD.map(v => {
          const o = owner[v]; const other = o && o !== a;
          return '<option value="' + v + '"' + (c.base[a] === v ? ' selected' : '') + '>' + v + (other ? '  (' + T('swap with {0}', AN(o)) + ')' : '') + '</option>';
        }).join('') + '</select>';
      } else if (c.method === 'pointbuy') {
        const v = c.base[a] == null ? 8 : c.base[a];
        ctl = '<span class="pb"><button data-act="pbStep" data-a="' + a + '" data-d="-1"' + (v <= 8 ? ' disabled' : '') + '>−</button><b>' + v + '</b><button data-act="pbStep" data-a="' + a + '" data-d="1"' + (v >= 15 ? ' disabled' : '') + '>+</button></span>';
      } else if (c.method === 'roll') {
        ctl = '<select data-on="setRolled" data-a="' + a + '"><option value="">—</option>' + c.rolled.map((v, i) => '<option value="' + i + '"' + (String(c.rollAssign[a]) === String(i) ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>';
      } else {
        ctl = '<input type="number" min="1" max="20" data-on="setBaseNum" data-a="' + a + '" value="' + (c.base[a] == null ? '' : c.base[a]) + '">';
      }
      const bon = bgBonusOf(c, a);
      const isMain = C && C.primary.includes(a);
      return '<tr' + (isMain ? ' class="main"' : '') + '><td><b>' + AN(a) + '</b>' + (isMain ? ' <span class="tag">⭐ ' + T('main') + '</span>' : '') + '<small>' + D.ABIL_HELP[a] + '</small></td><td>' + ctl + '</td>' +
        '<td>' + (bon ? '<b class="ok">+' + bon + '</b> <small>' + esc(B.name) + '</small>' : '') + '</td><td><b>' + sc[a] + '</b></td><td class="mod">' + sign(E.modOf(sc[a])) + '</td></tr>';
    }).join('');
    let extra = '';
    if (c.method === 'pointbuy') extra = '<p class="pbleft">' + T('Points left:') + ' <b class="' + (D.POINT_TOTAL - spent < 0 ? 'fail' : '') + '">' + (D.POINT_TOTAL - spent) + '</b> / ' + D.POINT_TOTAL + ' <small>' + T('(8 = free … 13 = 5 points, 14 = 7, 15 = 9)') + '</small></p>';
    if (c.method === 'roll') extra = '<p><button data-act="rollStats">' + T('🎲 Roll 4d6, drop lowest ×6') + '</button> ' + (c.rolled.length ? T('Results: <b>{0}</b> — assign each one below.', c.rolled.join(', ')) : '') + '</p>';
    if (c.method === 'standard') extra = '<p class="hint">' + T('Give each number to one ability. Picking a number that is already used swaps the two.') + '</p>';
    const warnBg = !B ? '<p class="warn">' + T('Pick a background first (step 3) — it adds +3 points here.') + '</p>' : (c.bgMode === '21' && (!c.bgPlus2 || !c.bgPlus1)) ? '<p class="warn">' + T('Your background bonus is not finished — go back to step 3 and choose where the +2 and +1 go.') + '</p>' : '';
    return '<h2>' + T('4. Ability scores') + ' ' + ib('abilities') + '</h2><p class="lead">' + T('Six numbers for your body and mind. Put your <b>highest number</b> in your class\'s <b>⭐ main</b> ability. The <b>modifier</b> {0} is what you add to dice.', ib('modifier')) + '</p>' +
      warnBg + '<div class="tabs">' + tabs + '</div>' + extra +
      (C && (c.method === 'standard' || c.method === 'pointbuy') ? '<p><button data-act="autoAbil">' + T('✨ Do it for me (best for {0})', C.name) + '</button></p>' : '') +
      '<table class="abtable"><thead><tr><th>' + T('Ability') + '</th><th>' + T('Your number') + '</th><th>' + T('Background') + '</th><th>' + T('Total') + '</th><th>' + T('Modifier') + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function bSkills(c) {
    const C = D.CLASSES[c.classKey]; if (!C) return '<p>' + T('Choose a class first.') + '</p>';
    const d = E.compute(c); const sg = E.skillGroups(c); const all = E.profSkills(c);
    const prev = s => sign(d.mod[D.SKILLS[s]] + d.pb);
    let html = '<h2>' + T('5. Skills') + ' ' + ib('skills') + '</h2><p class="lead">' + T('What are you good at outside of fighting? When you try something risky, the DM asks for a skill roll: you roll a d20 and add your bonus. Trained skills add <b>+{0}</b>.', d.pb) + '<br><small>' + T('Tip: pick skills that use your high abilities — the number on the right shows your bonus if you pick it.') + '</small></p>';
    html += '<div class="detail"><h4>' + T('From your background (automatic)') + '</h4><div class="chips">' + (sg.fixed.length ? sg.fixed.map(s => '<span class="chip on" title="' + esc(D.SKILL_HELP[s]) + '">' + t(s) + ' ' + prev(s) + '</span>').join('') : '<i>' + T('choose a background') + '</i>') + '</div></div>';
    sg.groups.forEach(g => {
      const picked = c.picks[g.id] || [];
      const items = g.list.map(s => {
        const on = picked.includes(s);
        const elsewhere = !on && all.has(s);
        const dis = elsewhere || (!on && picked.length >= g.count);
        return pill(on, 'togglePick', 'data-g="' + g.id + '" data-v="' + esc(s) + '" data-max="' + g.count + '"', t(s) + ' <span class="prev">' + prev(s) + '</span>',
          esc(D.SKILL_HELP[s]) + ' <i>(' + AN(D.SKILLS[s]) + ')</i>' + (elsewhere ? ' · <b>' + T('you already have it') + '</b>' : ''), dis);
      }).join('');
      html += '<div class="detail"><h4>' + esc(g.label) + ' <span class="count">' + Math.min(picked.length, g.count) + '/' + g.count + '</span></h4><div class="opts">' + items + '</div></div>';
    });
    const ex = E.expertiseCount(c);
    if (ex) {
      const picked = c.picks.expertise || []; const list = (C.expertiseList || D.ALL_SKILLS).filter(s => all.has(s));
      html += '<div class="detail"><h4>' + T('Expertise') + ' ' + ib('expertise') + ' — ' + T('choose {0}', ex) + ' <span class="count">' + Math.min(picked.length, ex) + '/' + ex + '</span></h4><div class="opts">' +
        list.map(s => pill(picked.includes(s), 'togglePick', 'data-g="expertise" data-v="' + esc(s) + '" data-max="' + ex + '"', t(s), esc(D.SKILL_HELP[s]), !picked.includes(s) && picked.length >= ex)).join('') + '</div></div>';
    }
    return html;
  }

  function bFeatures(c) {
    const C = D.CLASSES[c.classKey]; if (!C) return '<p>' + T('Choose a class first.') + '</p>';
    let html = '<h2>' + T('6. Class options') + '</h2><p class="lead">' + T('Choices your class gives you at level {0}.', c.level) + '</p>'; let any = false;
    if (E.hasFightingStyle(c)) {
      any = true;
      html += '<div class="detail"><h4>' + T('Fighting Style') + ' ' + ib('fightingstyle') + '</h4><div class="opts">' + Object.keys(D.FIGHTING_STYLES).map(k => pill(c.opts.fightingStyle === k, 'setOpt', 'data-k="fightingStyle" data-v="' + k + '"', D.FIGHTING_STYLES[k].name, esc(D.FIGHTING_STYLES[k].desc))).join('') + '</div></div>';
    }
    if (C.orders) {
      any = true;
      html += '<div class="detail"><h4>' + (c.classKey === 'cleric' ? T('Divine Order — choose one') : T('Primal Order — choose one')) + '</h4><div class="opts">' + Object.keys(C.orders).map(k => pill(c.opts.order === k, 'setOpt', 'data-k="order" data-v="' + k + '"', C.orders[k].name, esc(C.orders[k].desc))).join('') + '</div></div>';
    }
    if (C.masteries) {
      any = true; const picked = c.picks.masteries || [];
      const kitW = new Set(); (C.kits || []).forEach(k => k.items.forEach(x => { if (x.w) kitW.add(x.w); }));
      const ws = Object.keys(D.WEAPONS).filter(k => E.weaponProf(c, D.WEAPONS[k]) && (c.classKey !== 'barbarian' || D.WEAPONS[k].range === 'melee'))
        .sort((a, b) => (kitW.has(b) ? 1 : 0) - (kitW.has(a) ? 1 : 0));
      html += '<div class="detail"><h4>' + T('Weapon Mastery') + ' ' + ib('mastery') + ' — ' + T('choose {0} weapons', C.masteries) + ' <span class="count">' + Math.min(picked.length, C.masteries) + '/' + C.masteries + '</span></h4><p class="hint">' + T('⭐ = weapons in your starting kit. Pick those.') + '</p><div class="opts">' +
        ws.map(k => { const w = D.WEAPONS[k]; return pill(picked.includes(k), 'togglePick', 'data-g="masteries" data-v="' + k + '" data-max="' + C.masteries + '"', (kitW.has(k) ? '⭐ ' : '') + w.name + ' · ' + t(w.mastery), esc(D.MASTERIES[w.mastery]), !picked.includes(k) && picked.length >= C.masteries); }).join('') + '</div></div>';
    }
    if (C.invocations) {
      any = true; const n = C.invocations[c.level - 1]; const picked = c.picks.invocations || [];
      html += '<div class="detail"><h4>' + T('Eldritch Invocations') + ' — ' + T('choose {0}', n) + ' <span class="count">' + Math.min(picked.length, n) + '/' + n + '</span></h4><div class="opts">' +
        Object.keys(D.INVOCATIONS).filter(k => D.INVOCATIONS[k].lvl <= c.level && (!D.INVOCATIONS[k].req || picked.includes(D.INVOCATIONS[k].req))).map(k => pill(picked.includes(k), 'togglePick', 'data-g="invocations" data-v="' + k + '" data-max="' + n + '"', D.INVOCATIONS[k].name, esc(D.INVOCATIONS[k].desc), !picked.includes(k) && picked.length >= n)).join('') + '</div></div>';
    }
    if (c.classKey === 'sorcerer' && c.level >= 2) {
      any = true; const picked = c.picks.metamagic || []; const mmN = D.METAMAGIC_COUNT(c.level);
      html += '<div class="detail"><h4>' + T('Metamagic') + ' — ' + T('choose {0}', mmN) + ' <span class="count">' + Math.min(picked.length, mmN) + '/' + mmN + '</span></h4><div class="opts">' +
        Object.keys(D.METAMAGIC).map(k => pill(picked.includes(k), 'togglePick', 'data-g="metamagic" data-v="' + k + '" data-max="' + mmN + '"', D.METAMAGIC[k].name, esc(D.METAMAGIC[k].desc), !picked.includes(k) && picked.length >= mmN)).join('') + '</div></div>';
    }
    if (c.level >= 3 && C.subclasses) {
      any = true; const sub = E.subclass(c);
      html += '<div class="detail"><h4>' + T('Subclass') + ' ' + ib('subclass') + '</h4><div class="opts">' + Object.keys(C.subclasses).filter(k => U.srcOk(C.subclasses[k]) || c.opts.subclass === k).map(k => { const s = C.subclasses[k]; return pill(c.opts.subclass === k, 'setOpt', 'data-k="subclass" data-v="' + k + '"', s.name, esc(s.desc) + '<br>' + s.features.slice().sort((a, b) => a.lvl - b.lvl).map(f => '• <small class="tag">' + T('lvl {0}', f.lvl) + '</small> <b>' + esc(f.name) + '</b> — ' + esc(f.desc)).join('<br>')); }).join('') + '</div>' +
        (sub && sub.extraSkills ? '<p class="warn">👉 ' + T('{0} gives {1} bonus skills — go back to the <b>Skills</b> step to pick them.', esc(sub.name), sub.extraSkills) + '</p>' : '') + '</div>';
      // Circle of the Land: which land
      if (sub && c.classKey === 'druid' && c.opts.subclass === 'land' && D.LANDS) {
        html += '<div class="detail"><h4>' + T('Your land') + '</h4><div class="opts">' + Object.keys(D.LANDS).map(k => { const L = D.LANDS[k]; return pill(c.opts.land === k, 'setOpt', 'data-k="land" data-v="' + k + '"', L.name, esc(L.desc) + '<br>' + Object.keys(L.spellsAt).map(l => T('lvl {0}', l) + ': ' + L.spellsAt[l].map(U.spName).join(', ')).join('<br>')); }).join('') + '</div></div>';
      }
      // Battle Master: maneuvers
      if (sub && c.classKey === 'fighter' && c.opts.subclass === 'battlemaster' && D.MANEUVERS) {
        const n = D.MANEUVERS_COUNT(c.level); const picked = c.picks.maneuvers || [];
        html += '<div class="detail"><h4>' + T('Maneuvers') + ' — ' + T('choose {0}', n) + ' <span class="count">' + Math.min(picked.length, n) + '/' + n + '</span></h4><div class="opts">' +
          Object.keys(D.MANEUVERS).map(k => pill(picked.includes(k), 'togglePick', 'data-g="maneuvers" data-v="' + k + '" data-max="' + n + '"', D.MANEUVERS[k].name, esc(D.MANEUVERS[k].desc), !picked.includes(k) && picked.length >= n)).join('') + '</div></div>';
      }
    }
    const asi = U.asiSection ? U.asiSection(c) : ''; if (asi) { any = true; html += asi; }
    if (!any) html += '<div class="detail"><p>' + T('Nothing to choose for a level {0} {1} — everything is automatic. 👍', c.level, C.name) + '</p></div>';
    const fl = E.allFeatures(c).filter(f => !f.custom);
    html += '<details class="detail passive"><summary><b>' + T('Your powers right now') + ' (' + fl.length + ')</b> <small>' + T('already given — nothing to choose here') + '</small></summary><ul class="flist">' + fl.map(f => '<li><b>' + esc(f.name) + '</b> <small>' + esc(f.src) + '</small><br>' + esc(f.desc) + '</li>').join('') + '</ul></details>';
    return html;
  }

  // ---------- spells ----------
  function knownSpells(c, except) {
    const d = E.compute(c); const out = d.casting.list.map(e => e.sp.n);
    ['cantrips', 'prepared', 'miCantrips', 'miSpell'].forEach(g => { if (g !== except) (c.picks[g] || []).forEach(n => out.push(n)); });
    (except ? (c.picks[except] || []) : []).forEach(n => { const i = out.indexOf(n); if (i >= 0) out.splice(i, 1); });
    return out;
  }
  U.spellWhat = sp => (sp.a === 'atk' ? '⚔️ ' + T('attack') : sp.a === 'save' ? '🛡️ ' + T('enemy saves') : sp.a === 'heal' ? '❤️ ' + T('heals') : sp.a === 'auto' ? '🎯 ' + T('always hits') : sp.a === 'dmg' ? '➕ ' + T('extra damage') : sp.a === 'temp' ? '🛡️ ' + T('temp HP') : '✨ ' + T('utility'));
  function spellPick(c, sp, group, max, picked, taken, rec) {
    const on = picked.includes(sp.n);
    const known = !on && taken && taken.includes(sp.n);
    const star = rec && rec.includes(sp.n);
    const meta = U.spellWhat(sp) + (sp.d ? ' · ' + sp.d + ' ' + t(sp.dt || '') : '') + ' · ' + sp.t + ' · ' + T('range {0}', sp.r) + (sp.conc ? ' · ' + T('needs concentration') : '');
    return pill(on, 'togglePick', 'data-g="' + group + '" data-v="' + esc(sp.n) + '" data-max="' + max + '"', (star ? '⭐ ' : '') + esc(sp.name), esc(sp.desc) + '<br><i>' + esc(meta) + '</i>' + (known ? ' · <b>' + T('already known') + '</b>' : ''), known || (!on && picked.length >= max));
  }
  const recSort = rec => (a, b) => (rec.includes(b.n) ? 1 : 0) - (rec.includes(a.n) ? 1 : 0) || a.l - b.l || a.name.localeCompare(b.name);
  function bSpells(c) {
    const d = E.compute(c); const ci = d.casting; let html = '<h2>' + T('7. Spells') + ' ' + ib('spells') + '</h2>';
    const R = D.RECOMMENDED_SPELLS[ci.listKey || c.classKey] || { cantrips: [], spells: [] };
    if (ci.ability) {
      html += '<div class="explain"><b>' + T('How your magic works:') + '</b> ' +
        (ci.cantripsN ? T('<b>Cantrips</b> {0} are free — cast them as often as you like.', ib('cantrip')) + ' ' : '') +
        T('Bigger spells use a <b>spell slot</b> {0} — you have <b>{1}</b>.', ib('slots'), ci.pact ? T('{0} (back after a Short Rest)', ci.pact.count) : T('{0} (back after a Long Rest)', ci.slots.reduce((a, b) => a + b, 0))) + ' ' +
        T('Your class knows a whole list of spells; you choose <b>{0}</b> to have ready {1} and can swap them after a Long Rest.', ci.preparedN, ib('prepared')) + '<br>' +
        T('Your magic uses <b>{0}</b>: spell attack <b>{1}</b> {2}, enemies save against DC <b>{3}</b> {4}.', AN(ci.ability), sign(ci.atk), ib('spellatk'), ci.dc, ib('spelldc')) +
        '<div class="btnrow" style="margin-top:8px"><button class="primary" data-act="recSpells">' + T('⭐ Pick good spells for me') + '</button><small>' + T('⭐ = recommended for new players') + '</small></div></div>';
      const always = ci.list.filter(e => e.always).map(e => e.sp.n);
      if (always.length) html += '<div class="detail"><h4>' + T('You always have these (free)') + '</h4><div class="chips">' + always.map(n => '<span class="chip on">' + esc(U.spName(n)) + '</span>').join('') + '</div></div>';
      if (ci.cantripsN) {
        const picked = c.picks.cantrips || [];
        html += '<div class="detail"><h4>' + T('Cantrips') + ' ' + ib('cantrip') + ' — ' + T('choose {0}', ci.cantripsN) + ' <span class="count">' + Math.min(picked.length, ci.cantripsN) + '/' + ci.cantripsN + '</span></h4><div class="opts spells">' +
          D.SPELLS.filter(s => s.l === 0 && s.c.includes(ci.listKey || c.classKey) && (U.srcOk(s) || (c.picks.cantrips || []).includes(s.n))).sort(recSort(R.cantrips)).map(s => spellPick(c, s, 'cantrips', ci.cantripsN, picked, knownSpells(c, 'cantrips'), R.cantrips)).join('') + '</div></div>';
      }
      const picked = c.picks.prepared || [];
      html += '<div class="detail"><h4>' + T('Prepared spells') + ' ' + ib('prepared') + ' — ' + T('choose {0}', ci.preparedN) + ' <span class="count">' + Math.min(picked.length, ci.preparedN) + '/' + ci.preparedN + '</span></h4>' +
        '<p class="hint">' + T('These are all {0} spells you could know. You only pick {1}.', d.C.name, ci.preparedN) + '</p><div class="opts spells">' +
        D.SPELLS.filter(s => s.l >= 1 && s.l <= ci.maxLevel && s.c.includes(ci.listKey || c.classKey) && !always.includes(s.n) && (U.srcOk(s) || (c.picks.prepared || []).includes(s.n))).sort(recSort(R.spells)).map(s => spellPick(c, s, 'prepared', ci.preparedN, picked, knownSpells(c, 'prepared'), R.spells)).join('') + '</div></div>';
    }
    if (d.featKeys.includes('magicinitiate')) {
      const ml = E.miList(c); const list = D.MI_LISTS[ml]; const MR = D.RECOMMENDED_SPELLS['mi_' + ml] || { cantrips: [], spells: [] };
      const pc = c.picks.miCantrips || [], ps = c.picks.miSpell || [];
      html += '<div class="detail"><h3>' + T('Bonus magic from your background: Magic Initiate ({0})', list.name) + ' ' + ib('magicinitiate') + '</h3>' +
        '<p class="hint">' + T('Extra spells on top of your class.') + ' ' + (ci.ability ? '' : T('Even non-magic classes get these!')) + '</p>' +
        (ci.ability ? '' : '<p><button class="primary" data-act="recSpells">' + T('⭐ Pick good spells for me') + '</button></p>') +
        '<h4>' + T('Which ability powers it?') + '</h4><div class="opts">' +
        ['INT', 'WIS', 'CHA'].map(a => pill((c.opts.miAbility || list.ability) === a, 'setOpt', 'data-k="miAbility" data-v="' + a + '"', AN(a) + ' ' + sign(d.mod[a]), a === E.bestMental(d) ? T('your best of the three') : '')).join('') + '</div>' +
        '<h4>' + T('2 cantrips') + ' <span class="count">' + Math.min(pc.length, 2) + '/2</span></h4><div class="opts spells">' + D.SPELLS.filter(s => s.l === 0 && s.c.includes(ml)).sort(recSort(MR.cantrips)).map(s => spellPick(c, s, 'miCantrips', 2, pc, knownSpells(c, 'miCantrips'), MR.cantrips)).join('') + '</div>' +
        '<h4>' + T('1 level 1 spell (once per Long Rest for free)') + ' <span class="count">' + Math.min(ps.length, 1) + '/1</span></h4><div class="opts spells">' + D.SPELLS.filter(s => s.l === 1 && s.c.includes(ml)).sort(recSort(MR.spells)).map(s => spellPick(c, s, 'miSpell', 1, ps, knownSpells(c, 'miSpell'), MR.spells)).join('') + '</div></div>';
    }
    return html;
  }

  // ---------- equipment ----------
  function kitItems(k) {
    return k.items.map(x => x.w ? D.WEAPONS[x.w].name + (x.qty > 1 ? ' ×' + x.qty : '') : x.a ? D.ARMOR[x.a].name : t(x.g)).join(', ') + ', ' + T('{0} GP', k.gold);
  }
  function bEquipment(c) {
    const C = D.CLASSES[c.classKey]; if (!C) return '<p>' + T('Choose a class first.') + '</p>';
    const kits = C.kits.map((k, i) => pill(c.kit === i && c.inventory.length > 0, 'takeKit', 'data-i="' + i + '"', '🎒 ' + esc(k.name), esc(kitItems(k)))).join('') +
      (C.goldOption ? pill(c.kit === 'gold', 'takeGold', '', '💰 ' + T('Only gold: {0} GP', C.goldOption), T('No items. You buy your gear in a shop with the DM.') + ' ' + ib('goldoption')) : '');
    let html = '<h2>' + T('8. Equipment') + ' ' + ib('equipment') + '</h2><p class="lead">' + T('Choose <b>one</b> option. New players: take the kit — it has the right armor and weapons for your class. Better gear comes during the adventure!') + '</p>' +
      '<div class="detail"><h4>' + T('Choose one') + ' ' + ib('kit') + '</h4><div class="opts">' + kits + '</div></div>';
    if (c.inventory.length) html += '<div class="detail"><h4>' + T('Your items') + '</h4><p class="hint">' + T('✔ = you wear or hold it right now (armor counts for AC only when ticked). It does not add items.') + ' ' + ib('equipped') + '</p>' + U.invRows(c, U.DM ? 'builder' : 'view') + (U.DM ? U.addItemControls() : '') + '</div>';
    if (c.inventory.length || c.kit === 'gold') html += '<div class="detail">' + (U.DM ? '<p><label class="inl">' + T('Gold (GP)') + ' <input type="number" data-on="bindNum" data-path="gold" value="' + (c.gold || 0) + '"></label></p>' : '<p>' + T('Gold:') + ' <b>' + T('{0} GP', c.gold || 0) + '</b> ' + ib('gold') + '</p>') + '</div>';
    if (U.DM) html += '<p class="hint">' + T('DM version: you can also add any item, armor or magic item above.') + '</p>';
    else html += '<p class="hint">' + T('Other items come from your DM during the game.') + '</p>';
    return html;
  }

  function bDetails(c) {
    const ta = (k, label, ph) => '<label class="blk">' + label + '<textarea data-on="bind" data-path="details.' + k + '" placeholder="' + esc(ph) + '">' + esc(c.details[k] || '') + '</textarea></label>';
    return '<h2>' + T('9. Name & story') + '</h2><p class="lead">' + T('Give your hero a name and three short lines. That\'s enough to start roleplaying!') + '</p>' +
      '<div class="detail row2"><div>' +
      '<label class="blk">' + T('Character name') + '<input data-on="bind" data-path="name" value="' + esc(c.name) + '" placeholder="' + esc(T('e.g. Bran Ashford')) + '"></label>' +
      '<label class="blk">' + T('Portrait (any picture — e.g. made in ChatGPT)') + '</label><div class="portraitrow">' + U.portrait(c, E.compute(c), 'md') + '<div><button data-act="pickPortrait">' + T('Upload picture…') + '</button>' + (c.portrait ? ' <button class="danger" data-act="clearPortrait">' + T('Remove') + '</button>' : '') + '</div></div>' +
      '</div><div>' + ta('who', T('Who are you, in one sentence?'), T('An ex-soldier who…')) + ta('want', T('What do you want?'), T('Revenge, gold, to find my sister…')) + ta('flaw', T('Flaw or fear'), T('Charges in first, thinks later')) + ta('secret', T('A secret (only the DM will know)'), '') + '</div></div>' +
      '<div class="detail">' + ta('appearance', T('What do you look like?'), T('Tall, scar over the left eye…')) + ta('backstory', T('Backstory (optional)'), '') + '</div>';
  }

  // ======================================================================
  //  HELP PAGE
  // ======================================================================
  const sec = (h, p) => '<div class="detail"><h3>' + T(h) + '</h3><p>' + T(p) + '</p></div>';
  U.views.help = function () {
    if (U.PLAYER) return '<div class="page help"><h1>' + T('How to use (player)') + '</h1>' +
      sec('1. Make your character', '<b>＋ New character</b> and follow the 9 steps. Every ⓘ button explains a word. ⭐ marks good choices for new players.') +
      sec('2. Send it to your DM', 'Click <b>📤 Send to DM</b> — a small file downloads. Send it on Discord.') +
      sec('3. During the game', 'Open your sheet. When the DM says "roll Perception", click <b>Perception</b>. When you attack, click <b>Roll</b> next to your weapon and say the numbers out loud. If the DM says you take damage, type it in the HP box and press <b>Damage</b>. The <b>⚡ Right now</b> box shows how many spell slots and uses you have left.') +
      sec('4. Updates from the DM', 'After a level up or new loot the DM sends you a file: click <b>📥 Import file from DM</b>. Your character updates.') +
      sec('Saving', 'Everything saves automatically in this browser on this computer. Keep the file you sent to the DM as a backup.') +
      sec('Language', 'EN / RU at the top switches the language. Your character stays the same.') + '</div>';
    return '<div class="page help"><h1>' + T('How to use (DM)') + '</h1>' +
      sec('Two versions', '<b>DnD_Game_DM.html</b> = your DM version (full control). <b>DnD_Game_PLAYERS.html</b> = the simple player version — send it on Discord.') +
      sec('🎲 Games', 'A game = one campaign (one group, one story, many evenings). Each game has its own characters, monsters, prepared fights and current fight. Switch, create, rename, copy or delete games with the <b>🎲</b> button at the top.') +
      sec('Characters', 'Players send you their file → <b>Import file(s)</b>. Change anything (Edit build, level, items, Gravemaw…). Then <b>📤 Export for player</b> and send it back; their copy becomes "managed by DM".') +
      sec('Combat', '<b>👹 Monsters</b>: start from a ready monster or a blank one, pick a Challenge Rating and click Balance. <b>📋 Prepared fights</b>: plan fights before the session — the app shows how hard each fight is for your party. <b>⚔️ Fight</b>: start, pick targets, click actions — every button shows the chance to hit and the average damage, and the log explains each roll.') +
      sec('Saving', 'Every click is saved automatically in this browser. <b>💾 Save file</b> downloads the whole game (characters, monsters, prepared fights, current fight) as one <code>.game.json</code> file — keep it in <code>Campaigns/&lt;game name&gt;/</code>. <b>📥 Load game from file</b> on the 🎲 Games page brings it back.') +
      sec('Language', 'EN / RU at the top switches the language. Characters and saves stay the same.') + '</div>';
  };

  // ======================================================================
  //  ACTIONS
  // ======================================================================
  function defaultBgPlus(c, B) {
    const C = D.CLASSES[c.classKey]; const order = C ? C.order : D.ABIL;
    const ranked = B.abil.slice().sort((a, b) => order.indexOf(a) - order.indexOf(b));
    c.bgPlus2 = ranked[0]; c.bgPlus1 = ranked[1];
  }
  function pickRecommended(c) {
    const d = E.compute(c); const ci = d.casting; const R = D.RECOMMENDED_SPELLS[ci.listKey || c.classKey] || { cantrips: [], spells: [] };
    const fill = (group, n, pool, rec) => {
      const taken = knownSpells(c, group); const arr = [];
      rec.concat(pool.map(s => s.n)).forEach(name => { if (arr.length < n && !arr.includes(name) && !taken.includes(name) && pool.some(s => s.n === name)) arr.push(name); });
      c.picks[group] = arr;
    };
    if (ci.ability) {
      if (ci.cantripsN) fill('cantrips', ci.cantripsN, D.SPELLS.filter(s => s.l === 0 && s.c.includes(ci.listKey || c.classKey)), R.cantrips);
      const always = ci.list.filter(e => e.always).map(e => e.sp.n);
      fill('prepared', ci.preparedN, D.SPELLS.filter(s => s.l >= 1 && s.l <= ci.maxLevel && s.c.includes(ci.listKey || c.classKey) && !always.includes(s.n)), R.spells);
    }
    if (d.featKeys.includes('magicinitiate')) {
      const ml = E.miList(c); const MR = D.RECOMMENDED_SPELLS['mi_' + ml] || { cantrips: [], spells: [] };
      fill('miCantrips', 2, D.SPELLS.filter(s => s.l === 0 && s.c.includes(ml)), MR.cantrips);
      fill('miSpell', 1, D.SPELLS.filter(s => s.l === 1 && s.c.includes(ml)), MR.spells);
    }
  }

  Object.assign(U.ACT, {
    newChar: () => { const c = E.newChar(); S.chars.push(c); S.charId = c.id; S.step = 0; U.saveChars(); U.go('builder'); },
    loadSample: () => {
      D.SAMPLE_CHARACTERS.forEach(s => { const c = E.normalize(E.clone(s)); c.id = E.uid(); S.chars.push(c); });
      U.saveChars(); U.render(); U.toast(T('Bran added — open his sheet!'));
    },
    openSheet: ds => { const c = U.byId(ds.id); if (c && c.lvlUp && S.view === 'builder') { U.go('levelup', ds.id); return; } U.go('sheet', ds.id); },
    openBuilder: ds => { S.step = 0; U.go('builder', ds.id); },
    toggleParty: ds => { const c = U.byId(ds.id); c.party = !c.party; U.commit(); },
    dupChar: ds => { const c = E.clone(U.byId(ds.id)); c.id = E.uid(); c.name = (c.name || T('Hero')) + ' ' + T('(copy)'); S.chars.push(c); U.commit(); },
    delChar: ds => {
      const c = U.byId(ds.id); if (!confirm(T('Delete {0}? This cannot be undone (export first if you want a backup).', c.name || T('this character')))) return;
      S.chars = S.chars.filter(x => x.id !== ds.id); S.combat.list = S.combat.list.filter(x => x.charId !== ds.id); U.saveCombat(); U.commit();
    },
    exportChar: ds => {
      const c = E.clone(U.byId(ds.id));
      if (U.DM) c.dmLocked = true; // the player's copy becomes "managed by DM"
      U.download(U.fileName(c.name || 'character') + '.json', c);
      U.toast(U.DM ? T('Downloaded. Send this file to the player — they click “Import file from DM”.') : T('Downloaded. Send this file to your DM on Discord.'));
    },
    backup: () => { if (U.game) U.ACT.gameSave({ id: U.game.id }); },
    importChar: () => document.getElementById('importFile').click(),
    pickPortrait: () => document.getElementById('portraitFile').click(),
    clearPortrait: () => { U.cur().portrait = ''; U.commit(); },
    step: ds => { S.step = Number(ds.i); U.render(); window.scrollTo(0, 0); },

    setClass: ds => {
      const c = U.cur(); if (c.classKey === ds.k) return;
      c.classKey = ds.k; ['class', 'classx', 'expertise', 'masteries', 'cantrips', 'prepared', 'invocations', 'metamagic'].forEach(k => delete c.picks[k]);
      ['fightingStyle', 'order', 'subclass'].forEach(k => delete c.opts[k]);
      c.inventory = []; delete c.kit; c.gold = 0;
      const B = D.BACKGROUNDS[c.backgroundKey]; if (B) defaultBgPlus(c, B);
      U.commit(); U.toPickbar();
    },
    setSpecies: ds => { const c = U.cur(); if (c.speciesKey === ds.k) return; c.speciesKey = ds.k; c.speciesOpt = ''; delete c.picks.species; if (ds.k !== 'human') delete c.opts.humanFeat; c.inspiration = ds.k === 'human'; U.commit(); U.toPickbar(); },
    setSpOpt: ds => { U.cur().speciesOpt = ds.k; U.commit(); },
    setBg: ds => { const c = U.cur(); c.backgroundKey = ds.k; defaultBgPlus(c, D.BACKGROUNDS[ds.k]); Object.keys(c.picks).filter(k => k.indexOf('skilled') === 0).forEach(k => delete c.picks[k]); delete c.picks.miCantrips; delete c.picks.miSpell; U.commit(); U.toPickbar(); },
    setBgMode: ds => { U.cur().bgMode = ds.v; U.commit(); },
    setBgPlus: ds => {
      const c = U.cur();
      if (ds.w === '2') { if (c.bgPlus1 === ds.v) c.bgPlus1 = c.bgPlus2; c.bgPlus2 = ds.v; } // swap instead of clearing
      else if (ds.v !== c.bgPlus2) c.bgPlus1 = ds.v;
      U.commit();
    },
    setOpt: ds => { const c = U.cur(); c.opts[ds.k] = ds.v; if (ds.k === 'humanFeat') { Object.keys(c.picks).filter(k => k.indexOf('skilled') === 0).forEach(k => delete c.picks[k]); delete c.picks.miCantrips; delete c.picks.miSpell; } U.commit(); },
    togglePick: ds => {
      const c = U.cur(); const arr = c.picks[ds.g] = c.picks[ds.g] || []; const i = arr.indexOf(ds.v);
      if (i >= 0) arr.splice(i, 1); else if (arr.length < Number(ds.max)) arr.push(ds.v);
      U.commit();
    },
    recSpells: () => { pickRecommended(U.cur()); U.commit(); U.toast(T('⭐ Recommended spells picked. You can still change them.')); },
    setMethod: ds => {
      const c = U.cur(); if (c.method === ds.v) return; c.method = ds.v;
      if (ds.v === 'pointbuy') D.ABIL.forEach(a => { c.base[a] = 8; });
      else if (ds.v === 'standard' || ds.v === 'roll') { D.ABIL.forEach(a => { c.base[a] = null; }); c.rollAssign = {}; }
      U.commit();
    },
    pbStep: ds => {
      const c = U.cur(); const v = (c.base[ds.a] == null ? 8 : c.base[ds.a]) + Number(ds.d); if (v < 8 || v > 15) return;
      let spent = 0; D.ABIL.forEach(a => { spent += D.POINT_COST[a === ds.a ? v : (c.base[a] == null ? 8 : c.base[a])] || 0; });
      if (spent > D.POINT_TOTAL) { U.toast(T('Not enough points.')); return; }
      c.base[ds.a] = v; U.commit();
    },
    autoAbil: () => {
      const c = U.cur(); const C = D.CLASSES[c.classKey]; if (!C) return;
      if (c.method === 'pointbuy') { const vals = [15, 15, 15, 8, 8, 8]; C.order.forEach((a, i) => { c.base[a] = vals[i]; }); }
      else C.order.forEach((a, i) => { c.base[a] = D.STANDARD[i]; });
      U.commit();
    },
    rollStats: () => {
      const c = U.cur(); c.rolled = []; for (let i = 0; i < 6; i++) { const r = [1, 2, 3, 4].map(() => E.rollDie(6)).sort((a, b) => b - a); c.rolled.push(r[0] + r[1] + r[2]); }
      c.rollAssign = {}; D.ABIL.forEach(a => { c.base[a] = null; });
      U.logAdd(c.name || T('New hero'), [T('Ability rolls: <b>{0}</b>', c.rolled.join(', '))]); U.commit();
    },
    takeKit: ds => {
      const c = U.cur(); const k = D.CLASSES[c.classKey].kits[Number(ds.i)];
      if (U.DM && c.inventory.length && c.kit !== Number(ds.i) && !confirm(T('Replace the current items with this kit?'))) return;
      // names are stored in English (they follow the language on screen)
      c.inventory = k.items.map(x => {
        if (x.w) return { id: E.uid(), name: D.WEAPONS[x.w].en, weapon: x.w, qty: x.qty || 1, equipped: !!x.eq, desc: '', effects: [] };
        if (x.a) return { id: E.uid(), name: D.ARMOR[x.a].en, armor: x.a, qty: 1, equipped: !!x.eq, effects: [] };
        return { id: E.uid(), name: x.g, qty: x.qty || 1, effects: [] };
      });
      c.kit = Number(ds.i); c.gold = k.gold; U.commit();
    },
    takeGold: () => {
      const c = U.cur(); const C = D.CLASSES[c.classKey];
      if (c.inventory.length && !confirm(T('Remove the kit items and take only gold?'))) return;
      c.inventory = []; c.kit = 'gold'; c.gold = C.goldOption; U.commit();
    }
  });

  Object.assign(U.ON, {
    bsrc: el => { S.bsrc = el.value; U.render(); },
    setBase: el => { // standard array: picking a used number swaps the two abilities
      const c = U.cur(); const a = el.dataset.a; const v = el.value === '' ? null : Number(el.value);
      if (v != null) { const other = D.ABIL.find(b => b !== a && c.base[b] === v); if (other) c.base[other] = c.base[a] == null ? null : c.base[a]; }
      c.base[a] = v; U.commit();
    },
    setBaseNum: el => { U.cur().base[el.dataset.a] = el.value === '' ? null : Math.max(1, Math.min(20, Number(el.value))); U.commit(); },
    setRolled: el => {
      const c = U.cur(); const a = el.dataset.a;
      if (el.value === '') { delete c.rollAssign[a]; c.base[a] = null; }
      else { Object.keys(c.rollAssign).forEach(k => { if (k !== a && String(c.rollAssign[k]) === el.value) { delete c.rollAssign[k]; c.base[k] = null; } }); c.rollAssign[a] = Number(el.value); c.base[a] = c.rolled[Number(el.value)]; }
      U.commit();
    }
  });

  // ---------- file inputs ----------
  function importObj(obj, fileName) {
    if (obj && obj.app === 'dnd-table' && U.IMPORT && U.IMPORT[obj.kind]) { U.IMPORT[obj.kind](obj, fileName); return; }
    if (obj && obj.app === 'dnd-table' && obj.kind === 'game') {
      if (U.PLAYER) { U.toast(T('⚠️ That is the DM\'s game file, not a character.')); return; }
      U.loadGameFile(obj, fileName); return;
    }
    if (obj && obj.app === 'dnd-table' && obj.kind === 'backup') {
      if (U.PLAYER) { U.toast(T('⚠️ That is a DM backup file, not a character.')); return; }
      const merge = (arr, items) => (items || []).forEach(x => { const i = arr.findIndex(y => y.id === x.id); if (i >= 0) arr[i] = x; else arr.push(x); });
      merge(S.chars, (obj.chars || []).map(E.normalize)); merge(S.monsters, obj.monsters); merge(S.encounters, obj.encounters);
      U.saveChars(); U.saveMonsters(); U.saveEncounters(); U.render(); U.toast(T('Backup restored: {0} characters, {1} monsters, {2} fights.', (obj.chars || []).length, (obj.monsters || []).length, (obj.encounters || []).length));
      return;
    }
    if (!obj || typeof obj !== 'object' || (!obj.classKey && !obj.name)) throw new Error('bad');
    const c = E.normalize(obj);
    const i = S.chars.findIndex(x => x.id === c.id);
    if (i >= 0 && U.DM) {
      const old = S.chars[i]; const diff = [];
      if (old.level !== c.level) diff.push(T('level {0} → {1}', old.level, c.level));
      if ((Number(old.xp) || 0) !== (Number(c.xp) || 0)) diff.push(T('XP {0} → {1}', Number(old.xp) || 0, Number(c.xp) || 0));
      if (!confirm(T('Replace your copy of {0} with this file?', c.name || T('character')) + (diff.length ? '\n' + diff.join(', ') : ''))) return;
    }
    if (i >= 0) { if (U.DM) c.party = S.chars[i].party; S.chars[i] = c; } else S.chars.push(c);
    U.saveChars(); U.render(); U.toast(T(i >= 0 ? 'Updated {0}.' : 'Imported {0}.', esc(c.name || T('character'))));
  }
  document.getElementById('importFile').addEventListener('change', e => {
    Array.from(e.target.files || []).forEach(file => {
      const rd = new FileReader();
      rd.onload = () => { try { importObj(JSON.parse(rd.result), file.name); } catch (err) { U.toast(T('⚠️ {0} is not a character or backup file.', esc(file.name))); } };
      rd.readAsText(file);
    });
    e.target.value = '';
  });
  document.getElementById('portraitFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 320; const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
        const s = Math.min(img.width, img.height); const ctx = cv.getContext('2d');
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
        U.cur().portrait = cv.toDataURL('image/jpeg', 0.85); U.commit();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file); e.target.value = '';
  });
})(window.UI);
