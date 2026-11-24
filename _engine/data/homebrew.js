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

})(window.DND);
