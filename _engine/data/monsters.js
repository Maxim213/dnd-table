// Monsters for the combat tracker. Numbers follow the free SRD stat blocks (close enough for play — tweak freely).
// attacks: n name, hit to-hit bonus, d damage, t type, plus {d,t} extra damage, range text. multi = attacks per turn.
window.DND = window.DND || {};
(function (D) {
  D.MONSTERS = {
    goblin: { name: 'Goblin Warrior', cr: '1/4', ac: 15, hp: 10, speed: '30 ft', abil: { STR: 8, DEX: 15, CON: 10, INT: 10, WIS: 8, CHA: 8 },
      attacks: [{ n: 'Scimitar', hit: 4, d: '1d6+2', t: 'slashing' }, { n: 'Shortbow', hit: 4, d: '1d6+2', t: 'piercing', range: '80/320 ft' }],
      traits: 'Nimble Escape: Bonus Action to Disengage or Hide. Darkvision 60 ft. +1d4 damage when it has Advantage.' },
    goblinboss: { name: 'Goblin Boss', cr: '1', ac: 17, hp: 21, speed: '30 ft', abil: { STR: 10, DEX: 15, CON: 10, INT: 10, WIS: 8, CHA: 10 }, multi: 2,
      attacks: [{ n: 'Scimitar', hit: 4, d: '1d6+2', t: 'slashing' }],
      traits: 'Multiattack (2 Scimitar). Redirect Attack: reaction, swap places with a goblin ally so it gets hit instead.' },
    giantrat: { name: 'Giant Rat', cr: '1/8', ac: 13, hp: 7, speed: '30 ft', abil: { STR: 7, DEX: 16, CON: 11, INT: 2, WIS: 10, CHA: 4 },
      attacks: [{ n: 'Bite', hit: 5, d: '1d4+2', t: 'piercing' }],
      traits: 'Pack Tactics: Advantage if an ally is within 5 ft of the target. Darkvision 60 ft.' },
    kobold: { name: 'Kobold Warrior', cr: '1/8', ac: 14, hp: 7, speed: '30 ft', abil: { STR: 7, DEX: 15, CON: 9, INT: 8, WIS: 7, CHA: 8 },
      attacks: [{ n: 'Dagger', hit: 4, d: '1d4+2', t: 'piercing' }],
      traits: 'Pack Tactics. Sunlight Sensitivity (Disadvantage in sunlight).' },
    wolf: { name: 'Wolf', cr: '1/4', ac: 13, hp: 11, speed: '40 ft', abil: { STR: 12, DEX: 15, CON: 12, INT: 3, WIS: 12, CHA: 6 },
      attacks: [{ n: 'Bite', hit: 4, d: '2d4+2', t: 'piercing' }],
      traits: 'Pack Tactics. Bite: target (Large or smaller) is knocked Prone (STR save DC 11 avoids).' },
    skeleton: { name: 'Skeleton', cr: '1/4', ac: 13, hp: 13, speed: '30 ft', abil: { STR: 10, DEX: 14, CON: 15, INT: 6, WIS: 8, CHA: 5 },
      attacks: [{ n: 'Shortsword', hit: 4, d: '1d6+2', t: 'piercing' }, { n: 'Shortbow', hit: 4, d: '1d6+2', t: 'piercing', range: '80/320 ft' }],
      traits: 'Vulnerable to bludgeoning (double damage). Immune to poison.' },
    zombie: { name: 'Zombie', cr: '1/4', ac: 8, hp: 22, speed: '20 ft', abil: { STR: 13, DEX: 6, CON: 16, INT: 3, WIS: 6, CHA: 5 },
      attacks: [{ n: 'Slam', hit: 3, d: '1d6+1', t: 'bludgeoning' }],
      traits: 'Undead Fortitude: if damage drops it to 0 HP, CON save (DC 5 + damage taken) to drop to 1 HP instead (not vs radiant or crits).' },
    bandit: { name: 'Bandit', cr: '1/8', ac: 12, hp: 11, speed: '30 ft', abil: { STR: 11, DEX: 12, CON: 12, INT: 10, WIS: 10, CHA: 10 },
      attacks: [{ n: 'Scimitar', hit: 3, d: '1d6+1', t: 'slashing' }, { n: 'Light Crossbow', hit: 3, d: '1d8+1', t: 'piercing', range: '80/320 ft' }], traits: '' },
    cultist: { name: 'Cultist', cr: '1/8', ac: 12, hp: 9, speed: '30 ft', abil: { STR: 11, DEX: 12, CON: 10, INT: 10, WIS: 11, CHA: 10 },
      attacks: [{ n: 'Ritual Sickle', hit: 3, d: '1d4+1', t: 'slashing', plus: { d: '1', t: 'necrotic' } }], traits: 'Advantage on saves vs Charmed and Frightened.' },
    guard: { name: 'Guard', cr: '1/8', ac: 16, hp: 11, speed: '30 ft', abil: { STR: 13, DEX: 12, CON: 12, INT: 10, WIS: 11, CHA: 10 },
      attacks: [{ n: 'Spear', hit: 3, d: '1d6+1', t: 'piercing' }], traits: '' },
    orc: { name: 'Orc', cr: '1/2', ac: 13, hp: 15, speed: '30 ft', abil: { STR: 16, DEX: 12, CON: 16, INT: 7, WIS: 11, CHA: 10 },
      attacks: [{ n: 'Greataxe', hit: 5, d: '1d12+3', t: 'slashing' }, { n: 'Javelin', hit: 5, d: '1d6+3', t: 'piercing', range: '30/120 ft' }],
      traits: 'Aggressive: Bonus Action to move up to its Speed toward an enemy. Darkvision 60 ft.' },
    spider: { name: 'Giant Spider', cr: '1', ac: 14, hp: 26, speed: '30 ft, climb 30 ft', abil: { STR: 14, DEX: 16, CON: 12, INT: 2, WIS: 11, CHA: 4 },
      attacks: [{ n: 'Bite', hit: 5, d: '1d8+3', t: 'piercing', plus: { d: '2d8', t: 'poison' } }],
      traits: 'Spider Climb, Web Sense, Web Walker. Web (recharge 5–6): DEX save or Restrained.' },
    bugbear: { name: 'Bugbear', cr: '1', ac: 16, hp: 27, speed: '30 ft', abil: { STR: 15, DEX: 14, CON: 13, INT: 8, WIS: 11, CHA: 9 },
      attacks: [{ n: 'Morningstar', hit: 4, d: '2d8+2', t: 'piercing' }, { n: 'Javelin', hit: 4, d: '1d6+2', t: 'piercing', range: '30/120 ft' }],
      traits: 'Brute (big damage dice). Surprise Attack: +2d6 if it hits a Surprised creature in the first round.' },
    ogre: { name: 'Ogre', cr: '2', ac: 11, hp: 59, speed: '40 ft', abil: { STR: 19, DEX: 8, CON: 16, INT: 5, WIS: 7, CHA: 7 },
      attacks: [{ n: 'Greatclub', hit: 6, d: '2d8+4', t: 'bludgeoning' }, { n: 'Javelin', hit: 6, d: '2d6+4', t: 'piercing', range: '30/120 ft' }],
      traits: 'Large. Darkvision 60 ft.' }
  };

  // Balance table: typical numbers for a monster of each Challenge Rating (CR), from the DMG guidelines (rounded).
  // dpr = damage per round (all attacks together). xp = XP value (2024 encounter budget).
  D.CR_LIST = ['0', '1/8', '1/4', '1/2', '1', '2', '3', '4', '5'];
  D.CR_TABLE = {
    '0':   { ac: 12, hp: 4,  hit: 2, dpr: 1,  dc: 10, xp: 10,   mod: 0, note: 'harmless (a rat, a cat)' },
    '1/8': { ac: 12, hp: 9,  hit: 3, dpr: 4,  dc: 10, xp: 25,   mod: 1, note: 'very weak (bandit, kobold)' },
    '1/4': { ac: 13, hp: 13, hit: 4, dpr: 6,  dc: 11, xp: 50,   mod: 2, note: 'weak (goblin, wolf, skeleton)' },
    '1/2': { ac: 13, hp: 22, hit: 4, dpr: 8,  dc: 12, xp: 100,  mod: 2, note: 'tough-ish (orc)' },
    '1':   { ac: 13, hp: 30, hit: 4, dpr: 11, dc: 12, xp: 200,  mod: 2, note: 'a real threat for level 1 (bugbear, giant spider)' },
    '2':   { ac: 13, hp: 45, hit: 5, dpr: 16, dc: 13, xp: 450,  mod: 3, note: 'a boss for level 1, strong for level 2 (ogre)' },
    '3':   { ac: 14, hp: 60, hit: 5, dpr: 22, dc: 13, xp: 700,  mod: 3, note: 'a boss for level 2-3' },
    '4':   { ac: 14, hp: 75, hit: 5, dpr: 28, dc: 14, xp: 1100, mod: 4, note: 'very dangerous for level 3' },
    '5':   { ac: 15, hp: 95, hit: 6, dpr: 34, dc: 15, xp: 1800, mod: 4, note: 'deadly for level 3' }
  };
  // XP budget per character for one fight (2024 rules): Low / Moderate / High difficulty.
  D.XP_BUDGET = { 1: [50, 75, 100], 2: [100, 150, 200], 3: [150, 225, 400], 4: [250, 375, 500], 5: [500, 750, 1100] };
})(window.DND);
