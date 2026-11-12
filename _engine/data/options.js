// Everything else from the 2024 Player's Handbook that you can choose: Aasimar, the rest of the feats
// (general, fighting style, epic boons), all Eldritch Invocations, Battle Master maneuvers, Circle of the Land types.
// Short summaries in our own words, Russian inline: ru: [name, desc]. Loads after levels.js and subclasses.js.
window.DND = window.DND || {};
(function (D) {
  const R = (name, desc, rn, rd, x) => Object.assign({ name, desc, ru: [rn, rd] }, x || {});
  const ALL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];

  // ---------------- Aasimar ----------------
  D.SPECIES.aasimar = {
    name: 'Aasimar', icon: '😇', speed: 30, size: 'Medium or Small', darkvision: 60, ru: ['Аасимар', 'Потомок небожителей. Лечит руками, сопротивляется свету и тьме, на 3 уровне принимает небесный облик.'],
    blurb: 'Touched by the heavens. Heals with a touch, resists radiant and necrotic, shows a celestial form at level 3.',
    traits: [
      R('Darkvision', '60 ft.', 'Тёмное зрение', '60 фт.'),
      R('Celestial Resistance', 'Resistance to necrotic and radiant damage.', 'Небесное сопротивление', 'Сопротивление некротике и излучению.'),
      R('Healing Hands', 'Magic action: touch a creature and heal (Proficiency Bonus)d4. Once per Long Rest.', 'Исцеляющие руки', 'Действие Магия: касаешься существа и лечишь (бонус мастерства)к4. Раз за длинный отдых.', { uses: { max: 1, reset: 'long' }, roll: x => x.pb + 'd4', heal: true }),
      R('Light Bearer', 'You know the Light cantrip (CHA).', 'Несущий свет', 'Знаешь заговор «Свет» (ХАР).', { spells: ['Light'] }),
      R('Celestial Revelation', 'From level 3. Bonus Action, 1 minute: choose Heavenly Wings (Fly Speed = Speed), Inner Radiance (light; creatures within 10 ft take PB radiant at the end of your turns) or Necrotic Shroud (creatures within 10 ft: CHA save or Frightened). Once per turn, a hit deals extra damage = PB. Once per Long Rest.', 'Небесное откровение', 'С 3 уровня. Бонусным действием на минуту: Небесные крылья (полёт со скоростью ходьбы), Внутреннее сияние (свет; существа в 10 фт получают БМ излучением в конце твоих ходов) или Некротический саван (существа в 10 фт: спасбросок ХАР или испуганы). Раз в ход попадание наносит доп. урон = БМ. Раз за длинный отдых.', { lvl: 3, uses: { max: 1, reset: 'long' }, roll: x => String(x.pb), dmgx: true, toggle: true })
    ]
  };

  // ---------------- general feats (level 4+) ----------------
  const G = (name, abil, desc, rn, rd, x) => Object.assign({ name, abil, desc, ru: [rn, rd] }, x || {});
  Object.assign(D.GENERAL_FEATS, {
    actor: G('Actor', ['CHA'], 'Advantage on Deception and Performance to pass as someone else; mimic voices and sounds.', 'Актёр', 'Преимущество на Обман и Выступление, чтобы выдать себя за другого; подражаешь голосам.'),
    athlete: G('Athlete', ['STR', 'DEX'], 'Climb Speed = Speed; stand up with only 5 ft of movement; running jumps after 5 ft.', 'Атлет', 'Лазаешь со скоростью ходьбы; встаёшь за 5 фт движения; прыжок с разбега после 5 фт.'),
    charger: G('Charger', ['STR', 'DEX'], 'Dash costs less; after moving 10 ft straight, a hit deals +1d8 or pushes 10 ft (once per turn).', 'Таран', 'Пробежав 10 фт по прямой, попадание наносит +1d8 или отталкивает на 10 фт (раз в ход).', { roll: '1d8', dmgx: true }),
    chef: G('Chef', ['CON', 'WIS'], 'Cook\'s Utensils. After a Short Rest you and up to 4 allies heal +1d8. Make PB treats: Bonus Action to eat, temp HP = PB.', 'Повар', 'Кухонная утварь. После короткого отдыха ты и до 4 союзников лечите +1d8. Готовишь БМ угощений: съесть бонусным действием — временные хиты = БМ.', { uses: { max: 'PB', reset: 'long' }, roll: x => String(x.pb), heal: true }),
    crossbowexpert: G('Crossbow Expert', ['DEX'], 'Ignore Loading of crossbows; no Disadvantage shooting in melee; add your modifier to the extra Light-weapon attack.', 'Эксперт по арбалетам', 'Игнорируешь Перезарядку арбалетов; нет помехи при стрельбе вблизи; модификатор к урону дополнительной атаки лёгким оружием.'),
    crusher: G('Crusher', ['STR', 'CON'], 'Once per turn a bludgeoning hit pushes the target 5 ft. Your critical hits give allies Advantage against the target.', 'Сокрушитель', 'Раз в ход дробящее попадание сдвигает цель на 5 фт. После твоего крита союзники атакуют её с преимуществом.'),
    defensiveduelist: G('Defensive Duelist', ['DEX'], 'Holding a Finesse weapon, Reaction: add PB to AC against one melee attack.', 'Оборонительный дуэлянт', 'С фехтовальным оружием реакцией прибавляешь БМ к КД против одной рукопашной атаки.'),
    elementaladept: G('Elemental Adept', ['INT', 'WIS', 'CHA'], 'Pick acid, cold, fire, lightning or thunder: your spells ignore Resistance to it and treat 1s on damage dice as 2s.', 'Адепт стихий', 'Выбери кислоту, холод, огонь, молнию или звук: твои заклинания игнорируют сопротивление к нему, а 1 на костях урона считается 2.'),
    feytouched: G('Fey Touched', ['INT', 'WIS', 'CHA'], 'Misty Step is always prepared and once per Long Rest free; also one level 1 Divination or Enchantment spell (add it as a custom spell).', 'Тронутый феями', '«Туманный шаг» всегда подготовлен и раз за длинный отдых бесплатно; ещё одно заклинание 1 уровня прорицания или очарования (добавь как своё).', { spells: ['Misty Step'], uses: { max: 1, reset: 'long' } }),
    heavilyarmored: G('Heavily Armored', ['STR', 'CON'], 'Proficiency with Heavy armor (auto-applied). Needs Medium armor training.', 'Тяжелобронированный', 'Владение тяжёлыми доспехами (считается само). Нужно владеть средними.', { armorProf: ['heavy'] }),
    keenmind: G('Keen Mind', ['INT'], 'Proficiency (or Expertise) in one of Arcana, History, Investigation, Nature, Religion; Study as a Bonus Action.', 'Острый ум', 'Владение (или экспертиза) одним из: Магия, История, Анализ, Природа, Религия; Изучение бонусным действием.'),
    lightlyarmored: G('Lightly Armored', ['STR', 'DEX'], 'Proficiency with Light armor and Shields (auto-applied).', 'Легкобронированный', 'Владение лёгкими доспехами и щитами (считается само).', { armorProf: ['light', 'shield'] }),
    martialtraining: G('Martial Weapon Training', ['STR', 'DEX'], 'Proficiency with Martial weapons (auto-applied).', 'Обучение воинскому оружию', 'Владение воинским оружием (считается само).', { martialProf: true }),
    mediumarmormaster: G('Medium Armor Master', ['STR', 'DEX'], 'In Medium armor you add up to +3 DEX to AC instead of +2 (auto-applied).', 'Мастер средних доспехов', 'В среднем доспехе к КД идёт до +3 ЛОВ вместо +2 (считается само).', { medArmorMaster: true }),
    moderatelyarmored: G('Moderately Armored', ['STR', 'DEX'], 'Proficiency with Medium armor (auto-applied). Needs Light armor training.', 'Умеренно бронированный', 'Владение средними доспехами (считается само). Нужно владеть лёгкими.', { armorProf: ['medium', 'shield'] }),
    mountedcombatant: G('Mounted Combatant', ['STR', 'DEX', 'WIS'], 'Advantage on attacks vs unmounted creatures smaller than your mount; protect your mount.', 'Конный боец', 'Преимущество на атаки по пешим меньше твоего скакуна; защищаешь скакуна.'),
    observant: G('Observant', ['INT', 'WIS'], 'Proficiency (or Expertise) in Insight, Investigation or Perception; Search as a Bonus Action.', 'Наблюдательный', 'Владение (или экспертиза) Проницательностью, Анализом или Внимательностью; Поиск бонусным действием.'),
    piercer: G('Piercer', ['STR', 'DEX'], 'Once per turn reroll one piercing damage die; on a critical hit add one more die.', 'Пронзатель', 'Раз в ход перебрасываешь одну кость колющего урона; на крите ещё одна кость.'),
    poisoner: G('Poisoner', ['DEX', 'INT'], 'Your poison ignores Resistance; make doses (CON save or +2d8 poison and Poisoned).', 'Отравитель', 'Твой яд игнорирует сопротивление; делаешь дозы (спасбросок ТЕЛ или +2d8 ядом и отравлен).', { roll: '2d8', dmgx: true }),
    ritualcaster: G('Ritual Caster', ['INT', 'WIS', 'CHA'], 'Know PB level 1 ritual spells (add them as custom spells); cast a ritual quickly once per Long Rest.', 'Ритуальный заклинатель', 'Знаешь БМ ритуалов 1 уровня (добавь как свои заклинания); раз за длинный отдых ритуал быстро.'),
    shadowtouched: G('Shadow Touched', ['INT', 'WIS', 'CHA'], 'Invisibility is always prepared and once per Long Rest free; also one level 1 Illusion or Necromancy spell.', 'Тронутый тенью', '«Невидимость» всегда подготовлена и раз за длинный отдых бесплатно; ещё одно заклинание 1 уровня иллюзии или некромантии.', { spells: ['Invisibility'], uses: { max: 1, reset: 'long' } }),
    shieldmaster: G('Shield Master', ['STR'], 'Shield Bash: on a hit, push 5 ft or knock Prone (STR save). Add shield AC to DEX saves vs effects that target only you.', 'Мастер щита', 'Удар щитом: при попадании отталкиваешь на 5 фт или сбиваешь (спасбросок СИЛ). Щит помогает на спасбросках ЛОВ.'),
    skillexpert: G('Skill Expert', ALL, 'One more skill proficiency and Expertise in one skill.', 'Знаток навыков', 'Ещё один навык и экспертиза в одном навыке.'),
    skulker: G('Skulker', ['DEX'], 'Blindsight 10 ft; missing an attack doesn\'t reveal you; Advantage on Stealth to hide in combat.', 'Скрытный', 'Слепое зрение 10 фт; промах не выдаёт тебя; преимущество на Скрытность в бою.'),
    slasher: G('Slasher', ['STR', 'DEX'], 'Once per turn a slashing hit lowers the target\'s Speed by 10 ft; your critical hits give it Disadvantage on attacks.', 'Рубака', 'Раз в ход рубящее попадание снижает скорость цели на 10 фт; после крита она атакует с помехой.'),
    spellsniper: G('Spell Sniper', ['INT', 'WIS', 'CHA'], 'Spell attacks: +60 ft range, ignore Half and Three-Quarters Cover, no Disadvantage in melee.', 'Снайпер заклинаний', 'Атаки заклинаниями: +60 фт дальности, игнорируешь укрытия, нет помехи вблизи.'),
    telekinetic: G('Telekinetic', ['INT', 'WIS', 'CHA'], 'Invisible Mage Hand; Bonus Action: push a creature 5 ft (STR save).', 'Телекинетик', 'Невидимая «Волшебная рука»; бонусным действием толкаешь существо на 5 фт (спасбросок СИЛ).', { spells: ['Mage Hand'] }),
    telepathic: G('Telepathic', ['INT', 'WIS', 'CHA'], 'Telepathy 60 ft; Detect Thoughts is always prepared and once per Long Rest free.', 'Телепат', 'Телепатия 60 фт; «Обнаружение мыслей» всегда подготовлено и раз за длинный отдых бесплатно.', { spells: ['Detect Thoughts'], uses: { max: 1, reset: 'long' } }),
    weaponmaster: G('Weapon Master', ['STR', 'DEX'], 'Learn the mastery property of one more weapon (change it after a Long Rest).', 'Мастер оружия', 'Ещё один приём оружия (меняешь после длинного отдыха).'),
    // Fighting Style feats: only for classes with Fighting Style. No ability increase.
    fs_archery: G('Fighting Style: Archery', [], '+2 to hit with ranged weapons (auto-applied).', 'Боевой стиль: Стрельба', '+2 к попаданию дальнобойным оружием (считается само).', { fs: 'archery' }),
    fs_defense: G('Fighting Style: Defense', [], '+1 AC in armor (auto-applied).', 'Боевой стиль: Оборона', '+1 КД в доспехе (считается само).', { fs: 'defense' }),
    fs_dueling: G('Fighting Style: Dueling', [], '+2 damage with a one-handed melee weapon (auto-applied).', 'Боевой стиль: Дуэлянт', '+2 урона оружием в одной руке (считается само).', { fs: 'dueling' }),
    fs_gwf: G('Fighting Style: Great Weapon Fighting', [], 'Two-handed weapon damage dice: treat 1 and 2 as 3 (auto-applied).', 'Боевой стиль: Двуручное оружие', 'На костях урона двуручного оружия 1 и 2 считаются 3 (считается само).', { fs: 'gwf' }),
    fs_protection: G('Fighting Style: Protection', [], 'Reaction with a shield: an attack against a nearby ally has Disadvantage.', 'Боевой стиль: Защита', 'Реакция со щитом: атака по союзнику рядом с помехой.', { fs: 'protection' }),
    fs_twf: G('Fighting Style: Two-Weapon Fighting', [], 'Add your modifier to the extra Light-weapon attack.', 'Боевой стиль: Бой двумя оружиями', 'Модификатор к урону дополнительной атаки лёгким оружием.', { fs: 'twf' }),
    fs_thrown: G('Fighting Style: Thrown Weapon Fighting', [], '+2 damage with thrown weapons (auto-applied).', 'Боевой стиль: Метательное оружие', '+2 урона метательным оружием (считается само).', { fs: 'thrown' }),
    fs_blind: G('Fighting Style: Blind Fighting', [], 'Blindsight 10 ft.', 'Боевой стиль: Слепой бой', 'Слепое зрение 10 фт.', { fs: 'blind' }),
    fs_interception: G('Fighting Style: Interception', [], 'Reaction: reduce damage to a nearby ally by 1d10 + PB.', 'Боевой стиль: Перехват', 'Реакция: урон союзнику рядом меньше на 1d10 + БМ.', { fs: 'interception', roll: '1d10+@PB' }),
    fs_unarmed: G('Fighting Style: Unarmed Fighting', [], 'Unarmed strikes deal 1d6 + STR (auto-applied).', 'Боевой стиль: Безоружный бой', 'Безоружные удары 1d6 + СИЛ (считается само).', { fs: 'unarmed' }),
    // Epic Boons (level 19)
    boondimensional: G('Boon of Dimensional Travel', ALL, 'After an Attack or Magic action, teleport 30 ft.', 'Дар пространственных путешествий', 'После Атаки или Магии телепорт на 30 фт.', { boon: true }),
    boonenergy: G('Boon of Energy Resistance', ALL, 'Resistance to two damage types (change after a Long Rest); Reaction: redirect that damage to a creature nearby (2d12 + CON, DEX save).', 'Дар сопротивления энергии', 'Сопротивление двум типам урона (меняешь после отдыха); реакцией перенаправляешь урон на существо рядом (2d12 + ТЕЛ, спасбросок ЛОВ).', { boon: true, roll: '2d12+@CON', dmgx: true }),
    boonirresistible: G('Boon of Irresistible Offense', ['STR', 'DEX'], 'Your bludgeoning, piercing and slashing damage ignores Resistance; on a natural 20, extra damage = the raised ability score.', 'Дар неотразимой атаки', 'Твой дробящий, колющий и рубящий урон игнорирует сопротивление; на натуральной 20 доп. урон = значение характеристики.', { boon: true }),
    boonrecovery: G('Boon of Recovery', ALL, 'Once per Long Rest, when you drop to 0 HP, drop to half HP instead. A pool of 10d10 to heal yourself as a Bonus Action.', 'Дар восстановления', 'Раз за длинный отдых, падая до 0 хитов, остаёшься с половиной. Запас 10d10 для лечения себя бонусным действием.', { boon: true, uses: { max: 10, reset: 'long' }, pool: true, roll: '1d10', heal: true }),
    boonskill: G('Boon of Skill', ALL, 'Proficiency in all skills, and Expertise in one.', 'Дар мастерства', 'Владение всеми навыками и экспертиза в одном.', { boon: true }),
    boonnightspirit: G('Boon of the Night Spirit', ALL, 'In dim light or darkness: Bonus Action to become Invisible; Resistance to all damage except psychic and radiant.', 'Дар духа ночи', 'В тусклом свете или темноте: бонусным действием невидимость; сопротивление всему урону, кроме психики и излучения.', { boon: true })
  });

  // ---------------- Eldritch Invocations (all of the 2024 list) ----------------
  // req = needs that invocation first. spells / extraAttack / pactBlade / roll are counted by the app.
  const IV = D.INVOCATIONS;
  const pactLvl = l => (D.PACT[l - 1] || { level: 1 }).level;
  Object.assign(IV.armorofshadows, { spells: ['Mage Armor'] });
  Object.assign(IV.fiendishvigor, { spells: ['False Life'] });
  Object.assign(IV.maskfaces, { spells: ['Disguise Self'] });
  Object.assign(IV.mistyvisions, { spells: ['Silent Image'] });
  Object.assign(IV.otherworldlyleap, { spells: ['Jump'] });
  Object.assign(IV.pactchain, { spells: ['Find Familiar'] });
  Object.assign(IV.pactblade, { pactBlade: true });
  Object.assign(IV, {
    eldritchspear: R('Eldritch Spear', 'Your damaging warlock cantrip reaches 30 × Warlock level ft.', 'Мистическое копьё', 'Твой атакующий заговор колдуна бьёт на 30 × уровень колдуна фт.', { lvl: 2 }),
    lessonsfirst: R('Lessons of the First Ones', 'Gain one Origin feat of your choice (tell the DM; you can take this invocation more than once).', 'Уроки Первых', 'Получаешь одну черту происхождения на выбор (скажи мастеру; можно брать несколько раз).', { lvl: 2 }),
    ascendantstep: R('Ascendant Step', 'Cast Levitate on yourself at will, without a slot.', 'Восходящий шаг', '«Левитация» на себя без ячейки сколько угодно.', { lvl: 5, spells: ['Levitate'] }),
    gazetwominds: R('Gaze of Two Minds', 'Bonus Action: see and hear through a willing creature\'s senses; cast spells from its space.', 'Взгляд двух разумов', 'Бонусным действием видишь и слышишь чувствами союзника; колдуешь из его клетки.', { lvl: 5 }),
    giftdepths: R('Gift of the Depths', 'Breathe underwater, Swim Speed = Speed; Water Breathing once per Long Rest without a slot.', 'Дар глубин', 'Дышишь под водой, плаваешь со скоростью ходьбы; «Подводное дыхание» раз за длинный отдых без ячейки.', { lvl: 5, spells: ['Water Breathing'] }),
    myriadforms: R('Master of Myriad Forms', 'Cast Alter Self at will, without a slot.', 'Мастер множества обличий', '«Смена обличья» без ячейки сколько угодно.', { lvl: 5, spells: ['Alter Self'] }),
    onewithshadows: R('One with Shadows', 'In dim light or darkness, cast Invisibility on yourself without a slot.', 'Единый с тенями', 'В тусклом свете или темноте «Невидимость» на себя без ячейки.', { lvl: 5, spells: ['Invisibility'] }),
    eldritchsmite: R('Eldritch Smite', 'Once per turn on a pact weapon hit, spend a Pact slot: +1d8 force plus 1d8 per slot level, and you can knock the target Prone.', 'Мистическая кара', 'Раз в ход при попадании оружием договора трать ячейку: +1d8 силовым полем и ещё 1d8 за уровень ячейки, можешь сбить с ног.', { lvl: 5, req: 'pactblade', roll: x => (1 + pactLvl(x.lvl)) + 'd8', dmgx: true }),
    thirstingblade: R('Thirsting Blade', 'Attack twice with your pact weapon (auto-applied).', 'Жаждущий клинок', 'Две атаки оружием договора (считается само).', { lvl: 5, req: 'pactblade', extraAttack: 2 }),
    chainmaster: R('Investment of the Chain Master', 'Your familiar gets a fly or swim speed, attacks as a Bonus Action, uses your spell save DC and can resist damage.', 'Дар повелителя цепи', 'Фамильяр получает полёт или плавание, атакует бонусным действием, использует твою СЛ и может сопротивляться урону.', { lvl: 5, req: 'pactchain' }),
    whispersgrave: R('Whispers of the Grave', 'Cast Speak with Dead without a slot.', 'Шёпот могилы', '«Разговор с мёртвыми» без ячейки.', { lvl: 7, spells: ['Speak with Dead'] }),
    lifedrinker: R('Lifedrinker', 'Pact weapon hits deal +1d6 necrotic, psychic or radiant; spend a Hit Die to heal once per turn.', 'Пожиратель жизни', 'Попадания оружием договора +1d6 некротикой, психикой или излучением; можешь потратить кость хитов на лечение раз в ход.', { lvl: 9, req: 'pactblade', roll: '1d6', dmgx: true }),
    giftprotectors: R('Gift of the Protectors', 'A creature whose name is in your Book of Shadows drops to 1 HP instead of 0 (once per Long Rest).', 'Дар защитников', 'Существо, чьё имя записано в Книге теней, падает до 1 хита вместо 0 (раз за длинный отдых).', { lvl: 9, req: 'pacttome', uses: { max: 1, reset: 'long' } }),
    visionsrealms: R('Visions of Distant Realms', 'Cast Arcane Eye without a slot.', 'Видения далёких миров', '«Магический глаз» без ячейки.', { lvl: 9, spells: ['Arcane Eye'] }),
    devouringblade: R('Devouring Blade', 'Thirsting Blade gives three attacks (auto-applied).', 'Пожирающий клинок', 'Жаждущий клинок даёт три атаки (считается само).', { lvl: 12, req: 'thirstingblade', extraAttack: 3 }),
    witchsight: R('Witch Sight', 'Truesight 30 ft.', 'Ведьмовское зрение', 'Истинное зрение 30 фт.', { lvl: 15 })
  });

  // ---------------- Battle Master maneuvers ----------------
  D.MANEUVERS_COUNT = l => (l >= 15 ? 9 : l >= 10 ? 7 : l >= 7 ? 5 : l >= 3 ? 3 : 0);
  D.MANEUVERS = {
    ambush: R('Ambush', 'Add a Superiority die to a Stealth check or to Initiative.', 'Засада', 'Добавь кость превосходства к Скрытности или инициативе.'),
    baitswitch: R('Bait and Switch', 'Swap places with an ally within 5 ft; one of you gets the die as AC until your next turn.', 'Подмена', 'Меняешься местами с союзником в 5 фт; один из вас получает кость к КД до твоего хода.'),
    commanderstrike: R('Commander\'s Strike', 'Give up one attack: an ally uses its Reaction to attack and adds the die to damage.', 'Удар командира', 'Отдаёшь одну атаку: союзник реакцией атакует и добавляет кость к урону.'),
    commandingpresence: R('Commanding Presence', 'Add the die to an Intimidation, Performance or Persuasion check.', 'Властное присутствие', 'Добавь кость к Запугиванию, Выступлению или Убеждению.'),
    disarming: R('Disarming Attack', 'On a hit: add the die to damage; STR save or it drops what it holds.', 'Обезоруживающая атака', 'При попадании: +кость к урону; спасбросок СИЛ или роняет то, что держит.'),
    distracting: R('Distracting Strike', 'On a hit: add the die; the next attack by an ally against it has Advantage.', 'Отвлекающий удар', 'При попадании: +кость; следующая атака союзника по цели с преимуществом.'),
    evasive: R('Evasive Footwork', 'When you move, add the die to your AC until you stop.', 'Уклоняющийся шаг', 'Когда двигаешься, кость к КД, пока не остановишься.'),
    feinting: R('Feinting Attack', 'Bonus Action: Advantage on your next attack this turn; on a hit add the die.', 'Финт', 'Бонусным действием преимущество на следующую атаку в этом ходу; при попадании +кость.'),
    goading: R('Goading Attack', 'On a hit: add the die; WIS save or Disadvantage attacking anyone but you.', 'Провоцирующая атака', 'При попадании: +кость; спасбросок МДР или помеха на атаки по всем, кроме тебя.'),
    lunging: R('Lunging Attack', 'Dash as a Bonus Action; if you hit after moving 5 ft straight, add the die.', 'Выпад', 'Рывок бонусным действием; если попал после 5 фт по прямой — +кость.'),
    maneuvering: R('Maneuvering Attack', 'On a hit: add the die; an ally moves half its Speed without provoking.', 'Манёвренная атака', 'При попадании: +кость; союзник проходит половину скорости без провоцированных атак.'),
    menacing: R('Menacing Attack', 'On a hit: add the die; WIS save or Frightened until your next turn.', 'Устрашающая атака', 'При попадании: +кость; спасбросок МДР или испуган до твоего хода.'),
    parry: R('Parry', 'Reaction when hit in melee: reduce the damage by die + STR or DEX.', 'Парирование', 'Реакция на попадание вблизи: урон меньше на кость + СИЛ или ЛОВ.'),
    precision: R('Precision Attack', 'Add the die to an attack roll (even after you see it miss).', 'Точная атака', 'Добавь кость к броску атаки (даже увидев промах).'),
    pushing: R('Pushing Attack', 'On a hit: add the die; STR save or pushed 15 ft.', 'Толкающая атака', 'При попадании: +кость; спасбросок СИЛ или отброшен на 15 фт.'),
    rally: R('Rally', 'Bonus Action: an ally gets temp HP = die + half your level.', 'Воодушевление', 'Бонусным действием союзник получает временные хиты = кость + половина уровня.'),
    riposte: R('Riposte', 'Reaction when a creature misses you in melee: attack it and add the die.', 'Ответный удар', 'Реакция, когда по тебе промахнулись вблизи: атакуешь и добавляешь кость.'),
    sweeping: R('Sweeping Attack', 'On a melee hit: another creature within 5 ft takes the die as damage if your roll would hit it.', 'Широкий удар', 'При попадании вблизи: другое существо в 5 фт получает урон = кость, если бросок бы его поразил.'),
    tactical: R('Tactical Assessment', 'Add the die to a History, Insight or Investigation check.', 'Тактическая оценка', 'Добавь кость к Истории, Проницательности или Анализу.'),
    trip: R('Trip Attack', 'On a hit: add the die; Large or smaller makes a STR save or falls Prone.', 'Сбивающая атака', 'При попадании: +кость; существо Большого размера и меньше — спасбросок СИЛ или сбито с ног.')
  };

  // ---------------- Circle of the Land: choose your land ----------------
  D.LANDS = {
    arid: R('Arid', 'Desert. Resistance: fire.', 'Пустыня', 'Пустыня. Сопротивление: огонь.', { spellsAt: { 3: ['Blur', 'Burning Hands', 'Fire Bolt'], 5: ['Fireball'], 7: ['Blight'], 9: ['Wall of Stone'] } }),
    polar: R('Polar', 'Ice and snow. Resistance: cold.', 'Полярная', 'Лёд и снег. Сопротивление: холод.', { spellsAt: { 3: ['Fog Cloud', 'Hold Person', 'Ray of Frost'], 5: ['Sleet Storm'], 7: ['Ice Storm'], 9: ['Cone of Cold'] } }),
    temperate: R('Temperate', 'Forests and plains. Resistance: lightning.', 'Умеренная', 'Леса и равнины. Сопротивление: молния.', { spellsAt: { 3: ['Misty Step', 'Shocking Grasp', 'Sleep'], 5: ['Lightning Bolt'], 7: ['Freedom of Movement'], 9: ['Tree Stride'] } }),
    tropical: R('Tropical', 'Jungle. Resistance: poison.', 'Тропическая', 'Джунгли. Сопротивление: яд.', { spellsAt: { 3: ['Acid Splash', 'Ray of Sickness', 'Web'], 5: ['Stinking Cloud'], 7: ['Polymorph'], 9: ['Insect Plague'] } })
  };
  const land = D.CLASSES.druid.subclasses.land.features.find(f => f.name === 'Circle Spells');
  if (land) land.landSpells = true;

  // language: inline Russian for invocations, maneuvers and lands
  (D.AFTER_LANG = D.AFTER_LANG || []).push(function (lang) {
    if (lang !== 'ru') return;
    [D.INVOCATIONS, D.MANEUVERS, D.LANDS].forEach(o => Object.values(o).forEach(x => { if (Array.isArray(x.ru)) { x.name = x.ru[0]; x.desc = x.ru[1]; } }));
  });
})(window.DND);
