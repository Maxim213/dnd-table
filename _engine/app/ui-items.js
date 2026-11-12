// 🎒 Equipment screen: item catalog, shops (DM builds → file → players buy), loot (DM → file → player), scenarios.
(function (U) {
  'use strict';
  const D = U.D, E = U.E, esc = U.esc, sign = U.sign, S = U.S, ib = U.ib, opt = U.opt, T = U.T, t = D.t;
  const SCN = window.SCN;
  const AB = a => D.AB[a] || a;
  const store = U.store;
  S.itemsTab = S.itemsTab || 'catalog'; S.icat = S.icat || 'all'; S.iq = S.iq || '';

  // the DM's own prices / levels / tiers (saved per game in 'itemEdits')
  U.applyItemEdits = function () {
    const ed = U.DM ? store.get('itemEdits', {}) || {} : {};
    D.CATALOG.forEach(e => {
      if (!e.def0) e.def0 = { cost: e.cost, level: e.level, tier: e.tier };
      e.cost = e.def0.cost; e.level = e.def0.level; e.tier = e.def0.tier;
      const x = ed[e.id]; if (!x) return;
      if (x.cost != null) e.cost = x.cost; if (x.level) e.level = x.level; if (x.tier) e.tier = x.tier;
    });
  };
  U.applyItemEdits();
  const loadState0 = U.loadState; U.loadState = function () { loadState0.apply(this, arguments); U.applyItemEdits(); };
  // players only get the shops (the full list of items is the DM's secret)
  if (U.PLAYER) { const b = document.querySelector('[data-act="nav"][data-v="items"]'); if (b) { b.dataset.t = '🛒 Shops'; b.textContent = '🛒 Shops'; } }

  // ---------- money ----------
  U.money = function (gp) {
    gp = Math.round((Number(gp) || 0) * 100) / 100;
    if (gp >= 1 || gp === 0) return T('{0} GP', Number(gp.toFixed(2)));
    if (gp * 10 >= 1 && Math.abs(gp * 10 - Math.round(gp * 10)) < 0.001) return T('{0} SP', Math.round(gp * 10));
    return T('{0} CP', Math.round(gp * 100));
  };
  const rarityTxt = r => (r ? (U.LANG === 'ru' ? (D.RARITY_RU[r] || t(r)) : r) : '');

  // ---------- catalog entries ↔ inventory items ↔ file snapshots ----------
  // snapshot = everything needed to rebuild the item on another computer (even without the scenario)
  const localEntry = snap => { const e = snap && D.catalogById(snap.id); return e || snap; };
  // what an item looks like at its level: stats grow with the level (data/items2.js D.scaleItem), the special text stays
  U.itemView = function (src, L) {
    const e = localEntry(src); const mb = Number(src.magicBonus) || Number(e.magicBonus) || 0;
    const L0 = src.baseLevel != null ? Number(src.baseLevel) : D.levelOf(Object.assign({}, e, { magicBonus: mb, level: e.def0 ? e.def0.level : undefined }));
    const lv = L != null ? Number(L) : src.level != null ? Number(src.level) : (e.def0 && e.level != null && e.level !== '' ? Number(e.level) : L0);
    const v = Object.assign({}, e, { magicBonus: mb });
    const sc = D.scaleItem(v, L0, lv);
    Object.assign(v, sc, { level: lv, baseLevel: L0, tier: src.tier || e.tier || D.tierOf(v) });
    const wa = e.weapon ? D.WEAPONS[e.weapon] : e.armor ? D.ARMOR[e.armor] : null;
    if (wa && !e.rarity && sc.magicBonus) { v.name = '+' + sc.magicBonus + ' ' + wa.name; v.genName = '+' + sc.magicBonus + ' ' + (wa.en || wa.name); }
    if (!D.catalogById(src.id) && Array.isArray(src.ru) && U.LANG === 'ru' && !v.genName) { v.name = src.ru[0]; v.desc = src.ru[1]; }
    v.base = { level: L0, magicBonus: mb, effects: E.clone(e.effects || []), roll: e.roll };
    return v;
  };
  // snapshot = everything needed to rebuild the item on another computer (even without the scenario).
  // It keeps the BASE stats + the level; the stats for that level are worked out when it is shown or given.
  U.entrySnap = function (e, o) {
    o = o || {};
    const v = U.itemView(Object.assign({ id: e.id }, o.magicBonus ? { magicBonus: o.magicBonus } : {}));
    return { id: e.id, name: e.en || e.name, desc: e.descEn || e.desc || '', ru: e.ru, icon: e.icon, cat: e.cat, weapon: e.weapon, armor: e.armor,
      rarity: e.rarity, requiresAttunement: !!e.requiresAttunement, magicBonus: v.base.magicBonus, roll: e.roll, heal: !!e.heal,
      effects: E.clone(e.effects || []), cost: e.cost || 0, temp: !!e.temp, tier: v.tier, baseLevel: v.baseLevel, level: v.level };
  };
  U.itemFrom = function (src, qty) {
    const e = localEntry(src); const v = U.itemView(src);
    return { id: E.uid(), name: v.genName || e.en || e.name, cid: e.id, icon: e.icon, weapon: e.weapon || undefined, armor: e.armor || undefined, qty: qty || 1, equipped: false,
      desc: '', cdesc: e.descEn || e.desc || '', ru: v.genName ? undefined : e.ru, rarity: e.rarity || (v.magicBonus ? (v.magicBonus >= 3 ? 'Very Rare' : v.magicBonus === 2 ? 'Rare' : 'Uncommon') : undefined),
      requiresAttunement: !!e.requiresAttunement, magicBonus: v.magicBonus || undefined, roll: v.roll, heal: !!e.heal, temp: !!e.temp, effects: v.effects,
      tier: v.tier, level: v.level, base: v.base };
  };
  // change the level of an item a hero already has (DM: ✎ on the item)
  U.relevelItem = function (it, L) {
    L = Math.max(1, Math.min(20, Math.round(Number(L) || 1)));
    if (!it.base) it.base = { level: it.level || D.levelOf(it), magicBonus: Number(it.magicBonus) || 0, effects: E.clone(it.effects || []), roll: it.roll };
    const sc = D.scaleItem(Object.assign({ weapon: it.weapon, armor: it.armor }, it.base), it.base.level, L);
    it.magicBonus = sc.magicBonus || undefined; it.effects = sc.effects; it.roll = sc.roll; it.level = L;
    const wa = D.WEAPONS[it.weapon] || D.ARMOR[it.armor];
    if (wa && !it.rarity) { const plain = String(it.name || '').replace(/^\+\d /, ''); if (plain === wa.en || plain === wa.name || !plain) { it.name = sc.magicBonus ? '+' + sc.magicBonus + ' ' + (wa.en || wa.name) : (wa.en || wa.name); delete it.ru; } }
  };
  // put an item into a hero's bag (stacks plain items of the same kind)
  U.giveItem = function (c, src, qty) {
    const it = U.itemFrom(src, qty);
    const same = !it.magicBonus && !(it.effects && it.effects.length) && c.inventory.find(x => x.cid && x.cid === it.cid && !x.magicBonus && (x.level || 0) === (it.level || 0) && x.roll === it.roll);
    if (same) same.qty = (Number(same.qty) || 1) + (qty || 1); else c.inventory.push(it);
    return it;
  };
  const priceOf = (e, mb) => (mb ? Math.max(e.cost || 0, (D.RARITY_PRICE[mb >= 3 ? 'Very Rare' : mb === 2 ? 'Rare' : 'Uncommon'] || 0) + (e.cost || 0)) : (e.cost || 0));

  // ---------- one item card ----------
  function stats(e) {
    const out = [];
    const w = D.WEAPONS[e.weapon], A = D.ARMOR[e.armor], mb = Number(e.magicBonus) || 0;
    // the magic bonus is shown INSIDE the numbers (AC, to hit, damage) — the same numbers the fight uses
    const plus = '<b class="mbon" title="' + esc(T('Magic bonus of the item — already counted in this number and in fights')) + '">';
    if (w) out.push('⚔️ ' + (mb ? plus + esc(T('{0} to hit', '+' + mb)) + '</b> · ' : '') + w.dmg + (mb ? plus + '+' + mb + '</b>' : '') + ' ' + esc(t(w.type)) + (w.props.length ? ' · ' + w.props.map(D.tProp).join(', ') : '') + (w.mastery ? ' · <span class="tag" title="' + esc(D.MASTERIES[w.mastery]) + '">' + esc(t(w.mastery)) + '</span>' : '') + ' · ' + esc(t(w.cat)));
    if (A) out.push('🛡️ ' + (A.type === 'shield' ? (mb ? plus + T('+{0} AC', 2 + mb) + '</b>' : T('+2 AC')) : T('AC') + ' ' + (mb ? plus + (A.base + mb) + '</b>' : A.base) + (A.dexMax === null ? ' + ' + AB('DEX') : A.dexMax ? ' + ' + AB('DEX') + ' ' + T('(max 2)') : '')) + ' · ' + esc(t(A.type)) + (A.str ? ' · ' + T('needs STR {0}', A.str) : '') + (A.stealthDis ? ' · ' + T('noisy (Stealth disadv.)') : ''));
    if (mb && (w || A)) out.push('<small class="mbnote">✨ ' + (w ? T('Magic +{0}: to hit and damage', mb) : T('Magic +{0}: to AC', mb)) + '</small>');
    else if (mb) out.push('✨ ' + T('Magic +{0}', mb));
    if (e.roll) out.push((e.heal ? '❤️ ' : '🎲 ') + esc(e.roll));
    if (e.effects && e.effects.length) out.push('<span class="fx">✨ ' + e.effects.map(U.fxText).join(', ') + '</span>');
    if (e.requiresAttunement) out.push('🔗 ' + T('needs attunement'));
    return out.join('<br>');
  }
  U.tierBadge = e => { const k = D.tierOf(e); const tr = D.TIERS[k]; return '<span class="tier t-' + k + '" title="' + esc(T('Tier: how special the item is. Level: from which hero level it fits.')) + '">' + tr.icon + ' ' + esc(tr.name) + ' · ' + T('lvl {0}', D.levelOf(e)) + '</span>'; };
  function card(e, btns, extra) {
    const cat = D.ITEM_CATS[e.cat] || D.ITEM_CATS.gear;
    return '<div class="icard t-' + D.tierOf(e) + '"><div class="iic">' + (e.icon || cat.icon) + '</div><div class="ibody">' +
      '<div class="ihead"><b>' + esc(e.name) + '</b>' + (e.scenario ? ' <span class="tag scn">📜</span>' : '') + '</div>' +
      '<div class="isub">' + U.tierBadge(e) + ' · ' + cat.icon + ' ' + esc(cat.name) + (e.rarity ? ' · <small title="' + esc(T('Rarity in the D&D books')) + '">D&amp;D: ' + esc(rarityTxt(e.rarity)) + '</small>' : '') + '</div>' +
      (stats(e) ? '<div class="istat">' + stats(e) + '</div>' : '') +
      (e.desc ? '<div class="idesc">' + esc(e.desc) + '</div>' : '') +
      '<div class="imeta">💰 ' + U.money(e.cost) + (e.weight ? ' · ⚖️ ' + T('{0} lb', e.weight) : '') + (extra || '') + '</div>' +
      (btns ? '<div class="ibtns">' + btns + '</div>' : '') + '</div></div>';
  }

  // ======================================================================
  //  VIEW
  // ======================================================================
  U.views.items = function () {
    if (U.PLAYER) S.itemsTab = 'shops'; // the full item list is for the DM only
    const tabs = U.PLAYER ? [] : [['catalog', '📚 ' + T('Catalog')], ['shops', '🛒 ' + T('Shops')]].concat(U.DM ? [['loot', '🎁 ' + T('Loot') + (S.loot && (S.loot.items.length || S.loot.gold) ? ' (' + (S.loot.items.length + (S.loot.gold ? 1 : 0)) + ')' : '')]] : []);
    let h = '<div class="page items"><div class="ph"><h1>' + (U.PLAYER ? '🛒 ' + T('Shops') : '🎒 ' + T('Equipment')) + ' ' + ib('catalog') + '</h1><div class="btnrow">' +
      '<button data-act="importChar">📥 ' + (U.DM ? T('Load a file (shop, loot, scenario, character)') : T('Load a file from the DM (shop, loot, scenario)')) + '</button></div></div>' +
      (SCN.active ? '<div class="scnbar">📜 ' + T('Scenario:') + ' <b>' + esc(SCN.active.title || SCN.active.name) + '</b> ' + T('— its items are marked 📜') + '</div>' : '') +
      '<div class="tabs">' + tabs.map(x => '<button class="tab' + (S.itemsTab === x[0] ? ' on' : '') + '" data-act="itemsTab" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    h += S.itemsTab === 'shops' ? shopsTab() : S.itemsTab === 'loot' && U.DM ? lootTab() : catalogTab();
    return h + '</div>';
  };

  function catalogTab() {
    const cats = ['all'].concat(Object.keys(D.ITEM_CATS).filter(k => D.CATALOG.some(e => e.cat === k)));
    const q = S.iq.trim().toLowerCase();
    const srcOk = e => !S.isrc || (S.isrc === 'scn' ? !!e.scenario : !e.scenario); // source: standard D&D or the active scenario
    const list = D.CATALOG.filter(e => srcOk(e) && (S.icat === 'all' || e.cat === S.icat) && (!S.itier || S.itier === 'all' || D.tierOf(e) === S.itier) && (!q || (e.name + ' ' + (e.en || '') + ' ' + (e.desc || '')).toLowerCase().includes(q)));
    const shop = U.DM && S.shops.find(x => x.id === S.shopSel);
    let h = '<div class="ifilter">' + cats.map(k => '<button class="chip' + (S.icat === k ? ' on' : '') + '" data-act="icat" data-v="' + k + '">' + (k === 'all' ? '🗂️ ' + T('All') : D.ITEM_CATS[k].icon + ' ' + esc(D.ITEM_CATS[k].name)) + '</button>').join('') +
      '<input class="isearch" data-on="iq" value="' + esc(S.iq) + '" placeholder="🔎 ' + esc(T('Search…')) + '"></div>';
    const nScn = D.CATALOG.filter(e => e.scenario).length;
    h += '<div class="ifilter">' + [['', '🗂️ ' + T('All sources')], ['dnd', '📖 ' + T('Standard D&D')], ['scn', '📜 ' + T('Scenario') + (SCN.active ? ': ' + esc(SCN.active.title || SCN.active.name) : '') + ' (' + nScn + ')']]
      .map(x => '<button class="chip' + ((S.isrc || '') === x[0] ? ' on' : '') + '" data-act="isrc" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    h += '<div class="ifilter">' + ['all'].concat(D.TIER_KEYS).map(k => '<button class="chip' + ((S.itier || 'all') === k ? ' on' : '') + ' t-' + k + '" data-act="itier" data-v="' + k + '">' + (k === 'all' ? T('Any tier') : D.TIERS[k].icon + ' ' + esc(D.TIERS[k].name)) + '</button>').join('') + '</div>';
    if (U.DM) h += '<p class="hint">' + T('Add to: shop') + ' <select data-on="shopSel">' + opt('', T('— choose a shop —'), S.shopSel || '') + S.shops.map(s => opt(s.id, s.name, S.shopSel)).join('') + '</select> ' +
      T('or to the 🎁 loot bag. For weapons and armor you can pick a magic bonus first.') + '<br>📈 ' + T('Stats grow with the item level: change the level with ✎ (or in a shop) and the bonuses and dice change. The special power stays the same.') + '</p>';
    else h += '<p class="hint">' + T('Everything that exists in the game. To buy things, open 🛒 Shops (your DM sends you a shop file).') + '</p>';
    h += '<p class="hint">' + T('{0} items', list.length) + '</p><div class="igrid">' + list.slice(0, 400).map(e => {
      let b = '';
      if (U.DM) {
        const mbSel = (e.weapon || e.armor) && !e.rarity ? '<select class="mini mbsel" title="' + esc(T('Magic bonus')) + '">' + [0, 1, 2, 3].map(n => opt(n, n ? '+' + n : '+0', 0)).join('') + '</select>' : '';
        b = mbSel + '<button class="mini" data-act="toShop" data-id="' + esc(e.id) + '"' + (shop ? '' : ' disabled title="' + esc(T('Choose a shop above (or create one in 🛒 Shops)')) + '"') + '>🛒 ' + T('To shop') + '</button>' +
          '<button class="mini" data-act="toLoot" data-id="' + esc(e.id) + '">🎁 ' + T('To loot') + '</button>' +
          '<button class="mini" data-act="iEditOpen" data-id="' + esc(e.id) + '" title="' + esc(T('Change price, level, tier')) + '">✎</button>';
        if (S.iedit === e.id) b += '<div class="iedit"><label class="inl">💰 <input type="number" step="0.01" min="0" data-on="iEdit" data-id="' + esc(e.id) + '" data-f="cost" value="' + (e.cost || 0) + '"></label>' +
          '<label class="inl">⭐ ' + T('Level') + ' <input type="number" min="1" max="20" class="tiny" data-on="iEdit" data-id="' + esc(e.id) + '" data-f="level" value="' + D.levelOf(e) + '"></label>' +
          '<select data-on="iEdit" data-id="' + esc(e.id) + '" data-f="tier">' + D.TIER_KEYS.map(k => opt(k, D.TIERS[k].icon + ' ' + D.TIERS[k].name, D.tierOf(e))).join('') + '</select>' +
          '<button class="mini" data-act="iEditReset" data-id="' + esc(e.id) + '">↺ ' + T('Default') + '</button></div>';
      }
      return card(U.itemView(e), b);
    }).join('') + '</div>';
    return h;
  }

  // ---------- shops ----------
  // DM shops live in the game (S.shops). Players keep the shops they imported (also S.shops).
  // The active scenario can bring its own shop (read only).
  function scenarioShop() {
    const p = SCN.active; if (!p || !p.shop || !p.shop.items) return null;
    const items = p.shop.items.map(x => { const e = D.catalogById(x.id) || D.catalogById('s:' + p.id + ':' + x.id); return e ? Object.assign(U.entrySnap(e, x), { price: x.price != null ? x.price : priceOf(e, x.magicBonus), qty: x.qty == null ? -1 : x.qty }) : null; }).filter(Boolean);
    return { id: 'scn:' + p.id, name: (Array.isArray(p.shop.ru) && U.LANG === 'ru' ? p.shop.ru[0] : p.shop.name) || p.title, desc: p.shop.desc || '', items, fromScenario: true };
  }
  const allShops = () => { const sc = scenarioShop(); return (sc ? [sc] : []).concat(S.shops); };
  const shopById = id => allShops().find(s => s.id === id);

  function shopsTab() {
    const sh = S.shopSel && shopById(S.shopSel);
    if (sh && S.shopMode === 'edit' && U.DM && !sh.fromScenario) return shopEditor(sh);
    if (sh) return shopBuy(sh);
    const list = allShops();
    let h = U.DM ? '<p class="lead">' + T('Make a shop: name it, add items from the 📚 Catalog with your prices, then <b>📤 Export</b> and send the file to the players. They load it and buy with their gold.') + '</p><p><button class="primary" data-act="shopNew">＋ ' + T('New shop') + '</button></p>'
      : '<p class="lead">' + T('Shops your DM sent you. Click <b>📥 Load a file</b> above to add one.') + '</p>';
    h += list.length ? '<div class="cgrid">' + list.map(s => '<div class="ccard shopcard"><div class="portrait sm ph">🏪</div><div class="cc-body"><div class="cc-name">' + esc(s.name) + (s.fromScenario ? ' <span class="tag scn">📜</span>' : '') + '</div>' +
      '<div class="cc-sub">' + T('{0} items', s.items.length) + (s.desc ? ' · ' + esc(s.desc) : '') + '</div><div class="cc-btns">' +
      '<button class="primary" data-act="shopOpen" data-id="' + esc(s.id) + '">🛒 ' + T('Open') + '</button>' +
      (U.DM && !s.fromScenario ? '<button data-act="shopEdit" data-id="' + esc(s.id) + '">✎ ' + T('Edit') + '</button><button data-act="shopExport" data-id="' + esc(s.id) + '">📤 ' + T('Export for players') + '</button>' : '') +
      (!s.fromScenario ? '<button class="danger" data-act="shopDel" data-id="' + esc(s.id) + '">' + T('Delete') + '</button>' : '') + '</div></div></div>').join('') + '</div>'
      : '<div class="emptybig"><p>' + (U.DM ? T('No shops yet.') : T('No shops yet — ask your DM for a shop file.')) + '</p></div>';
    return h;
  }

  function shopEditor(sh) {
    let h = '<p><button data-act="shopBack">← ' + T('All shops') + '</button></p><div class="detail"><h3>✎ ' + T('Edit shop') + '</h3>' +
      '<label class="blk">' + T('Shop name') + '<input data-on="shopSet" data-f="name" value="' + esc(sh.name) + '"></label>' +
      '<label class="blk">' + T('Merchant / description (players see it)') + '<textarea data-on="shopSet" data-f="desc">' + esc(sh.desc || '') + '</textarea></label></div>';
    h += '<div class="detail"><h3>📦 ' + T('Items') + ' <small>' + T('price in GP; empty quantity = unlimited') + '</small></h3>' +
      (sh.items.length ? '<table class="inv shoptable"><thead><tr><th></th><th>' + T('Item') + '</th><th>' + T('Price (GP)') + '</th><th>' + T('Qty') + '</th><th>⭐ ' + T('Level') + '</th><th></th></tr></thead><tbody>' + sh.items.map((x, i) => {
        const e = localEntry(x); const xv = U.itemView(x); const nm = xv.name;
        return '<tr><td>' + (e.icon || '📦') + '</td><td><b>' + esc(nm) + '</b><small>' + esc(U.money(priceOf(e, x.magicBonus))) + ' ' + T('in the book') + '</small>' + (stats(xv) ? '<small class="istat">' + stats(xv) + '</small>' : '') + '</td>' +
          '<td><input type="number" step="0.01" min="0" class="qty" data-on="shopItem" data-i="' + i + '" data-f="price" value="' + x.price + '"></td>' +
          '<td><input type="number" min="0" class="qty" data-on="shopItem" data-i="' + i + '" data-f="qty" value="' + (x.qty < 0 ? '' : x.qty) + '" placeholder="∞"></td>' +
          '<td><input type="number" min="1" max="20" class="qty" data-on="shopItem" data-i="' + i + '" data-f="level" value="' + xv.level + '"></td>' +
          '<td><button class="mini danger" data-act="shopItemDel" data-i="' + i + '">✕</button></td></tr>';
      }).join('') + '</tbody></table>' : '<p class="hint">' + T('Empty. Go to 📚 Catalog and click 🛒 To shop on items.') + '</p>') +
      '<div class="btnrow"><button class="primary" data-act="itemsTab" data-v="catalog">📚 ' + T('Add items from the catalog') + '</button><button data-act="shopExport" data-id="' + esc(sh.id) + '">📤 ' + T('Export for players') + '</button><button data-act="shopOpen" data-id="' + esc(sh.id) + '">🛒 ' + T('Open as buyer') + '</button></div></div>';
    return h;
  }

  function shopBuy(sh) {
    const chars = S.chars; if (!S.buyer || !U.byId(S.buyer)) S.buyer = (U.cur() && U.cur().id) || (chars[0] && chars[0].id) || null;
    const c = S.buyer && U.byId(S.buyer);
    let h = '<p><button data-act="shopBack">← ' + T('All shops') + '</button>' + (U.DM && !sh.fromScenario ? ' <button data-act="shopEdit" data-id="' + esc(sh.id) + '">✎ ' + T('Edit') + '</button>' : '') + '</p>' +
      '<div class="shophead"><div class="shopic">🏪</div><div><h2>' + esc(sh.name) + '</h2>' + (sh.desc ? '<p class="lead">' + esc(sh.desc) + '</p>' : '') + '</div></div>';
    if (!c) return h + '<p class="warn">' + T('Make a character first.') + '</p>';
    h += '<div class="buyer">' + T('Buying for') + ' <select data-on="buyer">' + chars.map(x => opt(x.id, x.name || T('Unnamed hero'), S.buyer)).join('') + '</select> · 💰 <b class="gold">' + U.money(c.gold) + '</b> ' + ib('gold') + '</div>';
    h += '<div class="igrid">' + sh.items.map((x, i) => {
      const e = U.itemView(x); e.cost = x.price;
      const out = x.qty === 0; const poor = (Number(c.gold) || 0) + 1e-9 < x.price;
      return card(e, '<button class="mini primary" data-act="buy" data-i="' + i + '"' + (out || poor ? ' disabled' : '') + '>' + (out ? T('Sold out') : poor ? T('Not enough gold') : '🪙 ' + T('Buy')) + '</button>', x.qty >= 0 ? ' · ' + T('{0} left', x.qty) : '');
    }).join('') + '</div>';
    // selling: half of the book price
    const sellable = c.inventory.filter(it => { const e = it.cid && D.catalogById(it.cid); return e && e.cost > 0; });
    if (sellable.length) h += '<div class="detail"><h3>💱 ' + T('Sell your items') + ' <small>' + T('merchants pay half the book price') + '</small></h3><table class="inv"><tbody>' + sellable.map(it => {
      const e = D.catalogById(it.cid); const p = Math.round(priceOf(e, it.magicBonus) / 2 * 100) / 100;
      return '<tr><td>' + (it.icon || e.icon || '📦') + '</td><td><b>' + esc(E.itemName(it)) + '</b> ×' + (it.qty || 1) + '</td><td>' + U.money(p) + '</td><td><button class="mini" data-act="sell" data-id="' + it.id + '">' + T('Sell 1') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
    return h;
  }

  // ---------- loot ----------
  function lootTab() {
    const L = S.loot; const chars = S.chars;
    let h = '<p class="lead">' + T('The party found something? Put it in the bag (from the 📚 Catalog, or gold), pick the hero, and give it. The app adds it to your copy AND downloads a small file for that player — they load it and the items appear in their bag.') + '</p>';
    h += '<div class="detail"><h3>🎁 ' + T('Loot bag') + '</h3>' + (L.items.length ? '<table class="inv"><tbody>' + L.items.map((x, i) => {
      const e = localEntry(x); const nm = U.itemView(x).name + ' · ' + T('lvl {0}', U.itemView(x).level);
      return '<tr><td>' + (e.icon || '📦') + '</td><td><b>' + esc(nm) + '</b></td><td><input type="number" min="1" class="qty" data-on="lootQty" data-i="' + i + '" value="' + (x.qty || 1) + '"></td><td><button class="mini danger" data-act="lootDel" data-i="' + i + '">✕</button></td></tr>';
    }).join('') + '</tbody></table>' : '<p class="hint">' + T('Empty. Go to 📚 Catalog and click 🎁 To loot.') + '</p>') +
      '<p><label class="inl">💰 ' + T('Gold (GP)') + ' <input type="number" min="0" step="0.01" data-on="lootGold" value="' + (L.gold || 0) + '"></label></p>' +
      '<p><label class="inl">' + T('Give to') + ' <select id="lootTo">' + chars.map(c => opt(c.id, c.name || T('Unnamed hero'), S.lootTo || '')).join('') + '</select></label></p>' +
      '<div class="btnrow"><button class="primary" data-act="lootGive" data-file="1"' + (L.items.length || L.gold ? '' : ' disabled') + '>🎁 ' + T('Give + 📤 file for the player') + '</button>' +
      '<button data-act="lootGive"' + (L.items.length || L.gold ? '' : ' disabled') + '>🎁 ' + T('Only give (my copy)') + '</button>' +
      '<button data-act="itemsTab" data-v="catalog">📚 ' + T('Add from catalog') + '</button></div></div>';
    return h;
  }

  // ======================================================================
  //  SCENARIO box (in ⚙️ Settings)
  // ======================================================================
  U.scenarioBox = function () {
    if (U.DM && !U.game) return '';
    const all = SCN.all(); const cur = SCN.activeId();
    const row = (id, title, about, extra) => '<label class="scnrow' + ((cur || '') === id ? ' on' : '') + '"><input type="radio" name="scn" data-on="scnPick" value="' + esc(id) + '"' + ((cur || '') === id ? ' checked' : '') + '><span><b>' + esc(title) + '</b>' + (about ? '<small>' + esc(about) + '</small>' : '') + '</span>' + (extra || '') + '</label>';
    const ttl = p => (U.LANG === 'ru' && Array.isArray(p.ru) ? p.ru[0] : p.name), abt = p => (U.LANG === 'ru' && Array.isArray(p.ru) && p.ru[1] ? p.ru[1] : p.desc || '');
    let h = '<div class="setgrp"><h4>📜 ' + T('Scenario') + ' ' + ib('scenario') + (U.DM ? ' <small>' + T('(for this game)') + '</small>' : '') + '</h4>' +
      row('', T('Normal D&D'), T('The base rules, nothing added.')) +
      Object.values(all).map(p => row(p.id, ttl(p), abt(p), '<span class="scnbtns">' + (U.DM ? '<button class="mini" data-act="scnExport" data-id="' + esc(p.id) + '" title="' + esc(T('Download the file to send to players')) + '">📤</button>' : '') + '<button class="mini danger" data-act="scnDel" data-id="' + esc(p.id) + '">✕</button></span>')).join('') +
      '<p><button class="mini" data-act="importChar">📥 ' + T('Load a scenario file') + '</button></p>';
    if (SCN.active && SCN.active.rules) h += '<div class="scnrules"><b>' + T('Scenario rules') + '</b><p>' + esc(U.LANG === 'ru' && SCN.active.rulesRu ? SCN.active.rulesRu : SCN.active.rules).replace(/\n/g, '<br>') + '</p></div>';
    return h + '</div>';
  };

  // ======================================================================
  //  ACTIONS
  // ======================================================================
  const saveShops = () => store.set('shops', S.shops);
  const curShop = () => S.shops.find(x => x.id === S.shopSel);
  const mbOf = el => { const s = el && el.parentNode && el.parentNode.querySelector('.mbsel'); return s ? Number(s.value) || 0 : 0; };
  Object.assign(U.ACT, {
    itemsTab: ds => { S.itemsTab = ds.v; if (ds.v !== 'shops') S.shopMode = S.shopMode; U.render(); },
    icat: ds => { S.icat = ds.v; U.render(); },
    itier: ds => { S.itier = ds.v; U.render(); },
    isrc: ds => { S.isrc = ds.v; U.render(); },
    iEditOpen: ds => { S.iedit = S.iedit === ds.id ? null : ds.id; U.render(); },
    iEditReset: ds => { const ed = store.get('itemEdits', {}); delete ed[ds.id]; store.set('itemEdits', ed); U.applyItemEdits(); U.render(); },
    shopNew: () => {
      const n = prompt(T('Shop name?'), T('General store')); if (!n) return;
      const s = { id: E.uid(), name: n, desc: '', items: [] }; S.shops.push(s); saveShops();
      S.shopSel = s.id; S.shopMode = 'edit'; U.render();
    },
    shopOpen: ds => { S.shopSel = ds.id; S.shopMode = 'buy'; S.itemsTab = 'shops'; U.render(); },
    shopEdit: ds => { S.shopSel = ds.id; S.shopMode = 'edit'; S.itemsTab = 'shops'; U.render(); },
    shopBack: () => { S.shopSel = S.shopMode === 'edit' ? S.shopSel : null; S.shopMode = null; S.shopSel = null; U.render(); },
    shopDel: ds => { const s = S.shops.find(x => x.id === ds.id); if (!s || !confirm(T('Delete the shop {0}?', s.name))) return; S.shops = S.shops.filter(x => x !== s); saveShops(); U.render(); },
    shopItemDel: ds => { curShop().items.splice(Number(ds.i), 1); saveShops(); U.render(); },
    toShop: (ds, el) => {
      const s = curShop(); const e = D.catalogById(ds.id); if (!s || !e) return;
      const mb = mbOf(el); s.items.push(Object.assign(U.entrySnap(e, { magicBonus: mb }), { price: priceOf(e, mb), qty: -1 })); saveShops();
      U.toast('🛒 ' + T('{0} added to {1}.', esc(mb ? '+' + mb + ' ' + e.name : e.name), esc(s.name)));
    },
    shopExport: ds => {
      const s = shopById(ds.id); if (!s) return;
      U.download(U.fileName(s.name) + '.shop.json', { app: 'dnd-table', kind: 'shop', version: 1, shop: { id: s.id, name: s.name, desc: s.desc || '', items: s.items } });
      U.toast(T('Downloaded. Send this file to the players — they load it in 🎒 Equipment.'));
    },
    buy: ds => {
      const sh = shopById(S.shopSel); const c = U.byId(S.buyer); if (!sh || !c) return;
      const x = sh.items[Number(ds.i)]; if (!x || x.qty === 0) return;
      if ((Number(c.gold) || 0) + 1e-9 < x.price) { U.toast(T('Not enough gold.')); return; }
      c.gold = Math.round(((Number(c.gold) || 0) - x.price) * 100) / 100;
      const it = U.giveItem(c, x, 1);
      if (x.qty > 0) { x.qty--; if (!sh.fromScenario) saveShops(); }
      U.saveChars();
      U.logAdd(c.name || T('Hero'), ['🪙 ' + T('bought {0} for {1}', '<b>' + esc(E.itemName(it)) + '</b>', U.money(x.price)) + ' · ' + T('gold left: {0}', U.money(c.gold))]);
      U.render();
    },
    sell: ds => {
      const c = U.byId(S.buyer); const it = c && c.inventory.find(x => x.id === ds.id); if (!it) return;
      const e = D.catalogById(it.cid); const p = Math.round(priceOf(e, it.magicBonus) / 2 * 100) / 100;
      if (!confirm(T('Sell 1 × {0} for {1}?', E.itemName(it), U.money(p)))) return;
      it.qty = (Number(it.qty) || 1) - 1; if (it.qty <= 0) c.inventory = c.inventory.filter(x => x !== it);
      c.gold = Math.round(((Number(c.gold) || 0) + p) * 100) / 100; U.saveChars();
      U.logAdd(c.name || T('Hero'), ['💱 ' + T('sold {0} for {1}', '<b>' + esc(E.itemName(it)) + '</b>', U.money(p))]); U.render();
    },
    toLoot: (ds, el) => { const e = D.catalogById(ds.id); if (!e) return; const mb = mbOf(el); S.loot.items.push(Object.assign(U.entrySnap(e, { magicBonus: mb }), { qty: 1 })); U.toast('🎁 ' + T('{0} is in the loot bag.', esc(mb ? '+' + mb + ' ' + e.name : e.name))); U.render(); },
    lootDel: ds => { S.loot.items.splice(Number(ds.i), 1); U.render(); },
    lootGive: ds => {
      const sel = document.getElementById('lootTo'); const c = sel && U.byId(sel.value); if (!c) { U.toast(T('Make a character first.')); return; }
      S.lootTo = c.id; const L = S.loot;
      const loot = { app: 'dnd-table', kind: 'loot', version: 1, id: E.uid(), to: c.id, toName: c.name, gold: Number(L.gold) || 0, items: L.items.map(x => E.clone(x)), date: new Date().toISOString() };
      applyLoot(c, loot);
      if (ds.file) { U.download(U.fileName((c.name || 'hero') + ' loot') + '.loot.json', loot); U.toast(T('Given to {0}. Send the downloaded file to that player.', esc(c.name))); }
      else U.toast(T('Given to {0}.', esc(c.name)));
      S.loot = { gold: 0, items: [] }; U.render();
    },
    scnExport: ds => { const p = SCN.all()[ds.id]; if (p) U.download(U.fileName(p.name) + '.scenario.json', p); },
    scnDel: ds => {
      const p = SCN.all()[ds.id]; if (!p || !confirm(T('Remove the scenario {0} from this browser?', p.name))) return;
      SCN.remove(ds.id); if (SCN.activeId() === ds.id) { SCN.choose(''); location.reload(); return; }
      document.querySelector('[data-act="settings"]').click();
    }
  });
  U.ON.itLevel = el => { const c = U.cur(); const it = c && c.inventory.find(x => x.id === el.dataset.id); if (!it) return; U.relevelItem(it, el.value); U.commit(); };
  Object.assign(U.ON, {
    iEdit: el => {
      const ed = store.get('itemEdits', {}); const x = ed[el.dataset.id] = ed[el.dataset.id] || {}; const f = el.dataset.f;
      x[f] = f === 'tier' ? el.value : Math.max(0, Number(el.value) || 0); store.set('itemEdits', ed); U.applyItemEdits(); U.render();
    }
  });
  Object.assign(U.ON, {
    iq: el => { S.iq = el.value; U.render(); const i = document.querySelector('.isearch'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } },
    shopSel: el => { S.shopSel = el.value || null; S.shopMode = null; U.render(); },
    shopSet: el => { const s = curShop(); s[el.dataset.f] = el.value; saveShops(); },
    shopItem: el => { const x = curShop().items[Number(el.dataset.i)]; if (el.dataset.f === 'price') x.price = Math.max(0, Number(el.value) || 0); else if (el.dataset.f === 'level') { x.level = Math.max(1, Math.min(20, Math.round(Number(el.value) || 1))); saveShops(); U.render(); return; } else x.qty = el.value === '' ? -1 : Math.max(0, Math.round(Number(el.value) || 0)); saveShops(); },
    buyer: el => { S.buyer = el.value; U.render(); },
    lootQty: el => { S.loot.items[Number(el.dataset.i)].qty = Math.max(1, Math.round(Number(el.value) || 1)); },
    lootGold: el => { S.loot.gold = Math.max(0, Number(el.value) || 0); U.render(); },
    scnPick: el => {
      const id = el.value; const p = SCN.all()[id];
      if (!confirm(id ? T('Switch to the scenario {0}? The page reloads.', p ? p.name : id) : T('Switch back to normal D&D? The page reloads.'))) { el.checked = false; return; }
      SCN.choose(id); location.reload();
    }
  });

  function applyLoot(c, loot) {
    c.lootIds = c.lootIds || [];
    if (c.lootIds.includes(loot.id)) return false;
    c.lootIds.push(loot.id);
    const names = [];
    (loot.items || []).forEach(x => { const it = U.giveItem(c, x, x.qty || 1); names.push(E.itemName(it) + (x.qty > 1 ? ' ×' + x.qty : '')); });
    if (loot.gold) { c.gold = Math.round(((Number(c.gold) || 0) + Number(loot.gold)) * 100) / 100; names.push(U.money(loot.gold)); }
    U.saveChars();
    U.logAdd(c.name || T('Hero'), ['🎁 ' + T('got loot: {0}', '<b>' + names.map(esc).join(', ') + '</b>')]);
    return true;
  }

  // ---------- loading files: shop / loot / scenario ----------
  U.IMPORT = U.IMPORT || {};
  U.IMPORT.shop = function (obj) {
    const s = obj.shop; if (!s || !Array.isArray(s.items)) { U.toast(T('⚠️ This shop file is broken.')); return; }
    const i = S.shops.findIndex(x => x.id === s.id);
    if (i >= 0) S.shops[i] = s; else S.shops.push(s);
    saveShops(); S.itemsTab = 'shops'; S.shopSel = s.id; S.shopMode = 'buy'; U.go('items');
    U.toast('🛒 ' + T(i >= 0 ? 'Shop updated: {0}' : 'New shop: {0}', esc(s.name)));
  };
  U.IMPORT.loot = function (obj) {
    if (!S.chars.length) { U.toast(T('Make a character first.')); return; }
    let c = U.byId(obj.to);
    if (!c) {
      if (S.chars.length === 1) c = S.chars[0];
      else {
        const n = prompt(T('Who gets this loot? Type the number:') + '\n' + S.chars.map((x, i) => (i + 1) + ') ' + (x.name || T('Unnamed hero'))).join('\n'), '1');
        c = S.chars[Number(n) - 1]; if (!c) return;
      }
    }
    if (!applyLoot(c, obj)) { U.toast(T('{0} already got this loot.', esc(c.name))); return; }
    U.go('sheet', c.id); U.toast('🎁 ' + T('Loot added to {0}!', esc(c.name)));
  };
  U.IMPORT.scenario = function (obj) {
    if (!SCN.valid(obj)) { U.toast(T('⚠️ This scenario file is broken.')); return; }
    if (U.DM && !U.game) { U.toast(T('Open a game first.')); return; }
    if (!SCN.save(obj)) { U.toast(T('⚠️ Browser storage is full or blocked — use 💾 Save file to keep a copy.')); return; }
    const name = U.LANG === 'ru' && Array.isArray(obj.ru) ? obj.ru[0] : obj.name;
    if (confirm(T('Scenario {0} loaded. Turn it on now? The page reloads.', name))) { SCN.choose(obj.id); location.reload(); }
    else U.toast(T('Saved. Turn it on in ⚙️ Settings → Scenario.'));
  };
})(window.UI);
