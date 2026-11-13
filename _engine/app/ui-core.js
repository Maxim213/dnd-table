// UI core: mode (DM / player), storage, helpers, dice resolver, side panel, info popups, wiring.
window.UI = (function () {
  'use strict';
  const D = window.DND, E = window.ENG, esc = E.esc, sign = E.sign;
  const U = { D, E, esc, sign, views: {}, ACT: {}, ON: {}, FORMS: {} };

  // ---------- language ----------
  // English data is the base. In Russian mode the layer from data/ru/*.js is laid on top (text only).
  let lang = 'ru'; try { lang = localStorage.getItem('dnd.lang') || 'ru'; } catch (e) { /* ignore */ }
  if (!window.DND_RU) lang = 'en';
  U.LANG = lang; D.LANG = lang;
  (function stamp() { // remember the English names: they are the stable ids that saves use
    Object.values(D.CLASSES).forEach(C => { C.features.forEach(f => { f.key = f.key || f.name; }); Object.values(C.subclasses || {}).forEach(s => s.features.forEach(f => { f.key = f.key || f.name; })); });
    Object.values(D.SPECIES).forEach(S => { S.traits.forEach(t => { t.key = t.key || t.name; }); Object.values(S.options || {}).forEach(o => { o.key = o.key || o.name; }); });
    Object.values(D.WEAPONS).forEach(w => { w.en = w.name; }); Object.values(D.ARMOR).forEach(a => { a.en = a.name; });
    D.SPELLS.forEach(s => { s.name = s.n; });
  })();
  if (lang === 'ru') {
    const R = window.DND_RU;
    const merge = (t, s) => { Object.keys(s).forEach(k => { const v = s[k]; if (v && typeof v === 'object' && t[k] && typeof t[k] === 'object') merge(t[k], v); else t[k] = v; }); };
    const skip = { SPELL_TEXT: 1, HOMEBREW_TEXT: 1, UI: 1 };
    Object.keys(R).forEach(k => { if (skip[k]) return; if (D[k] && typeof D[k] === 'object' && R[k] && typeof R[k] === 'object') merge(D[k], R[k]); else D[k] = R[k]; });
    D.SPELLS.forEach(s => { const x = R.SPELL_TEXT && R.SPELL_TEXT[s.n]; if (x) { s.name = x[0]; s.t = x[1]; s.r = x[2]; s.desc = x[3]; } });
    D.HOMEBREW_ITEMS.forEach(it => { const x = R.HOMEBREW_TEXT && R.HOMEBREW_TEXT[it.name]; if (x) it.desc = x; });
    // newer data files carry their Russian text inline: ru: [name, desc] (spells: [name, time, range, desc])
    const ruF = f => { if (f && Array.isArray(f.ru)) { f.name = f.ru[0] || f.name; f.desc = f.ru[1] || f.desc; } };
    Object.values(D.CLASSES).forEach(C => { C.features.forEach(ruF); Object.values(C.subclasses || {}).forEach(s => { s.features.forEach(ruF); if (s.ru) { s.name = s.ru[0]; s.desc = s.ru[1]; } }); });
    Object.values(D.GENERAL_FEATS || {}).forEach(ruF);
    Object.values(D.SPECIES).forEach(Sp => { Sp.traits.forEach(ruF); if (Sp.ru) { Sp.name = Sp.ru[0]; Sp.blurb = Sp.ru[1]; } });
    D.SPELLS.forEach(s => { if (Array.isArray(s.ru)) { s.name = s.ru[0]; s.t = s.ru[1]; s.r = s.ru[2]; s.desc = s.ru[3]; } });
  }
  (D.AFTER_LANG || []).forEach(fn => fn(lang));
  const UIS = (lang === 'ru' && window.DND_RU && window.DND_RU.UI) || {};
  // T('text {0}', value): the UI text in the chosen language
  const T = U.T = E.T = function (s, ...a) { let r = UIS[s] != null ? UIS[s] : s; a.forEach((v, i) => { r = r.split('{' + i + '}').join(v); }); return r; };
  const t = D.t, AB = a => D.AB[a] || a;
  U.spName = n => { const s = D.SPELLS.find(x => x.n === n); return s ? s.name : n; };

  // ---------- mode ----------
  // DnD_Game_DM.html = DM version. The file made by make_player_file.ps1 sets APP_MODE = 'player'.
  U.PLAYER = window.APP_MODE === 'player';
  U.DM = !U.PLAYER;
  const P = U.PLAYER ? 'dndp.' : 'dndt.'; // separate storage so DM and player files never mix on one computer

  // ---------- storage ----------
  // raw = this version's whole browser storage. DM data is split into GAMES (save slots):
  //   dndt.games = [{id, name, created, updated}], dndt.curGame = id, dndt.g.<id>.<key> = that game's data.
  // The player version has no games (one pile under dndp.).
  const raw = U.raw = {
    get(k, def) { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { U.toast(T('⚠️ Browser storage is full or blocked — use 💾 Save file to keep a copy.')); return false; } },
    del(k) { try { localStorage.removeItem(P + k); } catch (e) { /* ignore */ } }
  };
  U.GAME_KEYS = ['chars', 'combat', 'monsters', 'encounters', 'log', 'view', 'charId', 'shops', 'scenario', 'itemEdits'];
  U.games = []; U.game = null;
  if (U.DM) {
    let games = raw.get('games', null);
    if (!Array.isArray(games)) { // first start with games: old data becomes the game "Practice"
      games = [];
      const hasOld = ['chars', 'monsters', 'encounters', 'combat'].some(k => localStorage.getItem(P + k) != null);
      if (hasOld) {
        const id = E.uid(); games.push({ id, name: 'Practice', created: Date.now(), updated: Date.now() });
        U.GAME_KEYS.forEach(k => { const v = localStorage.getItem(P + k); if (v != null) { localStorage.setItem(P + 'g.' + id + '.' + k, v); localStorage.removeItem(P + k); } });
        raw.set('curGame', id);
      }
      raw.set('games', games);
    }
    U.games = games;
    U.game = games.find(g => g.id === raw.get('curGame', null)) || null;
  }
  const gp = () => (U.DM ? 'g.' + (U.game ? U.game.id : '_none') + '.' : '');
  let touchT = 0;
  const store = U.store = {
    get(k, def) { return raw.get(gp() + k, def); },
    set(k, v) {
      if (U.DM && !U.game) return false; // no game open → nothing to save into
      const ok = raw.set(gp() + k, v);
      if (ok && U.DM && k !== 'view' && k !== 'charId' && Date.now() - touchT > 5000) { touchT = Date.now(); U.game.updated = touchT; raw.set('games', U.games); }
      return ok;
    }
  };
  const S = U.S = { step: 0, mode: 'normal', editing: {}, combatTab: 'fight', monSel: null };
  U.loadState = function () { // (re)load everything of the open game into S
    Object.assign(S, {
      chars: store.get('chars', []).map(E.normalize),
      combat: store.get('combat', { list: [], round: 0, turn: -1, target: {} }),
      monsters: store.get('monsters', []),
      encounters: store.get('encounters', []), shops: store.get('shops', []), loot: { gold: 0, items: [] },
      log: store.get('log', []),
      view: store.get('view', 'home'), charId: store.get('charId', null), step: 0,
      mode: 'normal', editing: {}, combatTab: 'fight', monSel: null
    });
    if (!S.combat || !Array.isArray(S.combat.list)) S.combat = { list: [], round: 0, turn: -1, target: {} };
    if (!S.combat.target) S.combat.target = {};
    if (U.DM && !U.game) S.view = 'games';
  };
  U.loadState();
  U.saveChars = () => store.set('chars', S.chars);
  U.saveCombat = () => store.set('combat', S.combat);
  U.saveMonsters = () => store.set('monsters', S.monsters);
  U.saveEncounters = () => store.set('encounters', S.encounters);
  U.saveLog = () => store.set('log', S.log.slice(0, 150));
  U.cur = () => S.chars.find(c => c.id === S.charId);
  U.byId = id => S.chars.find(c => c.id === id);
  U.locked = c => U.PLAYER && c && c.dmLocked;

  // ---------- small UI helpers ----------
  U.toast = function (html) {
    const el = document.getElementById('toast'); if (!el) return;
    el.innerHTML = html; el.classList.add('show');
    clearTimeout(U.toast._t); U.toast._t = setTimeout(() => el.classList.remove('show'), 4500);
  };
  // dice animation (≈1 second), can be switched off in the side panel
  U.animOn = () => { try { return localStorage.getItem('dnd.anim') !== '0'; } catch (e) { return true; } };
  const SND = window.SND || { click() {}, roll() {}, land() {}, get() {}, set() {} };
  U.SND = SND;
  // final = number to show; d = a d20 roll {dice:[a,b], used, mode, bonus, total} (two dice for advantage / disadvantage)
  // d.faces = sides of each shown die (a number for all, or a list); the die is drawn in its own shape (d4 triangle, d6 square, d8 diamond...)
  U.diceAnim = function (final, kind, done, d) {
    let el = document.getElementById('diceAnim');
    if (!el) { el = document.createElement('div'); el.id = 'diceAnim'; document.body.appendChild(el); }
    const two = !!d && (d.mode === 'adv' || d.mode === 'dis') && d.dice.length === 2;
    const fOf = i => Math.abs(Number(Array.isArray(d.faces) ? d.faces[i] : d.faces) || 20);
    const shape = f => (f <= 4 ? 'f4' : f <= 6 ? 'f6' : f <= 8 ? 'f8' : f <= 10 ? 'f10' : f <= 12 ? 'f12' : f <= 20 ? 'f20' : 'f100');
    const die = i => '<div class="dcol"><div class="d20 ' + shape(fOf(i)) + '"><span>?</span></div><small>' + (d.label && two ? '' : 'd' + fOf(i)) + '</small></div>';
    el.className = 'show rolling' + (two ? ' two' : '') + (d && d.dice.length > 3 ? ' many' : '');
    el.innerHTML = d ? '<div class="dice2">' + d.dice.map((v, i) => die(i)).join('') + '</div><div class="why"></div><div class="tot"></div>'
      : '<div class="die">🎲</div><div class="num">?</div>';
    const faces = el.querySelectorAll(d ? '.d20 span' : '.num'); let n = 0;
    SND.roll(0.55);
    const iv = setInterval(() => { faces.forEach((f, i) => { f.textContent = 1 + Math.floor(Math.random() * (d ? fOf(i) : 20)); }); if (++n > 12) { clearInterval(iv); land(); } }, 45);
    function land() {
      SND.land(kind);
      el.className = 'show landed ' + (two ? 'two ' : '') + (kind || '');
      if (!d) faces[0].textContent = final;
      else {
        let keptOne = false;
        d.dice.forEach((v, i) => {
          faces[i].textContent = v; const col = faces[i].closest('.dcol');
          if (two) {
            const keep = !keptOne && v === d.used; if (keep) keptOne = true;
            col.classList.add(keep ? 'keep' : 'drop'); col.querySelector('small').textContent = keep ? '✓ ' + T('kept') : '✗';
          }
        });
        if (two && el.querySelector('.why')) el.querySelector('.why').innerHTML = (d.label ? '<small>' + esc(d.label) + '</small> · ' : '') + (d.mode === 'adv' ? '<span class="adv">' + T('Advantage: the higher die counts') + '</span>' : '<span class="dis">' + T('Disadvantage: the lower die counts') + '</span>');
        const sum = !two && d.dice.length > 1 ? d.dice.map((v, i) => (i && v >= 0 ? '+ ' : '') + v).join(' ') + (d.more ? ' + …' : '') : String(d.used);
        const tt = el.querySelector('.tot'); if (tt) tt.innerHTML = d.bonus || (!two && d.dice.length > 1) ? sum + (d.bonus ? ' ' + sign(d.bonus) : '') + ' = <b>' + d.total + '</b>' : '<b>' + d.total + '</b>';
      }
      setTimeout(() => { el.className = ''; if (done) done(); }, two ? 1000 : 520);
    }
  };
  U.logAdd = function (who, lines) {
    const html = '<div class="lw">' + esc(who) + '</div>' + lines.map(l => '<div>' + l + '</div>').join('');
    S.log.unshift({ t: Date.now(), html }); S.log = S.log.slice(0, 150); U.saveLog();
    U.renderSide();
    const m = html.match(/class="big[^"]*">(-?\d+)</);
    // what to animate: the first d20 of this click, otherwise the first dice expression (damage, healing, a die button)
    const d = E.d20q[0] || U.rollAnimData(E.rq[0]); E.d20q = []; E.rq = [];
    const kind = /class="crit"/.test(html) ? 'crit' : /data-nat1/.test(html) ? 'fumble' : '';
    if ((m || d) && U.animOn()) U.diceAnim(m ? m[1] : d.total, kind, () => U.toast(html), d);
    else { if (m || d) SND.land(kind); U.toast(html); }
  };
  // a rolled expression → animation data: every die in its own shape (up to 8 shown), the flat part as a bonus
  U.rollAnimData = function (r) {
    if (!r || !r.rolls || !r.rolls.length) return null;
    const shown = r.rolls.slice(0, 8); const diceSum = r.rolls.reduce((a, x) => a + x.r, 0);
    return { dice: shown.map(x => x.r), faces: shown.map(x => x.f), used: diceSum, mode: 'normal', bonus: r.total - diceSum, total: r.total, more: r.rolls.length > 8 };
  };
  // ---------- turn economy: each turn = 1 action, 1 bonus action, 1 reaction (the reaction comes back at the start of your turn) ----------
  // what an action costs: 'a' action · 'b' bonus action · 'r' reaction · '-' free (extra damage riders like Sneak Attack, Divine Smite dice)
  U.actCost = function (a) {
    if (!a) return 'a';
    if (a.extra) return '-';
    if (a.kind === 'spell') { const sp = D.SPELLS.find(s => 'sp:' + s.n === a.id); const t0 = String((sp && sp.t) || ''); return /bonus|бонус/i.test(t0) ? 'b' : /reaction|реакц/i.test(t0) ? 'r' : 'a'; }
    if (a.kind === 'item') return a.heal ? 'b' : 'a';
    if (a.kind === 'feature') { const f = (a.desc || '') + ' ' + (a.name || ''); return /bonus action|бонусн/i.test(f) ? 'b' : /reaction|реакци/i.test(f) ? 'r' : 'a'; }
    return 'a';
  };
  U.econNew = () => ({ a: 0, b: 0, r: 0 });
  U.ECON_NAME = { a: 'Action', b: 'Bonus Action', r: 'Reaction' };
  U.ECON_ICON = { a: '🗡', b: '⚡', r: '🛡' };
  // chips: what is still free this turn
  U.econChips = ec => '<span class="econ">' + ['a', 'b', 'r'].map(k => '<span class="eck' + (ec && ec[k] ? ' used' : '') + '" title="' + esc(T(ec && ec[k] ? 'Used this turn' : 'Still free this turn')) + '">' + U.ECON_ICON[k] + ' ' + T(U.ECON_NAME[k]) + '</span>').join('') + '</span>';
  U.takeMode = () => { const m = S.mode; S.mode = 'normal'; return m; };
  U.opt = (v, label, sel) => '<option value="' + esc(v) + '"' + (String(v) === String(sel) ? ' selected' : '') + '>' + esc(label) + '</option>';
  U.pill = (on, act, data, title, sub, dis) =>
    '<button class="opt' + (on ? ' on' : '') + '"' + (dis ? ' disabled' : '') + ' data-act="' + act + '" ' + data + '><span class="box"></span><span><b>' + title + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span></button>';
  U.pips = (max, used, act, id, readonly) => {
    let h = '<span class="pips">';
    for (let i = 0; i < max; i++) h += '<button class="pip' + (i < max - used ? ' full' : '') + '" title="' + esc(T('click to use / restore')) + '"' + (readonly ? ' disabled' : '') + ' data-act="' + act + '" data-id="' + esc(id) + '" data-i="' + i + '"></button>';
    return h + '</span>';
  };
  // ⓘ button that opens an explanation
  U.ib = k => (D.HELP[k] ? '<button class="ib" data-act="info" data-k="' + k + '" title="' + esc(T('What is this?')) + '">i</button>' : '');
  U.portrait = function (c, d, size) {
    if (c.portrait) return '<img class="portrait ' + size + '" src="' + esc(c.portrait) + '" alt="">';
    return '<div class="portrait ' + size + ' ph">' + (d.C ? d.C.icon : '🧙') + '</div>';
  };
  U.download = function (name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  U.fileName = s => (s || 'file').replace(/[^\wЀ-ӿ\- ]+/g, '').trim().replace(/\s+/g, '_') || 'file';

  // ---------- odds (for "how likely is this?") ----------
  U.avgExpr = function (expr, ctx) {
    let s = String(expr == null ? '0' : expr).replace(/\s+/g, '');
    if (ctx) s = s.replace(/@(STR|DEX|CON|INT|WIS|CHA|LVL|PB)/gi, (m, k) => { k = k.toUpperCase(); return k === 'LVL' ? ctx.lvl : k === 'PB' ? ctx.pb : ctx.mod[k]; });
    s = s.replace(/\+-/g, '-').replace(/--/g, '+');
    let tot = 0;
    (s.match(/[+-]?[^+-]+/g) || []).forEach(x => {
      const sg = x[0] === '-' ? -1 : 1; const b = x.replace(/^[+-]/, ''); const m = b.match(/^(\d*)d(\d+)$/i);
      tot += sg * (m ? Number(m[1] || 1) * (Number(m[2]) + 1) / 2 : (Number(b) || 0));
    });
    return Math.max(0, tot);
  };
  U.hitPct = function (bonus, ac, mode) {
    let p = (21 - (Number(ac) - Number(bonus))) / 20; p = Math.min(0.95, Math.max(0.05, p));
    if (mode === 'adv') p = 1 - (1 - p) * (1 - p); else if (mode === 'dis') p = p * p;
    return Math.round(p * 100);
  };
  U.failPct = function (saveBonus, dc) { // chance the target FAILS its save
    const succ = Math.min(1, Math.max(0, (21 - (Number(dc) - Number(saveBonus))) / 20));
    return Math.round((1 - succ) * 100);
  };
  U.oddsTag = (pct, title) => '<span class="odds ' + (pct >= 65 ? 'good' : pct >= 40 ? 'mid' : 'bad') + '" title="' + esc(title || '') + '">' + pct + '%</span>';

  // ---------- conditions with durations (characters and monsters) ----------
  U.holder = h => { if (!Array.isArray(h.conditions)) h.conditions = []; if (!h.condDur || typeof h.condDur !== 'object') h.condDur = {}; return h; };
  U.addCond = (h, name, rounds) => { U.holder(h); if (!h.conditions.includes(name)) h.conditions.push(name); if (Number(rounds) > 0) h.condDur[name] = Number(rounds); else delete h.condDur[name]; };
  U.delCond = (h, name) => { U.holder(h); h.conditions = h.conditions.filter(x => x !== name); delete h.condDur[name]; };
  U.tickConds = h => { // start of that creature's turn
    U.holder(h); const ended = [];
    Object.keys(h.condDur).forEach(k => { h.condDur[k]--; if (h.condDur[k] <= 0) { ended.push(k); U.delCond(h, k); } });
    return ended;
  };
  U.condChips = (h, delAct, data) => U.holder(h).conditions.map(x => '<span class="chip on small" title="' + esc(D.CONDITIONS[x] || '') + '">' + esc(t(x)) + (h.condDur[x] ? ' <b class="dur">' + T('{0}r', h.condDur[x]) + '</b>' : '') +
    (delAct ? ' <button class="x" data-act="' + delAct + '" ' + data + ' data-v="' + esc(x) + '">✕</button>' : '') + '</span>').join('');
  U.condAdder = (onName, data) => '<span class="condadd"><select class="mini" data-on="' + onName + '" ' + data + '><option value="">' + T('＋ condition') + '</option>' +
    Object.keys(D.CONDITIONS).map(k => U.opt(k, t(k), '')).join('') + '</select><select class="mini durSel" title="' + esc(T('How many rounds?')) + '">' +
    U.opt(0, T('until removed'), 0) + [1, 2, 3, 5, 10].map(n => U.opt(n, T(n === 1 ? '{0} round' : '{0} rounds', n) + (n === 10 ? ' ' + T('(1 min)') : ''), 0)).join('') + '</select></span>';
  U.durOf = el => { const s = el.parentNode && el.parentNode.querySelector('.durSel'); return s ? Number(s.value) || 0 : 0; };

  // ---------- conditions and buffs change the rolls by themselves (D&D 2024) ----------
  // Extra marks the app puts on creatures: Blessed (+1d4 attacks & saves), Helped (Advantage on the next attack), Hidden (Advantage on the next attack),
  // Dodging (attacks against it: Disadvantage, its DEX saves: Advantage). They live in .conditions like the others.
  const has = (h, c) => !!(h && Array.isArray(h.conditions) && h.conditions.includes(c));
  U.rollEdge = function (att, tgt, act) { // → { adv: [why…], dis: [why…], crit: bool } for an attack roll
    const A = att && att.holder, G = tgt && tgt.holder; const adv = [], dis = [];
    const melee = act.scope ? act.scope !== 'ranged' : act.kind === 'spell' ? /touch|касан/i.test(String(((D.SPELLS.find(s => 'sp:' + s.n === act.id) || {}).r) || '')) : act.kind !== 'weapon' || !/ranged/.test(act.scope || '');
    const W = n => t(n);
    ['Blinded', 'Poisoned', 'Prone', 'Restrained', 'Frightened'].forEach(c => { if (has(A, c)) dis.push(T('you are {0}', W(c))); });
    ['Invisible', 'Helped', 'Hidden'].forEach(c => { if (has(A, c)) adv.push(T('you are {0}', W(c))); });
    ['Blinded', 'Paralyzed', 'Petrified', 'Restrained', 'Stunned', 'Unconscious'].forEach(c => { if (has(G, c)) adv.push(T('the target is {0}', W(c))); });
    const close = S.near != null ? S.near : melee; // distance on the map when known (online), else melee = next to it
    if (has(G, 'Prone')) (close ? adv : dis).push(T('the target is {0}', W('Prone')) + (close ? '' : ' ' + T('(far away)')));
    ['Invisible', 'Dodging'].forEach(c => { if (has(G, c)) dis.push(T('the target is {0}', W(c))); });
    return { adv, dis, crit: close && (has(G, 'Paralyzed') || has(G, 'Unconscious')) };
  };
  U.mixMode = (base, e) => { const a = (base === 'adv' ? 1 : 0) + e.adv.length, d = (base === 'dis' ? 1 : 0) + e.dis.length; return a && d ? 'normal' : a ? 'adv' : d ? 'dis' : 'normal'; };
  U.edgeTxt = e => (e.adv.length ? ' <small class="edge adv">⬆ ' + esc(e.adv.join(', ')) + '</small>' : '') + (e.dis.length ? ' <small class="edge dis">⬇ ' + esc(e.dis.join(', ')) + '</small>' : '');
  U.blessDie = h => { if (has(h, 'Blessed')) { const r = E.rollExpr('1d4', {}); return { v: r.total, txt: ' + 🙏' + r.total }; } return { v: 0, txt: '' }; };
  // concentration: damage → CON save DC max(10, half) rolled at once; a fail ends the spell (and what it gave to others)
  U.concCheck = function (h, n, conMod) {
    if (!has(h, 'Concentrating') || !(n > 0)) return '';
    const dc = Math.min(30, Math.max(10, Math.floor(n / 2))); const b = U.blessDie(h); const r = E.rollD20(conMod || 0, 'normal'); const tot = r.total + b.v; const ok = tot >= dc;
    if (!ok) U.endConc(h);
    return '🧠 ' + T('Concentration') + ': 🎲 ' + r.nat + ' ' + E.sign(conMod || 0) + b.txt + ' = ' + tot + ' ' + (ok ? '≥' : '&lt;') + ' ' + T('DC') + ' ' + dc + ' → ' + (ok ? T('holds on') : '<b class="fail">' + T('lost — the spell ends') + '</b>');
  };
  U.endConc = function (h) {
    U.delCond(h, 'Concentrating');
    (h.concGave || []).forEach(g => {
      (g.cids || []).forEach(id => { const c = U.byId(id); if (!c) return; if (g.cond) U.delCond(c, g.cond); if (g.toggle) delete c.toggles[g.toggle]; });
      (g.eids || []).forEach(id => { const m = ((S.combat && S.combat.list) || []).find(x => x.id === id); if (m && g.cond) U.delCond(m, g.cond); });
    });
    h.concGave = [];
    if (h.toggles) Object.keys(h.toggles).forEach(k => { if (k.indexOf('spell:') === 0 && k !== 'spell:Mage Armor') { const sp = D.SPELLS.find(s => 'spell:' + s.n === k); if (sp && sp.conc) delete h.toggles[k]; } });
  };

  // ======================================================================
  //  RESOLVER — rolls an action (attack, spell, feature, monster ability) vs a target
  //  and writes every step in plain words: roll + bonus = total vs AC → hit/miss → damage → HP.
  // ======================================================================
  const notesTxt = U.notesTxt = n => (n && n.length ? ' <span class="note">(' + n.map(esc).join('; ') + ')</span>' : '');
  const diceOf = r => r.text.replace(/^d20\((.*?)\).*$/, '$1'); // "16" or "15, 16 → 16"
  const hpTxt = (tg, before) => { if (!tg || !tg.hpNow) return ''; const now = tg.hpNow(); return now === before ? '' : ' <span class="hpchg">' + T('HP {0} → {1}', before, now) + '</span>'; };
  U.resolve = function (act, attacker, target) {
    const ctx = attacker.ctx; const edge = act.hit != null && target && !Array.isArray(target) ? U.rollEdge(attacker, target, act) : null; const mode = act.hit != null ? (edge ? U.mixMode(U.takeMode(), edge) : U.takeMode()) : 'normal'; const L = [];
    const mult = act.mult || 1;
    const multTxt = mult !== 1 ? ' <span class="mult">×' + mult + (act.multSrc ? ' ' + esc(act.multSrc) : '') + '</span>' : '';
    const tName = tg => '<b>' + esc(tg.name) + '</b>';
    const dtype = esc(t(act.dtype || ''));
    const roll = (crit) => {
      const r = E.rollExpr(act.dmg, { crit, min3: act.min3, ctx }); let raw = r.total; let text = r.text;
      if (act.plus) { const p = E.rollExpr(act.plus.d, { crit, ctx }); raw += p.total; text += ' + ' + p.text + ' ' + esc(t(act.plus.t)); }
      raw = Math.max(0, raw);
      return { raw, total: raw * mult, text: text + (mult !== 1 ? ' = ' + raw + ' ×' + mult : '') };
    };
    const modeTxt = mode === 'adv' ? ' <span class="tag adv">' + T('ADV') + '</span>' : mode === 'dis' ? ' <span class="tag dis">' + T('DIS') + '</span>' : '';
    if (act.heal || act.temp) {
      const r = E.rollExpr(act.dmg, { ctx }); const v = Math.max(0, r.total);
      const before = target && target.hpNow ? target.hpNow() : null;
      L.push((act.temp ? T('gains') + ' ' : '❤️ ' + T('heals') + ' ') + '<b class="big heal">' + v + '</b> ' + (act.temp ? T('temp HP') : T('HP')) + ' <small>' + r.text + '</small>' + (target ? ' → ' + tName(target) : ''));
      if (target) { if (act.temp) target.temp(v); else target.heal(v); if (before != null) L.push(hpTxt(target, before)); }
    } else if (act.save) {
      const dm = act.dmg ? roll(false) : null;
      const targets = Array.isArray(target) ? target : (target ? [target] : []);
      const ab = AB(act.save.abil);
      if (!targets.length) {
        L.push(T('Targets make a {0} saving throw, DC {1}', ab, '<b class="big">' + act.save.dc + '</b>') + (dm ? ' · ' + T('damage') + ' <b class="big dmg">' + dm.total + '</b> ' + dtype + ' <small>' + dm.text + '</small>' + (act.half ? ' · ' + T('if they resist: {0}', Math.floor(dm.total / 2)) : ' · ' + T('nothing if they resist')) : '') + multTxt);
        L.push('<small>' + T('Tell the DM: “{0} save, DC {1}”.', ab, act.save.dc) + '</small>');
      } else {
        if (dm) L.push('💥 ' + T('Damage rolled') + ': <b class="big dmg">' + dm.total + '</b> ' + dtype + ' <small>' + dm.text + '</small>' + multTxt + (act.half ? ' ' + T('(half if they resist)') : ''));
        targets.forEach(tg => {
          const bonus = tg.saveMod(act.save.abil); const G = tg.holder; const ab0 = act.save.abil; const autoFail = (ab0 === 'STR' || ab0 === 'DEX') && ['Paralyzed', 'Stunned', 'Unconscious', 'Petrified'].some(c => has(G, c));
          const smode = ab0 === 'DEX' && has(G, 'Dodging') && !has(G, 'Restrained') ? 'adv' : ab0 === 'DEX' && has(G, 'Restrained') && !has(G, 'Dodging') ? 'dis' : 'normal'; const bl = U.blessDie(G);
          // a player's hero online: the player rolls this save himself (online.js → U.askSave); the damage waits for his roll
          if (U.askSave && tg.pc && tg.pc.obr && U.askSave(tg, { abil: ab0, dc: act.save.dc, dm: dm ? dm.total : 0, dtype: act.dtype || '', half: !!act.half, cond: act.cond || '', condRounds: act.condRounds || 0, what: act.name, by: attacker.name, autoFail, smode })) {
            L.push(tName(tg) + ' — ' + T('{0} save', ab) + ' ' + T('DC') + ' ' + act.save.dc + ': ⏳ ' + T('the player rolls it himself…')); return;
          }
          const sv = E.rollD20(bonus, smode); sv.total += bl.v; const ok = !autoFail && sv.total >= act.save.dc;
          const fin = dm ? (ok ? (act.half ? Math.floor(dm.total / 2) : 0) : dm.total) : 0;
          const before = tg.hpNow ? tg.hpNow() : null;
          let notes = []; if (fin > 0) notes = tg.damage(fin);
          if (!ok && act.cond) { tg.cond(act.cond, act.condRounds); notes.push(t(act.cond) + (act.condRounds ? ' ' + T('for {0} rounds', act.condRounds) : '')); }
          L.push(tName(tg) + ' — ' + T('{0} save', ab) + ': 🎲 ' + diceOf(sv) + ' ' + sign(bonus) + bl.txt + (autoFail ? ' <small>(' + T('auto-fail: {0}', G.conditions.filter(c => ['Paralyzed', 'Stunned', 'Unconscious', 'Petrified'].includes(c)).map(c => t(c)).join(', ')) + ')</small>' : '') + ' = <b class="big">' + sv.total + '</b> ' + (ok ? '≥' : '&lt;') + ' ' + T('DC') + ' ' + act.save.dc + ' → ' +
            (ok ? '<b class="ok">' + T('RESISTED') + '</b>' : '<b class="fail">' + T('FAILED') + '</b>') + (dm ? ' · ' + T('takes {0}', '<b class="dmg">' + fin + '</b>') : '') + (before != null ? hpTxt(tg, before) : '') + notesTxt(notes));
        });
      }
    } else if (act.hit != null) {
      for (let i = 0; i < (act.count || 1); i++) {
        const r = E.rollD20(act.hit, mode, attacker.luck); const bl = U.blessDie(attacker.holder); r.total += bl.v; const nat1 = r.nat === 1;
        let crit = r.nat >= (act.critRange || 20); if (!crit && edge && edge.crit && target && !nat1 && r.total >= target.ac) crit = true; // Paralyzed / Unconscious, hit from 5 ft = critical
        const pre = (act.count > 1 ? '#' + (i + 1) + ' ' : '');
        const sum = '🎲 ' + diceOf(r) + ' ' + sign(act.hit) + bl.txt + ' = <b class="big">' + r.total + '</b>' + (i === 0 && edge ? U.edgeTxt(edge) : '');
        const critTxt = crit ? ' <b class="crit">' + T('CRITICAL! Damage dice are doubled.') + '</b>' : '';
        const n1 = nat1 ? ' <b class="fail" data-nat1>' + T('natural 1 = always a miss') + '</b>' : '';
        if (!target) {
          const dm = act.dmg ? roll(crit) : null;
          L.push(pre + T('To hit') + ': ' + sum + modeTxt + critTxt + n1);
          if (dm) L.push('💥 ' + T('Damage if it hits') + ': <b class="big dmg">' + dm.total + '</b> ' + dtype + ' <small>' + dm.text + '</small>' + multTxt);
          if (!nat1) L.push('<small>' + T('Tell the DM: “{0} to hit{1}”. The DM compares it with the enemy\'s Armor Class.', r.total, dm ? ', ' + T('{0} damage', dm.total) : '') + '</small>');
          if (act.graze) L.push('<small>' + T('Graze: on a miss the target still takes {0}.', act.graze * mult) + '</small>');
        } else {
          const hit = crit || (!nat1 && r.total >= target.ac);
          const vs = ' ' + (hit ? '≥' : '&lt;') + ' ' + T('AC') + ' ' + target.ac;
          const before = target.hpNow ? target.hpNow() : null;
          // a player's hero who knows Shield (+5 AC would turn this hit into a miss): the player decides (online.js → U.askShield)
          if (hit && !crit && i === 0 && U.askShield && target.pc && target.pc.obr && r.total < target.ac + 5) {
            const dm0 = act.dmg ? roll(crit) : { total: 0, text: '' };
            if (U.askShield(target, { total: r.total, ac: target.ac, dm: dm0, cond: act.cond || '', condRounds: act.condRounds || 0, what: act.name, by: attacker.name, dtype })) {
              L.push(pre + '🎯 ' + T('HIT') + ' ' + tName(target) + ': ' + sum + vs + modeTxt + ' · ⏳ ' + T('{0} may cast Shield (+5 AC) — waiting for the player…', esc(target.name)));
              continue;
            }
          }
          if (hit) {
            const dm = act.dmg ? roll(crit) : { total: 0, text: '' }; const notes = target.damage(dm.total);
            if (act.cond) { target.cond(act.cond, act.condRounds); notes.push(t(act.cond)); }
            L.push(pre + '🎯 <b class="ok">' + T('HIT') + '</b> ' + tName(target) + ': ' + sum + vs + modeTxt + critTxt);
            L.push('💥 ' + T('Damage') + ': <b class="big dmg">' + dm.total + '</b> ' + dtype + ' <small>' + dm.text + '</small>' + multTxt + (before != null ? hpTxt(target, before) : '') + notesTxt(notes));
            if (act.mastery) L.push('<small>⚔️ ' + T('Mastery') + ' <b>' + esc(t(act.mastery)) + '</b>: ' + esc(D.MASTERIES[act.mastery]) + '</small>');
          } else {
            L.push(pre + '❌ <b class="fail">' + T('MISS') + '</b> ' + tName(target) + ': ' + sum + vs + modeTxt + n1);
            if (act.graze > 0) { const g = act.graze * mult; const notes = target.damage(g); L.push(T('Graze: {0} still takes {1}', tName(target), '<b class="dmg">' + g + '</b>') + (before != null ? hpTxt(target, before) : '') + notesTxt(notes)); }
          }
        }
      }
      if (attacker.holder) ['Helped', 'Hidden'].forEach(c => U.delCond(attacker.holder, c)); // used up by this attack
    } else if (act.plain) {
      if (act.dmg) { const r = E.rollExpr(act.dmg, { ctx }); L.push(T('rolls') + ' <b class="big">' + r.total + '</b> <small>' + r.text + '</small>'); }
      if (act.desc) L.push('<i>' + esc(act.desc) + '</i>');
    } else if (act.dmg) {
      let total = 0; const texts = [];
      for (let i = 0; i < (act.count || 1); i++) { const dm = roll(false); total += dm.total; texts.push(dm.text); }
      const before = target && target.hpNow ? target.hpNow() : null;
      const notes = target ? target.damage(total) : [];
      L.push('💥 ' + (act.auto ? T('always hits') + ': ' : T('extra damage') + ': ') + '<b class="big dmg">' + total + '</b> ' + dtype + ' <small>' + texts.join(' | ') + '</small>' + multTxt + (target ? ' → ' + tName(target) : '') + (before != null ? hpTxt(target, before) : '') + notesTxt(notes));
    } else L.push(T('used.'));
    return L;
  };

  // spend resources for an action (spell slot / feature use). Returns text or ''.
  U.spendFor = function (c, d, act) {
    if (act.kind === 'spell' && act.level >= 1) {
      const slots = d.resources.filter(r => r.slot && r.slot >= act.level && E.left(c, r) > 0).sort((a, b) => a.slot - b.slot);
      if (!slots.length) return '⚠️ ' + T('no spell slot left');
      const r = slots[0]; c.used[r.id] = (Number(c.used[r.id]) || 0) + 1;
      return T('used a level {0} slot, {1} left', r.slot, E.left(c, r));
    }
    if (act.res) {
      const r = d.resources.find(x => x.id === act.res); if (!r) return '';
      if (E.left(c, r) <= 0) return '⚠️ ' + T('no uses left');
      c.used[r.id] = (Number(c.used[r.id]) || 0) + 1; return T('used 1 {0}, {1} left', r.name, E.left(c, r));
    }
    if (act.kind === 'item') {
      const it = c.inventory.find(i => i.id === act.item);
      if (it && it.heal) { it.qty = Math.max(0, (Number(it.qty) || 1) - 1); if (!it.qty) c.inventory = c.inventory.filter(i => i !== it); return T('consumed 1'); }
    }
    return '';
  };

  // adapters so the resolver can hit characters and monsters the same way
  U.pcTarget = function (c) {
    const d = E.compute(c);
    return {
      name: c.name || T('Unnamed'), ac: d.ac, saveMod: a => d.saves[a].val, holder: c, pc: c,
      hpNow: () => E.compute(c).hpCur,
      damage: n => { const r = E.damageChar(c, n).filter(x => !/Concentration|Концентрац/.test(x)); const cc = U.concCheck(c, n, d.saves.CON.val); if (cc) r.push(cc); U.saveChars(); return r; },
      heal: n => { E.healChar(c, n); U.saveChars(); },
      temp: n => { c.hp.temp = Math.max(Number(c.hp.temp) || 0, n); U.saveChars(); },
      cond: (name, r) => { U.addCond(c, name, r); U.saveChars(); }
    };
  };
  U.monTarget = function (m) {
    return {
      name: m.name, ac: Number(m.ac) || 10, saveMod: a => E.modOf((m.abil || {})[a] || 10), holder: m,
      hpNow: () => Number(m.hp) || 0,
      damage: n => {
        const notes = []; let tp = Number(m.temp) || 0; const ab = Math.min(tp, n); tp -= ab; m.temp = tp;
        m.hp = Math.max(0, (Number(m.hp) || 0) - (n - ab));
        const cc = U.concCheck(U.holder(m), n - ab, E.modOf((m.abil || {}).CON || 10)); if (cc) notes.push(cc);
        if (m.hp === 0) notes.push(T('defeated') + ' 💀');
        else if (m.hp <= (Number(m.hpMax) || 1) / 2) notes.push(T('bloodied — maybe it flees?'));
        U.saveCombat(); return notes;
      },
      heal: n => { m.hp = Math.min(Number(m.hpMax) || 0, (Number(m.hp) || 0) + n); U.saveCombat(); },
      temp: n => { m.temp = Math.max(Number(m.temp) || 0, n); U.saveCombat(); },
      cond: (name, r) => { U.addCond(m, name, r); U.saveCombat(); }
    };
  };
  U.cbTarget = cb => { if (cb.type === 'pc') { const c = U.byId(cb.charId); return c ? U.pcTarget(c) : null; } return U.monTarget(cb); };
  U.attackerOf = c => { const d = E.compute(c); return { name: c.name || T('Hero'), ctx: d.x, luck: d.luck, holder: c }; };

  // ======================================================================
  //  SIDE PANEL — dice + log
  // ======================================================================
  U.renderSide = function () {
    const el = document.getElementById('side'); if (!el) return;
    const m = S.mode;
    el.innerHTML =
      '<div class="panel dice">' +
      '<div class="modes"><button class="' + (m === 'normal' ? 'on' : '') + '" data-act="mode" data-v="normal">' + T('Normal') + '</button>' +
      '<button class="' + (m === 'adv' ? 'on adv' : '') + '" data-act="mode" data-v="adv">' + T('Advantage') + '</button>' +
      '<button class="' + (m === 'dis' ? 'on dis' : '') + '" data-act="mode" data-v="dis">' + T('Disadvantage') + '</button></div>' +
      '<div class="hint">' + T('For your next roll (any die)') + ' ' + U.ib('advantage') + '</div>' +
      '<div class="dbtns">' + [4, 6, 8, 10, 12, 20, 100].map(n => '<button data-act="die" data-n="' + n + '">d' + n + '</button>').join('') + '</div>' +
      '<form class="expr" data-form="expr"><input name="e" placeholder="' + esc(T('e.g. 2d6+3')) + '" autocomplete="off"><button>' + T('Roll') + '</button></form>' +
      '<label class="animtoggle"><input type="checkbox" data-on="anim"' + (U.animOn() ? ' checked' : '') + '> ' + T('🎲 Dice animation') + '</label> ' + U.ib('diceanim') +
      '</div>' +
      '<div class="panel log"><div class="lh"><b>' + T('Roll log') + '</b><button class="link" data-act="clearLog">' + T('clear') + '</button></div>' +
      (S.log.length ? S.log.map(x => '<div class="le">' + x.html + '</div>').join('') : '<div class="empty">' + T('Rolls appear here.') + '</div>') + '</div>';
  };

  // ======================================================================
  //  RENDER
  // ======================================================================
  U.render = function () {
    const main = document.getElementById('main');
    let v = S.view; if (U.PLAYER && (v === 'combat' || v === 'games')) v = S.view = 'home';
    if (U.DM && !U.game && v !== 'help') v = S.view = 'games';
    const fn = U.views[v] || U.views.home;
    main.innerHTML = fn();
    document.querySelectorAll('[data-act="nav"]').forEach(b => b.classList.toggle('on', b.dataset.v === (v === 'builder' || v === 'sheet' || v === 'levelup' ? 'home' : v)));
    const gt = document.getElementById('gameTag');
    if (gt) gt.innerHTML = U.game ? '🎲 ' + esc(U.game.name) : '🎲 ' + T('No game open');
    document.querySelectorAll('.need-game').forEach(b => { b.disabled = U.DM && !U.game; });
    U.renderSide(); if (v !== 'games') { store.set('view', S.view); store.set('charId', S.charId); }
  };
  U.go = (view, id) => { S.view = view; if (id) S.charId = id; U.render(); window.scrollTo(0, 0); };
  U.commit = () => { U.saveChars(); U.render(); };

  function showInfo(k) {
    const h = D.HELP[k]; if (!h) return;
    const pop = document.getElementById('pop');
    pop.innerHTML = '<div class="popcard" role="dialog"><h3>' + esc(h[0]) + '</h3><p>' + esc(h[1]) + '</p><button class="primary" data-act="closePop">' + T('Got it') + '</button></div>';
    pop.classList.add('show');
  }

  // ---------- top bar buttons + ⚙️ settings ----------
  U.renderTop = function () {
    const el = document.getElementById('topCtl'); if (!el) return;
    const mute = SND.get('mute'); const mus = SND.get('musicOn');
    el.innerHTML = '<button class="tb' + (mus && !mute ? ' on' : '') + '" data-act="music" title="' + esc(T('Background music on / off')) + '">🎵</button>' +
      '<button class="tb" data-act="mute" title="' + esc(mute ? T('Sound is off — click to turn on') : T('Sound is on — click to mute')) + '">' + (mute ? '🔇' : '🔊') + '</button>' +
      '<button class="tb" data-act="settings" title="' + esc(T('Settings')) + '">⚙️</button>';
  };
  function showSettings() {
    const pop = document.getElementById('pop');
    const sl = (k, icon, label, hint) => '<div class="setrow"><span class="setl">' + icon + ' ' + label + (hint ? '<small>' + hint + '</small>' : '') + '</span>' +
      '<input type="range" min="0" max="100" step="5" value="' + Math.round((SND.get(k) || 0) * 100) + '" data-in="vol" data-on="vol" data-k="' + k + '"><b class="setv">' + Math.round((SND.get(k) || 0) * 100) + '%</b></div>';
    const mute = SND.get('mute'); const mus = SND.get('musicOn');
    pop.innerHTML = '<div class="popcard settings" role="dialog"><h3>⚙️ ' + T('Settings') + '</h3>' +
      '<div class="setgrp"><h4>🔊 ' + T('Sound') + '</h4>' +
      '<div class="setrow"><span class="setl">' + T('All sound') + '</span><button class="' + (mute ? '' : 'on') + '" data-act="mute">' + (mute ? '🔇 ' + T('Off') : '🔊 ' + T('On')) + '</button></div>' +
      sl('master', '🎚️', T('Volume'), T('everything together')) +
      sl('sfx', '🎲', T('Effects'), T('dice and button clicks')) +
      '<div class="setrow"><span class="setl">🎵 ' + T('Background music') + '<small>' + T('calm fantasy music, made by the app') + '</small></span><button class="' + (mus && !mute ? 'on' : '') + '" data-act="music">' + (mus ? T('Playing ✓') : T('Off')) + '</button></div>' +
      sl('music', '🎶', T('Music volume'), '') + '</div>' +
      '<div class="setgrp"><h4>🎲 ' + T('Dice') + '</h4><label class="animtoggle"><input type="checkbox" data-on="anim"' + (U.animOn() ? ' checked' : '') + '> ' + T('🎲 Dice animation') + '</label> ' + U.ib('diceanim') + '</div>' +
      (U.scenarioBox ? U.scenarioBox() : '') +
      '<div class="setgrp"><h4>🌐 ' + T('Language') + '</h4><span class="langsw">' + ['en', 'ru'].map(l => '<button class="' + (U.LANG === l ? 'on' : '') + '" data-act="lang" data-v="' + l + '">' + (l === 'en' ? 'English' : 'Русский') + '</button>').join('') + '</span></div>' +
      '<p class="hint">' + T('Settings are saved on this computer only. Each player sets their own.') + '</p>' +
      '<button class="primary" data-act="closePop">' + T('Done') + '</button></div>';
    pop.classList.add('show');
  }
  U.IN = {
    vol: el => { const v = Number(el.value) / 100; SND.set(el.dataset.k, v); const b = el.parentNode.querySelector('.setv'); if (b) b.textContent = el.value + '%'; }
  };
  U.ON.vol = el => { if (el.dataset.k === 'sfx' || el.dataset.k === 'master') SND.click(); };

  // any dice with Advantage / Disadvantage: roll twice, keep the higher / lower total
  const modeTag = m => (m === 'adv' ? ' <span class="tag adv">' + T('ADV') + '</span>' : m === 'dis' ? ' <span class="tag dis">' + T('DIS') + '</span>' : '');
  U.rollMode = function (expr, mode) {
    const faces = Math.max(2, ...(String(expr).match(/d(\d+)/gi) || ['d6']).map(x => Number(x.slice(1))));
    const a = E.rollExpr(expr);
    if (mode !== 'adv' && mode !== 'dis') { const ad = U.rollAnimData(a); if (ad) E.d20q.push(ad); return { total: a.total, text: a.text }; }
    const b = E.rollExpr(expr); const keepA = mode === 'adv' ? a.total >= b.total : a.total <= b.total; const k = keepA ? a : b, x = keepA ? b : a;
    if (k.rolls.length === 1 && x.rolls.length === 1) E.d20q.push({ dice: [k.rolls[0].r, x.rolls[0].r], used: k.rolls[0].r, mode, bonus: k.total - k.rolls[0].r, total: k.total, faces }); // one die: show both dice
    else E.d20q.push({ dice: [k.total, x.total], used: k.total, mode, bonus: 0, total: k.total, faces, label: String(expr) }); // several dice: show the two totals
    const one = /^1?d\d+$/i.test(String(expr).trim()); // a single die: no need to repeat the dice text
    return { total: k.total, text: '<u>' + k.total + '</u>' + (one ? '' : ' <small>(' + k.text + ')</small>') + ', <s>' + x.total + '</s>' + (one ? '' : ' <small>(' + x.text + ')</small>') };
  };

  // ---------- shared actions ----------
  Object.assign(U.ACT, {
    nav: ds => U.go(ds.v),
    info: ds => showInfo(ds.k),
    closePop: () => document.getElementById('pop').classList.remove('show'),
    mode: ds => { S.mode = ds.v; U.renderSide(); },
    die: ds => {
      if (ds.n === '20') { // the d20 button uses Advantage / Disadvantage too
        const mode = U.takeMode(); const r = E.rollD20(0, mode);
        const tag = mode === 'adv' ? ' <span class="tag adv">' + T('ADV') + '</span>' : mode === 'dis' ? ' <span class="tag dis">' + T('DIS') + '</span>' : '';
        U.logAdd(T('Dice'), ['d20: 🎲 ' + r.text.replace(/^d20\((.*?)\).*$/, '$1') + ' → <b class="big">' + r.total + '</b>' + tag + (r.nat === 20 ? ' <b class="crit">' + T('NAT 20!') + '</b>' : r.nat === 1 ? ' <b class="fail" data-nat1>' + T('NAT 1') + '</b>' : '')]);
        return;
      }
      const mode = U.takeMode(); const r = U.rollMode('1d' + ds.n, mode);
      U.logAdd(T('Dice'), ['d' + ds.n + ': 🎲 ' + r.text + ' → <b class="big">' + r.total + '</b>' + modeTag(mode)]);
    },
    settings: () => showSettings(),
    mute: () => { SND.set('mute', !SND.get('mute')); U.renderTop(); if (document.querySelector('#pop .settings')) showSettings(); },
    music: () => { SND.set('musicOn', !SND.get('musicOn')); if (SND.get('musicOn') && SND.get('mute')) SND.set('mute', false); U.renderTop(); if (document.querySelector('#pop .settings')) showSettings(); },
    clearLog: () => { S.log = []; U.saveLog(); U.renderSide(); },
    lang: ds => { try { localStorage.setItem('dnd.lang', ds.v); } catch (e) { /* ignore */ } location.reload(); }
  });
  U.ON.anim = el => { try { localStorage.setItem('dnd.anim', el.checked ? '1' : '0'); } catch (e) { /* ignore */ } };
  U.FORMS.expr = f => {
    const v = f.e.value.trim(); if (!v) return;
    if (!/^[\dd+\-\s]+$/i.test(v)) { U.toast(T('Use dice like 2d6+3')); return; }
    const mode = U.takeMode(); const r = U.rollMode(v, mode);
    U.logAdd(T('Dice'), [esc(v) + ': <b class="big">' + r.total + '</b> <small>' + r.text + '</small>' + modeTag(mode)]);
  };

  // ---------- wiring ----------
  U.start = function () {
    document.body.classList.add(U.PLAYER ? 'mode-player' : 'mode-dm');
    document.documentElement.lang = U.LANG;
    const tag = document.getElementById('modeTag'); if (tag) tag.textContent = U.PLAYER ? T('Player version') : T('DM version');
    if (U.PLAYER) document.querySelectorAll('.dm-only').forEach(e => e.remove());
    document.title = U.PLAYER ? T('D&D Game — Player') : T('D&D Game — DM');
    document.querySelectorAll('[data-t]').forEach(e => { e.textContent = T(e.dataset.t); });
    document.querySelectorAll('[data-t-title]').forEach(e => { e.title = T(e.dataset.tTitle); });
    const ls = document.getElementById('langSw');
    U.renderTop();
    if (ls && window.DND_RU) ls.innerHTML = ['en', 'ru'].map(l => '<button class="' + (U.LANG === l ? 'on' : '') + '" data-act="lang" data-v="' + l + '" title="' + esc(D.HELP.language ? D.HELP.language[1] : '') + '">' + l.toUpperCase() + '</button>').join('');
    document.addEventListener('click', e => {
      if (e.target.id === 'pop') { U.ACT.closePop(); return; }
      const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      const fn = U.ACT[el.dataset.act];
      if (fn) { e.preventDefault(); E.d20q = []; E.rq = []; SND.click(); fn(el.dataset, el, e); }
    });
    document.addEventListener('change', e => {
      const el = e.target.closest('[data-on]'); if (!el) return;
      const fn = U.ON[el.dataset.on]; if (fn) fn(el, e);
    });
    document.addEventListener('input', e => {
      const el = e.target.closest('[data-in]'); if (!el) return;
      const fn = U.IN[el.dataset.in]; if (fn) fn(el, e);
    });
    document.addEventListener('submit', e => {
      const f = e.target; e.preventDefault();
      const fn = U.FORMS[f.dataset.form]; if (fn) fn(f);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') U.ACT.closePop(); });
    if (S.view !== 'home' && S.view !== 'combat' && S.view !== 'help' && S.view !== 'games' && S.view !== 'items' && !U.cur()) S.view = 'home';
    U.render();
  };
  return U;
})();
