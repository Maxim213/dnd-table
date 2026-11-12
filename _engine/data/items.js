// Item CATALOG: every item the app knows, with category, icon, price (GP), weight (lb) and a short description.
// Used by the 🎒 Equipment screen, the shop builder and loot. Scenario files can add more items.
// ru: ['Название', 'Описание'] is the Russian text.
window.DND = window.DND || {};
(function (D) {
  D.ITEM_CATS = {
    weapon: { icon: '⚔️', name: 'Weapons', ru: 'Оружие' },
    armor: { icon: '🛡️', name: 'Armor', ru: 'Доспехи' },
    gear: { icon: '🎒', name: 'Adventuring gear', ru: 'Снаряжение' },
    tool: { icon: '🛠️', name: 'Tools & kits', ru: 'Инструменты' },
    consumable: { icon: '🧪', name: 'Potions & consumables', ru: 'Зелья и расходники' },
    magic: { icon: '✨', name: 'Magic items', ru: 'Магические предметы' },
    scenario: { icon: '📜', name: 'Scenario items', ru: 'Предметы сценария' }
  };
  D.RARITY_PRICE = { Common: 100, Uncommon: 400, Rare: 4000, 'Very Rare': 40000, Legendary: 200000 };
  D.RARITY_RU = { Common: 'Обычный', Uncommon: 'Необычный', Rare: 'Редкий', 'Very Rare': 'Очень редкий', Legendary: 'Легендарный' };

  // [cost GP, weight lb]
  const WP = { club: [0.1, 2], dagger: [2, 1], greatclub: [0.2, 10], handaxe: [5, 2], javelin: [0.5, 2], lighthammer: [2, 2], mace: [5, 4], quarterstaff: [0.2, 4],
    sickle: [1, 2], spear: [1, 3], dart: [0.05, 0.25], lightcrossbow: [25, 5], shortbow: [25, 2], sling: [0.1, 0], battleaxe: [10, 4], flail: [10, 2], glaive: [20, 6],
    greataxe: [30, 7], greatsword: [50, 6], halberd: [20, 6], lance: [10, 6], longsword: [15, 3], maul: [10, 10], morningstar: [15, 4], pike: [5, 18], rapier: [25, 2],
    scimitar: [25, 3], shortsword: [10, 2], trident: [5, 4], warhammer: [15, 5], warpick: [5, 2], whip: [2, 3], blowgun: [10, 1], handcrossbow: [75, 3], heavycrossbow: [50, 18], longbow: [50, 2] };
  const AP = { padded: [5, 8], leather: [10, 10], studded: [45, 13], hide: [10, 12], chainshirt: [50, 20], scale: [50, 45], breastplate: [400, 20], halfplate: [750, 40],
    ringmail: [30, 40], chainmail: [75, 55], splint: [200, 60], plate: [1500, 65], shield: [10, 6] };

  // gear: [English name, category, icon, cost, weight, description, Russian name, Russian description, extra]
  const GR = [
    ['Backpack', 'gear', '🎒', 2, 5, 'Holds 30 lb of gear.', 'Рюкзак', 'Вмещает 30 фунтов вещей.'],
    ['Bedroll', 'gear', '🛏️', 1, 7, 'Sleep warm outdoors.', 'Спальник', 'Тёплый сон под открытым небом.'],
    ['Rope (50 ft)', 'gear', '🪢', 1, 5, 'Hemp rope. Tie, climb, bind (DC 15 to burst).', 'Верёвка (50 фт)', 'Пеньковая верёвка: связать, залезть, спуститься.'],
    ['Torch', 'gear', '🔥', 0.01, 1, 'Burns 1 hour: bright light 20 ft, dim 20 ft more. Can be an improvised weapon (1 fire damage).', 'Факел', 'Горит час: яркий свет 20 фт и тусклый ещё 20 фт.'],
    ['Tinderbox', 'gear', '🔥', 0.5, 1, 'Light a fire, torch or lantern.', 'Трутница', 'Зажечь костёр, факел или фонарь.'],
    ['Rations (1 day)', 'gear', '🍖', 0.5, 2, 'Dry food for one day.', 'Паёк (1 день)', 'Сухая еда на день.'],
    ['Waterskin', 'gear', '💧', 0.2, 5, 'Holds 4 pints of liquid.', 'Бурдюк', 'Вмещает около 2 литров.'],
    ['Crowbar', 'gear', '🔧', 2, 5, 'Advantage on STR checks where leverage helps.', 'Ломик', 'Преимущество на проверки СИЛ, где поможет рычаг.'],
    ['Hammer', 'gear', '🔨', 1, 3, 'For pitons and repairs.', 'Молоток', 'Забивать крюки и чинить.'],
    ['Pitons', 'gear', '📍', 0.05, 0.25, 'Iron spike to anchor rope.', 'Шлямбуры', 'Железный крюк для верёвки.'],
    ['Lantern', 'gear', '🏮', 5, 2, 'Hooded lantern: bright light 30 ft, burns 6 hours on a flask of oil.', 'Фонарь', 'Свет 30 фт, 6 часов на фляге масла.'],
    ['Oil flask', 'gear', '🫙', 0.1, 1, 'Fuel for a lantern, or splash and ignite: 5 fire damage.', 'Фляга масла', 'Топливо для фонаря или подожги: 5 урона огнём.'],
    ['Healer\'s Kit', 'tool', '🩹', 5, 3, '10 uses. Stabilize a dying creature without a Medicine check.', 'Набор целителя', '10 использований. Стабилизирует умирающего без проверки.'],
    ['Thieves\' Tools', 'tool', '🗝️', 25, 1, 'Pick locks and disarm traps (DEX check).', 'Воровские инструменты', 'Вскрыть замок или обезвредить ловушку.'],
    ['Holy Symbol', 'gear', '☀️', 5, 1, 'Spellcasting focus for Clerics and Paladins.', 'Священный символ', 'Фокусировка для жрецов и паладинов.'],
    ['Arcane Focus', 'gear', '🔮', 10, 1, 'Crystal, orb or wand: spellcasting focus for Sorcerers, Warlocks and Wizards.', 'Магическая фокусировка', 'Кристалл, сфера или жезл для чародеев, колдунов, волшебников.'],
    ['Druidic Focus', 'gear', '🌿', 1, 0, 'Sprig of mistletoe or wooden staff: focus for Druids and Rangers.', 'Друидическая фокусировка', 'Веточка омелы или посох для друидов и следопытов.'],
    ['Spellbook', 'gear', '📖', 50, 3, 'Holds a Wizard\'s spells.', 'Книга заклинаний', 'Здесь записаны заклинания волшебника.'],
    ['Musical Instrument', 'tool', '🎻', 30, 2, 'Lute, flute, drum... Bards use it as a focus.', 'Музыкальный инструмент', 'Лютня, флейта, барабан... Фокусировка барда.'],
    ['Quiver', 'gear', '🏹', 1, 1, 'Holds 20 arrows.', 'Колчан', 'Вмещает 20 стрел.'],
    ['Arrows (20)', 'gear', '🏹', 1, 1, 'Ammunition for bows.', 'Стрелы (20)', 'Боеприпасы для луков.'],
    ['Bolts (20)', 'gear', '🏹', 1, 1.5, 'Ammunition for crossbows.', 'Болты (20)', 'Боеприпасы для арбалетов.'],
    ['Explorer\'s Pack', 'gear', '🎒', 10, 55, 'Backpack, bedroll, 10 days of rations, waterskin, 10 torches, tinderbox, 50 ft rope.', 'Набор путешественника', 'Рюкзак, спальник, паёк на 10 дней, бурдюк, 10 факелов, трутница, верёвка.'],
    ['Dungeoneer\'s Pack', 'gear', '🎒', 12, 55, 'Backpack, crowbar, hammer, 10 pitons, 10 torches, tinderbox, 10 days of rations, waterskin, rope.', 'Набор исследователя подземелий', 'Рюкзак, ломик, молоток, крюки, факелы, паёк, верёвка.'],
    ['Priest\'s Pack', 'gear', '🎒', 33, 29, 'Backpack, blanket, candles, holy water, lamp, rations, robe.', 'Набор священника', 'Рюкзак, одеяло, свечи, святая вода, лампа, паёк, ряса.'],
    ['Scholar\'s Pack', 'gear', '🎒', 40, 22, 'Backpack, book, ink, pen, parchment, lamp, oil.', 'Набор учёного', 'Рюкзак, книга, чернила, перо, пергамент, лампа.'],
    ['Burglar\'s Pack', 'gear', '🎒', 16, 42, 'Backpack, ball bearings, bell, candles, crowbar, lantern, rope, rations.', 'Набор взломщика', 'Рюкзак, шарики, колокольчик, свечи, ломик, фонарь, верёвка.'],
    ['Entertainer\'s Pack', 'gear', '🎒', 40, 58, 'Backpack, bedroll, costumes, candles, mirror, perfume, rations.', 'Набор артиста', 'Рюкзак, спальник, костюмы, свечи, зеркало, духи.'],
    ['Herbalism Kit', 'tool', '🌱', 5, 3, 'Make antitoxin and Potions of Healing.', 'Набор травника', 'Делать противоядие и зелья лечения.'],
    ['Caltrops', 'gear', '📌', 1, 2, 'Scatter in a 5-ft square: creatures entering take 1 piercing and stop (DEX save DC 15).', 'Шипы', 'Рассыпь на клетку 5 фт: входящий получает 1 урон и останавливается.'],
    ['Ball Bearings', 'gear', '⚪', 1, 2, 'Cover a 10-ft square: DEX save DC 10 or fall Prone.', 'Металлические шарики', 'Квадрат 10 фт: спасбросок ЛОВ СЛ 10 или падаешь.'],
    ['Chain (10 ft)', 'gear', '⛓️', 5, 10, 'Strong chain (DC 20 to burst).', 'Цепь (10 фт)', 'Прочная цепь.'],
    ['Climber\'s Kit', 'tool', '🧗', 25, 12, 'Anchor yourself: you can\'t fall more than 25 ft.', 'Набор скалолаза', 'Страховка: не упадёшь больше чем на 25 фт.'],
    ['Grappling Hook', 'gear', '🪝', 2, 4, 'Throw onto a ledge and climb the rope.', 'Абордажный крюк', 'Закинь на уступ и лезь по верёвке.'],
    ['Manacles', 'gear', '⛓️', 2, 6, 'Bind a Small or Medium creature (DC 20 to escape).', 'Кандалы', 'Сковать существо (СЛ 20, чтобы вырваться).'],
    ['Mirror', 'gear', '🪞', 5, 0.5, 'Steel hand mirror.', 'Зеркальце', 'Стальное ручное зеркало.'],
    ['Shovel', 'gear', '⛏️', 2, 5, 'Dig a hole or a trench.', 'Лопата', 'Копать ямы и траншеи.'],
    ['Tent', 'gear', '⛺', 2, 20, 'Shelter for two.', 'Палатка', 'Укрытие на двоих.'],
    ['Lock', 'gear', '🔒', 10, 1, 'Comes with a key (DC 15 to pick).', 'Замок', 'С ключом (СЛ 15, чтобы вскрыть).'],
    ['Map', 'gear', '🗺️', 1, 0, 'A map of a region.', 'Карта', 'Карта местности.'],
    ['Spyglass', 'gear', '🔭', 1000, 1, 'See things far away twice as big.', 'Подзорная труба', 'Видишь далёкое вдвое крупнее.'],
    ['Traveler\'s Clothes', 'gear', '👕', 2, 4, 'Sturdy clothes for the road.', 'Дорожная одежда', 'Прочная одежда для путешествий.'],
    ['Fine Clothes', 'gear', '👔', 15, 6, 'For nobles and parties.', 'Изящная одежда', 'Для балов и знати.'],
    ['Disguise Kit', 'tool', '🎭', 25, 3, 'Change your look.', 'Набор для грима', 'Меняешь внешность.'],
    ['Poisoner\'s Kit', 'tool', '☠️', 50, 2, 'Make and apply poisons.', 'Набор отравителя', 'Делать и наносить яды.'],
    ['Book', 'gear', '📕', 25, 5, 'Lore, poetry or history.', 'Книга', 'Знания, стихи или история.'],
    ['Riding Horse', 'gear', '🐎', 75, 0, 'Speed 60 ft. Carries you and your gear.', 'Ездовая лошадь', 'Скорость 60 фт. Везёт тебя и вещи.'],
    // consumables
    ['Potion of Healing', 'consumable', '🧪', 50, 0.5, 'Drink: regain 2d4 + 2 HP.', 'Зелье лечения', 'Выпей: восстанавливаешь 2d4 + 2 хита.', { roll: '2d4+2', heal: true, rarity: 'Common' }],
    ['Antitoxin', 'consumable', '💊', 50, 0, 'Advantage on saves vs Poisoned for 1 hour.', 'Противоядие', 'Час преимущества на спасброски от отравления.'],
    ['Acid (vial)', 'consumable', '🧴', 25, 1, 'Throw: DEX save or 2d6 acid damage.', 'Кислота (флакон)', 'Брось: спасбросок ЛОВ или 2d6 урона кислотой.', { roll: '2d6' }],
    ['Alchemist\'s Fire', 'consumable', '🔥', 50, 1, 'Throw: DEX save or 1d4 fire and burning each turn.', 'Алхимический огонь', 'Брось: спасбросок ЛОВ или 1d4 огнём и горение.', { roll: '1d4' }],
    ['Holy Water', 'consumable', '💧', 25, 1, 'Throw: DEX save or 2d8 radiant to a fiend or undead.', 'Святая вода', 'Брось: 2d8 излучением исчадию или нежити.', { roll: '2d8' }],
    ['Candle', 'gear', '🕯️', 0.01, 0, 'Dim light 5 ft for 1 hour.', 'Свеча', 'Тусклый свет 5 фт на час.']
  ];

  // magic items: [English name, icon, rarity, attunement, description, Russian name, Russian description, extra]
  const MG = [
    ['Potion of Greater Healing', '🧪', 'Uncommon', false, 'Drink: regain 4d4 + 4 HP.', 'Зелье большого лечения', 'Выпей: 4d4 + 4 хита.', { cat: 'consumable', roll: '4d4+4', heal: true }],
    ['Potion of Superior Healing', '🧪', 'Rare', false, 'Drink: regain 8d4 + 8 HP.', 'Зелье превосходного лечения', 'Выпей: 8d4 + 8 хитов.', { cat: 'consumable', roll: '8d4+8', heal: true }],
    ['Potion of Supreme Healing', '🧪', 'Very Rare', false, 'Drink: regain 10d4 + 20 HP.', 'Зелье высшего лечения', 'Выпей: 10d4 + 20 хитов.', { cat: 'consumable', roll: '10d4+20', heal: true }],
    ['Potion of Climbing', '🧪', 'Common', false, '1 hour: Climb Speed = Speed, Advantage on Athletics to climb.', 'Зелье лазания', 'Час: лазаешь со скоростью ходьбы.', { cat: 'consumable' }],
    ['Potion of Invisibility', '🧪', 'Rare', false, 'Invisible for 1 hour (ends if you attack or cast).', 'Зелье невидимости', 'Невидим час (кончается при атаке).', { cat: 'consumable' }],
    ['Potion of Giant Strength', '🧪', 'Uncommon', false, 'STR becomes 21 for 1 hour.', 'Зелье силы великана', 'СИЛ 21 на час.', { cat: 'consumable' }],
    ['Potion of Resistance', '🧪', 'Uncommon', false, 'Resistance to one damage type for 1 hour.', 'Зелье сопротивления', 'Сопротивление одному типу урона на час.', { cat: 'consumable' }],
    ['Spell Scroll (level 1)', '📜', 'Common', false, 'Cast the level 1 spell written on it once (if it is on your class list).', 'Свиток заклинания (1 ур.)', 'Сотвори записанное заклинание 1 уровня один раз.', { cat: 'consumable' }],
    ['Bag of Holding', '👜', 'Uncommon', false, 'Holds 500 lb in a pocket space; always weighs 15 lb.', 'Сумка хранения', 'Вмещает 500 фунтов, весит всегда 15.'],
    ['Cloak of Protection', '🧥', 'Uncommon', true, '+1 AC and +1 to saving throws.', 'Плащ защиты', '+1 КД и +1 к спасброскам.', { effects: [{ type: 'ac', value: 1 }, { type: 'save', value: 1 }] }],
    ['Ring of Protection', '💍', 'Rare', true, '+1 AC and +1 to saving throws.', 'Кольцо защиты', '+1 КД и +1 к спасброскам.', { effects: [{ type: 'ac', value: 1 }, { type: 'save', value: 1 }] }],
    ['Bracers of Defense', '🛡️', 'Rare', true, '+2 AC while you wear no armor and no shield.', 'Наручи защиты', '+2 КД без доспеха и щита.', { effects: [{ type: 'ac', value: 2 }] }],
    ['Boots of Elvenkind', '👢', 'Uncommon', false, 'Silent steps: Advantage on Stealth checks to move quietly.', 'Сапоги эльфов', 'Бесшумный шаг: преимущество на Скрытность.'],
    ['Boots of Striding and Springing', '👢', 'Uncommon', true, 'Speed at least 30 ft; jump three times as far.', 'Сапоги ходьбы и прыжков', 'Скорость минимум 30 фт, прыжки втрое дальше.', { effects: [{ type: 'speed', value: 10 }] }],
    ['Cloak of Elvenkind', '🧥', 'Uncommon', true, 'Advantage on Stealth; others have Disadvantage to see you.', 'Плащ эльфов', 'Преимущество на Скрытность.'],
    ['Gauntlets of Ogre Power', '🧤', 'Uncommon', true, 'Your STR is 19 while you wear them.', 'Перчатки силы огра', 'СИЛ 19, пока носишь.'],
    ['Amulet of Health', '📿', 'Rare', true, 'Your CON is 19 while you wear it.', 'Амулет здоровья', 'ТЕЛ 19, пока носишь.'],
    ['Headband of Intellect', '👑', 'Uncommon', true, 'Your INT is 19 while you wear it.', 'Обруч интеллекта', 'ИНТ 19, пока носишь.'],
    ['Goggles of Night', '🥽', 'Uncommon', false, 'Darkvision 60 ft (or +60 ft).', 'Очки ночи', 'Тёмное зрение 60 фт.'],
    ['Wand of Magic Missiles', '🪄', 'Uncommon', false, '7 charges: cast Magic Missile (3 darts, 1d4+1 force each). Regains 1d6+1 at dawn.', 'Палочка волшебных стрел', '7 зарядов: Волшебная стрела (3 × 1d4+1).', { roll: '3d4+3' }],
    ['Flame Tongue', '🔥', 'Rare', true, 'Bonus Action: the blade bursts into flame, +2d6 fire damage on hits.', 'Пылающий клинок', 'Бонусным действием клинок вспыхивает: +2d6 огнём при попадании.', { weapon: 'longsword', roll: '2d6' }],
    ['Javelin of Lightning', '⚡', 'Uncommon', false, 'Throw: turns into lightning, 4d6 to everything in a line. Once per dawn.', 'Дротик молнии', 'Брось: молния 4d6 по линии. Раз в день.', { weapon: 'javelin', roll: '4d6' }],
    ['Immovable Rod', '🪄', 'Uncommon', false, 'Press the button: the rod stays fixed in the air (holds 8,000 lb).', 'Недвижимый жезл', 'Нажми кнопку — жезл застывает в воздухе.'],
    ['Driftglobe', '💡', 'Uncommon', false, 'Glowing orb that floats after you.', 'Плывущий шар', 'Светящийся шар следует за тобой.'],
    ['Pearl of Power', '⚪', 'Uncommon', true, 'Once per day, regain one spent spell slot of level 3 or lower.', 'Жемчужина силы', 'Раз в день вернуть одну ячейку до 3 уровня.'],
    ['Sending Stones', '🪨', 'Uncommon', false, 'Pair of stones: send a short message to the other once per day.', 'Камни послания', 'Пара камней: раз в день короткое послание.'],
    ['Rope of Climbing', '🪢', 'Uncommon', false, '60 ft of rope that moves and knots on command.', 'Верёвка лазания', '60 фт верёвки, двигается по команде.']
  ];

  const CAT = D.CATALOG = [];
  Object.keys(D.WEAPONS).forEach(k => { const w = D.WEAPONS[k]; const p = WP[k] || [0, 0];
    CAT.push({ id: 'w:' + k, cat: 'weapon', icon: w.range === 'ranged' ? '🏹' : (w.type === 'slashing' ? '🗡️' : w.type === 'piercing' ? '🔱' : '🔨'), name: w.name, weapon: k, cost: p[0], weight: p[1] }); });
  Object.keys(D.ARMOR).forEach(k => { const a = D.ARMOR[k]; const p = AP[k] || [0, 0];
    CAT.push({ id: 'a:' + k, cat: 'armor', icon: a.type === 'shield' ? '🛡️' : a.type === 'heavy' ? '🦾' : a.type === 'medium' ? '🥋' : '🧥', name: a.name, armor: k, cost: p[0], weight: p[1] }); });
  GR.forEach(g => CAT.push(Object.assign({ id: 'g:' + g[0], cat: g[1], icon: g[2], name: g[0], cost: g[3], weight: g[4], desc: g[5], ru: [g[6], g[7]] }, g[8] || {})));
  MG.forEach(m => CAT.push(Object.assign({ id: 'm:' + m[0], cat: 'magic', icon: m[1], name: m[0], rarity: m[2], requiresAttunement: m[3], desc: m[4], ru: [m[5], m[6]], cost: D.RARITY_PRICE[m[2]] }, m[7] || {})));
  // the homebrew library (data/homebrew.js) is part of the catalog too
  (D.HOMEBREW_ITEMS || []).forEach(h => CAT.push(Object.assign({ id: 'h:' + h.name, cat: h.roll && h.heal ? 'consumable' : 'magic', icon: h.weapon ? '🗡️' : h.heal ? '🧪' : '✨', cost: h.cost || D.RARITY_PRICE[String(h.rarity || '').split(' ')[0]] || 100 }, h)));
  // the same name twice (e.g. Potion of Healing in gear and homebrew) → keep the first
  const seen = {}; D.CATALOG = CAT.filter(e => { if (seen[e.name]) return false; seen[e.name] = 1; return true; });
  D.catalogById = id => D.CATALOG.find(e => e.id === id);
  D.catalogByName = n => D.CATALOG.find(e => e.name === n || e.en === n);

  (D.AFTER_LANG = D.AFTER_LANG || []).push(function (lang) {
    D.CATALOG.forEach(e => {
      e.descEn = e.descEn || e.desc || '';
      e.en = e.en || (e.weapon && !e.rarity ? D.WEAPONS[e.weapon].en : e.armor && !e.rarity ? D.ARMOR[e.armor].en : e.name);
      if (lang === 'ru') {
        if (Array.isArray(e.ru)) { D.RU[e.en] = e.ru[0]; e.name = e.ru[0]; e.desc = e.ru[1]; }
        else if (e.weapon && !e.rarity) e.name = D.WEAPONS[e.weapon].name;
        else if (e.armor && !e.rarity) e.name = D.ARMOR[e.armor].name;
        else e.name = D.t(e.en);
        const hb = e.id.indexOf('h:') === 0 && (D.HOMEBREW_ITEMS || []).find(x => x.name === e.en);
        if (hb && hb.desc) e.desc = hb.desc;
      }
    });
    Object.values(D.ITEM_CATS).forEach(c => { c.en = c.en || c.name; if (lang === 'ru') c.name = c.ru; });
  });
})(window.DND);
