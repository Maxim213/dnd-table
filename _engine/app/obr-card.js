// Token card: shown inside Owlbear's context menu when ONE token is selected (card.html, an ES module).
// A token is linked to a hero or a fight entry through its metadata 'dndtable/link':
//   { k: 'pc', cid, n }  — a hero (by id)          { k: 'mon', eid, n } — a monster in the fight (by entry id, or by name)
// DM:     link / unlink, see the real numbers, change a monster's HP, make it the target of the active combatant.
// Player: see heroes (HP, AC) and monsters (only "hurt", "badly hurt"…), and ATTACK the monster right from the card.
// The card reads the same browser storage as the panel (same site): obrdm / obrstate / obrmenu / chars / combat.
export function startCard(OBR) {
  const LINK = 'dndtable/link', CH = 'dndtable/v1';
  const ruOn = () => { try { return (localStorage.getItem('dnd.lang') || 'ru') === 'ru'; } catch (e) { return true; } };
  const tr = (en, ru) => (ruOn() ? ru : en);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ST = { ok: ['Unhurt', 'Цел', '🟢'], hurt: ['Hurt', 'Ранен', '🟡'], bloodied: ['Badly hurt', 'Сильно ранен', '🟠'], dying: ['Barely alive', 'Еле жив', '🔴'], down: ['Down', 'Повержен', '💀'] };
  const el = document.getElementById('card');
  OBR.onReady(async () => {
    const role = await OBR.player.getRole(); const DM = role === 'GM';
    const P = DM ? 'dndt.' : 'dndp.';
    const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
    const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} };
    const game = () => (DM ? get('curGame', null) : '');
    const gk = k => (DM ? 'g.' + game() + '.' + k : k);
    let item = null, mode = 'normal', note = '';

    async function load() {
      try { const sel = await OBR.player.getSelection(); item = sel && sel.length === 1 ? ((await OBR.scene.items.getItems(sel))[0] || null) : null; } catch (e) { item = null; }
    }
    const bar = (hp, mx) => '<div class="tc-bar"><i style="width:' + Math.max(0, Math.min(100, Math.round((hp / (mx || 1)) * 100))) + '%"></i></div>';
    const conds = cs => (cs && cs.length ? '<div class="tc-sub">⚠️ ' + cs.map(esc).join(', ') + '</div>' : '');
    const head = (pic, name, sub) => '<div class="tc-head">' + (pic ? '<img class="tc-pic" src="' + esc(pic) + '">' : '<div class="tc-pic">' + esc(String(name || '?').slice(0, 1)) + '</div>') + '<div><div class="tc-name">' + esc(name) + '</div><div class="tc-sub">' + sub + '</div></div></div>';
    const linkOf = it => (it && it.metadata && it.metadata[LINK]) || null;

    // the fight: DM → his own numbers (obrdm) + the live fight from storage; player → the public summary
    const fightPub = () => get(DM ? 'obrdm' : 'obrstate', null);
    const combat = () => (DM ? get(gk('combat'), null) : null);
    const monEntry = lk => {
      if (DM) { const cb = combat(); const L = (cb && cb.list) || []; return L.find(x => x.id === lk.eid) || L.find(x => x.type === 'mon' && x.name === lk.n) || null; }
      const f = fightPub(); const L = (f && f.list) || []; return L.find(x => x.id === lk.eid) || L.find(x => x.k === 'mon' && x.n === lk.n) || null;
    };
    const heroInfo = cid => {
      const f = fightPub() || {}; const inFight = (f.list || []).find(x => x.cid === cid); const party = (f.party || []).find(x => x.id === cid);
      const own = get(gk('chars'), []).find(c => c.id === cid);
      return { n: (own && own.name) || (party && party.n) || (inFight && inFight.n) || '?', lvl: (own && own.level) || (party && party.lvl) || '', hp: (inFight || party || {}).hp, mx: (inFight || party || {}).mx, ac: (inFight || party || {}).ac, cond: (inFight || party || {}).cond || [], pic: own ? (own.portraitThumb || own.portrait || '') : '', mine: !DM && !!own };
    };

    function render() {
      let h = '';
      if (!item) h = '<p class="tc-msg">' + tr('Select one token.', 'Выдели один токен.') + '</p>';
      else {
        const lk = linkOf(item);
        if (!lk) h = DM ? linkChooser() : '<p class="tc-msg">' + tr('This token is not linked. The DM can link it to a hero or a monster.', 'Этот токен не привязан. Мастер может привязать его к герою или монстру.') + '</p>';
        else if (lk.k === 'pc') h = heroCard(lk);
        else h = monCard(lk);
      }
      if (note) h += '<p class="tc-msg">' + note + '</p>';
      el.innerHTML = h;
    }
    function linkChooser() {
      const chars = get(gk('chars'), []); const cb = combat(); const mons = ((cb && cb.list) || []).filter(x => x.type === 'mon');
      if (!game()) return '<p class="tc-msg">' + tr('Open a game in D&D Table first.', 'Сначала открой игру в D&D Table.') + '</p>';
      return '<div class="tc-link"><h4>🔗 ' + tr('Link this token to…', 'Привязать токен к…') + '</h4>' +
        (chars.length ? chars.map(c => '<button data-l="pc" data-id="' + esc(c.id) + '" data-n="' + esc(c.name) + '">🧙 ' + esc(c.name || '?') + (c.obr ? ' <small>🦉 ' + esc(c.obr.name) + '</small>' : '') + '</button>').join('') : '') +
        (mons.length ? '<h4>⚔️ ' + tr('In the fight', 'В бою') + '</h4>' + mons.map(x => '<button data-l="mon" data-id="' + esc(x.id) + '" data-n="' + esc(x.name) + '">👹 ' + esc(x.name) + '</button>').join('') : '<p class="tc-msg">' + tr('Monsters appear here once they are in the fight.', 'Монстры появятся здесь, когда будут в бою.') + '</p>') + '</div>';
    }
    function heroCard(lk) {
      const h = heroInfo(lk.cid);
      let out = head(h.pic, h.n, (h.lvl ? tr('Level', 'Уровень') + ' ' + h.lvl + ' · ' : '') + (h.ac != null ? tr('AC', 'КД') + ' ' + h.ac : ''));
      if (h.hp != null) out += bar(h.hp, h.mx) + '<div class="tc-sub">❤️ ' + h.hp + ' / ' + h.mx + '</div>';
      out += conds(h.cond);
      out += '<div class="tc-row">' + (h.mine ? '<button data-do="sheet" data-id="' + esc(lk.cid) + '">📜 ' + tr('My sheet', 'Мой лист') + '</button>' : '') +
        (DM ? '<button data-do="target">🎯 ' + tr('Target', 'Цель') + '</button><button data-do="unlink">✂️ ' + tr('Unlink', 'Отвязать') + '</button>' : '') + '</div>';
      return out;
    }
    function monCard(lk) {
      const e = monEntry(lk);
      if (!e) return head('', lk.n || '?', tr('not in the fight now', 'сейчас не в бою')) + (DM ? '<div class="tc-row"><button data-do="unlink">✂️ ' + tr('Unlink', 'Отвязать') + '</button></div>' : '');
      if (DM) {
        return head('', e.name, (e.cr ? tr('CR', 'ПО') + ' ' + esc(e.cr) + ' · ' : '') + tr('AC', 'КД') + ' ' + esc(e.ac)) + bar(e.hp, e.hpMax) + '<div class="tc-sub">❤️ ' + e.hp + ' / ' + e.hpMax + '</div>' + conds(e.conditions) +
          '<div class="tc-row"><input type="number" min="0" id="amt" placeholder="0"><button data-do="dmg">− ' + tr('Damage', 'Урон') + '</button><button data-do="heal">+ ' + tr('Heal', 'Лечить') + '</button></div>' +
          '<div class="tc-row"><button data-do="target">🎯 ' + tr('Target of the active one', 'Цель того, кто ходит') + '</button><button data-do="unlink">✂️</button></div>';
      }
      const s = ST[e.st] || ST.ok;
      let out = head('', e.n, s[2] + ' ' + (ruOn() ? s[1] : s[0])) + conds(e.cond);
      const f = fightPub(); const menu = get('obrmenu', []); const mine = new Set(menu.map(m => m.cid));
      const meIn = f && f.on && (f.list || []).find(x => x.cid && mine.has(x.cid));
      const actor = meIn ? menu.find(m => m.cid === meIn.cid) : null;
      if (!f || !f.on) out += '<p class="tc-msg">' + tr('No fight right now.', 'Сейчас боя нет.') + '</p>';
      else if (!actor) out += '<p class="tc-msg">' + tr('Your hero is not in this fight.', 'Твоего героя нет в этом бою.') + '</p>';
      else {
        const myTurn = f.list[f.turn] && f.list[f.turn].cid === actor.cid;
        const ec = meIn.ec || { a: 0, b: 0, r: 0 };
        const can = a => myTurn ? (a.cost === '-' || !ec[a.cost]) : ((a.cost === 'r' || a.k === 'weapon') && !ec.r);
        const CN = { a: tr('Action', 'Действие'), b: tr('Bonus', 'Бонусное'), r: tr('Reaction', 'Реакция'), '-': tr('free', 'бесплатно') };
        const costTxt = a => !myTurn && a.k === 'weapon' ? '🛡 ' + tr('opportunity attack', 'провоцированная атака') : ({ a: '🗡', b: '⚡', r: '🛡', '-': '' }[a.cost] || '') + ' ' + (CN[a.cost] || '');
        out += '<h4>⚔️ ' + esc(actor.n) + ' → ' + esc(e.n) + (myTurn ? '' : ' <small>(' + tr('not your turn: reactions only', 'не твой ход: только реакция') + ')</small>') + '</h4>' +
          '<div class="tc-row tc-mode">' + [['normal', tr('Normal', 'Обычно')], ['adv', '⬆ ' + tr('Advantage', 'Преимущество')], ['dis', '⬇ ' + tr('Disadvantage', 'Помеха')]].map(m => '<button data-mode="' + m[0] + '" class="' + (mode === m[0] ? 'on' : '') + '">' + m[1] + '</button>').join('') + '</div>' +
          '<div class="tc-acts">' + actor.acts.filter(a => !a.heal).map(a => '<button data-act="' + esc(a.id) + '" data-cid="' + esc(actor.cid) + '"' + (can(a) ? '' : ' disabled') + '><b>' + esc(a.n) + '</b><small>' + esc(a.info) + ' · ' + costTxt(a) + '</small></button>').join('') + '</div>';
      }
      return out;
    }

    // ---------- clicks ----------
    el.addEventListener('click', async ev => {
      const b = ev.target.closest('button'); if (!b) return; note = '';
      if (b.dataset.l) { // link
        const link = b.dataset.l === 'pc' ? { k: 'pc', cid: b.dataset.id, n: b.dataset.n } : { k: 'mon', eid: b.dataset.id, n: b.dataset.n };
        await OBR.scene.items.updateItems([item.id], items => { items.forEach(it => { it.metadata[LINK] = link; }); });
        await load(); render(); return;
      }
      if (b.dataset.mode) { mode = b.dataset.mode; render(); return; }
      if (b.dataset.act) { // player attacks this monster
        const lk = linkOf(item); const e = monEntry(lk); if (!e) return;
        const menu = get('obrmenu', []); const hero = menu.find(m => m.cid === b.dataset.cid) || {};
        let player = ''; try { player = await OBR.player.getName(); } catch (er) {}
        const req = { id: Math.random().toString(36).slice(2, 10), t: Date.now(), cid: b.dataset.cid, aid: b.dataset.act, tid: e.id, mode, from: hero.n || '', player };
        try { await OBR.broadcast.sendMessage(CH, { type: 'act', req }); note = '⏳ ' + tr('Sent to the DM — the result shows up in the roll log.', 'Отправлено мастеру — результат появится в журнале бросков.'); }
        catch (er) { note = '⚠️ ' + esc(er.message || er); }
        mode = 'normal'; render(); return;
      }
      const d = b.dataset.do; const lk = linkOf(item);
      if (d === 'unlink') { await OBR.scene.items.updateItems([item.id], items => { items.forEach(it => { delete it.metadata[LINK]; }); }); await load(); render(); return; }
      if (d === 'sheet') { set('view', 'sheet'); set('charId', b.dataset.id); try { await OBR.action.open(); } catch (er) {} note = tr('Opened in the D&D Table panel.', 'Открыто в панели D&D Table.'); render(); return; }
      if (DM && (d === 'dmg' || d === 'heal')) {
        const n = Math.max(0, Number((document.getElementById('amt') || {}).value) || 0); if (!n) return;
        const cb = combat(); const e = cb && cb.list.find(x => x.id === (monEntry(lk) || {}).id); if (!e) return;
        e.hp = d === 'dmg' ? Math.max(0, (Number(e.hp) || 0) - n) : Math.min(Number(e.hpMax) || 999, (Number(e.hp) || 0) + n);
        set(gk('combat'), cb); render(); return;
      }
      if (DM && d === 'target') {
        const cb = combat(); if (!cb || cb.turn < 0) { note = tr('No fight right now.', 'Сейчас боя нет.'); render(); return; }
        const active = cb.list[cb.turn]; let tid = '';
        if (lk.k === 'pc') { const x = cb.list.find(y => y.type === 'pc' && y.charId === lk.cid); tid = x ? x.id : ''; } else tid = (monEntry(lk) || {}).id || '';
        if (!active || !tid) { note = tr('Not in the fight.', 'Не участвует в бою.'); render(); return; }
        cb.target = cb.target || {}; cb.target[active.id] = tid; set(gk('combat'), cb);
        note = '🎯 ' + tr('Target set for', 'Цель выбрана для') + ' ' + esc(active.name || ''); render(); return;
      }
    });

    // ---------- keep it fresh ----------
    let lastSel = '';
    OBR.player.onChange(async p => { const s = JSON.stringify(p.selection || []); if (s !== lastSel) { lastSel = s; note = ''; await load(); render(); } });
    try { OBR.scene.items.onChange(async () => { await load(); render(); }); } catch (e) {}
    window.addEventListener('storage', () => render());
    await load(); render();
  });
}
