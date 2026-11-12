// Explanations for new players (the ⓘ buttons), skill descriptions and recommended spells. Safe to edit.
window.DND = window.DND || {};
(function (D) {
  // key: [title, text]
  D.HELP = {
    class: ['Class', 'Your job in the group. Fighters hit things, Rogues sneak and stab, Clerics heal, Wizards cast spells. It decides your HP, what armor you can wear and your special powers. New players: pick an "Easy" one.'],
    species: ['Species', 'What kind of person you are: Human, Elf, Dwarf… It gives a few small special traits (seeing in the dark, luck, a breath weapon). It does NOT change your stats.'],
    background: ['Background', 'What you did before adventuring (soldier, criminal, sage…). It gives you: +3 points to ability scores, 2 skills you are good at, and one Origin feat (a small special talent).'],
    bgbonus: ['Background bonus', 'Your background lets you raise 3 abilities. Either +2 to one and +1 to another (best: put +2 on your class\'s main ability), or +1 to all three.'],
    abilities: ['Ability scores', 'Six numbers for your body and mind. 10 = average human, 15+ = very good, 8 = weak. What matters in play is the MODIFIER next to it: you add it to dice rolls.'],
    modifier: ['Modifier', 'The small number like +2 or −1. It comes from the score: (score − 10) ÷ 2, rounded down. 10–11 = +0, 12–13 = +1, 14–15 = +2, 16–17 = +3. You add it to every roll that uses that ability.'],
    standard: ['Standard array', 'Six fixed numbers: 15, 14, 13, 12, 10, 8. Give each one to an ability — each number once. Fair and fast. Recommended for new players.'],
    pointbuy: ['Point buy', 'You have 27 points to "buy" scores between 8 and 15. Higher scores cost more. Lets you fine-tune.'],
    rollstats: ['Rolling for stats', 'Roll 4 six-sided dice, drop the lowest, add the rest — six times. Can be great or terrible! Only with the DM.'],
    proficiency: ['Proficiency bonus', 'A bonus (+2 at levels 1–4) you add to things you are TRAINED in: your skills, your weapons, your saving throws and your spells. It grows as you level up.'],
    skills: ['Skills', 'What you are good at outside of fighting: sneaking, lying, climbing, noticing things… When you try something risky, the DM says "roll Stealth" — you roll a d20 and add the skill bonus. Trained skills (●) get your Proficiency bonus.'],
    expertise: ['Expertise', 'You are an expert: add your Proficiency bonus TWICE to that skill.'],
    saves: ['Saving throws', 'A roll to resist something bad: dodge a fireball (Dexterity save), resist poison (Constitution save), resist mind control (Wisdom save). Your class makes you good (●) at two of them.'],
    ac: ['Armor Class (AC)', 'How hard you are to hit. An enemy rolls d20 + their attack bonus: if the total is equal to or higher than your AC, they hit you. The app counts it for you: without armor 10 + DEX; light armor = armor + DEX; medium armor = armor + DEX (max +2); heavy armor = just the armor; shield +2; plus magic items and spells (Mage Armor, Shield). The line under AC shows exactly how your number is made.'],
    hp: ['Hit Points (HP)', 'Your health. Damage lowers it. At 0 you fall unconscious and roll death saves. Healing, potions and rests bring it back.'],
    temphp: ['Temporary HP', 'A shield of extra HP. Damage removes these first. They don\'t stack (keep the higher) and disappear after a Long Rest.'],
    speed: ['Speed', 'How far you can move on your turn. 30 ft = 6 squares on the map (1 square = 5 ft).'],
    initiative: ['Initiative', 'When a fight starts, everyone rolls d20 + Initiative. Highest goes first, then down the list.'],
    passive: ['Passive Perception', 'What you notice without trying (10 + Perception bonus). The DM uses it secretly, for example to see if you spot a hidden goblin.'],
    inspiration: ['Heroic Inspiration', 'A reward from the DM (Humans get one every Long Rest). Spend it to REROLL any one die you just rolled and use the new result.'],
    advantage: ['Advantage / Disadvantage', 'In the app this works for ANY die: pick the mode, then roll. Advantage: roll two d20 and keep the HIGHER (good situation — attacking a sleeping enemy). Disadvantage: roll two and keep the LOWER (bad situation — attacking in darkness). They cancel each other out.'],
    attacks: ['Attacks', 'To attack: roll d20 + "To hit". If it reaches the enemy\'s AC, you hit and roll the damage. A natural 20 is a CRITICAL hit: double the damage dice. A natural 1 always misses. The "Roll" button does all of this.'],
    mastery: ['Weapon Mastery', 'A special trick your weapon does when you use it. Example: Graze — even if you miss, you still deal damage equal to your modifier. Only classes like Fighter, Barbarian, Paladin, Ranger and Rogue get it.'],
    fightingstyle: ['Fighting Style', 'Your combat specialty. Great Weapon Fighting = better damage with big two-handed weapons. Archery = better aim with bows. Defense = +1 AC in armor.'],
    feat: ['Feat', 'A special talent. Your background gives you one "Origin feat" (like Alert = better Initiative, Tough = more HP).'],
    subclass: ['Subclass', 'At level 3 you specialize inside your class (a Fighter becomes a Champion, a Wizard an Evoker…). It gives new powers.'],
    spells: ['How spells work', 'CANTRIPS are small spells you can cast as often as you want. Bigger spells (level 1+) use a SPELL SLOT — a kind of magic energy. You have only a few slots; they come back after a Long Rest (Warlocks: Short Rest). Your class knows a whole list of spells, and each day you choose a few to have "prepared" (ready to cast).'],
    cantrip: ['Cantrip', 'A small spell you can cast unlimited times. No spell slot needed. Your basic magic attack is usually a cantrip.'],
    prepared: ['Prepared spells', 'The spells you have ready today. You pick them from your class list. After a Long Rest you can swap them for others from the same list.'],
    slots: ['Spell slots', 'Magic energy for leveled spells. Casting a level 1 spell uses one level 1 slot. When they are gone you can only cast cantrips. They come back on a Long Rest.'],
    spelldc: ['Spell save DC', 'When your spell forces an enemy to make a saving throw, they must roll this number or higher to resist it.'],
    spellatk: ['Spell attack', 'Some spells need an attack roll, like a weapon: d20 + this bonus against the enemy\'s AC.'],
    concentration: ['Concentration', 'Some spells last while you focus. You can only concentrate on ONE spell at a time. If you take damage, roll a Constitution save (DC 10 or half the damage) or the spell ends.'],
    magicinitiate: ['Magic Initiate', 'An Origin feat from your background: you learn 2 cantrips and one level 1 spell from another class\'s list. You can cast that spell once per Long Rest for free.'],
    features: ['Features', 'Your special powers from class, species and feats. Some have limited uses (the circles): click a circle to use it. They come back after a rest.'],
    hitdice: ['Hit Dice', 'During a Short Rest (1 hour) you can spend Hit Dice to heal: roll the die + your Constitution modifier. You have one per level; they come back on a Long Rest.'],
    rests: ['Rests', 'SHORT REST: 1 hour of downtime — spend Hit Dice to heal, some powers come back. LONG REST: 8 hours of sleep — full HP, everything comes back. The DM decides when you can rest.'],
    conditions: ['Conditions', 'Status effects like Poisoned, Prone or Charmed. Each one has a rule (hover/see the list). In combat the DM can give them a duration in rounds.'],
    deathsaves: ['Death saves', 'At 0 HP, on each of your turns roll a d20: 10+ is a success, 9 or less a failure. 3 successes = you stabilize. 3 failures = you die. A natural 20 = you wake up with 1 HP. Any healing wakes you up.'],
    attunement: ['Attunement', 'Powerful magic items need a bond: spend a Short Rest focusing on the item. You can be attuned to max 3 items. Their magic only works while attuned.'],
    equipment: ['Starting equipment', 'Choose ONE option: a starting kit (the right armor and weapons for your class) OR only gold, to buy your own gear with the DM. New players: take the kit. Better gear comes during the adventure.'],
    kit: ['Kits', 'Pick one kit. Everything in it is yours. You can\'t add other items yourself — new items come from the DM.'],
    equipped: ['Equipped (✔)', 'The tick means you are WEARING or HOLDING it right now. It does not give you anything new. Armor and shield only count for AC while ticked; only ticked weapons show up in combat. Untick armor when you sleep, tick a bow when you shoot.'],
    goldoption: ['Only gold', 'Option B from the rules: no kit, just gold. Then you buy your armor and weapons in a shop with the DM. Slower — recommended only if you know what you want.'],
    gold: ['Gold (GP)', 'Money. A sword costs ~15 GP, a night in an inn ~1 GP.'],
    level: ['Level', 'How experienced your character is. Everyone starts at level 1; the DM tells you when you level up.'],
    dmlocked: ['Managed by your DM', 'Your DM has updated this character (level, loot, magic items). To keep things fair, only the DM can change the build now. You can still roll, track HP and use your powers.'],
    combat: ['Combat tracker', 'Add characters and monsters, roll initiative, then on each turn pick a target and click an action. The app rolls, checks AC and subtracts HP.'],
    monsterability: ['Special abilities', 'Attack = rolls to hit vs AC. Save = target(s) roll a saving throw against your DC (e.g. fire breath, poison cloud). Heal = monster heals itself. Text only = just a description you read out (the app logs it).'],
    recharge: ['Recharge', 'Strong monster abilities recharge randomly: at the start of the monster\'s turn roll a d6; on 5–6 (or the number you set) it can use the ability again.'],
    duration: ['Duration', 'How many rounds the condition lasts. It counts down at the START of that creature\'s turn and disappears at 0.'],
    encounters: ['Prepared fights', 'Build fights before the session (which monsters, how many, notes). During the game, click Start and everything is loaded into the tracker with your party. The difficulty line tells you if the fight is easy or deadly for your party.'],
    hitchance: ['Chance to hit', 'The attacker rolls a d20 and adds the to-hit bonus. It hits if the total is the target\'s AC or more. Example: +4 to hit vs AC 15 → you need 11 or more on the die → 10 numbers out of 20 = 50%. A natural 20 always hits, a natural 1 always misses. Average damage = what the damage dice give on average (1d6 ≈ 3.5).'],
    savechance: ['Chance to resist', 'For saving-throw abilities the TARGET rolls: d20 + their save bonus. If the total is the DC or more, they resist (often half damage). The percent shows how likely the target FAILS.'],
    later: ['Later levels', 'What this class gets after level 3. The app covers levels 1–3 for now; this is just so you can see where your character is going.'],
    cr: ['Challenge Rating (CR)', 'How strong a monster is. Rough guide: a fair fight for 4 heroes is one monster with CR = their level. CR 1/4 = goblin, CR 1 = bugbear, CR 2 = ogre. Pick a CR and click Balance: AC, HP, to-hit, damage and save DC are set to typical numbers for that CR.'],
    difficulty: ['Fight difficulty', 'Counted with the 2024 rules: every monster is worth XP (by CR). Compare the total with your party (number of heroes × level). Low = easy warm-up, Moderate = normal fight, High = dangerous, above High = could be deadly.'],
    diceanim: ['Dice animation', 'A quick 1-second dice roll on screen whenever something is rolled. Turn it off if you want rolls to be instant.'],
    language: ['Language', 'Switch the app between English and Russian. Your characters and saves stay the same.']
  };

  D.SKILL_HELP = {
    'Acrobatics': 'Keep your balance, flips, tumble past enemies, slip out of a grab.',
    'Animal Handling': 'Calm, control or ride animals.',
    'Arcana': 'Knowledge about magic, spells, magic items and magical creatures.',
    'Athletics': 'Climb, jump, swim, push, grapple — anything with raw strength.',
    'Deception': 'Lie convincingly, disguise your intentions, bluff.',
    'History': 'Know about kingdoms, wars, legends and famous people.',
    'Insight': 'Tell if someone is lying or what they really want.',
    'Intimidation': 'Scare or threaten someone into doing what you want.',
    'Investigation': 'Search for clues, find traps and secret doors by thinking.',
    'Medicine': 'Stabilize a dying friend, understand wounds and illnesses.',
    'Nature': 'Know plants, animals, weather and the wild.',
    'Perception': 'Notice things: spot, hear, smell. The most used skill in the game!',
    'Performance': 'Sing, play music, act, dance, tell stories.',
    'Persuasion': 'Convince people nicely, negotiate, make friends.',
    'Religion': 'Know gods, temples, holy symbols and the undead.',
    'Sleight of Hand': 'Pickpocket, hide small things, quick hand tricks.',
    'Stealth': 'Sneak, hide, move without being heard.',
    'Survival': 'Track creatures, hunt, find the way, survive in the wild.'
  };

  // Good, simple picks for new players (⭐ in the builder; "Pick recommended" button uses them in order).
  D.RECOMMENDED_SPELLS = {
    bard: { cantrips: ['Vicious Mockery', 'Minor Illusion'], spells: ['Healing Word', 'Faerie Fire', 'Thunderwave', 'Charm Person', 'Sleep', 'Hold Person'] },
    cleric: { cantrips: ['Sacred Flame', 'Guidance', 'Thaumaturgy', 'Light'], spells: ['Bless', 'Healing Word', 'Guiding Bolt', 'Cure Wounds', 'Shield of Faith', 'Spiritual Weapon'] },
    druid: { cantrips: ['Produce Flame', 'Guidance', 'Thorn Whip'], spells: ['Healing Word', 'Entangle', 'Faerie Fire', 'Thunderwave', 'Goodberry', 'Moonbeam'] },
    paladin: { cantrips: [], spells: ['Bless', 'Cure Wounds', 'Shield of Faith', 'Heroism'] },
    ranger: { cantrips: [], spells: ['Cure Wounds', 'Entangle', 'Goodberry', 'Fog Cloud'] },
    sorcerer: { cantrips: ['Fire Bolt', 'Ray of Frost', 'Mage Hand', 'Prestidigitation'], spells: ['Magic Missile', 'Shield', 'Burning Hands', 'Sleep', 'Scorching Ray', 'Misty Step'] },
    warlock: { cantrips: ['Eldritch Blast', 'Minor Illusion'], spells: ['Hex', 'Hellish Rebuke', 'Charm Person', 'Misty Step'] },
    wizard: { cantrips: ['Fire Bolt', 'Mage Hand', 'Ray of Frost', 'Light'], spells: ['Magic Missile', 'Shield', 'Sleep', 'Mage Armor', 'Burning Hands', 'Misty Step'] },
    // Magic Initiate lists
    mi_cleric: { cantrips: ['Guidance', 'Sacred Flame'], spells: ['Healing Word'] },
    mi_druid: { cantrips: ['Guidance', 'Produce Flame'], spells: ['Healing Word'] },
    mi_wizard: { cantrips: ['Fire Bolt', 'Mage Hand'], spells: ['Shield'] }
  };
})(window.DND);
// help for levels 1-20, equipment, shops, loot and scenarios
(function (D) {
  Object.assign(D.HELP, {
    xp: ['Experience (XP)', 'The DM gives XP after fights and adventures (or just says "level up"). Type the number and click + Add XP. When the bar is full, the Level up button appears: it raises the level and shows what changed and what you must choose.'],
    asi: ['Ability Score Improvement', 'At levels 4, 8, 12, 16 (some classes more) you choose: +2 to one ability, +1 to two abilities, or a feat (a special power; most also give +1). Abilities can\'t go above 20. Level 19 gives an Epic Boon.'],
    catalog: ['Equipment, shops and loot', 'Catalog = every item with its price, weight and what it does. Shops: the DM makes a shop, exports it as a file and sends it; players load it and buy with their gold (selling gives half the price). Loot: the DM gives items or gold to a hero and sends a small file; the player loads it and the items appear in the bag.'],
    scenario: ['Scenario', 'A scenario is one file laid on top of normal D&D for one campaign: new items, species, subclasses, spells, feats, monsters, a shop and house rules. The DM picks it for the game and sends the file; each player loads it (📥) and turns it on in ⚙️ Settings. "Normal D&D" = no additions.']
  });
})(window.DND);
