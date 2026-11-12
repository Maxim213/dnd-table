// YOUR homebrew library: magic items you can add to any character from the sheet.
// Item fields: name, weapon (key from rules.js WEAPONS) or armor (key from ARMOR) or nothing (gear),
// magicBonus (+X to hit & damage for weapons, +X AC for armor), requiresAttunement, rarity, desc,
// roll (dice for consumables), effects: [{ type, value, scope }] (types listed in rules.js EFFECT_TYPES).
// Effects only work while the item is EQUIPPED (and ATTUNED, if it requires attunement).
window.DND = window.DND || {};
(function (D) {
  D.HOMEBREW_ITEMS = [
    {
      name: 'Gravemaw', weapon: 'greatsword', rarity: 'Legendary (homebrew)', requiresAttunement: true,
      desc: 'Black iron greatsword with teeth along the edge. While equipped and attuned, ALL damage you deal is doubled (any source). Roll damage, apply all other rules, then ×2.',
      effects: [{ type: 'damageMult', value: 2, scope: 'all' }]
    },
    { name: 'Potion of Healing', rarity: 'Common', desc: 'Drink (Bonus Action house rule / Action): regain 2d4 + 2 HP.', roll: '2d4+2', heal: true },
    { name: '+1 Longsword', weapon: 'longsword', magicBonus: 1, rarity: 'Uncommon', desc: '+1 to attack and damage rolls.' },
    { name: 'Ring of Protection', rarity: 'Rare', requiresAttunement: true, desc: '+1 AC and +1 to all saving throws.', effects: [{ type: 'ac', value: 1 }, { type: 'save', value: 1 }] },
    { name: 'Boots of Striding', rarity: 'Uncommon', requiresAttunement: true, desc: '+10 ft Speed.', effects: [{ type: 'speed', value: 10 }] },
    { name: 'Amulet of Health (lite)', rarity: 'Rare', requiresAttunement: true, desc: '+2 Constitution.', effects: [{ type: 'ability', ability: 'CON', value: 2 }] }
  ];

  // Ready-made practice character (the paper version is in _Old/03_Characters/)
  D.SAMPLE_CHARACTERS = [{
    id: 'sample-bran', name: 'Bran Ashford', player: 'Practice', level: 1,
    classKey: 'fighter', speciesKey: 'human', speciesOpt: '', backgroundKey: 'soldier',
    bgMode: '21', bgPlus2: 'STR', bgPlus1: 'CON',
    method: 'standard', base: { STR: 15, DEX: 14, CON: 13, INT: 8, WIS: 12, CHA: 10 },
    opts: { fightingStyle: 'gwf', humanFeat: 'tough' },
    picks: { class: ['Perception', 'Survival'], species: ['Stealth'], masteries: ['greatsword', 'javelin', 'flail'] },
    inventory: [
      { id: 'i1', name: 'Chain Mail', armor: 'chainmail', equipped: true, qty: 1 },
      { id: 'i2', name: 'Greatsword', weapon: 'greatsword', equipped: true, qty: 1 },
      { id: 'i3', name: 'Flail', weapon: 'flail', qty: 1 },
      { id: 'i4', name: 'Javelin', weapon: 'javelin', qty: 8 },
      { id: 'i5', name: 'Dungeoneer\'s Pack', qty: 1, desc: 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days rations, waterskin, 50 ft rope.' }
    ],
    gold: 4,
    details: {
      who: 'An ex-soldier who left the army after his squad was wiped out by goblins.',
      want: 'To make the roads safe — and to get paid for it.',
      flaw: 'Charges in first, thinks later.',
      secret: 'He deserted the night of the ambush.'
    }
  }];
})(window.DND);
