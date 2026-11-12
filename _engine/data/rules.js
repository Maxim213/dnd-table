// Core rules data (D&D 5e, 2024 rules / SRD 5.2). Safe to edit.
// Keys (STR, 'Stealth', 'Poisoned', 'Graze', 'Finesse'…) are English and are what saves store.
// Other languages: data/ru/*.js are laid on top of this at start (see ui-core.js). D.t() translates a key for the screen.
window.DND = window.DND || {};
(function (D) {
  D.RU = D.RU || {};               // term dictionary (filled by the Russian layer)
  D.t = s => (s == null ? '' : (D.RU[s] != null ? D.RU[s] : s));
  D.tProp = p => String(p);        // weapon property text (Russian layer replaces this)

  D.ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  D.ABIL_NAME = { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' };
  D.AB = { STR: 'STR', DEX: 'DEX', CON: 'CON', INT: 'INT', WIS: 'WIS', CHA: 'CHA' }; // short names on screen
  D.ABIL_HELP = {
    STR: 'Muscle: heavy weapons, climbing, grappling',
    DEX: 'Agility: aim, sneaking, reflexes, light-armor AC',
    CON: 'Toughness: more HP, holding concentration',
    INT: 'Knowledge & logic. Wizard magic',
    WIS: 'Awareness & willpower. Cleric, Druid, Ranger, Monk',
    CHA: 'Presence & charm. Bard, Paladin, Sorcerer, Warlock'
  };

  D.SKILLS = {
    'Acrobatics': 'DEX', 'Animal Handling': 'WIS', 'Arcana': 'INT', 'Athletics': 'STR',
    'Deception': 'CHA', 'History': 'INT', 'Insight': 'WIS', 'Intimidation': 'CHA',
    'Investigation': 'INT', 'Medicine': 'WIS', 'Nature': 'INT', 'Perception': 'WIS',
    'Performance': 'CHA', 'Persuasion': 'CHA', 'Religion': 'INT', 'Sleight of Hand': 'DEX',
    'Stealth': 'DEX', 'Survival': 'WIS'
  };
  D.ALL_SKILLS = Object.keys(D.SKILLS);

  D.pb = lvl => 2 + Math.floor((lvl - 1) / 4);
  D.MAX_LEVEL = 3; // levels.js raises this to 20

  D.POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  D.POINT_TOTAL = 27;
  D.STANDARD = [15, 14, 13, 12, 10, 8];

  // Spell slots by character level (index 0 = level 1). Each entry = slots per spell level.
  D.SLOTS = {
    full: [[2], [3], [4, 2]],
    half: [[2], [2], [3]],
  };
  // Warlock Pact Magic: {count, level}
  D.PACT = [{ count: 1, level: 1 }, { count: 2, level: 1 }, { count: 2, level: 2 }];

  D.CONDITIONS = {
    'Blinded': 'Can\'t see. Your attacks have Disadvantage, attacks against you have Advantage.',
    'Charmed': 'Can\'t attack the charmer. Charmer has Advantage on social checks with you.',
    'Deafened': 'Can\'t hear.',
    'Exhaustion': 'Each level: −2 to d20 tests, −5 ft Speed. Level 6 = death. Long rest removes 1.',
    'Frightened': 'Disadvantage on checks/attacks while you can see the source. Can\'t move closer to it.',
    'Grappled': 'Speed 0. Disadvantage on attacks against anyone except the grappler.',
    'Incapacitated': 'No actions, bonus actions or reactions. Concentration breaks.',
    'Invisible': 'Your attacks have Advantage, attacks against you have Disadvantage.',
    'Paralyzed': 'Incapacitated, Speed 0. Fail STR/DEX saves. Attacks vs you have Advantage; hits within 5 ft are crits.',
    'Poisoned': 'Disadvantage on attack rolls and ability checks.',
    'Prone': 'Can only crawl. Your attacks have Disadvantage. Attacks within 5 ft have Advantage, farther have Disadvantage.',
    'Restrained': 'Speed 0. Your attacks and DEX saves have Disadvantage; attacks vs you have Advantage.',
    'Stunned': 'Incapacitated. Fail STR/DEX saves. Attacks vs you have Advantage.',
    'Unconscious': 'Incapacitated, Prone, drop what you hold. Fail STR/DEX saves. Hits within 5 ft are crits.',
    'Concentrating': '(reminder) Taking damage → CON save DC 10 or half the damage (max 30).',
    'Raging': '(reminder) Barbarian Rage active.',
    'Hidden': '(reminder) Enemies don\'t know where you are.'
  };

  D.MASTERIES = {
    Cleave: 'Hit a creature → make one more attack roll vs another creature within 5 ft of it (no ability modifier to that damage). Once per turn.',
    Graze: 'Miss → the target still takes damage equal to your ability modifier.',
    Nick: 'The extra attack from the Light property is part of the Attack action (not a Bonus Action). Once per turn.',
    Push: 'Hit → push the target (Large or smaller) up to 10 ft away from you.',
    Sap: 'Hit → the target has Disadvantage on its next attack roll before your next turn.',
    Slow: 'Hit and deal damage → target\'s Speed −10 ft until the start of your next turn.',
    Topple: 'Hit → target makes a CON save (DC 8 + your ability mod + PB) or falls Prone.',
    Vex: 'Hit and deal damage → you have Advantage on your next attack vs that target before the end of your next turn.'
  };

  // Weapons. range: melee|ranged. props: list. mastery: key of MASTERIES.
  D.WEAPONS = {
    club: { name: 'Club', cat: 'simple', range: 'melee', dmg: '1d4', type: 'bludgeoning', props: ['Light'], mastery: 'Slow' },
    dagger: { name: 'Dagger', cat: 'simple', range: 'melee', dmg: '1d4', type: 'piercing', props: ['Finesse', 'Light', 'Thrown (20/60)'], mastery: 'Nick', thrown: true },
    greatclub: { name: 'Greatclub', cat: 'simple', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: ['Two-Handed'], mastery: 'Push' },
    handaxe: { name: 'Handaxe', cat: 'simple', range: 'melee', dmg: '1d6', type: 'slashing', props: ['Light', 'Thrown (20/60)'], mastery: 'Vex', thrown: true },
    javelin: { name: 'Javelin', cat: 'simple', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Thrown (30/120)'], mastery: 'Slow', thrown: true },
    lighthammer: { name: 'Light Hammer', cat: 'simple', range: 'melee', dmg: '1d4', type: 'bludgeoning', props: ['Light', 'Thrown (20/60)'], mastery: 'Nick', thrown: true },
    mace: { name: 'Mace', cat: 'simple', range: 'melee', dmg: '1d6', type: 'bludgeoning', props: [], mastery: 'Sap' },
    quarterstaff: { name: 'Quarterstaff', cat: 'simple', range: 'melee', dmg: '1d6', type: 'bludgeoning', props: ['Versatile (1d8)'], mastery: 'Topple', versatile: '1d8' },
    sickle: { name: 'Sickle', cat: 'simple', range: 'melee', dmg: '1d4', type: 'slashing', props: ['Light'], mastery: 'Nick' },
    spear: { name: 'Spear', cat: 'simple', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Thrown (20/60)', 'Versatile (1d8)'], mastery: 'Sap', thrown: true, versatile: '1d8' },
    dart: { name: 'Dart', cat: 'simple', range: 'ranged', dmg: '1d4', type: 'piercing', props: ['Finesse', 'Thrown (20/60)'], mastery: 'Vex', thrown: true },
    lightcrossbow: { name: 'Light Crossbow', cat: 'simple', range: 'ranged', dmg: '1d8', type: 'piercing', props: ['Ammunition (80/320)', 'Loading', 'Two-Handed'], mastery: 'Slow' },
    shortbow: { name: 'Shortbow', cat: 'simple', range: 'ranged', dmg: '1d6', type: 'piercing', props: ['Ammunition (80/320)', 'Two-Handed'], mastery: 'Vex' },
    sling: { name: 'Sling', cat: 'simple', range: 'ranged', dmg: '1d4', type: 'bludgeoning', props: ['Ammunition (30/120)'], mastery: 'Slow' },
    battleaxe: { name: 'Battleaxe', cat: 'martial', range: 'melee', dmg: '1d8', type: 'slashing', props: ['Versatile (1d10)'], mastery: 'Topple', versatile: '1d10' },
    flail: { name: 'Flail', cat: 'martial', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: [], mastery: 'Sap' },
    glaive: { name: 'Glaive', cat: 'martial', range: 'melee', dmg: '1d10', type: 'slashing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Graze' },
    greataxe: { name: 'Greataxe', cat: 'martial', range: 'melee', dmg: '1d12', type: 'slashing', props: ['Heavy', 'Two-Handed'], mastery: 'Cleave' },
    greatsword: { name: 'Greatsword', cat: 'martial', range: 'melee', dmg: '2d6', type: 'slashing', props: ['Heavy', 'Two-Handed'], mastery: 'Graze' },
    halberd: { name: 'Halberd', cat: 'martial', range: 'melee', dmg: '1d10', type: 'slashing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Cleave' },
    lance: { name: 'Lance', cat: 'martial', range: 'melee', dmg: '1d10', type: 'piercing', props: ['Heavy', 'Reach', 'Two-Handed (unless mounted)'], mastery: 'Topple' },
    longsword: { name: 'Longsword', cat: 'martial', range: 'melee', dmg: '1d8', type: 'slashing', props: ['Versatile (1d10)'], mastery: 'Sap', versatile: '1d10' },
    maul: { name: 'Maul', cat: 'martial', range: 'melee', dmg: '2d6', type: 'bludgeoning', props: ['Heavy', 'Two-Handed'], mastery: 'Topple' },
    morningstar: { name: 'Morningstar', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: [], mastery: 'Sap' },
    pike: { name: 'Pike', cat: 'martial', range: 'melee', dmg: '1d10', type: 'piercing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Push' },
    rapier: { name: 'Rapier', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Finesse'], mastery: 'Vex' },
    scimitar: { name: 'Scimitar', cat: 'martial', range: 'melee', dmg: '1d6', type: 'slashing', props: ['Finesse', 'Light'], mastery: 'Nick' },
    shortsword: { name: 'Shortsword', cat: 'martial', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Finesse', 'Light'], mastery: 'Vex' },
    trident: { name: 'Trident', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Thrown (20/60)', 'Versatile (1d10)'], mastery: 'Topple', thrown: true, versatile: '1d10' },
    warhammer: { name: 'Warhammer', cat: 'martial', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: ['Versatile (1d10)'], mastery: 'Push', versatile: '1d10' },
    warpick: { name: 'War Pick', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Versatile (1d10)'], mastery: 'Sap', versatile: '1d10' },
    whip: { name: 'Whip', cat: 'martial', range: 'melee', dmg: '1d4', type: 'slashing', props: ['Finesse', 'Reach'], mastery: 'Slow' },
    blowgun: { name: 'Blowgun', cat: 'martial', range: 'ranged', dmg: '1', type: 'piercing', props: ['Ammunition (25/100)', 'Loading'], mastery: 'Vex' },
    handcrossbow: { name: 'Hand Crossbow', cat: 'martial', range: 'ranged', dmg: '1d6', type: 'piercing', props: ['Ammunition (30/120)', 'Light', 'Loading'], mastery: 'Vex' },
    heavycrossbow: { name: 'Heavy Crossbow', cat: 'martial', range: 'ranged', dmg: '1d10', type: 'piercing', props: ['Ammunition (100/400)', 'Heavy', 'Loading', 'Two-Handed'], mastery: 'Push' },
    longbow: { name: 'Longbow', cat: 'martial', range: 'ranged', dmg: '1d8', type: 'piercing', props: ['Ammunition (150/600)', 'Heavy', 'Two-Handed'], mastery: 'Slow' }
  };

  // Armor. dexMax: null = full DEX, 2 = max +2, 0 = no DEX.
  D.ARMOR = {
    padded: { name: 'Padded Armor', type: 'light', base: 11, dexMax: null, stealthDis: true },
    leather: { name: 'Leather Armor', type: 'light', base: 11, dexMax: null },
    studded: { name: 'Studded Leather Armor', type: 'light', base: 12, dexMax: null },
    hide: { name: 'Hide Armor', type: 'medium', base: 12, dexMax: 2 },
    chainshirt: { name: 'Chain Shirt', type: 'medium', base: 13, dexMax: 2 },
    scale: { name: 'Scale Mail', type: 'medium', base: 14, dexMax: 2, stealthDis: true },
    breastplate: { name: 'Breastplate', type: 'medium', base: 14, dexMax: 2 },
    halfplate: { name: 'Half Plate Armor', type: 'medium', base: 15, dexMax: 2, stealthDis: true },
    ringmail: { name: 'Ring Mail', type: 'heavy', base: 14, dexMax: 0, stealthDis: true },
    chainmail: { name: 'Chain Mail', type: 'heavy', base: 16, dexMax: 0, stealthDis: true, str: 13 },
    splint: { name: 'Splint Armor', type: 'heavy', base: 17, dexMax: 0, stealthDis: true, str: 15 },
    plate: { name: 'Plate Armor', type: 'heavy', base: 18, dexMax: 0, stealthDis: true, str: 15 },
    shield: { name: 'Shield', type: 'shield', base: 2 }
  };

  D.FIGHTING_STYLES = {
    archery: { name: 'Archery', desc: '+2 to attack rolls with Ranged weapons.' },
    defense: { name: 'Defense', desc: '+1 AC while wearing light, medium or heavy armor.' },
    dueling: { name: 'Dueling', desc: '+2 damage with a Melee weapon held in one hand (and no other weapon).' },
    gwf: { name: 'Great Weapon Fighting', desc: 'With a Two-Handed or Versatile weapon held in two hands, treat any 1 or 2 on a damage die as a 3.' },
    protection: { name: 'Protection', desc: 'Reaction (with a shield): give Disadvantage to an attack against an ally within 5 ft.' },
    twf: { name: 'Two-Weapon Fighting', desc: 'Add your ability modifier to the damage of the extra Light-weapon attack.' },
    thrown: { name: 'Thrown Weapon Fighting', desc: '+2 damage with Thrown weapons used for a ranged attack. Draw them as part of the attack.' },
    blind: { name: 'Blind Fighting', desc: 'Blindsight 10 ft.' },
    interception: { name: 'Interception', desc: 'Reaction: reduce damage to an ally within 5 ft by 1d10 + PB (needs a shield or weapon).' },
    unarmed: { name: 'Unarmed Fighting', desc: 'Unarmed strikes deal 1d6 + STR (1d8 if both hands free). Grappled foes take 1d4 at your turn start.' }
  };

  // Origin feats (granted by backgrounds; Humans get one more).
  D.FEATS = {
    alert: { name: 'Alert', desc: 'Add your Proficiency Bonus to Initiative. You can swap Initiative with a willing ally.' },
    crafter: { name: 'Crafter', desc: 'Proficiency with 3 Artisan\'s Tools, 20% discount on nonmagical items, craft faster.' },
    healer: { name: 'Healer', desc: 'Utilize a Healer\'s Kit to let a creature spend a Hit Die and heal (+PB). Reroll 1s on healing dice.' },
    lucky: { name: 'Lucky', desc: 'Luck Points = PB per Long Rest. Spend one to give yourself Advantage on a d20 test, or give an attacker Disadvantage against you.', uses: { max: 'PB', reset: 'long' } },
    magicinitiate: { name: 'Magic Initiate', desc: 'Learn 2 cantrips and one level 1 spell from the Cleric, Druid or Wizard list. Cast that spell once per Long Rest for free (or with slots).' },
    musician: { name: 'Musician', desc: 'Proficiency with 3 instruments. After a rest, play a song: give Heroic Inspiration to up to PB allies.' },
    savage: { name: 'Savage Attacker', desc: 'Once per turn when you hit with a weapon, roll its damage dice twice and use either roll.' },
    skilled: { name: 'Skilled', desc: 'Proficiency in any combination of 3 skills or tools.' },
    tavern: { name: 'Tavern Brawler', desc: 'Unarmed Strike deals 1d4 + STR. Reroll 1s on unarmed damage. Once per turn: push 5 ft on an unarmed hit. Proficient with improvised weapons.' },
    tough: { name: 'Tough', desc: '+2 Hit Points per level.' }
  };

  // Gear names are stored in English; the Russian layer translates them for the screen with D.t().
  D.GEAR = [
    'Backpack', 'Bedroll', 'Rope (50 ft)', 'Torch', 'Tinderbox', 'Rations (1 day)', 'Waterskin', 'Crowbar', 'Hammer', 'Pitons',
    'Lantern', 'Oil flask', 'Healer\'s Kit', 'Thieves\' Tools', 'Holy Symbol', 'Arcane Focus', 'Druidic Focus', 'Spellbook',
    'Musical Instrument', 'Quiver', 'Arrows (20)', 'Bolts (20)', 'Explorer\'s Pack', 'Dungeoneer\'s Pack', 'Priest\'s Pack',
    'Scholar\'s Pack', 'Burglar\'s Pack', 'Entertainer\'s Pack', 'Herbalism Kit', 'Potion of Healing'
  ];

  // Effects you can put on custom features and magic items.
  D.EFFECT_TYPES = {
    ac: 'Armor Class +',
    attack: 'Attack rolls (to hit) +',
    damage: 'Damage +',
    damageMult: 'Damage × (multiplier)',
    speed: 'Speed + (ft)',
    hpMax: 'Max HP +',
    initiative: 'Initiative +',
    save: 'All saving throws +',
    skills: 'All skill checks +',
    ability: 'Ability score +',
    spellDC: 'Spell save DC +',
    spellAttack: 'Spell attack +'
  };
  D.EFFECT_SCOPES = { all: 'everything', melee: 'melee only', ranged: 'ranged only', spell: 'spells only' };
})(window.DND);
