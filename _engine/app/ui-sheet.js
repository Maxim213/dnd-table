// Character sheet. DM version = everything editable. Player version = roll, track HP/uses, read explanations.
(function (U) {
  'use strict';
  const D = U.D, E = U.E, esc = U.esc, sign = U.sign, S = U.S, ib = U.ib, opt = U.opt, T = U.T, t = D.t;
  const AB = a => D.AB[a] || a;

  function fxText(x) {
    const s = x.type === 'damageMult' ? T('damage') + ' ×' + x.value : x.type === 'ability' ? AB(x.ability || '?') + ' ' + sign(Number(x.value) || 0) : (D.EFFECT_TYPES[x.type] || x.type).replace(/ \+.*$/, '').replace(/ \((ft|фт)\)/, '') + ' ' + sign(Number(x.value) || 0);
    return s + (x.scope && x.scope !== 'all' ? ' (' + (D.EFFECT_SCOPES[x.scope] || x.scope) + ')' : '');
  }
  U.fxText = fxText;
  const resetTxt = r => (r === 'short' ? T('per Short Rest') : r === 'short1' ? T('(+1 on Short Rest)') : T('per Long Rest'));
  const backTxt = r => (r === 'short' ? T('all back on a Short Rest') : r === 'short1' ? T('1 back on a Short Rest, all on a Long Rest') : T('back on a Long Rest'));

  // ---------- inventory table. mode: 'dm' | 'builder' | 'view' ----------
  U.invRows = function (c, mode) {
    if (!c.inventory.length) return '<p class="hint">' + T('No items yet.') + '</p>';
    const full = mode === 'dm';
    return '<table class="inv"><thead><tr><th title="' + esc(T('Equipped = worn / in hand')) + '">✔ ' + ib('equipped') + '</th><th>' + T('Item') + '</th><th>' + T('Details') + '</th><th>' + T('Qty') + '</th>' + (full ? '<th>' + T('Attuned') + ' ' + ib('attunement') + '</th>' : '') + (mode !== 'view' ? '<th></th>' : '') + '</tr></thead><tbody>' +
      c.inventory.map(it => {
        const w = D.WEAPONS[it.weapon], A = D.ARMOR[it.armor];
        const idesc = E.itemDesc(it); let info = idesc ? esc(idesc) : '';
        if (w) info = w.dmg + ' ' + t(w.type) + (it.magicBonus ? ' · +' + it.magicBonus : '') + ' · ' + w.props.map(D.tProp).join(', ') + (!E.weaponProf(c, w) ? ' · <span class="fail">' + T('not trained') + '</span>' : '') + (info ? '<br>' + info : '');
        if (A) info = (A.type === 'shield' ? T('+2 AC') : T('AC') + ' ' + A.base + (A.dexMax === null ? ' + ' + AB('DEX') : A.dexMax ? ' + ' + AB('DEX') + ' ' + T('(max 2)') : '')) + ' · ' + t(A.type) + (A.stealthDis ? ' · ' + T('noisy (Stealth disadv.)') : '') + (it.magicBonus ? ' · +' + it.magicBonus : '') + (!E.armorProf(c, A) && A.type !== 'shield' ? ' · <span class="fail">' + T('not trained') + '</span>' : '') + (idesc ? '<br>' + esc(idesc) : '');
        if (it.effects && it.effects.length) info += '<br><span class="fx">✨ ' + it.effects.map(fxText).join(', ') + (it.requiresAttunement ? (it.attuned ? ' ' + T('(attuned ✓)') : ' ' + T('(needs attunement)')) : '') + '</span>';
        const editing = S.editing['it:' + it.id];
        let row = '<tr class="' + (it.equipped ? 'eq' : '') + '"><td><input type="checkbox" data-on="itEquip" data-id="' + it.id + '"' + (it.equipped ? ' checked' : '') + ' title="' + esc(T('Equipped = worn / in hand')) + '"></td>' +
          '<td><b>' + esc(E.itemName(it)) + '</b>' + (it.tier || it.rarity || it.magicBonus ? ' ' + (U.tierBadge ? U.tierBadge(it) : '') : '') + (it.roll && mode !== 'builder' ? ' <button class="mini primary" data-act="act" data-id="it:' + it.id + '">' + (it.heal ? '❤️ ' + T('Use') : T('Use')) + '</button>' : '') + '</td><td class="small">' + info + '</td>' +
          '<td>' + (mode === 'view' ? (it.qty == null ? 1 : it.qty) : '<input type="number" class="qty" min="0" data-on="itQty" data-id="' + it.id + '" value="' + (it.qty == null ? 1 : it.qty) + '">') + '</td>';
        if (full) row += '<td>' + (it.requiresAttunement ? '<input type="checkbox" data-on="itAttune" data-id="' + it.id + '"' + (it.attuned ? ' checked' : '') + '>' : '') + '</td>' +
          '<td class="nowrap"><button class="mini" data-act="itEdit" data-id="' + it.id + '">' + (editing ? T('Done') : T('✎ Edit')) + '</button> <button class="mini danger" data-act="itDel" data-id="' + it.id + '">✕</button></td></tr>';
        else if (mode === 'builder') row += '<td><button class="mini danger" data-act="itDel" data-id="' + it.id + '">✕</button></td></tr>';
        else row += '</tr>';
        if (full && editing) row += '<tr class="editrow"><td colspan="6">' + itemEditor(it) + '</td></tr>';
        return row;
      }).join('') + '</tbody></table>';
  };
  U.addItemControls = function () {
    return '<div class="addrow">' +
      '<select data-on="addWeapon"><option value="">' + T('＋ Weapon…') + '</option>' + Object.keys(D.WEAPONS).map(k => opt(k, D.WEAPONS[k].name + ' (' + D.WEAPONS[k].dmg + ', ' + t(D.WEAPONS[k].cat) + ')', '')).join('') + '</select>' +
      '<select data-on="addArmor"><option value="">' + T('＋ Armor…') + '</option>' + Object.keys(D.ARMOR).map(k => opt(k, D.ARMOR[k].name + ' (' + t(D.ARMOR[k].type) + ')', '')).join('') + '</select>' +
      '<select data-on="addGear"><option value="">' + T('＋ Gear…') + '</option>' + D.GEAR.map(g => opt(g, t(g), '')).join('') + '</select>' +
      '<select data-on="addHomebrew"><option value="">' + T('＋ Magic / homebrew item…') + '</option>' + D.HOMEBREW_ITEMS.map((h, i) => opt(i, t(h.name), '')).join('') + '</select>' +
      '<button data-act="addCustomItem">' + T('＋ Create custom item') + '</button></div>';
  };

  function effectsEditor(owner, oid, list) {
    return '<div class="fxed"><b>' + T('Effects') + '</b> <small>' + T('(work automatically while active)') + '</small>' + list.map((x, i) =>
      '<div class="fxrow"><select data-on="fxSet" data-owner="' + owner + '" data-oid="' + oid + '" data-i="' + i + '" data-f="type">' + Object.keys(D.EFFECT_TYPES).map(k => opt(k, D.EFFECT_TYPES[k], x.type)).join('') + '</select>' +
      (x.type === 'ability' ? '<select data-on="fxSet" data-owner="' + owner + '" data-oid="' + oid + '" data-i="' + i + '" data-f="ability">' + D.ABIL.map(a => opt(a, AB(a), x.ability)).join('') + '</select>' : '') +
      '<input type="number" step="any" data-on="fxSet" data-owner="' + owner + '" data-oid="' + oid + '" data-i="' + i + '" data-f="value" value="' + esc(x.value) + '">' +
      '<select data-on="fxSet" data-owner="' + owner + '" data-oid="' + oid + '" data-i="' + i + '" data-f="scope">' + Object.keys(D.EFFECT_SCOPES).map(k => opt(k, D.EFFECT_SCOPES[k], x.scope || 'all')).join('') + '</select>' +
      '<button class="mini danger" data-act="fxDel" data-owner="' + owner + '" data-oid="' + oid + '" data-i="' + i + '">✕</button></div>').join('') +
      '<button class="mini" data-act="fxAdd" data-owner="' + owner + '" data-oid="' + oid + '">' + T('＋ add effect') + '</button></div>';
  }
  function itemEditor(it) {
    const f = (k, label, type, extra) => '<label class="inl">' + label + ' <input ' + (type ? 'type="' + type + '" ' : '') + 'data-on="itSet" data-id="' + it.id + '" data-f="' + k + '" value="' + esc(it[k] == null ? '' : it[k]) + '"' + (extra || '') + '></label>';
    return '<div class="editor">' + f('name', T('Name')) + f('rarity', T('Rarity')) +
      '<label class="inl">⭐ ' + T('Level') + ' <input type="number" min="1" max="20" class="tiny" data-on="itLevel" data-id="' + it.id + '" value="' + (it.level || D.levelOf(it)) + '" title="' + esc(T('Stats grow with the item level: change the level with ✎ (or in a shop) and the bonuses and dice change. The special power stays the same.')) + '"></label>' +
      '<label class="inl">' + T('Based on weapon') + ' <select data-on="itSet" data-id="' + it.id + '" data-f="weapon">' + opt('', T('— none —'), it.weapon || '') + Object.keys(D.WEAPONS).map(k => opt(k, D.WEAPONS[k].name, it.weapon)).join('') + '</select></label>' +
      '<label class="inl">' + T('or armor') + ' <select data-on="itSet" data-id="' + it.id + '" data-f="armor">' + opt('', T('— none —'), it.armor || '') + Object.keys(D.ARMOR).map(k => opt(k, D.ARMOR[k].name, it.armor)).join('') + '</select></label>' +
      f('magicBonus', T('Magic bonus +'), 'number', ' style="width:4em"') + f('roll', T('Roll (e.g. 2d4+2)')) +
      '<label class="inl"><input type="checkbox" data-on="itCheck" data-id="' + it.id + '" data-f="heal"' + (it.heal ? ' checked' : '') + '> ' + T('roll heals') + '</label>' +
      '<label class="inl"><input type="checkbox" data-on="itCheck" data-id="' + it.id + '" data-f="requiresAttunement"' + (it.requiresAttunement ? ' checked' : '') + '> ' + T('requires attunement') + '</label>' +
      '<label class="blk">' + T('Description') + '<textarea data-on="itSet" data-id="' + it.id + '" data-f="desc">' + esc(it.desc || '') + '</textarea></label>' +
      effectsEditor('it', it.id, it.effects || []) + '</div>';
  }
  function customEditor(f) {
    const inp = (k, label, type, extra) => '<label class="inl">' + label + ' <input ' + (type ? 'type="' + type + '" ' : '') + 'data-on="cfSet" data-id="' + f.id + '" data-f="' + k + '" value="' + esc(f[k] == null ? '' : f[k]) + '"' + (extra || '') + '></label>';
    return '<div class="editor">' + inp('name', T('Name')) + inp('maxUses', T('Uses (0 = unlimited)'), 'number', ' style="width:4em"') +
      '<label class="inl">' + T('Recharge') + ' <select data-on="cfSet" data-id="' + f.id + '" data-f="reset">' + opt('long', T('Long Rest'), f.reset) + opt('short', T('Short Rest'), f.reset) + opt('short1', T('1 per Short Rest'), f.reset) + '</select></label>' +
      inp('roll', T('Roll (e.g. 1d8+@STR)')) +
      '<label class="inl"><input type="checkbox" data-on="cfCheck" data-id="' + f.id + '" data-f="heal"' + (f.heal ? ' checked' : '') + '> ' + T('roll heals') + '</label>' +
      '<label class="inl"><input type="checkbox" data-on="cfCheck" data-id="' + f.id + '" data-f="isDamage"' + (f.isDamage ? ' checked' : '') + '> ' + T('roll is damage') + '</label>' +
      '<label class="inl"><input type="checkbox" data-on="cfCheck" data-id="' + f.id + '" data-f="toggle"' + (f.toggle ? ' checked' : '') + '> ' + T('on/off switch') + '</label>' +
      '<label class="blk">' + T('What it does') + '<textarea data-on="cfSet" data-id="' + f.id + '" data-f="desc">' + esc(f.desc || '') + '</textarea></label>' +
      effectsEditor('cf', f.id, f.effects || []) +
      '<p class="hint">' + T('Roll can use @STR @DEX @CON @INT @WIS @CHA (modifiers), @PB, @LVL.') + '</p></div>';
  }

  // slots that can pay for a spell of this level right now
  const slotsFor = (c, d, lvl) => d.resources.filter(r => r.slot && r.slot >= lvl).reduce((a, r) => a + E.left(c, r), 0);

  // "⚡ Right now": everything limited, in plain words
  function nowBox(c, d) {
    const rows = [];
    d.resources.filter(r => r.slot).forEach(r => {
      const left = E.left(c, r);
      rows.push('<div class="nowr' + (left ? '' : ' empty') + '"><span class="nowl">✨ ' + esc(r.name) + ' ' + ib('slots') + '</span>' + U.pips(r.max, Number(c.used[r.id]) || 0, 'pip', r.id) +
        '<b>' + T('{0} of {1} left', left, r.max) + '</b><small>' + backTxt(r.reset) + '</small></div>');
    });
    if (d.casting.cantripsN || d.casting.list.some(e => e.sp.l === 0)) rows.push('<div class="nowr"><span class="nowl">🔮 ' + T('Cantrips') + ' ' + ib('cantrip') + '</span><b>' + T('unlimited') + '</b><small>' + T('no slot needed') + '</small></div>');
    d.resources.filter(r => !r.slot && !r.hd).forEach(r => {
      const used = Number(c.used[r.id]) || 0; const left = E.left(c, r);
      rows.push('<div class="nowr' + (left ? '' : ' empty') + '"><span class="nowl">⭐ ' + esc(r.name) + '</span>' + (r.pool ? '' : U.pips(r.max, used, 'pip', r.id)) +
        '<b>' + T('{0} of {1} left', left, r.max) + '</b><small>' + backTxt(r.reset) + '</small></div>');
    });
    const hd = d.resources.find(r => r.hd);
    if (hd) rows.push('<div class="nowr"><span class="nowl">❤️ ' + esc(hd.name) + ' ' + ib('hitdice') + '</span><b>' + T('{0} of {1} left', E.left(c, hd), hd.max) + '</b><small>' + T('heal during a Short Rest') + '</small></div>');
    return '<section class="nowbox"><h3>⚡ ' + T('Right now') + ' <small>' + T('what you can still use — the app counts it when you click Cast / Roll') + '</small></h3>' + rows.join('') + '</section>';
  }

  // ======================================================================
  //  SHEET
  // ======================================================================
  U.views.sheet = function () {
    const c = U.cur(); if (!c) { S.view = 'home'; return U.views.home(); }
    const d = E.compute(c); const DM = U.DM; const locked = U.locked(c);
    const sub = T('Level {0}', c.level) + ' ' + [d.Sp && d.Sp.name, d.C && d.C.name].filter(Boolean).join(' ') + (E.subclass(c) ? ' (' + E.subclass(c).name + ')' : '') + (d.bg ? ' · ' + d.bg.name : '');
    const hpPct = Math.max(0, Math.min(100, Math.round(d.hpCur / d.hpMax * 100)));
    let h = '<div class="page sheet">';
    h += '<div class="sheethead">' + U.portrait(c, d, 'lg') + '<div class="sh-title"><h1>' + esc(c.name || T('Unnamed hero')) + '</h1><div class="sub">' + esc(sub) + (locked ? ' · <span class="tag">🔒 ' + T('managed by DM') + '</span> ' + ib('dmlocked') : '') + '</div>' +
      '<div class="btnrow">' + (locked && !c.lvlOpen ? '' : '<button data-act="openBuilder" data-id="' + c.id + '">' + T('✎ Edit build') + '</button>') +
      '<button data-act="shortRest">' + T('☕ Short rest') + '</button><button data-act="longRest">' + T('🌙 Long rest') + '</button>' + ib('rests') +
      (DM ? '<button data-act="addToCombat" data-id="' + c.id + '">' + T('⚔️ Add to combat') + '</button><button data-act="exportChar" data-id="' + c.id + '">' + T('📤 Export for player') + '</button>' : '<button data-act="exportChar" data-id="' + c.id + '">' + T('📤 Send to DM') + '</button>') +
      '<button data-act="print">' + T('🖨 Print') + '</button></div></div></div>';
    if (U.xpBox) h += U.xpBox(c, d);
    if (d.warnings.length) h += '<div class="warn">' + d.warnings.map(esc).join('<br>') + '</div>';
    if ((!locked || c.lvlOpen) && d.C) { const todo = U.builderSteps(c).filter(s => !s.done).map(s => s.t); if (todo.length) h += '<div class="warn">' + T('✋ Unfinished choices: <b>{0}</b> — click <b>✎ Edit build</b>', todo.join(', ')) + (c.level > 1 ? ' ' + T('(level-ups often bring new choices, like extra spells)') : '') + '.</div>'; }
    if (!d.C) h += '<div class="warn">' + T('This character has no class yet — click <b>Edit build</b>.') + '</div>';

    // stat strip
    h += '<div class="strip">' +
      '<div class="stat"><div class="sl">' + T('Armor Class') + ' ' + ib('ac') + '</div><div class="sv">' + d.ac + '</div><div class="ss acwhy">= ' + esc(d.acWhy) + '</div></div>' +
      '<div class="stat hp"><div class="sl">' + T('Hit Points') + ' ' + ib('hp') + '</div><div class="hpline"><input type="number" class="hpcur" data-on="hpCur" value="' + d.hpCur + '"> <span>/ ' + d.hpMax + '</span></div>' +
      '<div class="hpbar"><span style="width:' + hpPct + '%"></span></div>' +
      '<div class="hpctl"><input type="number" id="hpAmt" min="0" placeholder="' + esc(T('amount')) + '"><button class="mini dmgb" data-act="hpDmg">' + T('Damage') + '</button><button class="mini healb" data-act="hpHeal">' + T('Heal') + '</button></div>' +
      '<div class="ss">' + T('Temp HP') + ' ' + ib('temphp') + ' <input type="number" class="tiny" data-on="hpTemp" value="' + (c.hp.temp || 0) + '"></div></div>' +
      '<div class="stat"><div class="sl">' + T('Speed') + ' ' + ib('speed') + '</div><div class="sv">' + d.speed + '<small> ' + T('ft') + '</small></div><div class="ss">' + T('{0} squares', Math.floor(d.speed / 5)) + (d.darkvision ? ' · ' + T('sees in dark {0} ft', d.darkvision) : '') + '</div></div>' +
      '<div class="stat"><div class="sl">' + T('Initiative') + ' ' + ib('initiative') + '</div><button class="sv btnlike" data-act="rollInit">' + sign(d.init) + '</button><div class="ss">' + T('click to roll') + '</div></div>' +
      '<div class="stat"><div class="sl">' + T('Proficiency') + ' ' + ib('proficiency') + '</div><div class="sv">' + sign(d.pb) + '</div><div class="ss">' + T('Passive Perception {0}', d.passive) + ' ' + ib('passive') + '</div></div>' +
      '<div class="stat' + (c.inspiration ? ' insp' : '') + '"><div class="sl">' + T('Heroic Inspiration') + ' ' + ib('inspiration') + '</div><button class="sv btnlike" data-act="toggleInsp">' + (c.inspiration ? '★' : '☆') + '</button><div class="ss">' + (c.inspiration ? T('you have it — click to use') : T('none')) + '</div></div>' +
      '</div>';

    if (d.hpCur === 0) {
      const box = (k, i) => '<button class="ds ' + k + (c.deathSaves[k] > i ? ' on' : '') + '" data-act="dsSet" data-k="' + k + '" data-i="' + i + '"></button>';
      h += '<div class="death"><b>💀 ' + T('At 0 HP — death saves') + ' ' + ib('deathsaves') + '</b> ' + T('Successes') + ' ' + [0, 1, 2].map(i => box('s', i)).join('') + ' ' + T('Failures') + ' ' + [0, 1, 2].map(i => box('f', i)).join('') +
        ' <button class="primary" data-act="rollDeath">' + T('Roll death save') + '</button></div>';
    }

    h += '<div class="cols">';
    // --- left: abilities & skills
    h += '<div class="col"><section><h3>' + T('Abilities') + ' ' + ib('abilities') + ' <small>' + T('click to roll') + '</small></h3><div class="abgrid">' + D.ABIL.map(a => {
      const sv = d.saves[a];
      return '<div class="ab"><div class="an">' + D.ABIL_NAME[a] + '</div><button class="am" data-act="rollAbil" data-a="' + a + '" title="' + esc(T('Roll a {0} check', D.ABIL_NAME[a])) + '">' + sign(d.mod[a]) + '</button><div class="as">' + T('score {0}', d.score[a]) + '</div>' +
        '<button class="asv' + (sv.prof ? ' prof' : '') + '" data-act="rollSave" data-a="' + a + '">' + T('Save') + ' ' + sign(sv.val) + (sv.prof ? ' ●' : '') + '</button></div>';
    }).join('') + '</div><p class="hint">' + T('Big number = modifier (add to rolls). "Save" = saving throw') + ' ' + ib('saves') + '</p></section>';
    h += '<section><h3>' + T('Skills') + ' ' + ib('skills') + ' <small>' + T('● trained ◆ expert') + '</small></h3><div class="skills">' + D.ALL_SKILLS.map(s => {
      const k = d.skills[s]; const dis = s === 'Stealth' && d.stealthDis;
      return '<button class="sk' + (k.lv ? ' prof' : '') + '" data-act="rollSkill" data-s="' + esc(s) + '" title="' + esc(D.SKILL_HELP[s]) + '"><span class="dot">' + (k.lv === 2 ? '◆' : k.lv ? '●' : '○') + '</span><span class="skn">' + t(s) + ' <small>' + AB(k.abil) + '</small>' + (dis ? ' <small class="fail">' + T('disadv.') + '</small>' : '') + '</span><b>' + sign(k.val) + '</b></button>';
    }).join('') + '</div><p class="hint">' + T('Hover a skill to see what it is for.') + '</p>';
    if (c.customSkills.length || DM) {
      h += '<h4>' + T('Custom skills') + '</h4>' + c.customSkills.map(s => {
        const v = d.mod[s.ability || 'STR'] + (Number(s.prof) || 0) * d.pb + (Number(s.bonus) || 0) + E.effSum(d.L, 'skills');
        return '<div class="cskill"><button class="sk prof" data-act="rollCSkill" data-id="' + s.id + '"><span class="dot">✦</span><span class="skn">' + esc(s.name || T('Skill')) + ' <small>' + AB(s.ability) + '</small></span><b>' + sign(v) + '</b></button>' +
          (DM ? '<div class="csed"><input data-on="csSet" data-id="' + s.id + '" data-f="name" value="' + esc(s.name) + '" placeholder="' + esc(T('name')) + '"><select data-on="csSet" data-id="' + s.id + '" data-f="ability">' + D.ABIL.map(a => opt(a, AB(a), s.ability)).join('') + '</select>' +
            '<select data-on="csSet" data-id="' + s.id + '" data-f="prof">' + opt(0, T('not trained'), s.prof) + opt(1, T('trained'), s.prof) + opt(2, T('expert'), s.prof) + '</select>' +
            '<input type="number" class="tiny" data-on="csSet" data-id="' + s.id + '" data-f="bonus" value="' + (s.bonus || 0) + '" title="' + esc(T('extra bonus')) + '"><button class="mini danger" data-act="csDel" data-id="' + s.id + '">✕</button></div>' : '') + '</div>';
      }).join('') + (DM ? '<button class="mini" data-act="csAdd">' + T('＋ Add custom skill') + '</button>' : '');
    }
    h += '</section></div>';

    // --- middle
    h += '<div class="col wide">';
    h += nowBox(c, d);
    const weapons = d.actions.filter(a => a.kind === 'weapon').sort((a, b) => (b.equipped ? 1 : 0) - (a.equipped ? 1 : 0));
    h += '<section><h3>' + T('Attacks') + ' ' + ib('attacks') + ' <small>' + T('click Roll, then tell the DM the numbers') + '</small></h3><table class="atk"><thead><tr><th>' + T('Weapon') + '</th><th>' + T('To hit') + '</th><th>' + T('Damage') + '</th><th></th></tr></thead><tbody>' +
      weapons.map(a => '<tr class="' + (a.equipped ? '' : 'dim') + '"><td><b>' + esc(a.name) + '</b>' + (a.mastery ? ' <span class="tag" title="' + esc(D.MASTERIES[a.mastery]) + '">' + esc(t(a.mastery)) + '</span>' : '') + (a.mult !== 1 ? ' <span class="mult">×' + a.mult + '</span>' : '') + (a.count > 1 ? ' <span class="tag" title="' + esc(T('Extra Attack: the Roll button rolls all of them')) + '">' + T('{0} attacks', a.count) + '</span>' : '') + (!a.prof ? ' <span class="fail small">' + T('not trained') + '</span>' : '') +
        (a.equipped ? '' : ' <small>' + T('(not equipped)') + '</small>') + '</td><td>' + sign(a.hit) + '</td><td>' + esc(a.dmg) + ' <small>' + esc(t(a.dtype)) + ' · ≈' + Math.round(U.avgExpr(a.dmg) * (a.mult || 1)) + '</small>' + (a.critRange < 20 ? ' <small>' + T('crit {0}–20', a.critRange) + '</small>' : '') + '</td>' +
        '<td class="nowrap"><button class="mini primary" data-act="act" data-id="' + esc(a.id) + '">' + T('Roll') + '</button> <button class="mini" data-act="actDmg" data-id="' + esc(a.id) + '" title="' + esc(T('Only damage (you rolled the d20 yourself)')) + '">' + T('Dmg') + '</button></td></tr>').join('') + '</tbody></table>' +
      (weapons.some(a => a.mastery) ? '<p class="hint">' + T('Tags like <span class="tag">{0}</span> = weapon mastery', esc(t('Graze'))) + ' ' + ib('mastery') + ' ' + T('(hover to read).') + '</p>' : '') + '</section>';

    const ci = d.casting;
    if (ci.list.length || ci.ability) {
      h += '<section><h3>' + T('Spells') + ' ' + ib('spells') + (ci.ability ? ' <small>' + T('attack') + ' ' + sign(ci.atk) + ' ' + ib('spellatk') + ' · ' + T('save DC') + ' ' + ci.dc + ' ' + ib('spelldc') + '</small>' : '') + '</h3>' +
        '<p class="hint">' + T('C = cantrip (free, unlimited). 1, 2 = spell level: casting uses a slot of that level or higher. The ⚡ box above shows how many slots you have left.') + '</p>' +
        '<div class="spl">' + ci.list.map(e => {
          const sp = e.sp; const act = d.actions.find(a => a.id === 'sp:' + sp.n);
          const tog = sp.fx || sp.mageArmor || (sp.a === 'dmg' && sp.conc); const on = c.toggles['spell:' + sp.n];
          const needSlot = sp.l > 0 && !(act && act.level === 0);
          const noSlot = needSlot && slotsFor(c, d, sp.l) <= 0;
          const castBtn = (label, actName, extra) => '<button class="mini ' + (actName === 'act' ? 'primary' : '') + '" data-act="' + actName + '" ' + extra + (noSlot && actName !== 'act' ? ' disabled title="' + esc(T('No slots left — take a rest')) + '"' : '') + (noSlot && actName === 'act' && !tog ? ' disabled title="' + esc(T('No slots left — take a rest')) + '"' : '') + '>' + label + '</button>';
          // top: name + buttons, then what it does; bottom: what casting it costs
          const eff = [];
          if (sp.d) eff.push((sp.a === 'heal' ? '❤️ ' + T('heals') : '💥 ' + T('damage')) + ' <b>' + esc(sp.d) + '</b> ' + esc(t(sp.dt || '')) + ' <small>≈' + Math.round(U.avgExpr(sp.d, d.x)) + '</small>');
          if (sp.a === 'atk') eff.push('🎯 ' + T('spell attack {0}', '<b>' + sign(e.atk) + '</b>') + ' ' + T('vs AC'));
          if (sp.a === 'save') eff.push('🛡️ ' + T('target makes a {0} save vs DC {1}', AB(sp.s), '<b>' + e.dc + '</b>') + (sp.half ? ' · ' + T('half damage if it resists') : ''));
          if (sp.a === 'auto') eff.push('✅ ' + T('always hits'));
          const tm = String(sp.t || ''); const tIcon = /bonus|бонус/i.test(tm) ? '⚡' : /reaction|реакц/i.test(tm) ? '↩️' : /action|действ/i.test(tm) ? '⏱️' : '⏳';
          const free = !needSlot;
          const cost = '<span class="cchip" title="' + esc(T('What you spend on your turn')) + '">' + tIcon + ' ' + esc(tm) + '</span>' +
            (free ? '<span class="cchip free">🔮 ' + (sp.l === 0 ? T('free — cantrip') : T('free')) + '</span>'
              : noSlot ? '<span class="cchip none">✨ ' + T('no level {0}+ slots left — rest first', sp.l) + '</span>'
                : '<span class="cchip slot">✨ ' + T('1 slot of level {0}+', sp.l) + ' <small>' + T('({0} left)', slotsFor(c, d, sp.l)) + '</small></span>') +
            (sp.conc ? '<span class="cchip conc" title="' + esc(D.HELP.concentration[1]) + '">🧠 ' + T('Concentration') + '</span>' : '');
          return '<div class="spr' + (noSlot && !on ? ' noslot' : '') + '"><div class="sph"><span class="lvl" title="' + esc(sp.l ? T('Level {0} — uses a slot', sp.l) : T('Cantrip — free')) + '">' + (sp.l === 0 ? 'C' : sp.l) + '</span><b>' + esc(sp.name) + '</b> <small>📏 ' + esc(sp.r) + (e.always ? ' · ' + T('always ready') : '') + '</small>' +
            '<span class="spbtns">' + (act ? castBtn(tog ? T('Roll damage') : T('Cast'), 'act', 'data-id="' + esc(act.id) + '"') : '') +
            (tog ? ' <button class="mini' + (on ? ' on' : '') + '" data-act="spToggle" data-n="' + esc(sp.n) + '"' + (noSlot && !on ? ' disabled title="' + esc(T('No slots left — take a rest')) + '"' : '') + '>' + (on ? T('Active ✓') : T('Cast (turn on)')) + '</button>' : '') +
            (!act && !tog && sp.l > 0 ? ' ' + castBtn(T('Cast (use slot)'), 'castPlain', 'data-n="' + esc(sp.n) + '"') : '') + '</span></div>' +
            '<div class="spd">' + esc(sp.desc) + '</div>' +
            (eff.length ? '<div class="speff">' + eff.join(' · ') + '</div>' : '') +
            '<div class="spcost"><span class="costl">' + T('Costs:') + '</span>' + cost + '</div></div>';
        }).join('') + '</div>' +
        (DM ? '<button class="mini" data-act="addCustomSpell">' + T('＋ Add custom spell') + '</button>' : '') + '</section>';
    }

    const resById = {}; d.resources.forEach(r => { resById[r.id] = r; });
    // powers you can USE (uses, rolls, on/off) on top; passive or already-counted ones folded below
    const actWords = /(Bonus Action|Reaction|Magic action|бонусн\S* действ|реакци|действие Магия)/i;
    const usable = f => !!(resById[f.id] || d.actions.some(a => a.id === 'f:' + f.id) || f.toggle || f.custom || actWords.test(f.desc || ''));
    const featRow = f => {
      const r = resById[f.id]; const used = Number(c.used[f.id]) || 0;
      const act = d.actions.find(a => a.id === 'f:' + f.id);
      let ctl = '';
      if (r) ctl += r.pool ? '<span class="pool">' + T('Pool:') + ' <input type="number" class="tiny" data-on="poolSet" data-id="' + esc(f.id) + '" value="' + (r.max - used) + '"> / ' + r.max + '</span>' : U.pips(r.max, used, 'pip', f.id) + '<small> ' + resetTxt(r.reset) + '</small>';
      if (act) ctl += ' <button class="mini primary" data-act="act" data-id="' + esc(act.id) + '"' + (r && !r.pool && E.left(c, r) <= 0 ? ' disabled title="' + esc(T('No uses left — take a rest')) + '"' : '') + '>' + (act.heal ? T('Heal') : T('Roll')) + ' ' + esc(act.dmg && act.dmg.indexOf('@') < 0 ? act.dmg : '') + '</button>';
      if (f.toggle) ctl += ' <button class="mini' + (c.toggles[f.id] ? ' on' : '') + '" data-act="fToggle" data-id="' + esc(f.id) + '">' + (c.toggles[f.id] ? T('ON ✓') : T('Off')) + '</button>';
      return '<div class="ft' + (f.custom ? ' custom' : '') + '"><div class="fth"><b>' + esc(f.name) + '</b> <small>' + esc(f.src) + '</small><span class="ftc">' + ctl + '</span></div><div class="ftd">' + esc(f.desc) + (f.effects && f.effects.length ? ' <span class="fx">✨ ' + f.effects.map(fxText).join(', ') + '</span>' : '') + '</div></div>';
    };
    const useF = d.feats.filter(usable), passF = d.feats.filter(f => !usable(f));
    h += '<section><h3>⚔️ ' + T('Powers you can use') + ' ' + ib('features') + ' <small>' + T('circles = uses left, click to use') + '</small></h3><div class="feats">' + (useF.length ? useF.map(featRow).join('') : '<p class="hint">' + T('Nothing with uses yet — your attacks and spells are above.') + '</p>') + '</div>';
    if (passF.length) h += '<details class="passive"><summary>📜 ' + T('Always on and already counted ({0})', passF.length) + ' <small>' + T('passive bonuses and choices you made — the app already uses them') + '</small></summary><div class="feats">' + passF.map(featRow).join('') + '</div></details>';
    const hd = resById.hd;
    h += '<div class="hdrow"><b>' + T('Hit Dice') + ' ' + ib('hitdice') + '</b> ' + U.pips(hd.max, Number(c.used.hd) || 0, 'pip', 'hd') + ' <button class="mini" data-act="spendHD">' + T('Spend 1 to heal (d{0} {1})', d.C ? d.C.hitDie : 8, sign(d.mod.CON)) + '</button> <small>' + T('only during a Short Rest') + '</small></div></section>';

    if (DM) {
      h += '<section><h3>' + T('✨ Custom features & homebrew') + ' <small>' + T('DM: invent anything — it can roll dice and change numbers') + '</small></h3>' +
        (c.custom.length ? c.custom.map(f => '<div class="cfrow"><b>' + esc(f.name || T('New feature')) + '</b> <button class="mini" data-act="cfEdit" data-id="' + f.id + '">' + (S.editing['cf:' + f.id] ? T('Done') : T('✎ Edit')) + '</button> <button class="mini danger" data-act="cfDel" data-id="' + f.id + '">✕</button>' +
          (S.editing['cf:' + f.id] ? customEditor(f) : '') + '</div>').join('') : '<p class="hint">' + T('Example: “Lucky Coin — once per Long Rest add 1d4 to a roll”, or “Berserk Blood — damage +2 while ON”.') + '</p>') +
        '<button class="mini" data-act="cfAdd">' + T('＋ Add custom feature') + '</button></section>';
    }
    h += '</div>';

    // --- right
    h += '<div class="col">';
    const att = c.inventory.filter(i => i.attuned).length;
    h += '<section><h3>' + T('Inventory') + ' <small>' + (DM ? T('Gold') + ' <input type="number" class="tiny" data-on="bindNum" data-path="gold" value="' + (c.gold || 0) + '"> ' + T('GP') + ' · ' + T('Attuned {0}/3', att) : T('Gold {0} GP', c.gold || 0)) + '</small></h3>' +
      U.invRows(c, DM ? 'dm' : 'view') + (DM ? U.addItemControls() : '<p class="hint">' + T('Tick ✔ for what you wear and hold. New items come from your DM.') + '</p>') + '</section>';
    h += '<section><h3>' + T('Conditions') + ' ' + ib('conditions') + '</h3><div class="chips">' + U.condChips(c, 'condDel', '') + U.condAdder('condAdd', '') + '</div>' +
      (c.conditions.length ? '<ul class="condl">' + c.conditions.map(x => '<li><b>' + esc(t(x)) + (c.condDur[x] ? ' (' + T('{0} rounds left', c.condDur[x]) + ')' : '') + ':</b> ' + esc(D.CONDITIONS[x] || '') + '</li>').join('') + '</ul>' : '') + '</section>';
    const det = c.details;
    const lab = { who: T('Who'), want: T('Wants'), flaw: T('Flaw'), secret: T('Secret'), appearance: T('Looks') };
    h += '<section><h3>' + T('Personality & notes') + '</h3>' + ['who', 'want', 'flaw', 'secret', 'appearance'].map(k => '<label class="blk">' + lab[k] + '<textarea data-on="bind" data-path="details.' + k + '">' + esc(det[k] || '') + '</textarea></label>').join('') +
      '<label class="blk">' + T('Notes') + '<textarea class="tall" data-on="bind" data-path="notes" placeholder="' + esc(T('Quests, NPC names, loot…')) + '">' + esc(c.notes) + '</textarea></label></section>';
    if (DM) {
      const ov = c.overrides;
      h += '<section class="adv"><h3>' + T('Manual overrides') + ' <small>' + T('DM · empty = automatic') + '</small></h3><div class="ovr">' +
        [['ac', T('AC'), d.ac], ['hpMax', T('Max HP'), d.hpMax], ['speed', T('Speed'), d.speed], ['init', T('Initiative'), d.init]].map(o => '<label class="inl">' + o[1] + ' <input type="number" class="tiny" data-on="bind" data-path="overrides.' + o[0] + '" value="' + esc(ov[o[0]] == null ? '' : ov[o[0]]) + '" placeholder="' + o[2] + '"></label>').join('') + '</div></section>';
    }
    h += '</div></div></div>';
    return h;
  };

  // ======================================================================
  //  SHEET ACTIONS
  // ======================================================================
  function d20Roll(c, label, bonus, forceMode) {
    const d = E.compute(c); let mode = U.takeMode();
    if (forceMode === 'dis') mode = mode === 'adv' ? 'normal' : 'dis';
    const r = E.rollD20(bonus, mode, d.luck);
    const tag = r.nat === 20 ? ' <b class="crit">' + T('NAT 20!') + '</b>' : r.nat === 1 ? ' <b class="fail" data-nat1>' + T('NAT 1') + '</b>' : '';
    const dice = r.text.replace(/^d20\((.*?)\).*$/, '$1');
    U.logAdd(c.name || T('Hero'), [esc(label) + ': 🎲 ' + dice + ' ' + sign(bonus) + ' = <b class="big">' + r.total + '</b>' + (mode === 'adv' ? ' <span class="tag adv">' + T('ADV') + '</span>' : mode === 'dis' ? ' <span class="tag dis">' + T('DIS') + '</span>' : '') + tag]);
  }
  function addItem(c, base) { const it = Object.assign({ id: E.uid(), qty: 1, effects: [] }, E.clone(base)); c.inventory.push(it); return it; }
  function fxOwner(ds) { const c = U.cur(); return ds.owner === 'it' ? c.inventory.find(x => x.id === ds.oid) : c.custom.find(x => x.id === ds.oid); }
  U.deathSave = function (c) {
    const r = E.rollD20(0, 'normal'); const ds = c.deathSaves; let msg;
    if (r.nat === 20) { E.healChar(c, 1); msg = '<b class="crit">' + T('NAT 20!') + '</b> ' + T('back up with 1 HP!'); }
    else if (r.nat === 1) { ds.f = Math.min(3, ds.f + 2); msg = '<b class="fail" data-nat1>' + T('NAT 1') + '</b> — ' + T('two failures'); }
    else if (r.nat >= 10) { ds.s = Math.min(3, ds.s + 1); msg = '<b class="ok">' + T('success') + '</b>'; }
    else { ds.f = Math.min(3, ds.f + 1); msg = '<b class="fail">' + T('failure') + '</b>'; }
    if (ds.s >= 3) msg += ' — <b>' + T('STABLE (unconscious but safe)') + '</b>';
    if (ds.f >= 3) msg += ' — <b class="fail">' + T('DEAD') + ' 💀</b>';
    U.logAdd(c.name, [T('Death save') + ': <b class="big">' + r.nat + '</b> ' + msg + ' · ✓' + ds.s + ' ✗' + ds.f]);
  };

  Object.assign(U.ACT, {
    print: () => window.print(),
    rollAbil: ds => { const c = U.cur(); const d = E.compute(c); const jack = c.classKey === 'bard' && c.level >= 2 ? Math.floor(d.pb / 2) : 0; d20Roll(c, T('{0} check', D.ABIL_NAME[ds.a]), d.mod[ds.a] + jack); },
    rollSave: ds => { const c = U.cur(); const d = E.compute(c); d20Roll(c, T('{0} save', D.ABIL_NAME[ds.a]), d.saves[ds.a].val); },
    rollSkill: ds => { const c = U.cur(); const d = E.compute(c); d20Roll(c, t(ds.s), d.skills[ds.s].val, ds.s === 'Stealth' && d.stealthDis ? 'dis' : null); },
    rollCSkill: ds => { const c = U.cur(); const d = E.compute(c); const s = c.customSkills.find(x => x.id === ds.id); d20Roll(c, s.name || T('Custom skill'), d.mod[s.ability || 'STR'] + (Number(s.prof) || 0) * d.pb + (Number(s.bonus) || 0) + E.effSum(d.L, 'skills')); },
    rollInit: () => { const c = U.cur(); const d = E.compute(c); d20Roll(c, T('Initiative'), d.init); },
    toggleInsp: () => { const c = U.cur(); if (c.inspiration && !confirm(T('Use your Heroic Inspiration now? (reroll one die)'))) return; c.inspiration = !c.inspiration; U.commit(); },
    hpDmg: () => { const c = U.cur(); const n = Number(document.getElementById('hpAmt').value) || 0; if (!n) return; const notes = E.damageChar(c, n); U.logAdd(c.name, [T('takes {0} damage', '<b class="dmg">' + n + '</b>') + U.notesTxt(notes)]); U.commit(); },
    hpHeal: () => { const c = U.cur(); const n = Number(document.getElementById('hpAmt').value) || 0; if (!n) return; E.healChar(c, n); U.logAdd(c.name, [T('heals {0}', '<b class="heal">' + n + '</b>')]); U.commit(); },
    shortRest: () => { const c = U.cur(); E.shortRest(c); U.logAdd(c.name, [T('☕ Short Rest: some powers recharged. Spend Hit Dice to heal.')]); U.commit(); },
    longRest: () => { const c = U.cur(); E.longRest(c); U.logAdd(c.name, [T('🌙 Long Rest: full HP, all powers, slots and Hit Dice back.')]); U.commit(); },
    spendHD: () => {
      const c = U.cur(); const d = E.compute(c); const r = d.resources.find(x => x.id === 'hd');
      if (E.left(c, r) <= 0) { U.toast(T('No Hit Dice left.')); return; }
      c.used.hd = (Number(c.used.hd) || 0) + 1; const roll = E.rollExpr('1d' + d.C.hitDie + E.fmtBonus(d.mod.CON)); const v = Math.max(0, roll.total);
      E.healChar(c, v); U.logAdd(c.name, [T('spends a Hit Die: heals {0}', '<b class="big heal">' + v + '</b>') + ' <small>' + roll.text + '</small>']); U.commit();
    },
    pip: ds => {
      const c = U.cur(); const d = E.compute(c); const r = d.resources.find(x => x.id === ds.id); if (!r) return;
      const used = Number(c.used[ds.id]) || 0; const i = Number(ds.i); const full = i < r.max - used;
      c.used[ds.id] = full ? used + 1 : Math.max(0, used - 1); U.commit();
    },
    fToggle: ds => {
      const c = U.cur(); const on = !c.toggles[ds.id];
      const d = E.compute(c); const f = d.feats.find(x => x.id === ds.id);
      if (on) { const r = d.resources.find(x => x.id === ds.id); if (r) { if (E.left(c, r) <= 0) { U.toast(T('No uses left.')); return; } c.used[r.id] = (Number(c.used[r.id]) || 0) + 1; } }
      c.toggles[ds.id] = on; U.logAdd(c.name, [esc(f ? f.name : ds.id) + (on ? ' <b>' + T('ON') + '</b>' : ' ' + T('off'))]); U.commit();
    },
    spToggle: ds => {
      const c = U.cur(); const k = 'spell:' + ds.n; const turningOn = !c.toggles[k];
      if (turningOn) {
        const sp = D.SPELLS.find(s => s.n === ds.n);
        if (sp && sp.l > 0) { const d = E.compute(c); const w = U.spendFor(c, d, { kind: 'spell', level: sp.l }); if (/⚠️/.test(w)) { U.toast(w); return; } U.logAdd(c.name, [T('casts {0}', '<b>' + esc(U.spName(ds.n)) + '</b>') + ' (' + w + ')']); }
      }
      c.toggles[k] = turningOn; U.commit();
    },
    castPlain: ds => {
      const c = U.cur(); const d = E.compute(c); const sp = D.SPELLS.find(s => s.n === ds.n) || c.customSpells.find(s => s.n === ds.n);
      const w = U.spendFor(c, d, { kind: 'spell', level: sp ? sp.l : 1 }); if (/⚠️/.test(w)) { U.toast(w); return; }
      U.logAdd(c.name, [T('casts {0}', '<b>' + esc(U.spName(ds.n)) + '</b>') + (w ? ' (' + w + ')' : '')]); U.commit();
    },
    act: ds => {
      const c = U.cur(); const d = E.compute(c); const a = d.actions.find(x => x.id === ds.id); if (!a) return;
      const w = U.spendFor(c, d, a);
      if (/⚠️/.test(w)) { U.toast(w + ' — ' + T('take a rest to get it back.')); return; }
      const target = (a.heal || a.temp) ? U.pcTarget(c) : null;
      const lines = U.resolve(a, U.attackerOf(c), target);
      U.logAdd(c.name || T('Hero'), ['<b>' + esc(a.name) + '</b>' + (w ? ' <small>(' + w + ')</small>' : '')].concat(lines)); U.commit();
    },
    actDmg: ds => {
      const c = U.cur(); const d = E.compute(c); const a = d.actions.find(x => x.id === ds.id); if (!a) return;
      const crit = confirm(T('Was it a critical hit (natural 20)?\nOK = yes (double dice), Cancel = normal hit'));
      const r = E.rollExpr(a.dmg, { crit, min3: a.min3, ctx: d.x }); const tot = Math.max(0, r.total) * (a.mult || 1);
      U.logAdd(c.name, ['<b>' + esc(a.name) + '</b> ' + T('damage') + ': <b class="big dmg">' + tot + '</b> ' + esc(t(a.dtype || '')) + ' <small>' + r.text + (a.mult !== 1 ? ' ×' + a.mult : '') + '</small>' + (crit ? ' <b class="crit">' + T('CRIT') + '</b>' : '')]);
    },
    dsSet: ds => { const c = U.cur(); const i = Number(ds.i); c.deathSaves[ds.k] = c.deathSaves[ds.k] > i ? i : i + 1; U.commit(); },
    rollDeath: () => { const c = U.cur(); U.deathSave(c); U.commit(); },
    condDel: ds => { U.delCond(U.cur(), ds.v); U.commit(); },
    csAdd: () => { U.cur().customSkills.push({ id: E.uid(), name: T('New skill'), ability: 'INT', prof: 1, bonus: 0 }); U.commit(); },
    csDel: ds => { const c = U.cur(); c.customSkills = c.customSkills.filter(x => x.id !== ds.id); U.commit(); },
    cfAdd: () => { const f = { id: E.uid(), name: T('New feature'), desc: '', maxUses: 0, reset: 'long', roll: '', effects: [] }; U.cur().custom.push(f); S.editing['cf:' + f.id] = true; U.commit(); },
    cfEdit: ds => { S.editing['cf:' + ds.id] = !S.editing['cf:' + ds.id]; U.render(); },
    cfDel: ds => { const c = U.cur(); if (!confirm(T('Delete this custom feature?'))) return; c.custom = c.custom.filter(x => x.id !== ds.id); U.commit(); },
    itEdit: ds => { S.editing['it:' + ds.id] = !S.editing['it:' + ds.id]; U.render(); },
    itDel: ds => { const c = U.cur(); c.inventory = c.inventory.filter(x => x.id !== ds.id); U.commit(); },
    addCustomItem: () => { const it = addItem(U.cur(), { name: T('New magic item'), desc: '', requiresAttunement: false }); S.editing['it:' + it.id] = true; U.commit(); },
    addCustomSpell: () => {
      const c = U.cur(); const n = prompt(T('Spell name?')); if (!n) return;
      const lvl = Number(prompt(T('Spell level (0 = cantrip)?'), '1')) || 0;
      const desc = prompt(T('What does it do? (short)'), '') || '';
      const dmg = prompt(T('Damage or healing dice? (e.g. 3d6 — leave empty for none)'), '') || '';
      let a = null, s = null, dt = '';
      if (dmg) { const kind = (prompt(T('Type: atk (spell attack), save, heal, auto (always hits)'), 'atk') || 'atk').trim().toLowerCase(); a = ['atk', 'save', 'heal', 'auto'].includes(kind) ? kind : 'atk'; if (a === 'save') s = (prompt(T('Which save? STR DEX CON INT WIS CHA'), 'DEX') || 'DEX').toUpperCase(); if (a !== 'heal') dt = prompt(T('Damage type?'), 'force') || ''; }
      c.customSpells.push({ n, name: n, l: lvl, c: [], t: T('Action'), r: '—', a, s, d: dmg || undefined, dt, half: a === 'save', desc, addMod: a === 'heal' });
      U.commit();
    },
    fxAdd: ds => { const o = fxOwner(ds); o.effects = o.effects || []; o.effects.push({ type: 'damage', value: 1, scope: 'all' }); U.commit(); },
    fxDel: ds => { const o = fxOwner(ds); o.effects.splice(Number(ds.i), 1); U.commit(); }
  });

  function setPath(o, path, v) { const p = path.split('.'); let x = o; for (let i = 0; i < p.length - 1; i++) { x[p[i]] = x[p[i]] || {}; x = x[p[i]]; } x[p[p.length - 1]] = v; }
  Object.assign(U.ON, {
    bind: el => { setPath(U.cur(), el.dataset.path, el.value); U.commit(); },
    bindNum: el => { const c = U.cur(); setPath(c, el.dataset.path, Number(el.value) || 0); if (el.dataset.path === 'level') E.normalize(c); U.commit(); },
    hpCur: el => { const c = U.cur(); const d = E.compute(c); c.hp.cur = Math.max(0, Math.min(d.hpMax, Number(el.value) || 0)); U.commit(); },
    hpTemp: el => { U.cur().hp.temp = Math.max(0, Number(el.value) || 0); U.commit(); },
    poolSet: el => { const c = U.cur(); const d = E.compute(c); const r = d.resources.find(x => x.id === el.dataset.id); c.used[r.id] = Math.max(0, Math.min(r.max, r.max - (Number(el.value) || 0))); U.commit(); },
    itEquip: el => {
      const c = U.cur(); const it = c.inventory.find(x => x.id === el.dataset.id); it.equipped = el.checked;
      if (el.checked && it.armor && D.ARMOR[it.armor]) { const isShield = it.armor === 'shield'; c.inventory.forEach(o => { if (o !== it && o.armor && D.ARMOR[o.armor] && (o.armor === 'shield') === isShield) o.equipped = false; }); }
      U.commit();
    },
    itAttune: el => { const c = U.cur(); const it = c.inventory.find(x => x.id === el.dataset.id); if (el.checked && c.inventory.filter(x => x.attuned).length >= 3) { U.toast(T('Max 3 attuned items.')); el.checked = false; return; } it.attuned = el.checked; if (el.checked) U.logAdd(c.name, [T('attunes to {0} (takes a Short Rest of focus)', '<b>' + esc(E.itemName(it)) + '</b>')]); U.commit(); },
    itQty: el => { const c = U.cur(); c.inventory.find(x => x.id === el.dataset.id).qty = Math.max(0, Number(el.value) || 0); U.commit(); },
    itSet: el => { const c = U.cur(); const it = c.inventory.find(x => x.id === el.dataset.id); const f = el.dataset.f; it[f] = f === 'magicBonus' ? (Number(el.value) || 0) : el.value; if (f === 'weapon' && el.value) it.armor = ''; if (f === 'armor' && el.value) it.weapon = ''; U.commit(); },
    itCheck: el => { const c = U.cur(); const it = c.inventory.find(x => x.id === el.dataset.id); it[el.dataset.f] = el.checked; U.commit(); },
    cfSet: el => { const f = U.cur().custom.find(x => x.id === el.dataset.id); f[el.dataset.f] = el.dataset.f === 'maxUses' ? Math.max(0, Number(el.value) || 0) : el.value; U.commit(); },
    cfCheck: el => { const f = U.cur().custom.find(x => x.id === el.dataset.id); f[el.dataset.f] = el.checked; U.commit(); },
    csSet: el => { const s = U.cur().customSkills.find(x => x.id === el.dataset.id); const f = el.dataset.f; s[f] = (f === 'prof' || f === 'bonus') ? Number(el.value) || 0 : el.value; U.commit(); },
    fxSet: el => { const o = fxOwner(el.dataset); const x = o.effects[Number(el.dataset.i)]; const f = el.dataset.f; x[f] = f === 'value' ? Number(el.value) : el.value; if (f === 'type' && el.value === 'ability' && !x.ability) x.ability = 'STR'; U.commit(); },
    // standard items are stored with their English name (shown in the chosen language)
    addWeapon: el => { if (!el.value) return; addItem(U.cur(), { name: D.WEAPONS[el.value].en, weapon: el.value }); U.commit(); },
    addArmor: el => { if (!el.value) return; addItem(U.cur(), { name: D.ARMOR[el.value].en, armor: el.value }); U.commit(); },
    addGear: el => { if (!el.value) return; addItem(U.cur(), { name: el.value, heal: el.value === 'Potion of Healing', roll: el.value === 'Potion of Healing' ? '2d4+2' : '' }); U.commit(); },
    addHomebrew: el => { if (el.value === '') return; const hb = D.HOMEBREW_ITEMS[Number(el.value)]; addItem(U.cur(), hb); U.commit(); U.toast(T('Added {0}. Tick ✔', esc(t(hb.name))) + (hb.requiresAttunement ? ' ' + T('and “Attuned”') : '') + ' ' + T('to activate it.')); },
    condAdd: el => { if (!el.value) return; U.addCond(U.cur(), el.value, U.durOf(el)); U.commit(); }
  });
})(window.UI);
