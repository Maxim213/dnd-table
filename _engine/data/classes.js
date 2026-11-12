// Classes, levels 1-3 (2024 rules / SRD 5.2). Safe to edit.
// Feature fields: lvl, name, desc, uses {max, reset: 'long'|'short'|'short1'}, roll ('1d10+@LVL', '@WIS' etc.),
// toggle (can be switched on/off), effects (see rules.js EFFECT_TYPES), spells (always-prepared spells),
// dmgx (the roll is extra damage on the target), sneak (Sneak Attack dice).
// uses.max can be a number or a function (x) => number, where x = { lvl, pb, mod: {STR..CHA} }.
// later = what the class gets at levels 4-20 (info only; the app covers levels 1-3).
// goldOption = rules option B: take only gold instead of the kit.
// Russian text for all of this: data/ru/classes.js
window.DND = window.DND || {};
(function (D) {
  const atLeast1 = n => Math.max(1, n);

  // milestones every class gets
  D.LATER_COMMON = { 4: 'Feat (or +2 to an ability)', 8: 'Feat', 12: 'Feat', 16: 'Feat', 19: 'Epic Boon' };

  D.CLASSES = {
    barbarian: {
      name: 'Barbarian', icon: '🪓', difficulty: 'Easy', hitDie: 12, primary: ['STR'],
      blurb: 'A furious warrior. Huge HP, Rage makes you hit harder and shrug off damage.',
      saves: ['STR', 'CON'], skillCount: 2,
      skillList: ['Animal Handling', 'Athletics', 'Intimidation', 'Nature', 'Perception', 'Survival'],
      armor: ['light', 'medium', 'shield'], martial: true, masteries: 2,
      order: ['STR', 'CON', 'DEX', 'WIS', 'CHA', 'INT'],
      kits: [{ name: 'Barbarian kit', items: [{ w: 'greataxe', eq: true }, { w: 'handaxe', qty: 4 }, { g: 'Explorer\'s Pack' }], gold: 15 }],
      goldOption: 75,
      features: [
        { lvl: 1, name: 'Rage', desc: 'Bonus Action. While raging: Resistance to bludgeoning, piercing and slashing damage, +2 damage on Strength attacks, Advantage on STR checks and saves. Can\'t cast spells or concentrate. Lasts up to 10 min if you keep attacking. Regain 1 use on Short Rest.', uses: { max: x => x.lvl >= 3 ? 3 : 2, reset: 'short1' }, toggle: true, effects: [{ type: 'damage', value: 2, scope: 'melee' }] },
        { lvl: 1, name: 'Unarmored Defense', desc: 'Without armor, AC = 10 + DEX + CON (shield allowed).' },
        { lvl: 1, name: 'Weapon Mastery', desc: 'Use the mastery property of 2 weapon types you choose.' },
        { lvl: 2, name: 'Danger Sense', desc: 'Advantage on DEX saving throws unless Incapacitated.' },
        { lvl: 2, name: 'Reckless Attack', desc: 'On your first attack of the turn: Advantage on STR attacks this turn, but attacks against you have Advantage until your next turn.' },
        { lvl: 3, name: 'Primal Knowledge', desc: 'One extra Barbarian skill. While raging, use STR for Acrobatics, Intimidation, Perception, Stealth and Survival checks.' }
      ],
      extraSkills: { 3: 1 },
      subclasses: {
        berserker: { name: 'Path of the Berserker', desc: 'Pure fury.', features: [
          { lvl: 3, name: 'Frenzy', desc: 'While raging and using Reckless Attack, the first target you hit with a STR attack each turn takes extra damage: 2d6.', roll: '2d6', dmgx: true }
        ] }
      },
      later: { 5: 'Extra Attack (2 attacks per turn), +10 ft Speed', 7: 'Feral Instinct: Advantage on Initiative', 9: 'Brutal Strike: +1d10 damage and a special effect', 11: 'Relentless Rage: you may stay up instead of dropping to 0 HP', 15: 'Persistent Rage', 18: 'Indomitable Might: STR checks at least your STR score', 20: 'Primal Champion: STR and CON +4' }
    },

    bard: {
      name: 'Bard', icon: '🎻', difficulty: 'Medium', hitDie: 8, primary: ['CHA'],
      blurb: 'Magical performer. Inspires allies, heals, talks your way out of anything.',
      saves: ['DEX', 'CHA'], skillCount: 3, skillList: 'any',
      armor: ['light'], martial: false, masteries: 0,
      order: ['CHA', 'DEX', 'CON', 'WIS', 'INT', 'STR'],
      casting: { ability: 'CHA', type: 'full', cantrips: [2, 2, 2], prepared: [4, 5, 6] },
      kits: [{ name: 'Bard kit', items: [{ a: 'leather', eq: true }, { w: 'dagger', qty: 2, eq: true }, { g: 'Musical Instrument' }, { g: 'Entertainer\'s Pack' }], gold: 19 }],
      goldOption: 90,
      features: [
        { lvl: 1, name: 'Bardic Inspiration', desc: 'Bonus Action: give a creature within 60 ft an Inspiration die (d6). Within 1 hour, they can add it to a failed d20 test.', uses: { max: x => atLeast1(x.mod.CHA), reset: 'long' }, roll: '1d6' },
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Bard spells with Charisma.' },
        { lvl: 2, name: 'Expertise', desc: 'Double proficiency bonus in 2 skills you are proficient in.' },
        { lvl: 2, name: 'Jack of All Trades', desc: 'Add half your Proficiency Bonus to ability checks you aren\'t proficient in (auto-applied).' }
      ],
      expertise: { 2: 2 },
      subclasses: {
        lore: { name: 'College of Lore', desc: 'Knowledge and cutting words.', extraSkills: 3, features: [
          { lvl: 3, name: 'Bonus Proficiencies', desc: 'Proficiency in 3 skills of your choice.' },
          { lvl: 3, name: 'Cutting Words', desc: 'Reaction: spend a Bardic Inspiration and subtract the roll from an enemy\'s attack roll, damage roll or ability check (within 60 ft).', roll: '1d6' }
        ] }
      },
      later: { 5: 'Level 3 spells; Inspiration die d8; Inspiration comes back on a Short Rest', 6: 'College feature', 9: 'Level 5 spells', 10: 'Magical Secrets: spells from any list; die d10', 15: 'Inspiration die d12', 17: 'Level 9 spells', 20: 'Words of Creation' }
    },

    cleric: {
      name: 'Cleric', icon: '✨', difficulty: 'Medium', hitDie: 8, primary: ['WIS'],
      blurb: 'Divine champion. Heals, protects, and smites with holy power.',
      saves: ['WIS', 'CHA'], skillCount: 2, skillList: ['History', 'Insight', 'Medicine', 'Persuasion', 'Religion'],
      armor: ['light', 'medium', 'shield'], martial: false, masteries: 0,
      order: ['WIS', 'CON', 'STR', 'DEX', 'CHA', 'INT'],
      casting: { ability: 'WIS', type: 'full', cantrips: [3, 3, 3], prepared: [4, 5, 6] },
      orders: {
        protector: { name: 'Protector', desc: 'Trained for battle: Martial weapons and Heavy armor.' },
        thaumaturge: { name: 'Thaumaturge', desc: 'One extra cantrip, and add WIS mod (min +1) to Arcana and Religion checks.' }
      },
      kits: [{ name: 'Cleric kit', items: [{ a: 'chainshirt', eq: true }, { a: 'shield', eq: true }, { w: 'mace', eq: true }, { g: 'Holy Symbol' }, { g: 'Priest\'s Pack' }], gold: 7 }],
      goldOption: 110,
      features: [
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Cleric spells with Wisdom.' },
        { lvl: 1, name: 'Divine Order', desc: 'Choose Protector or Thaumaturge.' },
        { lvl: 2, name: 'Channel Divinity', desc: 'Divine Spark: Magic action, a creature within 30 ft heals 1d8 + WIS, or takes 1d8 + WIS radiant/necrotic (CON save for half). Turn Undead: undead within 30 ft make a WIS save or are Frightened and Incapacitated for 1 min. Regain 1 use on Short Rest.', uses: { max: 2, reset: 'short1' }, roll: '1d8+@WIS' }
      ],
      subclasses: {
        life: { name: 'Life Domain', desc: 'The best healer in the game.', features: [
          { lvl: 3, name: 'Disciple of Life', desc: 'Your healing spells (level 1+) restore extra HP = 2 + spell level.' },
          { lvl: 3, name: 'Preserve Life', desc: 'Channel Divinity: split 5 × level HP among creatures within 30 ft (up to half their max HP).' },
          { lvl: 3, name: 'Life Domain Spells', desc: 'Always prepared: Aid, Bless, Cure Wounds, Lesser Restoration.', spells: ['Aid', 'Bless', 'Cure Wounds', 'Lesser Restoration'] }
        ] }
      },
      later: { 5: 'Level 3 spells; Sear Undead', 6: 'Domain feature', 7: 'Blessed Strikes (+1d8 damage)', 10: 'Divine Intervention: ask your god for a miracle', 14: 'Improved Blessed Strikes (2d8)', 17: 'Domain feature', 20: 'Greater Divine Intervention' }
    },

    druid: {
      name: 'Druid', icon: '🌿', difficulty: 'Hard', hitDie: 8, primary: ['WIS'],
      blurb: 'Nature priest. Shapeshifts into animals and commands the elements.',
      saves: ['INT', 'WIS'], skillCount: 2,
      skillList: ['Arcana', 'Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Religion', 'Survival'],
      armor: ['light', 'shield'], martial: false, masteries: 0,
      order: ['WIS', 'CON', 'DEX', 'INT', 'STR', 'CHA'],
      casting: { ability: 'WIS', type: 'full', cantrips: [2, 2, 2], prepared: [4, 5, 6] },
      orders: {
        magician: { name: 'Magician', desc: 'One extra cantrip, and add WIS mod (min +1) to Arcana and Nature checks.' },
        warden: { name: 'Warden', desc: 'Martial weapons and Medium armor.' }
      },
      kits: [{ name: 'Druid kit', items: [{ a: 'leather', eq: true }, { a: 'shield', eq: true }, { w: 'sickle' }, { w: 'quarterstaff', eq: true }, { g: 'Druidic Focus' }, { g: 'Explorer\'s Pack' }, { g: 'Herbalism Kit' }], gold: 9 }],
      goldOption: 50,
      features: [
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Druid spells with Wisdom.' },
        { lvl: 1, name: 'Druidic', desc: 'You know the secret language of druids. Speak with Animals is always prepared.', spells: ['Speak with Animals'] },
        { lvl: 1, name: 'Primal Order', desc: 'Choose Magician or Warden.' },
        { lvl: 2, name: 'Wild Shape', desc: 'Bonus Action: turn into a beast (CR 1/4, no fly speed) for hours = half your level. Regain 1 use on Short Rest.', uses: { max: 2, reset: 'short1' } },
        { lvl: 2, name: 'Wild Companion', desc: 'Spend a spell slot or a Wild Shape use to cast Find Familiar without material components.' }
      ],
      subclasses: {
        land: { name: 'Circle of the Land', desc: 'Magic drawn from the land.', features: [
          { lvl: 3, name: 'Land\'s Aid', desc: 'Magic action, spend a Wild Shape use: 10-ft sphere within 60 ft, CON save or 2d6 necrotic (half on success), and one creature in it heals 2d6.', roll: '2d6', dmgx: true },
          { lvl: 3, name: 'Circle Spells', desc: 'Extra always-prepared spells depending on your chosen land (arid, polar, temperate, tropical).' }
        ] }
      },
      later: { 4: 'Wild Shape: CR 1/2 beasts, swimming', 5: 'Level 3 spells; Wild Resurgence', 7: 'Elemental Fury', 8: 'Wild Shape: CR 1 beasts, flying', 9: 'Level 5 spells', 18: 'Beast Spells: cast while in Wild Shape', 20: 'Archdruid' }
    },

    fighter: {
      name: 'Fighter', icon: '⚔️', difficulty: 'Easy', hitDie: 10, primary: ['STR', 'DEX'],
      blurb: 'Master of weapons and armor. Simple, strong, perfect first class.',
      saves: ['STR', 'CON'], skillCount: 2,
      skillList: ['Acrobatics', 'Animal Handling', 'Athletics', 'History', 'Insight', 'Intimidation', 'Persuasion', 'Perception', 'Survival'],
      armor: ['light', 'medium', 'heavy', 'shield'], martial: true, masteries: 3,
      fightingStyleAt: 1,
      order: ['STR', 'CON', 'DEX', 'WIS', 'CHA', 'INT'],
      kits: [
        { name: 'Heavy fighter (Greatsword)', items: [{ a: 'chainmail', eq: true }, { w: 'greatsword', eq: true }, { w: 'flail' }, { w: 'javelin', qty: 8 }, { g: 'Dungeoneer\'s Pack' }], gold: 4 },
        { name: 'Archer fighter (Longbow)', items: [{ a: 'studded', eq: true }, { w: 'scimitar', eq: true }, { w: 'shortsword' }, { w: 'longbow', eq: true }, { g: 'Arrows (20)' }, { g: 'Quiver' }, { g: 'Dungeoneer\'s Pack' }], gold: 11 }
      ],
      goldOption: 155,
      features: [
        { lvl: 1, name: 'Fighting Style', desc: 'Choose a fighting style.' },
        { lvl: 1, name: 'Second Wind', desc: 'Bonus Action: regain 1d10 + Fighter level HP. Regain 1 use on Short Rest.', uses: { max: 2, reset: 'short1' }, roll: '1d10+@LVL', heal: true },
        { lvl: 1, name: 'Weapon Mastery', desc: 'Use the mastery property of 3 weapon types you choose.' },
        { lvl: 2, name: 'Action Surge', desc: 'On your turn, take one extra action (not Magic). Once per Short Rest.', uses: { max: 1, reset: 'short' } },
        { lvl: 2, name: 'Tactical Mind', desc: 'When you fail an ability check, spend a Second Wind use to add 1d10 to it. If it still fails, the use isn\'t spent.' }
      ],
      subclasses: {
        champion: { name: 'Champion', desc: 'Simple and brutal: more critical hits.', features: [
          { lvl: 3, name: 'Improved Critical', desc: 'Your weapon attacks score a critical hit on a 19 or 20 (auto-applied).' },
          { lvl: 3, name: 'Remarkable Athlete', desc: 'Advantage on Initiative and Athletics checks. After a crit, move up to half your Speed without opportunity attacks.' }
        ] }
      },
      later: { 5: 'Extra Attack (2 attacks per turn)', 6: 'One more Feat', 9: 'Indomitable: reroll a failed save', 11: '3 attacks per turn', 13: 'Master Tactician', 14: 'One more Feat', 17: 'Second Action Surge', 20: '4 attacks per turn' }
    },

    monk: {
      name: 'Monk', icon: '🥋', difficulty: 'Medium', hitDie: 8, primary: ['DEX', 'WIS'],
      blurb: 'Martial artist. Fast, many attacks per turn, fights without armor.',
      saves: ['STR', 'DEX'], skillCount: 2, skillList: ['Acrobatics', 'Athletics', 'History', 'Insight', 'Religion', 'Stealth'],
      armor: [], martial: 'light', masteries: 0,
      order: ['DEX', 'WIS', 'CON', 'STR', 'INT', 'CHA'],
      kits: [{ name: 'Monk kit', items: [{ w: 'spear', eq: true }, { w: 'dagger', qty: 5 }, { g: 'Musical Instrument' }, { g: 'Explorer\'s Pack' }], gold: 11 }],
      goldOption: 50,
      features: [
        { lvl: 1, name: 'Martial Arts', desc: 'Without armor or shield: unarmed strikes and Monk weapons (simple melee + martial Light) can use DEX, damage die at least d6. Bonus Action: make one Unarmed Strike.' },
        { lvl: 1, name: 'Unarmored Defense', desc: 'Without armor or shield, AC = 10 + DEX + WIS.' },
        { lvl: 2, name: 'Monk\'s Focus', desc: 'Focus Points = Monk level. Flurry of Blows (1 FP: two unarmed strikes as a Bonus Action). Patient Defense (Disengage as BA; 1 FP: also Dodge). Step of the Wind (Dash as BA; 1 FP: also Disengage, double jump).', uses: { max: x => x.lvl, reset: 'short' } },
        { lvl: 2, name: 'Unarmored Movement', desc: '+10 ft Speed without armor or shield (auto-applied).' },
        { lvl: 2, name: 'Uncanny Metabolism', desc: 'When you roll Initiative, regain all Focus Points and heal Martial Arts die + Monk level. Once per Long Rest.', uses: { max: 1, reset: 'long' }, roll: '1d6+@LVL', heal: true },
        { lvl: 3, name: 'Deflect Attacks', desc: 'Reaction when hit by a B/P/S attack: reduce damage by 1d10 + DEX + Monk level. If reduced to 0, spend 1 FP to redirect a strike (2 Martial Arts dice).', roll: '1d10+@DEX+@LVL' }
      ],
      subclasses: {
        openhand: { name: 'Warrior of the Open Hand', desc: 'Control the battlefield with strikes.', features: [
          { lvl: 3, name: 'Open Hand Technique', desc: 'When you hit with Flurry of Blows: Addle (no reactions), Push (STR save or pushed 15 ft) or Topple (DEX save or Prone).' }
        ] }
      },
      later: { 4: 'Slow Fall', 5: 'Extra Attack; Stunning Strike', 6: 'Empowered Strikes; subclass feature', 7: 'Evasion', 10: 'Self-Restoration', 14: 'Disciplined Survivor: proficient in all saves', 18: 'Superior Defense', 20: 'Body and Mind: DEX and WIS +4' }
    },

    paladin: {
      name: 'Paladin', icon: '🛡️', difficulty: 'Easy', hitDie: 10, primary: ['STR', 'CHA'],
      blurb: 'Holy knight. Heavy armor, healing hands, and devastating Divine Smites.',
      saves: ['WIS', 'CHA'], skillCount: 2, skillList: ['Athletics', 'Insight', 'Intimidation', 'Medicine', 'Persuasion', 'Religion'],
      armor: ['light', 'medium', 'heavy', 'shield'], martial: true, masteries: 2,
      fightingStyleAt: 2,
      order: ['STR', 'CHA', 'CON', 'WIS', 'DEX', 'INT'],
      casting: { ability: 'CHA', type: 'half', cantrips: [0, 0, 0], prepared: [2, 3, 4] },
      kits: [{ name: 'Paladin kit', items: [{ a: 'chainmail', eq: true }, { a: 'shield', eq: true }, { w: 'longsword', eq: true }, { w: 'javelin', qty: 6 }, { g: 'Holy Symbol' }, { g: 'Priest\'s Pack' }], gold: 9 }],
      goldOption: 150,
      features: [
        { lvl: 1, name: 'Lay On Hands', desc: 'Bonus Action: touch a creature and restore HP from your pool (5 × Paladin level). Spend 5 to cure Poisoned. Pool refills on Long Rest.', uses: { max: x => 5 * x.lvl, reset: 'long' }, pool: true },
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Paladin spells with Charisma.' },
        { lvl: 1, name: 'Weapon Mastery', desc: 'Use the mastery property of 2 weapon types you choose.' },
        { lvl: 2, name: 'Fighting Style', desc: 'Choose a fighting style.' },
        { lvl: 2, name: 'Paladin\'s Smite', desc: 'Divine Smite is always prepared. Cast it once per Long Rest without a slot.', spells: ['Divine Smite'], uses: { max: 1, reset: 'long' } },
        { lvl: 3, name: 'Channel Divinity', desc: 'Divine Sense: for 10 min, sense celestials, fiends and undead within 60 ft. Regain 1 use on Short Rest.', uses: { max: 2, reset: 'short1' } }
      ],
      subclasses: {
        devotion: { name: 'Oath of Devotion', desc: 'The classic shining knight.', features: [
          { lvl: 3, name: 'Sacred Weapon', desc: 'Channel Divinity, when you attack: for 10 min add CHA mod to attack rolls with a weapon; it sheds light and can deal radiant damage.', toggle: true },
          { lvl: 3, name: 'Oath of Devotion Spells', desc: 'Always prepared: Protection from Evil and Good, Shield of Faith.', spells: ['Protection from Evil and Good', 'Shield of Faith'] }
        ] }
      },
      later: { 5: 'Extra Attack; level 2 spells', 6: 'Aura of Protection: allies near you add your CHA to saves', 9: 'Level 3 spells', 10: 'Aura of Courage', 11: 'Radiant Strikes: +1d8 radiant on every hit', 14: 'Restoring Touch', 18: 'Auras reach 30 ft', 20: 'Oath feature' }
    },

    ranger: {
      name: 'Ranger', icon: '🏹', difficulty: 'Medium', hitDie: 10, primary: ['DEX', 'WIS'],
      blurb: 'Hunter and tracker. Deadly with a bow, marks prey with magic.',
      saves: ['STR', 'DEX'], skillCount: 3,
      skillList: ['Animal Handling', 'Athletics', 'Insight', 'Investigation', 'Nature', 'Perception', 'Stealth', 'Survival'],
      armor: ['light', 'medium', 'shield'], martial: true, masteries: 2,
      fightingStyleAt: 2,
      order: ['DEX', 'WIS', 'CON', 'STR', 'INT', 'CHA'],
      casting: { ability: 'WIS', type: 'half', cantrips: [0, 0, 0], prepared: [2, 3, 4] },
      kits: [{ name: 'Ranger kit', items: [{ a: 'studded', eq: true }, { w: 'scimitar', eq: true }, { w: 'shortsword', eq: true }, { w: 'longbow' }, { g: 'Arrows (20)' }, { g: 'Quiver' }, { g: 'Druidic Focus' }, { g: 'Explorer\'s Pack' }], gold: 7 }],
      goldOption: 150,
      features: [
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Ranger spells with Wisdom.' },
        { lvl: 1, name: 'Favored Enemy', desc: 'Hunter\'s Mark is always prepared. Cast it twice per Long Rest without a slot.', spells: ['Hunter\'s Mark'], uses: { max: 2, reset: 'long' } },
        { lvl: 1, name: 'Weapon Mastery', desc: 'Use the mastery property of 2 weapon types you choose.' },
        { lvl: 2, name: 'Deft Explorer', desc: 'Expertise in one of your skills, and two languages.' },
        { lvl: 2, name: 'Fighting Style', desc: 'Choose a fighting style.' }
      ],
      expertise: { 2: 1 },
      subclasses: {
        hunter: { name: 'Hunter', desc: 'Specialist monster slayer.', features: [
          { lvl: 3, name: 'Hunter\'s Lore', desc: 'While a creature is marked by your Hunter\'s Mark, you know its immunities, resistances and vulnerabilities.' },
          { lvl: 3, name: 'Hunter\'s Prey: Colossus Slayer', desc: 'Once per turn, +1d8 damage to a creature that is missing any HP. (Alternative: Horde Breaker — one extra attack vs a different creature within 5 ft of the first.)', roll: '1d8', dmgx: true }
        ] }
      },
      later: { 5: 'Extra Attack; level 2 spells', 6: 'Roving: +10 ft Speed, climb and swim', 10: 'Tireless', 13: 'Relentless Hunter', 14: 'Nature\'s Veil', 18: 'Feral Senses', 20: 'Foe Slayer: Hunter\'s Mark d10' }
    },

    rogue: {
      name: 'Rogue', icon: '🗡️', difficulty: 'Easy', hitDie: 8, primary: ['DEX'],
      blurb: 'Sneaky expert. Huge Sneak Attack damage, best at skills.',
      saves: ['DEX', 'INT'], skillCount: 4,
      skillList: ['Acrobatics', 'Athletics', 'Deception', 'Insight', 'Intimidation', 'Investigation', 'Perception', 'Persuasion', 'Sleight of Hand', 'Stealth'],
      armor: ['light'], martial: 'finesse-light', masteries: 2,
      order: ['DEX', 'CON', 'WIS', 'INT', 'CHA', 'STR'],
      kits: [{ name: 'Rogue kit', items: [{ a: 'leather', eq: true }, { w: 'dagger', qty: 2 }, { w: 'shortsword', eq: true }, { w: 'shortbow' }, { g: 'Arrows (20)' }, { g: 'Quiver' }, { g: 'Thieves\' Tools' }, { g: 'Burglar\'s Pack' }], gold: 8 }],
      goldOption: 100,
      features: [
        { lvl: 1, name: 'Expertise', desc: 'Double proficiency bonus in 2 of your skills.' },
        { lvl: 1, name: 'Sneak Attack', desc: 'Once per turn, extra damage when you hit with a Finesse or Ranged weapon and you have Advantage OR an ally is within 5 ft of the target (and you don\'t have Disadvantage).', roll: 'SNEAK', dmgx: true, sneak: true },
        { lvl: 1, name: 'Thieves\' Cant', desc: 'Secret language of thieves, plus one more language.' },
        { lvl: 1, name: 'Weapon Mastery', desc: 'Use the mastery property of 2 weapon types you choose.' },
        { lvl: 2, name: 'Cunning Action', desc: 'Bonus Action: Dash, Disengage or Hide.' },
        { lvl: 3, name: 'Steady Aim', desc: 'Bonus Action (if you haven\'t moved): Advantage on your next attack this turn. Speed becomes 0 until end of turn.' }
      ],
      expertise: { 1: 2 },
      subclasses: {
        thief: { name: 'Thief', desc: 'Fast hands and climbing.', features: [
          { lvl: 3, name: 'Fast Hands', desc: 'Bonus Action: Sleight of Hand check, use Thieves\' Tools, or Utilize an object.' },
          { lvl: 3, name: 'Second-Story Work', desc: 'Climb Speed = Speed. Jump distance uses DEX.' }
        ] }
      },
      later: { 5: 'Sneak Attack 3d6; Uncanny Dodge (halve damage as a Reaction)', 7: 'Evasion', 11: 'Reliable Talent: skill rolls count as at least 10', 14: 'Devious Strikes', 15: 'Slippery Mind', 18: 'Elusive', 20: 'Stroke of Luck. Sneak Attack grows +1d6 every 2 levels' }
    },

    sorcerer: {
      name: 'Sorcerer', icon: '🔥', difficulty: 'Medium', hitDie: 6, primary: ['CHA'],
      blurb: 'Born with magic in the blood. Bends spells with Metamagic.',
      saves: ['CON', 'CHA'], skillCount: 2, skillList: ['Arcana', 'Deception', 'Insight', 'Intimidation', 'Persuasion', 'Religion'],
      armor: [], martial: false, masteries: 0,
      order: ['CHA', 'CON', 'DEX', 'WIS', 'INT', 'STR'],
      casting: { ability: 'CHA', type: 'full', cantrips: [4, 4, 4], prepared: [2, 4, 6] },
      kits: [{ name: 'Sorcerer kit', items: [{ w: 'spear', eq: true }, { w: 'dagger', qty: 2 }, { g: 'Arcane Focus' }, { g: 'Dungeoneer\'s Pack' }], gold: 28 }],
      goldOption: 50,
      features: [
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Sorcerer spells with Charisma.' },
        { lvl: 1, name: 'Innate Sorcery', desc: 'Bonus Action, 1 minute: your spell save DC +1 and Advantage on Sorcerer spell attack rolls.', uses: { max: 2, reset: 'long' }, toggle: true, effects: [{ type: 'spellDC', value: 1, scope: 'all' }] },
        { lvl: 2, name: 'Font of Magic', desc: 'Sorcery Points = Sorcerer level. Turn points into spell slots (level 1 = 2 points, level 2 = 3 points) or slots into points.', uses: { max: x => x.lvl, reset: 'long' } },
        { lvl: 2, name: 'Metamagic', desc: 'Choose 2 Metamagic options to twist your spells using Sorcery Points.' }
      ],
      subclasses: {
        draconic: { name: 'Draconic Sorcery', desc: 'Dragon blood: tougher and scalier.', features: [
          { lvl: 3, name: 'Draconic Resilience', desc: '+1 HP per Sorcerer level. Without armor, AC = 10 + DEX + CHA (auto-applied).' },
          { lvl: 3, name: 'Draconic Spells', desc: 'Always prepared: Chromatic Orb, Command (plus Alter Self and Dragon\'s Breath).', spells: ['Chromatic Orb', 'Command'] }
        ] }
      },
      later: { 5: 'Level 3 spells; Sorcerous Restoration', 6: 'Subclass feature', 7: 'Sorcery Incarnate', 9: 'Level 5 spells', 10: 'More Metamagic', 17: 'Level 9 spells', 20: 'Arcane Apotheosis' }
    },

    warlock: {
      name: 'Warlock', icon: '👁️', difficulty: 'Medium', hitDie: 8, primary: ['CHA'],
      blurb: 'Made a pact with a powerful being. Eldritch Blast all day, slots refresh on Short Rest.',
      saves: ['WIS', 'CHA'], skillCount: 2,
      skillList: ['Arcana', 'Deception', 'History', 'Intimidation', 'Investigation', 'Nature', 'Religion'],
      armor: ['light'], martial: false, masteries: 0,
      order: ['CHA', 'CON', 'DEX', 'WIS', 'INT', 'STR'],
      casting: { ability: 'CHA', type: 'pact', cantrips: [2, 2, 2], prepared: [2, 3, 4] },
      invocations: [1, 3, 3],
      kits: [{ name: 'Warlock kit', items: [{ a: 'leather', eq: true }, { w: 'sickle', eq: true }, { w: 'dagger', qty: 2 }, { g: 'Arcane Focus' }, { g: 'Scholar\'s Pack' }], gold: 15 }],
      goldOption: 100,
      features: [
        { lvl: 1, name: 'Eldritch Invocations', desc: 'Magical secrets you choose (see below).' },
        { lvl: 1, name: 'Pact Magic', desc: 'Cast Warlock spells with Charisma. All your slots are the same level and come back on a Short Rest.' },
        { lvl: 2, name: 'Magical Cunning', desc: '1-minute rite: regain half your Pact Magic slots (round up). Once per Long Rest.', uses: { max: 1, reset: 'long' } }
      ],
      subclasses: {
        fiend: { name: 'Fiend Patron', desc: 'A devil\'s bargain: fire and stolen life.', features: [
          { lvl: 3, name: 'Dark One\'s Blessing', desc: 'When you drop an enemy to 0 HP, gain Temporary HP = CHA mod + Warlock level.', roll: '@CHA+@LVL' },
          { lvl: 3, name: 'Fiend Spells', desc: 'Always prepared: Burning Hands, Command, Scorching Ray, Suggestion.', spells: ['Burning Hands', 'Command', 'Scorching Ray', 'Suggestion'] }
        ] }
      },
      later: { 5: 'Level 3 spells', 9: 'Contact Patron; level 5 spells', 11: 'Mystic Arcanum: one level 6 spell per day', 13: 'Level 7 Arcanum', 15: 'Level 8 Arcanum', 17: 'Level 9 Arcanum', 20: 'Eldritch Master' }
    },

    wizard: {
      name: 'Wizard', icon: '📜', difficulty: 'Hard', hitDie: 6, primary: ['INT'],
      blurb: 'Scholar of magic. The biggest spell list, fragile body.',
      saves: ['INT', 'WIS'], skillCount: 2, skillList: ['Arcana', 'History', 'Insight', 'Investigation', 'Medicine', 'Nature', 'Religion'],
      armor: [], martial: false, masteries: 0,
      order: ['INT', 'CON', 'DEX', 'WIS', 'CHA', 'STR'],
      casting: { ability: 'INT', type: 'full', cantrips: [3, 3, 3], prepared: [4, 5, 6] },
      kits: [{ name: 'Wizard kit', items: [{ w: 'dagger', qty: 2 }, { w: 'quarterstaff', eq: true }, { g: 'Arcane Focus' }, { g: 'Spellbook' }, { g: 'Scholar\'s Pack' }], gold: 5 }],
      goldOption: 55,
      features: [
        { lvl: 1, name: 'Spellcasting', desc: 'Cast Wizard spells with Intelligence. Your spellbook holds your spells.' },
        { lvl: 1, name: 'Ritual Adept', desc: 'Cast any Ritual spell in your spellbook as a ritual (10 min longer), even if not prepared.' },
        { lvl: 1, name: 'Arcane Recovery', desc: 'Once per day after a Short Rest, regain spell slots with total level ≤ half your Wizard level (round up).', uses: { max: 1, reset: 'long' } },
        { lvl: 2, name: 'Scholar', desc: 'Expertise in one of: Arcana, History, Investigation, Medicine, Nature, Religion (must be proficient).' }
      ],
      expertise: { 2: 1 }, expertiseList: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Religion'],
      subclasses: {
        evoker: { name: 'Evoker', desc: 'Blasting magic: fire, lightning, force.', features: [
          { lvl: 3, name: 'Evocation Savant', desc: 'Add two Evocation spells to your spellbook for free; copying Evocation spells is half price.' },
          { lvl: 3, name: 'Potent Cantrip', desc: 'When your damaging cantrip misses or the target saves, it still takes half damage.' }
        ] }
      },
      later: { 5: 'Level 3 spells (Fireball!); Memorize Spell', 6: 'Subclass feature', 9: 'Level 5 spells', 17: 'Level 9 spells', 18: 'Spell Mastery: a couple of spells without slots', 20: 'Signature Spells' }
    }
  };

  D.INVOCATIONS = {
    armorofshadows: { name: 'Armor of Shadows', lvl: 1, desc: 'Cast Mage Armor on yourself at will, without a slot.' },
    eldritchmind: { name: 'Eldritch Mind', lvl: 1, desc: 'Advantage on CON saves to keep Concentration.' },
    pactblade: { name: 'Pact of the Blade', lvl: 1, desc: 'Conjure a magic weapon; use CHA for its attack and damage rolls.' },
    pactchain: { name: 'Pact of the Chain', lvl: 1, desc: 'Find Familiar with special forms (imp, sprite, pseudodragon...).' },
    pacttome: { name: 'Pact of the Tome', lvl: 1, desc: 'Book of Shadows: 3 cantrips + 2 level 1 rituals from any class.' },
    agonizing: { name: 'Agonizing Blast', lvl: 2, desc: 'Add CHA mod to Eldritch Blast damage (auto-applied).' },
    devilssight: { name: 'Devil\'s Sight', lvl: 2, desc: 'See normally in darkness (even magical) within 120 ft.' },
    repelling: { name: 'Repelling Blast', lvl: 2, desc: 'Eldritch Blast hits push the target 10 ft away.' },
    fiendishvigor: { name: 'Fiendish Vigor', lvl: 2, desc: 'Cast False Life on yourself at will (max temp HP).' },
    maskfaces: { name: 'Mask of Many Faces', lvl: 2, desc: 'Cast Disguise Self at will.' },
    mistyvisions: { name: 'Misty Visions', lvl: 2, desc: 'Cast Silent Image at will.' },
    otherworldlyleap: { name: 'Otherworldly Leap', lvl: 2, desc: 'Cast Jump on yourself at will.' }
  };

  D.METAMAGIC = {
    careful: { name: 'Careful Spell', desc: '1 SP: chosen creatures auto-succeed on the spell\'s save and take no damage.' },
    distant: { name: 'Distant Spell', desc: '1 SP: double the range (touch → 30 ft).' },
    empowered: { name: 'Empowered Spell', desc: '1 SP: reroll up to CHA mod damage dice.' },
    extended: { name: 'Extended Spell', desc: '1 SP: double the duration; Advantage on its Concentration saves.' },
    heightened: { name: 'Heightened Spell', desc: '2 SP: one target has Disadvantage on its save.' },
    quickened: { name: 'Quickened Spell', desc: '2 SP: cast an Action spell as a Bonus Action.' },
    seeking: { name: 'Seeking Spell', desc: '1 SP: reroll a missed spell attack.' },
    subtle: { name: 'Subtle Spell', desc: '1 SP: cast without words or gestures.' },
    transmuted: { name: 'Transmuted Spell', desc: '1 SP: change the damage type (acid, cold, fire, lightning, poison, thunder).' },
    twinned: { name: 'Twinned Spell', desc: '1 SP per spell level: target one more creature.' }
  };
})(window.DND);
