// Rules engine: dice, character math, attacks, spells, resources. No UI here.
(function () {
  'use strict';
  const D = window.DND;
  const E = window.ENG = {};

  // ---------- small helpers ----------
  E.uid = () => Math.random().toString(36).slice(2, 10);
  E.modOf = s => Math.floor((Number(s) - 10) / 2);
  E.sign = n => (n >= 0 ? '+' : '−') + Math.abs(n);
  E.fmtBonus = n => (n === 0 ? '' : (n > 0 ? '+' + n : '-' + Math.abs(n)));
  E.clone = o => JSON.parse(JSON.stringify(o));
  // item name for the screen: standard weapons/armor follow the language, gear names go through the dictionary
  E.itemName = it => {
    if (it.ru && D.LANG === 'ru' && it.ru[0]) return it.ru[0];
    const w = D.WEAPONS[it.weapon] || D.ARMOR[it.armor]; const nm = String(it.name || '');
    const m = nm.match(/^\+(\d) (.*)$/);
    if (w && m && (m[2] === w.en || m[2] === w.name)) return '+' + m[1] + ' ' + w.name;
    if (w && (!it.name || nm === w.en || nm === w.name || nm === w.ru)) return w.name;
    return D.t(nm);
  };
  // description: own text, else the catalog's (in the current language), else the text saved from a shop / loot file
  E.itemDesc = it => { if (it.desc) return it.desc; if (it.ru && D.LANG === 'ru' && it.ru[1]) return it.ru[1]; const e = it.cid && D.catalogById && D.catalogById(it.cid); return (e && e.desc) || it.cdesc || ''; };
  const d_srcs = L => L.filter(x => x.type === "ac").map(x => x.src).join(", ");
  E.T = (s, ...a) => { let r = s; a.forEach((v, i) => { r = r.split("{" + i + "}").join(v); }); return r; }; // translator (ui-core replaces it)
  const T = (...a) => E.T(...a);
  E.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // ---------- dice ----------
  function rnd(n) {
    try { const a = new Uint32Array(1); crypto.getRandomValues(a); return 1 + (a[0] % n); }
    catch (e) { return 1 + Math.floor(Math.random() * n); }
  }
  E.rollDie = rnd;

  // expr like "2d6+3", "1d10+@LVL", "1d8+@WIS". o: {crit, min3, ctx}
  E.rollExpr = function (expr, o) {
    o = o || {};
    let s = String(expr == null ? '0' : expr).replace(/\s+/g, '');
    if (o.ctx) s = s.replace(/@(STR|DEX|CON|INT|WIS|CHA|LVL|PB)/gi, (m, k) => {
      k = k.toUpperCase();
      return k === 'LVL' ? o.ctx.lvl : k === 'PB' ? o.ctx.pb : o.ctx.mod[k];
    });
    s = s.replace(/\+-/g, '-').replace(/-\+/g, '+').replace(/--/g, '+').replace(/\+\+/g, '+');
    const terms = s.match(/[+-]?[^+-]+/g) || ['0'];
    let total = 0; const parts = []; const rolls = []; // rolls = every single die: { f: faces, r: result } (for the dice animation)
    terms.forEach(t => {
      const sg = t[0] === '-' ? -1 : 1;
      const body = t.replace(/^[+-]/, '');
      const m = body.match(/^(\d*)d(\d+)$/i);
      if (m) {
        let n = Number(m[1] || 1); const f = Number(m[2]);
        if (o.crit) n *= 2;
        const shown = []; let sum = 0;
        for (let i = 0; i < Math.min(n, 200); i++) {
          let r = rnd(f);
          if (o.min3 && r < 3) { shown.push(r + '→3'); r = 3; } else shown.push(String(r));
          sum += r; rolls.push({ f, r: sg * r });
        }
        total += sg * sum;
        parts.push((sg < 0 ? "− " : (parts.length ? "+ " : "")) + n + "d" + f + " (" + shown.join("+") + ")");
      } else {
        const v = Number(body) || 0;
        total += sg * v;
        if (v !== 0) parts.push((sg < 0 ? '− ' : (parts.length ? '+ ' : '')) + v);
      }
    });
    const res = { total, text: parts.join(' ') || '0', rolls, expr: s };
    if (rolls.length) E.rq.push(res);
    return res;
  };
  E.rq = []; // dice expressions rolled since the last click (the animation shows the first one when no d20 was rolled)

  // d20 test. mode: normal|adv|dis. luck: Halfling reroll natural 1.
  E.d20q = []; // d20 rolls since the last click (the dice animation shows the first one)
  E.rollD20 = function (bonus, mode, luck) {
    const one = () => { let r = rnd(20); let note = ''; if (luck && r === 1) { r = rnd(20); note = " " + T("(Luck: rerolled 1)"); } return { r, note }; };
    const a = one(), b = one();
    let used = a.r, txt = String(a.r), note = a.note;
    if (mode === 'adv' || mode === 'dis') {
      // two dice: advantage keeps the higher one, disadvantage the lower one; the other is crossed out
      used = mode === 'adv' ? Math.max(a.r, b.r) : Math.min(a.r, b.r);
      const keepA = a.r === used; const k = used, x = keepA ? b.r : a.r;
      txt = '<u>' + k + '</u>, <s>' + x + '</s>'; note = a.note || b.note;
    }
    E.d20q.push({ dice: mode === 'normal' || !mode ? [a.r] : [a.r, b.r], used, mode: mode || 'normal', bonus, total: used + bonus });
    return { nat: used, total: used + bonus, text: 'd20(' + txt + ') ' + E.sign(bonus) + note };
  };

  // ---------- character defaults ----------
  E.newChar = function () { return E.normalize({ id: E.uid(), name: '', level: 1 }); };
  E.normalize = function (c) {
    c.id = c.id || E.uid();
    if (c.name == null) c.name = '';
    if (c.player == null) c.player = '';
    c.level = Math.max(1, Math.min(D.MAX_LEVEL, Number(c.level) || 1));
    ['classKey', 'speciesKey', 'speciesOpt', 'backgroundKey', 'bgPlus2', 'bgPlus1', 'portrait', 'notes'].forEach(k => { if (c[k] == null) c[k] = ''; });
    if (!c.bgMode) c.bgMode = '21';
    if (!c.method) c.method = 'standard';
    if (!c.base) c.base = { STR: null, DEX: null, CON: null, INT: null, WIS: null, CHA: null };
    if (!c.rolled) c.rolled = [];
    if (!c.rollAssign) c.rollAssign = {};
    ['opts', 'picks', 'used', 'toggles', 'overrides', 'details'].forEach(k => { if (!c[k] || typeof c[k] !== 'object') c[k] = {}; });
    ['inventory', 'conditions', 'custom', 'customSkills', 'customSpells'].forEach(k => { if (!Array.isArray(c[k])) c[k] = []; });
    if (!c.condDur || typeof c.condDur !== 'object') c.condDur = {};
    if (c.party == null) c.party = true;
    if (!c.hp) c.hp = { cur: null, temp: 0 };
    if (!c.deathSaves) c.deathSaves = { s: 0, f: 0 };
    if (c.gold == null) c.gold = 0;
    if (!c.asi || typeof c.asi !== 'object') c.asi = {};
    if (c.xp == null || isNaN(Number(c.xp))) c.xp = (D.XP_LEVELS || [0])[c.level - 1] || 0;
    if (c.inspiration == null) c.inspiration = c.speciesKey === 'human';
    c.inventory.forEach(it => { it.id = it.id || E.uid(); if (it.qty == null) it.qty = 1; if (!it.effects) it.effects = []; });
    c.custom.forEach(f => { f.id = f.id || E.uid(); if (!f.effects) f.effects = []; });
    c.customSkills.forEach(s => { s.id = s.id || E.uid(); });
    return c;
  };

  // ---------- building blocks ----------
  E.featKeys = function (c) {
    const out = []; const bg = D.BACKGROUNDS[c.backgroundKey];
    if (bg) out.push(bg.feat);
    if (c.speciesKey === 'human' && c.opts.humanFeat) out.push(c.opts.humanFeat);
    E.asiList(c).forEach(s => { if (s.k === 'feat' && D.FEATS[s.f]) out.push(s.f); });
    return out;
  };
  E.miList = function (c) {
    const bg = D.BACKGROUNDS[c.backgroundKey];
    if (bg && bg.feat === 'magicinitiate') return bg.miList;
    if (c.speciesKey === 'human' && c.opts.humanFeat === 'magicinitiate') return c.opts.miList || 'wizard';
    return null;
  };
  E.hasFightingStyle = c => { const C = D.CLASSES[c.classKey]; return !!(C && C.fightingStyleAt && c.level >= C.fightingStyleAt); };
  E.subclass = c => { const C = D.CLASSES[c.classKey]; return (C && c.level >= 3 && C.subclasses && C.subclasses[c.opts.subclass]) || null; };
  // subclass features (reached by level) that carry a given mechanic field (data/subclasses.js)
  E.subFeats = (c, key) => E.allFeatures(c).filter(f => f[key]); // any power the hero has now (subclass, feat, invocation, species...)
  // fighting styles: the class choice + Fighting Style feats taken at Ability Score Improvements
  E.styles = c => { const s = new Set(); if (E.hasFightingStyle(c) && c.opts.fightingStyle) s.add(c.opts.fightingStyle); E.asiList(c).forEach(a => { const G = a.k === 'feat' && D.GENERAL_FEATS && D.GENERAL_FEATS[a.f]; if (G && G.fs) s.add(G.fs); }); return s; };

  // Ability Score Improvements chosen at levels 4, 8, 12... (c.asi = { '4': {k:'plus2'|'plus11'|'feat', a, b, f} })
  E.asiLevels = c => { const C = D.CLASSES[c.classKey]; return ((C && C.asi) || []).filter(l => l <= c.level); };
  E.asiList = c => E.asiLevels(c).map(l => Object.assign({ lvl: l }, (c.asi || {})[l] || {}));
  E.asiDone = s => (s.k === 'plus2' && !!s.a) || (s.k === 'plus11' && !!s.a && !!s.b && s.a !== s.b) || (s.k === 'feat' && !!s.f && (!D.GENERAL_FEATS || !D.GENERAL_FEATS[s.f] || !D.GENERAL_FEATS[s.f].abil.length || !!s.a));
  E.abilityScores = function (c) {
    const bg = D.BACKGROUNDS[c.backgroundKey]; const sc = {};
    const inc = {}, cap = {}; D.ABIL.forEach(a => { inc[a] = 0; cap[a] = 20; });
    E.asiList(c).forEach(s => {
      if (s.k === 'plus2' && s.a) inc[s.a] += 2;
      else if (s.k === 'plus11') { if (s.a) inc[s.a]++; if (s.b && s.b !== s.a) inc[s.b]++; }
      else if (s.k === 'feat' && s.a && D.GENERAL_FEATS && D.GENERAL_FEATS[s.f]) { inc[s.a]++; if (D.GENERAL_FEATS[s.f].boon) cap[s.a] = 30; }
    });
    D.ABIL.forEach(a => {
      let v = Number(c.base[a] == null || c.base[a] === '' ? 10 : c.base[a]);
      if (bg && bg.abil.includes(a)) {
        if (c.bgMode === '111') v += 1;
        else { if (c.bgPlus2 === a) v += 2; else if (c.bgPlus1 === a) v += 1; }
      }
      sc[a] = Math.max(Math.min(20, v), Math.min(cap[a], Math.min(20, v) + inc[a]));
    });
    return sc;
  };

  E.resolveMax = function (m, x) {
    if (typeof m === 'function') return Math.max(0, m(x));
    if (typeof m === 'number') return m;
    if (m === 'PB') return x.pb;
    if (m === 'LVL') return x.lvl;
    if (D.ABIL.includes(m)) return Math.max(1, x.mod[m]);
    return Number(m) || 0;
  };

  // All features the character has right now (class, subclass, species, feats, choices, custom).
  E.allFeatures = function (c) {
    const out = []; const C = D.CLASSES[c.classKey]; const Sp = D.SPECIES[c.speciesKey];
    if (C) C.features.filter(f => f.lvl <= c.level).forEach(f => out.push(Object.assign({}, f, { id: "cls:" + (f.key || f.name), src: C.name + " " + f.lvl })));
    const sub = E.subclass(c);
    if (sub) sub.features.filter(f => f.lvl <= c.level).forEach(f => out.push(Object.assign({}, f, { id: "sub:" + (f.key || f.name), src: sub.name })));
    if (Sp) {
      Sp.traits.filter(t => !t.lvl || t.lvl <= c.level).forEach(t => out.push(Object.assign({}, t, { id: "sp:" + (t.key || t.name), src: Sp.name })));
      const o = Sp.options && Sp.options[c.speciesOpt];
      if (o && o.desc) out.push({ id: "spo:" + (o.key || o.name), name: o.name, desc: o.desc, src: Sp.name });
    }
    E.featKeys(c).forEach((k, i) => { const F = D.FEATS[k]; if (F) out.push(Object.assign({}, F, { id: 'feat:' + k + i, src: T("Feat") })); });
    if (E.hasFightingStyle(c) && D.FIGHTING_STYLES[c.opts.fightingStyle]) {
      const fs = D.FIGHTING_STYLES[c.opts.fightingStyle];
      out.push({ id: 'fs', name: T("Fighting Style") + ": " + fs.name, desc: fs.desc, src: T("Choice") });
    }
    if (C && C.orders && C.orders[c.opts.order]) { const o = C.orders[c.opts.order]; out.push({ id: "order", name: o.name, desc: o.desc, src: T("Choice") }); }
    E.asiList(c).forEach(s => { const G = s.k === 'feat' && D.GENERAL_FEATS && D.GENERAL_FEATS[s.f]; if (G) out.push(Object.assign({}, G, { id: 'gfeat:' + s.f + s.lvl, src: T("Feat") + ' (' + T("level {0}", s.lvl) + ')' })); });
    (c.picks.invocations || []).forEach(k => { const v = D.INVOCATIONS[k]; if (v && (!v.req || (c.picks.invocations || []).includes(v.req))) out.push(Object.assign({}, v, { id: 'inv:' + k, src: T("Invocation"), toggle: k === 'armorofshadows' })); });
    if (c.classKey === 'fighter' && sub && c.opts.subclass === 'battlemaster' && D.MANEUVERS) (c.picks.maneuvers || []).slice(0, D.MANEUVERS_COUNT(c.level)).forEach(k => { const v = D.MANEUVERS[k]; if (v) out.push({ id: 'man:' + k, name: v.name, desc: v.desc, src: T("Maneuver") }); });
    if (c.classKey === 'druid' && sub && c.opts.subclass === 'land' && D.LANDS && D.LANDS[c.opts.land]) { const v = D.LANDS[c.opts.land]; out.push({ id: 'land', name: v.name, desc: v.desc, src: T("Choice") }); }
    (c.picks.metamagic || []).forEach(k => { const v = D.METAMAGIC[k]; if (v) out.push({ id: 'mm:' + k, name: v.name, desc: v.desc, src: T("Metamagic") }); });
    c.custom.forEach(f => out.push({
      id: 'custom:' + f.id, cid: f.id, custom: true, name: f.name || T("Custom"), desc: f.desc || "", src: T("Custom"),
      uses: Number(f.maxUses) > 0 ? { max: Number(f.maxUses), reset: f.reset || 'long' } : null,
      roll: f.roll || '', heal: !!f.heal, isDamage: !!f.isDamage, toggle: !!f.toggle, effects: f.effects || []
    }));
    return out;
  };

  E.activeEffects = function (c, feats) {
    const list = [];
    c.inventory.forEach(it => {
      if (it.equipped && (!it.requiresAttunement || it.attuned)) (it.effects || []).forEach(x => list.push(Object.assign({}, x, { src: E.itemName(it) })));
    });
    feats.forEach(f => {
      if (f.effects && f.effects.length && (!f.toggle || c.toggles[f.id])) f.effects.forEach(x => list.push(Object.assign({}, x, { src: f.name, value: typeof x.value === 'function' ? x.value({ lvl: c.level }) : x.value })));
    });
    D.SPELLS.forEach(sp => { if (sp.fx && c.toggles["spell:" + sp.n]) sp.fx.forEach(x => list.push(Object.assign({}, x, { src: sp.name || sp.n }))); });
    return list;
  };
  const inScope = (x, scope) => !scope || !x.scope || x.scope === 'all' || x.scope === scope;
  E.effSum = (L, type, scope, abil) => L.filter(x => x.type === type && (!abil || x.ability === abil) && inScope(x, scope)).reduce((a, x) => a + (Number(x.value) || 0), 0);
  E.effMult = (L, scope) => L.filter(x => x.type === 'damageMult' && inScope(x, scope)).reduce((a, x) => a * (Number(x.value) || 1), 1);
  E.multSources = (L, scope) => L.filter(x => x.type === 'damageMult' && inScope(x, scope)).map(x => x.src).join(', ');

  // ---------- skills ----------
  E.skillGroups = function (c) {
    const g = []; const C = D.CLASSES[c.classKey]; const Sp = D.SPECIES[c.speciesKey]; const bg = D.BACKGROUNDS[c.backgroundKey];
    const clist = C ? (C.skillList === 'any' ? D.ALL_SKILLS : C.skillList) : [];
    if (C) g.push({ id: 'class', label: T("{0} skills — choose {1}", C.name, C.skillCount), count: C.skillCount, list: clist });
    if (C && C.extraSkills) Object.keys(C.extraSkills).forEach(l => { if (c.level >= +l) g.push({ id: 'classx', label: T("{0} level {1} — {2} more", C.name, l, C.extraSkills[l]), count: C.extraSkills[l], list: clist }); });
    const sub = E.subclass(c);
    if (sub && sub.extraSkills) g.push({ id: 'subclass', label: T("{0} — {1} skills of your choice", sub.name, sub.extraSkills), count: sub.extraSkills, list: D.ALL_SKILLS });
    if (Sp && Sp.skillPick) g.push({ id: 'species', label: Sp.skillPick.label, count: Sp.skillPick.count, list: Sp.skillPick.list === 'any' ? D.ALL_SKILLS : Sp.skillPick.list });
    E.featKeys(c).forEach((k, i) => { if (k === 'skilled') g.push({ id: 'skilled' + i, label: T("Skilled feat — 3 skills of your choice"), count: 3, list: D.ALL_SKILLS }); });
    return { groups: g, fixed: bg ? bg.skills.slice() : [] };
  };
  E.profSkills = function (c) {
    const sg = E.skillGroups(c); const set = new Set(sg.fixed);
    sg.groups.forEach(gr => (c.picks[gr.id] || []).slice(0, gr.count).forEach(s => set.add(s)));
    return set;
  };
  E.expertiseCount = function (c) {
    const C = D.CLASSES[c.classKey]; if (!C || !C.expertise) return 0;
    let n = 0; Object.keys(C.expertise).forEach(l => { if (c.level >= +l) n += C.expertise[l]; }); return n;
  };

  // ---------- proficiencies ----------
  E.weaponProf = function (c, w) {
    const C = D.CLASSES[c.classKey]; if (!C) return w.cat === 'simple';
    if (w.cat === 'simple') return true;
    if (C.martial === true) return true;
    if (E.subFeats(c, 'martialProf').length) return true;
    if (c.classKey === 'cleric' && c.opts.order === 'protector') return true;
    if (c.classKey === 'druid' && c.opts.order === 'warden') return true;
    if (C.martial === 'finesse-light') return w.props.includes('Finesse') || w.props.includes('Light');
    if (C.martial === 'light') return w.props.includes('Light');
    return false;
  };
  E.armorProf = function (c, A) {
    const C = D.CLASSES[c.classKey]; if (!C) return false;
    const list = C.armor.slice();
    if (c.classKey === 'cleric' && c.opts.order === 'protector') list.push('heavy');
    if (c.classKey === 'druid' && c.opts.order === 'warden') list.push('medium');
    E.subFeats(c, 'armorProf').forEach(f => list.push(...f.armorProf));
    return list.includes(A.type);
  };

  const dieFaces = d => { const m = String(d).match(/d(\d+)/); return m ? Number(m[1]) : 0; };
  const biggerDie = (a, b) => (dieFaces(a) >= dieFaces(b) ? a : b);

  // ---------- main computation ----------
  E.compute = function (c) {
    const C = D.CLASSES[c.classKey] || null, Sp = D.SPECIES[c.speciesKey] || null, bg = D.BACKGROUNDS[c.backgroundKey] || null;
    const SpO = Sp && Sp.options ? Sp.options[c.speciesOpt] || null : null;
    const lvl = c.level, pb = D.pb(lvl);
    const feats = E.allFeatures(c);
    const L = E.activeEffects(c, feats);
    const warnings = [];

    const score = E.abilityScores(c);
    D.ABIL.forEach(a => { score[a] += E.effSum(L, 'ability', null, a); });
    const mod = {}; D.ABIL.forEach(a => { mod[a] = E.modOf(score[a]); });
    const x = { lvl, pb, mod };
    const featKeys = E.featKeys(c);

    const saves = {};
    const extraSaves = new Set();
    E.asiList(c).forEach(s => { if (s.k === 'feat' && s.a && D.GENERAL_FEATS && D.GENERAL_FEATS[s.f] && D.GENERAL_FEATS[s.f].saveProf) extraSaves.add(s.a); });
    if (c.classKey === 'rogue' && lvl >= 15) { extraSaves.add('WIS'); extraSaves.add('CHA'); }
    if (c.classKey === 'monk' && lvl >= 14) D.ABIL.forEach(a => extraSaves.add(a));
    E.subFeats(c, 'saveProf').forEach(f => { const a = f.saveProf.find(s => !(C && C.saves.includes(s))); if (a) extraSaves.add(a); });
    const aura = c.classKey === 'paladin' && lvl >= 6 ? Math.max(1, mod.CHA) : 0;
    D.ABIL.forEach(a => { const p = !!(C && C.saves.includes(a)) || extraSaves.has(a); saves[a] = { prof: p, val: mod[a] + (p ? pb : 0) + aura + E.effSum(L, 'save') }; });

    const prof = E.profSkills(c);
    const exp = new Set((c.picks.expertise || []).slice(0, E.expertiseCount(c)).filter(s => prof.has(s)));
    const jack = c.classKey === 'bard' && lvl >= 2;
    const skills = {};
    D.ALL_SKILLS.forEach(s => {
      const a = D.SKILLS[s]; let v = mod[a]; let lv = 0;
      if (exp.has(s)) { v += 2 * pb; lv = 2; } else if (prof.has(s)) { v += pb; lv = 1; } else if (jack) v += Math.floor(pb / 2);
      if (c.classKey === 'cleric' && c.opts.order === 'thaumaturge' && (s === 'Arcana' || s === 'Religion')) v += Math.max(1, mod.WIS);
      if (c.classKey === 'druid' && c.opts.order === 'magician' && (s === 'Arcana' || s === 'Nature')) v += Math.max(1, mod.WIS);
      v += E.effSum(L, 'skills');
      skills[s] = { abil: a, lv, val: v };
    });

    // Armor Class
    const armorItem = c.inventory.find(it => it.equipped && it.armor && D.ARMOR[it.armor] && D.ARMOR[it.armor].type !== 'shield') || null;
    const shieldItem = c.inventory.find(it => it.equipped && it.armor === 'shield') || null;
    const A = armorItem ? D.ARMOR[armorItem.armor] : null;
    const cands = [];
    if (A) {
      const dexMax = A.dexMax === 2 && feats.some(f => f.medArmorMaster) ? 3 : A.dexMax; // Medium Armor Master feat
      const dex = dexMax === null ? mod.DEX : Math.min(mod.DEX, dexMax);
      cands.push({ v: A.base + dex + (Number(armorItem.magicBonus) || 0), sh: true, why: E.itemName(armorItem) + " (" + A.base + (A.dexMax === 0 ? "" : " + " + D.AB.DEX + (dexMax === 3 ? " " + T("max +3") : A.dexMax === 2 ? " " + T("max +2") : "")) + (Number(armorItem.magicBonus) ? " + " + T("magic") + " " + Number(armorItem.magicBonus) : "") + ")" });
      if (!E.armorProf(c, A)) warnings.push(T('Not proficient with {0}: Disadvantage on STR/DEX tests and can\'t cast spells.', A.name));
    } else {
      cands.push({ v: 10 + mod.DEX, sh: true, why: T("No armor (10 + DEX)") });
      if (c.classKey === 'barbarian') cands.push({ v: 10 + mod.DEX + mod.CON, sh: true, why: T("Unarmored Defense (10 + DEX + CON)") });
      if (c.classKey === 'monk') cands.push({ v: 10 + mod.DEX + mod.WIS, sh: false, why: T("Unarmored Defense (10 + DEX + WIS)") });
      if (c.classKey === 'sorcerer' && lvl >= 3 && c.opts.subclass === 'draconic') cands.push({ v: 10 + mod.DEX + mod.CHA, sh: true, why: T("Draconic Resilience (10 + DEX + CHA)") });
      E.subFeats(c, 'unarmoredAC').forEach(f => { if (!shieldItem) cands.push({ v: 10 + mod.DEX + mod[f.unarmoredAC], sh: false, why: f.name + " (10 + " + D.AB.DEX + " + " + D.AB[f.unarmoredAC] + ")" }); });
      if (c.toggles['spell:Mage Armor'] || c.toggles['inv:armorofshadows']) cands.push({ v: 13 + mod.DEX, sh: true, why: T("Mage Armor (13 + DEX)") });
    }
    let best = null;
    cands.forEach(cd => {
      if (shieldItem && !cd.sh) return;
      const v = cd.v + (shieldItem ? 2 + (Number(shieldItem.magicBonus) || 0) : 0);
      if (!best || v > best.v) best = { v, why: cd.why + (shieldItem ? " + " + T("Shield") + " " + (2 + (Number(shieldItem.magicBonus) || 0)) : "") };
    });
    if (!best) best = { v: 10 + mod.DEX, why: "10 + " + D.AB.DEX };
    let ac = best.v; let acWhy = best.why;
    if (A && E.styles(c).has('defense')) { ac += 1; acWhy += " + " + T("Defense style") + " 1"; }
    const acEff = E.effSum(L, 'ac'); if (acEff) { ac += acEff; acWhy += " + " + T("magic") + " " + E.sign(acEff) + " (" + d_srcs(L) + ")"; }
    if (shieldItem && C && !C.armor.includes('shield') && !(c.classKey === 'druid')) warnings.push(T("Not proficient with shields."));

    // Hit Points
    let hpMax = C ? C.hitDie + mod.CON + (lvl - 1) * (C.hitDie / 2 + 1 + mod.CON) : 8 + mod.CON;
    if (featKeys.includes('tough')) hpMax += 2 * lvl;
    if (Sp && Sp.hpPerLevel) hpMax += Sp.hpPerLevel * lvl;
    if (c.classKey === 'sorcerer' && lvl >= 3 && c.opts.subclass === 'draconic') hpMax += lvl;
    hpMax += E.effSum(L, 'hpMax');

    // Speed & initiative
    let speed = (SpO && SpO.speed) || (Sp ? Sp.speed : 30);
    if (c.classKey === 'monk' && lvl >= 2 && !A && !shieldItem) speed += D.monkSpeed ? D.monkSpeed(lvl) : 10;
    if (c.classKey === 'barbarian' && lvl >= 5 && !(A && A.type === 'heavy')) speed += 10;
    if (c.classKey === 'ranger' && lvl >= 6 && !(A && A.type === 'heavy')) speed += 10;
    if (A && A.str && score.STR < A.str) { speed -= 10; warnings.push(T("{0} needs STR {1}: Speed −10 ft.", A.name, A.str)); }
    speed += E.effSum(L, 'speed');
    let init = mod.DEX + (featKeys.includes('alert') ? pb : 0) + E.effSum(L, 'initiative');
    E.subFeats(c, 'initAbil').forEach(f => { init += mod[f.initAbil]; });

    const ov = c.overrides || {};
    const has = k => ov[k] !== '' && ov[k] != null && !isNaN(Number(ov[k]));
    if (has('ac')) { ac = Number(ov.ac); acWhy = T("Manual override"); }
    if (has('hpMax')) hpMax = Number(ov.hpMax);
    if (has('speed')) speed = Number(ov.speed);
    if (has('init')) init = Number(ov.init);
    hpMax = Math.max(1, hpMax);

    const d = {
      C, Sp, SpO, bg, lvl, pb, score, mod, saves, skills, prof, exp, ac, acWhy, hpMax, speed, init,
      passive: 10 + skills.Perception.val, feats, L, featKeys, x, warnings,
      critRange: (c.classKey === 'fighter' && c.opts.subclass === 'champion') ? (lvl >= 15 ? 18 : lvl >= 3 ? 19 : 20) : 20,
      armorItem, shieldItem, A, stealthDis: !!(A && A.stealthDis),
      darkvision: (SpO && SpO.darkvision) || (Sp && Sp.darkvision) || 0,
      luck: c.speciesKey === 'halfling'
    };
    d.casting = E.casting(c, d);
    d.actions = E.actions(c, d);
    d.resources = E.resources(c, d);
    d.hpCur = c.hp.cur == null ? hpMax : Math.min(c.hp.cur, hpMax);
    return d;
  };

  E.bestMental = d => ['INT', 'WIS', 'CHA'].reduce((b, a) => (d.mod[a] > d.mod[b] ? a : b), 'INT');

  // ---------- spellcasting ----------
  E.casting = function (c, d) {
    const C = d.C;
    const info = { ability: null, slots: [], pact: null, cantripsN: 0, preparedN: 0, maxLevel: 0, list: [], dc: null, atk: null };
    const subC = E.subclass(c);
    const cs0 = (C && C.casting) || (subC && subC.casting) || null; // Eldritch Knight / Arcane Trickster cast through their subclass
    if (cs0) {
      const cs = cs0, i = d.lvl - 1;
      info.ability = cs.ability; info.listKey = cs.list || c.classKey;
      info.cantripsN = cs.cantrips[i] + (((c.classKey === 'cleric' && c.opts.order === 'thaumaturge') || (c.classKey === 'druid' && c.opts.order === 'magician')) ? 1 : 0);
      info.preparedN = cs.prepared[i];
      if (cs.type === 'pact') { info.pact = D.PACT[i]; info.maxLevel = info.pact.level; }
      else { info.slots = D.SLOTS[cs.type][i]; info.maxLevel = info.slots.length; }
    }
    const find = n => D.SPELLS.find(s => s.n === n) || c.customSpells.find(s => s.n === n);
    const add = (n, src, ability, always) => {
      const sp = find(n); if (!sp || info.list.some(e => e.sp.n === n)) return;
      info.list.push({ sp, src, ability: ability || 'INT', always: !!always });
    };
    const classAb = info.ability || E.bestMental(d);
    if (info.ability) (c.picks.cantrips || []).slice(0, info.cantripsN).forEach(n => add(n, C.name, info.ability));
    d.feats.forEach(f => (f.spells || []).forEach(n => add(n, f.name, classAb, true)));
    // subclass spells that unlock with class level: spellsAt = { 3: [...], 5: [...] }
    d.feats.forEach(f => {
      const at = f.landSpells ? ((D.LANDS || {})[c.opts.land] || {}).spellsAt : f.spellsAt; // Circle of the Land: spells of the chosen land
      if (at) Object.keys(at).forEach(l => { if (d.lvl >= +l) at[l].forEach(n => add(n, f.name, classAb, true)); });
    });
    if (info.ability) (c.picks.prepared || []).slice(0, info.preparedN).forEach(n => add(n, C.name, info.ability));
    const spAb = c.opts.speciesAbility || E.bestMental(d);
    if (d.SpO && d.SpO.cantrip) add(d.SpO.cantrip, d.Sp.name, spAb, true);
    if (c.speciesKey === 'tiefling') add("Thaumaturgy", d.Sp.name, spAb, true);
    if (c.speciesKey === 'gnome' && c.speciesOpt === 'rock') add("Prestidigitation", d.SpO ? d.SpO.name : d.Sp.name, spAb, true);
    if (d.featKeys.includes('magicinitiate')) {
      const ml = E.miList(c); const ab = c.opts.miAbility || (D.MI_LISTS[ml] && D.MI_LISTS[ml].ability) || 'INT';
      (c.picks.miCantrips || []).slice(0, 2).forEach(n => add(n, T("Magic Initiate"), ab));
      (c.picks.miSpell || []).slice(0, 1).forEach(n => add(n, T("Magic Initiate (1 free cast / Long Rest)"), ab));
    }
    c.customSpells.forEach(s => add(s.n, T("Custom"), s.ability || classAb));
    const dcB = E.effSum(d.L, 'spellDC'), atkB = E.effSum(d.L, 'spellAttack');
    info.list.forEach(e => { e.dc = 8 + d.pb + d.mod[e.ability] + dcB; e.atk = d.pb + d.mod[e.ability] + atkB; });
    if (info.ability) { info.dc = 8 + d.pb + d.mod[info.ability] + dcB; info.atk = d.pb + d.mod[info.ability] + atkB; }
    info.list.sort((a, b) => a.sp.l - b.sp.l || a.sp.n.localeCompare(b.sp.n));
    return info;
  };

  // ---------- attacks & rollable actions ----------
  E.actions = function (c, d) {
    const acts = []; const FS = E.styles(c); const fs = { has: k => FS.has(k) };
    const masteries = c.picks.masteries || [];
    const mk = (o) => Object.assign({ critRange: d.critRange, count: 1, mult: 1 }, o);
    let nAtk = D.attacksOf ? D.attacksOf(d.C, d.lvl) : 1;
    E.subFeats(c, 'extraAttack').forEach(f => { nAtk = Math.max(nAtk, f.extraAttack); });
    const mdie = D.monkDie ? D.monkDie(d.lvl) : '1d6';
    c.inventory.forEach(it => {
      const w = D.WEAPONS[it.weapon]; if (!w) return;
      const fin = w.props.includes('Finesse'); const ranged = w.range === 'ranged';
      const monkW = c.classKey === 'monk' && ((w.cat === 'simple' && w.range === 'melee') || (w.cat === 'martial' && w.props.includes('Light')));
      let ab = ranged ? 'DEX' : 'STR'; if (fin || monkW) ab = d.mod.DEX > d.mod.STR ? 'DEX' : 'STR';
      const pactW = !ranged && c.classKey === 'warlock' && d.feats.some(f => f.pactBlade); // Pact of the Blade: CHA and proficiency with melee weapons
      if (pactW && d.mod.CHA > d.mod[ab]) ab = 'CHA';
      const prof = E.weaponProf(c, w) || pactW;
      const mb = Number(it.magicBonus) || 0;
      const twoH = w.props.some(p => p.indexOf('Two-Handed') === 0);
      const mastery = masteries.includes(it.weapon) ? w.mastery : null;
      const base = { kind: 'weapon', item: it.id, ability: ab, prof, dtype: w.type, mastery, equipped: !!it.equipped, props: w.props };
      const build = (scope, die, extraDmg, extraHit, min3, suffix) => {
        const hit = d.mod[ab] + (prof ? d.pb : 0) + mb + extraHit + E.effSum(d.L, 'attack', scope);
        const bonus = d.mod[ab] + mb + extraDmg + E.effSum(d.L, 'damage', scope);
        const mult = E.effMult(d.L, scope);
        return mk(Object.assign({}, base, {
          id: it.id + ':' + scope + suffix, name: E.itemName(it) + (suffix ? " " + T(suffix) : ""), hit, dmg: die + E.fmtBonus(bonus), min3,
          mult, multSrc: E.multSources(d.L, scope), graze: mastery === 'Graze' ? Math.max(0, d.mod[ab] + mb) : 0, scope
          , count: nAtk
        }));
      };
      const die = monkW ? biggerDie(w.dmg, mdie) : w.dmg;
      if (ranged) acts.push(build('ranged', die, 0, fs.has('archery') ? 2 : 0, false, ''));
      else {
        const dueling = fs.has('dueling') && !twoH ? 2 : 0;
        acts.push(build('melee', die, dueling, 0, fs.has('gwf') && twoH, ''));
        if (w.versatile && !d.shieldItem) acts.push(build("melee", monkW ? biggerDie(w.versatile, mdie) : w.versatile, 0, 0, fs.has('gwf'), "(two hands)"));
        if (w.thrown) acts.push(build("ranged", die, fs.has('thrown') ? 2 : 0, 0, false, "(thrown)"));
      }
    });
    // Unarmed strike
    {
      let ab = 'STR', die = '1';
      if (c.classKey === 'monk') { ab = d.mod.DEX > d.mod.STR ? 'DEX' : 'STR'; die = mdie; }
      if (d.featKeys.includes('tavern')) die = biggerDie(die, '1d4');
      if (E.styles(c).has('unarmed')) die = biggerDie(die, '1d6');
      const bonus = d.mod[ab] + E.effSum(d.L, 'damage', 'melee');
      acts.push(mk({ kind: 'weapon', id: 'unarmed', name: T("Unarmed Strike"), ability: ab, prof: true, hit: d.mod[ab] + d.pb + E.effSum(d.L, 'attack', 'melee'),
        dmg: die + E.fmtBonus(bonus), dtype: 'bludgeoning', mult: E.effMult(d.L, 'melee'), multSrc: E.multSources(d.L, 'melee'), equipped: true, scope: 'melee' }));
    }
    // Attacks given by a feature (Psychic Blades, a beast companion, Starry Form archer...): f.atk = { die, abil, add, flat, dtype, ranged, spell, count }
    d.feats.forEach(f => {
      const a = f.atk; if (!a) return;
      const ab = a.abil === 'finesse' ? (d.mod.DEX > d.mod.STR ? 'DEX' : 'STR') : a.abil || null;
      const castAb = d.casting.ability || E.bestMental(d);
      const hit = a.spell ? (d.casting.atk != null ? d.casting.atk : d.pb + d.mod[castAb] + E.effSum(d.L, 'spellAttack')) : d.mod[ab] + d.pb + E.effSum(d.L, 'attack', a.ranged ? 'ranged' : 'melee');
      const scope = a.spell ? 'spell' : a.ranged ? 'ranged' : 'melee';
      const bonus = (ab && !a.spell ? d.mod[ab] + E.effSum(d.L, 'damage', scope) : 0) + (a.add ? d.mod[a.add] : 0) + (a.flat || 0);
      const die = typeof a.die === 'function' ? a.die(d.x) : a.die;
      const cnt = a.count === 'atk' ? nAtk : typeof a.count === 'function' ? a.count(d.x) : a.count || 1;
      acts.push(mk({ kind: 'weapon', id: 'fa:' + f.id, name: f.name, ability: ab || castAb, prof: true, hit, dmg: die + E.fmtBonus(bonus), dtype: a.dtype || '',
        mult: E.effMult(d.L, scope), multSrc: E.multSources(d.L, scope), equipped: true, scope, count: cnt, critRange: a.spell ? 20 : d.critRange }));
    });
    // Spells
    const agon =(c.picks.invocations || []).includes('agonizing');
    const lifeBonus = c.classKey === 'cleric' && E.subclass(c) && c.opts.subclass === 'life';
    d.casting.list.forEach(e => {
      const sp = e.sp; if (!sp.a) return;
      let dmg = sp.d || '0';
      let cnt = sp.count || 1;
      if (sp.l === 0 && sp.d) { // cantrips grow at levels 5, 11, 17
        const tierN = d.lvl >= 17 ? 4 : d.lvl >= 11 ? 3 : d.lvl >= 5 ? 2 : 1;
        if (sp.n === 'Eldritch Blast') cnt = tierN; else dmg = dmg.replace(/^(\d*)d(\d+)/, (m, n, f) => (Number(n || 1) * tierN) + 'd' + f);
      }
      if (sp.addMod) dmg += E.fmtBonus(d.mod[e.ability]);
      if (agon && sp.n === 'Eldritch Blast') dmg += E.fmtBonus(d.mod.CHA);
      if (sp.a === 'heal' && lifeBonus && sp.l >= 1) dmg += E.fmtBonus(2 + sp.l);
      // Hex / Hunter's Mark: cast once (toggle on the sheet spends the slot), then roll the extra damage for free on each hit
      const rider = sp.a === 'dmg' && sp.conc;
      acts.push(mk({
        kind: 'spell', id: 'sp:' + sp.n, name: (sp.name || sp.n) + (rider ? " " + T("(extra damage)") : ""), level: rider ? 0 : sp.l, conc: !!sp.conc,
        hit: sp.a === 'atk' ? e.atk : null, save: sp.a === 'save' ? { abil: sp.s, dc: e.dc } : null,
        dmg: sp.d ? dmg : null, dtype: sp.dt || '', half: !!sp.half, count: cnt,
        auto: sp.a === 'auto', heal: sp.a === 'heal', temp: sp.a === 'temp', extra: sp.a === 'dmg',
        mult: E.effMult(d.L, 'spell'), multSrc: E.multSources(d.L, 'spell'), critRange: 20
      }));
    });
    // Features with rolls (Sneak Attack, Second Wind, Breath Weapon...)
    d.feats.forEach(f => {
      if (f.breath) {
        const o = d.SpO; const dc = 8 + d.mod.CON + d.pb;
        acts.push(mk({ kind: 'feature', id: 'f:' + f.id, name: f.name, save: { abil: 'DEX', dc }, dmg: '1d10', dtype: o ? o.dtype : 'fire', half: true, mult: E.effMult(d.L, 'all'), multSrc: E.multSources(d.L, 'all'), res: f.id }));
        return;
      }
      if (!f.roll) return;
      let roll = typeof f.roll === 'function' ? f.roll(d.x) : f.roll;
      if (roll === 'SNEAK') roll = Math.ceil(d.lvl / 2) + 'd6';
      const isHeal = !!f.heal;
      const dmgLike = f.custom ? !!f.isDamage : !!f.dmgx;
      acts.push(mk({ kind: 'feature', id: 'f:' + f.id, name: f.name, dmg: roll, heal: isHeal, extra: !isHeal && dmgLike, plain: !isHeal && !dmgLike, dtype: f.sneak ? T("(same as weapon)") : "",
        mult: isHeal ? 1 : E.effMult(d.L, 'all'), multSrc: isHeal ? '' : E.multSources(d.L, 'all'), res: f.uses ? f.id : null, ctx: true }));
    });
    // Consumables / items with rolls
    c.inventory.forEach(it => { if (it.roll) acts.push(mk({ kind: "item", id: "it:" + it.id, name: E.itemName(it), dmg: it.roll, heal: !!it.heal, temp: !!it.temp, extra: !it.heal && !it.temp, mult: 1, item: it.id })); });
    return acts;
  };

  // ---------- resources (uses, slots, hit dice) ----------
  E.resources = function (c, d) {
    const r = [];
    d.feats.forEach(f => { if (f.uses) r.push({ id: f.id, name: f.name, max: E.resolveMax(f.uses.max, d.x), reset: (typeof f.uses.reset === 'function' ? f.uses.reset(d.x) : f.uses.reset) || 'long', pool: !!f.pool }); });
    d.casting.slots.forEach((n, i) => r.push({ id: 'slot' + (i + 1), name: T("Spell slots · level {0}", i + 1), max: n, reset: 'long', slot: i + 1 }));
    if (d.casting.pact) r.push({ id: 'pact', name: T("Pact slots · level {0}", d.casting.pact.level), max: d.casting.pact.count, reset: 'short', slot: d.casting.pact.level, pact: true });
    r.push({ id: 'hd', name: T("Hit Dice") + " (d" + (d.C ? d.C.hitDie : 8) + ")", max: d.lvl, reset: 'long', hd: true });
    return r;
  };
  E.left = (c, r) => Math.max(0, r.max - (Number(c.used[r.id]) || 0));

  E.shortRest = function (c) {
    const d = E.compute(c);
    d.resources.forEach(r => {
      if (r.reset === 'short') c.used[r.id] = 0;
      if (r.reset === 'short1') c.used[r.id] = Math.max(0, (Number(c.used[r.id]) || 0) - 1);
    });
  };
  E.longRest = function (c) {
    const d = E.compute(c);
    d.resources.forEach(r => { c.used[r.id] = 0; });
    c.hp.cur = d.hpMax; c.hp.temp = 0; c.deathSaves = { s: 0, f: 0 };
    c.conditions = c.conditions.filter(x => x !== 'Unconscious');
    if (c.speciesKey === 'human') c.inspiration = true;
    Object.keys(c.toggles).forEach(k => { if (k.indexOf('spell:') === 0 && k !== 'spell:Mage Armor') delete c.toggles[k]; });
  };

  // ---------- damage / healing on a character ----------
  E.damageChar = function (c, n) {
    const d = E.compute(c); let cur = d.hpCur; let temp = Number(c.hp.temp) || 0; const notes = [];
    if (n <= 0) return notes;
    if (cur === 0) { c.deathSaves.f = Math.min(3, c.deathSaves.f + 1); notes.push(T("already at 0 HP → 1 death save failure")); if (n >= d.hpMax) notes.push(T("massive damage: dies instantly!")); return notes; }
    const absorbed = Math.min(temp, n); temp -= absorbed; let rest = n - absorbed;
    if (absorbed) notes.push(T("{0} absorbed by temp HP", absorbed));
    const over = rest - cur; cur = Math.max(0, cur - rest);
    c.hp.cur = cur; c.hp.temp = temp;
    if (cur === 0) {
      if (over >= d.hpMax) notes.push(T("massive damage: dies instantly!") + " 💀");
      else { notes.push(T("drops to 0 HP — Unconscious, roll death saves")); if (!c.conditions.includes('Unconscious')) c.conditions.push('Unconscious'); }
    }
    if (c.conditions.includes('Concentrating')) notes.push(T("Concentration: CON save DC {0}", Math.min(30, Math.max(10, Math.floor(n / 2)))));
    return notes;
  };
  E.healChar = function (c, n) {
    const d = E.compute(c); const wasDown = d.hpCur === 0;
    c.hp.cur = Math.min(d.hpMax, d.hpCur + n);
    if (wasDown && n > 0) { c.deathSaves = { s: 0, f: 0 }; c.conditions = c.conditions.filter(x => x !== 'Unconscious'); }
  };
})();
