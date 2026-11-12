// Species and Backgrounds (2024 rules). Safe to edit.
window.DND = window.DND || {};
(function (D) {
  D.SPECIES = {
    human: {
      name: 'Human', icon: '🧑', speed: 30, size: 'Medium or Small', blurb: 'Adaptable and ambitious. Extra skill, extra feat, Heroic Inspiration every day.',
      skillPick: { count: 1, list: 'any', label: 'Skillful (Human): 1 skill of your choice' },
      bonusFeat: true,
      traits: [
        { name: 'Resourceful', desc: 'You gain Heroic Inspiration whenever you finish a Long Rest.' },
        { name: 'Skillful', desc: 'Proficiency in one skill of your choice.' },
        { name: 'Versatile', desc: 'You gain an Origin feat of your choice.' }
      ]
    },
    elf: {
      name: 'Elf', icon: '🧝', speed: 30, size: 'Medium', darkvision: 60, blurb: 'Graceful and long-lived. Darkvision, sharp senses, resist charm, magic lineage.',
      skillPick: { count: 1, list: ['Insight', 'Perception', 'Survival'], label: 'Keen Senses (Elf): Insight, Perception or Survival' },
      options: {
        drow: { name: 'Drow', desc: 'Darkvision 120 ft. Cantrip: Dancing Lights.', cantrip: 'Dancing Lights', darkvision: 120 },
        high: { name: 'High Elf', desc: 'Cantrip: Prestidigitation (can swap for another Wizard cantrip on Long Rest).', cantrip: 'Prestidigitation' },
        wood: { name: 'Wood Elf', desc: 'Speed 35 ft. Cantrip: Druidcraft.', cantrip: 'Druidcraft', speed: 35 }
      },
      traits: [
        { name: 'Darkvision', desc: 'See in dim light as bright and in darkness as dim, 60 ft.' },
        { name: 'Fey Ancestry', desc: 'Advantage on saves to avoid or end the Charmed condition.' },
        { name: 'Keen Senses', desc: 'Proficiency in Insight, Perception or Survival.' },
        { name: 'Trance', desc: 'Long Rest takes 4 hours of meditation instead of sleep.' }
      ]
    },
    dwarf: {
      name: 'Dwarf', icon: '⛏️', speed: 30, size: 'Medium', darkvision: 120, hpPerLevel: 1, blurb: 'Tough as stone. Extra HP, poison resistance, sense through stone.',
      traits: [
        { name: 'Darkvision', desc: '120 ft.' },
        { name: 'Dwarven Resilience', desc: 'Resistance to poison damage. Advantage on saves vs Poisoned.' },
        { name: 'Dwarven Toughness', desc: '+1 HP per level (auto-applied).' },
        { name: 'Stonecunning', desc: 'Bonus Action: Tremorsense 60 ft for 10 min while on stone.', uses: { max: 'PB', reset: 'long' } }
      ]
    },
    halfling: {
      name: 'Halfling', icon: '🍀', speed: 30, size: 'Small', blurb: 'Small, brave and lucky. Reroll natural 1s.',
      traits: [
        { name: 'Brave', desc: 'Advantage on saves vs Frightened.' },
        { name: 'Halfling Nimbleness', desc: 'Move through the space of larger creatures.' },
        { name: 'Luck', desc: 'When you roll a 1 on a d20 test, reroll it and use the new roll.' },
        { name: 'Naturally Stealthy', desc: 'Can Hide behind a creature at least one size larger.' }
      ]
    },
    dragonborn: {
      name: 'Dragonborn', icon: '🐉', speed: 30, size: 'Medium', darkvision: 60, blurb: 'Dragon ancestry: breath weapon and damage resistance.',
      options: {
        black: { name: 'Black (acid)', dtype: 'acid' }, blue: { name: 'Blue (lightning)', dtype: 'lightning' },
        brass: { name: 'Brass (fire)', dtype: 'fire' }, bronze: { name: 'Bronze (lightning)', dtype: 'lightning' },
        copper: { name: 'Copper (acid)', dtype: 'acid' }, gold: { name: 'Gold (fire)', dtype: 'fire' },
        green: { name: 'Green (poison)', dtype: 'poison' }, red: { name: 'Red (fire)', dtype: 'fire' },
        silver: { name: 'Silver (cold)', dtype: 'cold' }, white: { name: 'White (cold)', dtype: 'cold' }
      },
      traits: [
        { name: 'Breath Weapon', desc: 'Replace one attack: 15-ft cone or 30-ft line. DEX save (DC 8 + CON + PB), 1d10 damage of your ancestry type, half on success.', uses: { max: 'PB', reset: 'long' }, breath: true },
        { name: 'Damage Resistance', desc: 'Resistance to your ancestry\'s damage type.' },
        { name: 'Darkvision', desc: '60 ft.' }
      ]
    },
    gnome: {
      name: 'Gnome', icon: '🔧', speed: 30, size: 'Small', darkvision: 60, blurb: 'Clever tinkerer. Advantage on mental saves vs magic.',
      options: {
        forest: { name: 'Forest Gnome', desc: 'Cantrip: Minor Illusion. Speak with Animals PB times per Long Rest.', cantrip: 'Minor Illusion' },
        rock: { name: 'Rock Gnome', desc: 'Cantrips: Mending and Prestidigitation. Build tiny clockwork devices.', cantrip: 'Mending' }
      },
      traits: [
        { name: 'Darkvision', desc: '60 ft.' },
        { name: 'Gnomish Cunning', desc: 'Advantage on INT, WIS and CHA saving throws.' }
      ]
    },
    goliath: {
      name: 'Goliath', icon: '🗿', speed: 35, size: 'Medium', blurb: 'Giant blood. Fast, strong, with a giant\'s power.',
      options: {
        cloud: { name: 'Cloud\'s Jaunt', desc: 'Bonus Action: teleport 30 ft.' },
        fire: { name: 'Fire\'s Burn', desc: 'When you hit, deal +1d10 fire damage.' },
        frost: { name: 'Frost\'s Chill', desc: 'When you hit, +1d6 cold damage and target\'s Speed −10 ft.' },
        hill: { name: 'Hill\'s Tumble', desc: 'When you hit a Large or smaller creature, knock it Prone.' },
        stone: { name: 'Stone\'s Endurance', desc: 'Reaction when damaged: reduce it by 1d12 + CON.' },
        storm: { name: 'Storm\'s Thunder', desc: 'Reaction when damaged by a creature within 60 ft: it takes 1d8 thunder.' }
      },
      traits: [
        { name: 'Giant Ancestry', desc: 'Your chosen giant power (see option).', uses: { max: 'PB', reset: 'long' } },
        { name: 'Powerful Build', desc: 'Advantage on checks to end Grappled. Count as one size larger for carrying.' }
      ]
    },
    orc: {
      name: 'Orc', icon: '💪', speed: 30, size: 'Medium', darkvision: 120, blurb: 'Relentless. Refuses to fall, bursts of speed.',
      traits: [
        { name: 'Adrenaline Rush', desc: 'Bonus Action: Dash and gain Temporary HP = PB.', uses: { max: 'PB', reset: 'short' } },
        { name: 'Darkvision', desc: '120 ft.' },
        { name: 'Relentless Endurance', desc: 'When reduced to 0 HP (not killed outright), drop to 1 HP instead.', uses: { max: 1, reset: 'long' } }
      ]
    },
    tiefling: {
      name: 'Tiefling', icon: '😈', speed: 30, size: 'Medium or Small', darkvision: 60, blurb: 'Fiendish heritage. Innate magic and a resistance.',
      options: {
        abyssal: { name: 'Abyssal', desc: 'Resistance to poison. Cantrip: Poison Spray.', cantrip: 'Poison Spray' },
        chthonic: { name: 'Chthonic', desc: 'Resistance to necrotic. Cantrip: Chill Touch.', cantrip: 'Chill Touch' },
        infernal: { name: 'Infernal', desc: 'Resistance to fire. Cantrip: Fire Bolt.', cantrip: 'Fire Bolt' }
      },
      traits: [
        { name: 'Darkvision', desc: '60 ft.' },
        { name: 'Fiendish Legacy', desc: 'Your legacy gives a resistance and a cantrip (more spells at levels 3 and 5).' },
        { name: 'Otherworldly Presence', desc: 'You know the Thaumaturgy cantrip.' }
      ]
    }
  };

  // Backgrounds: 3 abilities (choose +2/+1 or +1/+1/+1), 2 skills, 1 origin feat.
  D.BACKGROUNDS = {
    acolyte: { name: 'Acolyte', abil: ['INT', 'WIS', 'CHA'], skills: ['Insight', 'Religion'], feat: 'magicinitiate', miList: 'cleric', blurb: 'Served in a temple.' },
    artisan: { name: 'Artisan', abil: ['STR', 'DEX', 'INT'], skills: ['Investigation', 'Persuasion'], feat: 'crafter', blurb: 'Learned a craft in a workshop.' },
    charlatan: { name: 'Charlatan', abil: ['DEX', 'CON', 'CHA'], skills: ['Deception', 'Sleight of Hand'], feat: 'skilled', blurb: 'Con artist and forger.' },
    criminal: { name: 'Criminal', abil: ['DEX', 'CON', 'INT'], skills: ['Sleight of Hand', 'Stealth'], feat: 'alert', blurb: 'Pickpocket, burglar, gang member.' },
    entertainer: { name: 'Entertainer', abil: ['STR', 'DEX', 'CHA'], skills: ['Acrobatics', 'Performance'], feat: 'musician', blurb: 'Performed for crowds.' },
    farmer: { name: 'Farmer', abil: ['STR', 'CON', 'WIS'], skills: ['Animal Handling', 'Nature'], feat: 'tough', blurb: 'Grew up working the land.' },
    guard: { name: 'Guard', abil: ['STR', 'INT', 'WIS'], skills: ['Athletics', 'Perception'], feat: 'alert', blurb: 'Watched walls and gates.' },
    guide: { name: 'Guide', abil: ['DEX', 'CON', 'WIS'], skills: ['Stealth', 'Survival'], feat: 'magicinitiate', miList: 'druid', blurb: 'Led travelers through the wild.' },
    hermit: { name: 'Hermit', abil: ['CON', 'WIS', 'CHA'], skills: ['Medicine', 'Religion'], feat: 'healer', blurb: 'Lived alone in seclusion.' },
    merchant: { name: 'Merchant', abil: ['CON', 'INT', 'CHA'], skills: ['Animal Handling', 'Persuasion'], feat: 'lucky', blurb: 'Bought and sold goods.' },
    noble: { name: 'Noble', abil: ['STR', 'INT', 'CHA'], skills: ['History', 'Persuasion'], feat: 'skilled', blurb: 'Raised in wealth and privilege.' },
    sage: { name: 'Sage', abil: ['CON', 'INT', 'WIS'], skills: ['Arcana', 'History'], feat: 'magicinitiate', miList: 'wizard', blurb: 'Studied in libraries.' },
    sailor: { name: 'Sailor', abil: ['STR', 'DEX', 'WIS'], skills: ['Acrobatics', 'Perception'], feat: 'tavern', blurb: 'Lived at sea.' },
    scribe: { name: 'Scribe', abil: ['DEX', 'INT', 'WIS'], skills: ['Investigation', 'Perception'], feat: 'skilled', blurb: 'Copied texts and records.' },
    soldier: { name: 'Soldier', abil: ['STR', 'DEX', 'CON'], skills: ['Athletics', 'Intimidation'], feat: 'savage', blurb: 'Trained for war.' },
    wayfarer: { name: 'Wayfarer', abil: ['DEX', 'WIS', 'CHA'], skills: ['Insight', 'Stealth'], feat: 'lucky', blurb: 'Grew up on the streets.' }
  };
})(window.DND);
