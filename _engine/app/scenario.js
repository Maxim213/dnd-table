// =====================================================================
//  SCENARIOS — one file (<name>.scenario.json) laid on top of normal D&D.
//  It can add: items, species, subclasses, spells, feats, monsters, a starting shop and rule notes.
//  Loads BEFORE ui-core, so everything in it behaves like built-in content.
//  Files are kept in this browser: localStorage 'dnd.packs' = { id: pack }.
//  Which one is active: DM → per game (dndt.g.<game>.scenario), player → dndp.scenario.
//
//  File format (all fields optional except app/kind/id/name). Text can carry Russian in ru: [...]:
//  { "app": "dnd-table", "kind": "scenario", "version": 1, "id": "frostlands", "name": "Frostlands", "ru": ["Мёрзлые земли", "описание"],
//    "desc": "...", "rules": "House rules text shown to everyone",
//    "items":    [ { "id": "frost-blade", "name": "Frost Blade", "icon": "❄️", "weapon": "longsword", "magicBonus": 1, "rarity": "Rare",
//                    "cost": 2000, "desc": "...", "roll": "1d6", "effects": [{ "type": "ac", "value": 1 }], "ru": ["Морозный клинок", "..."] } ],
//    "species":  { "yeti": { "name": "Yeti-kin", "icon": "❄️", "speed": 30, "size": "Medium", "darkvision": 60, "blurb": "...", "traits": [{ "name": "...", "desc": "...", "ru": ["", ""] }], "ru": ["Йети", "blurb"] } },
//    "subclasses": { "fighter.frost": { "name": "Frost Knight", "desc": "...", "features": [{ "lvl": 3, "name": "...", "desc": "...", "roll": "1d6", "dmgx": true }] } },
//    "spells":   [ { "n": "Frost Nova", "l": 2, "c": ["wizard"], "t": "Action", "r": "Self", "a": "save", "s": "CON", "d": "3d8", "dt": "cold", "half": true, "desc": "...", "ru": ["", "", "", ""] } ],
//    "feats":    { "frostborn": { "name": "Frostborn", "abil": ["CON"], "desc": "...", "effects": [...], "ru": ["", ""] } },
//    "monsters": { "frostwolf": { "name": "Frost Wolf", "ru": ["Морозный волк", "traits in Russian"], "type": "beast", "cr": "1", "ac": 13, "hp": 22, ... same as data/monsters.js } },
//      type = aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant or undead (for the filters)
//    "shop":     { "name": "Trading post", "items": [ { "id": "g:Torch", "price": 0.05 }, { "id": "frost-blade", "price": 2500, "qty": 1 } ] } }
// =====================================================================
window.SCN = (function () {
  'use strict';
  const D = window.DND;
  const PLAYER = window.APP_MODE === 'player';
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const activeKey = () => (PLAYER ? 'dndp.scenario' : 'dndt.g.' + read('dndt.curGame') + '.scenario');

  const SCN = {
    all: () => read('dnd.packs') || {},
    activeId: () => read(activeKey()) || '',
    active: null,
    save(pack) { const all = SCN.all(); all[pack.id] = pack; return write('dnd.packs', all); },
    remove(id) { const all = SCN.all(); delete all[id]; write('dnd.packs', all); },
    choose(id) { write(activeKey(), id || ''); },
    valid: p => !!(p && p.app === 'dnd-table' && p.kind === 'scenario' && p.id && p.name)
  };

  // lay the active scenario over the base data
  function apply(p) {
    const tag = x => Object.assign(x, { scenario: p.id });
    (p.items || []).forEach(it => {
      const e = tag(Object.assign({ cat: it.weapon ? 'weapon' : it.armor ? 'armor' : 'scenario', icon: '📜', cost: D.RARITY_PRICE ? (D.RARITY_PRICE[it.rarity] || 0) : 0 }, it));
      e.id = 's:' + p.id + ':' + (it.id || it.name);
      if (D.CATALOG) { D.CATALOG = D.CATALOG.filter(x => x.name !== e.name); D.CATALOG.push(e); }
    });
    Object.keys(p.species || {}).forEach(k => { const s = p.species[k]; D.SPECIES[k] = tag(Object.assign({ icon: '🧬', speed: 30, size: 'Medium', blurb: '', traits: [] }, s)); });
    Object.keys(p.backgrounds || {}).forEach(k => { D.BACKGROUNDS[k] = tag(p.backgrounds[k]); });
    Object.keys(p.subclasses || {}).forEach(path => {
      const [cls, key] = path.split('.'); const C = D.CLASSES[cls]; if (!C || !key) return;
      C.subclasses = C.subclasses || {}; C.subclasses[key] = tag(Object.assign({ desc: '', features: [] }, p.subclasses[path]));
    });
    (p.spells || []).forEach(s => { D.SPELLS = D.SPELLS.filter(x => x.n !== s.n); D.SPELLS.push(tag(Object.assign({ c: [], t: 'Action', r: '—', desc: '' }, s))); });
    Object.keys(p.feats || {}).forEach(k => { D.GENERAL_FEATS = D.GENERAL_FEATS || {}; D.GENERAL_FEATS[k] = tag(Object.assign({ abil: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] }, p.feats[k])); });
    Object.keys(p.monsters || {}).forEach(k => { D.MONSTERS[k] = tag(p.monsters[k]); });
  }
  const id = SCN.activeId(); const all = SCN.all();
  if (id && all[id] && SCN.valid(all[id])) {
    SCN.active = all[id];
    try { apply(SCN.active); } catch (e) { console.error('Scenario failed to load', e); SCN.active = null; }
  }
  // Russian names of the scenario itself
  (D.AFTER_LANG = D.AFTER_LANG || []).push(function (lang) {
    Object.values(SCN.all()).forEach(p => { p.title = lang === 'ru' && Array.isArray(p.ru) ? p.ru[0] : p.name; p.about = lang === 'ru' && Array.isArray(p.ru) && p.ru[1] ? p.ru[1] : (p.desc || ''); });
    if (SCN.active) { const p = SCN.active; p.title = lang === 'ru' && Array.isArray(p.ru) ? p.ru[0] : p.name; p.about = lang === 'ru' && Array.isArray(p.ru) && p.ru[1] ? p.ru[1] : (p.desc || ''); }
  });
  return SCN;
})();
