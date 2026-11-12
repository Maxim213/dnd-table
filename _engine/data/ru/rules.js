// Russian layer for rules.js. Laid on top of the English data when the language is Russian.
// Keys stay English (saves store them); here only text the player sees.
window.DND_RU = window.DND_RU || {};
(function (D) {
  D.RU = D.RU || {};

  D.ABIL = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  D.ABIL_NAME = { STR: 'Сила', DEX: 'Ловкость', CON: 'Телосложение', INT: 'Интеллект', WIS: 'Мудрость', CHA: 'Харизма' };
  D.AB = { STR: 'СИЛ', DEX: 'ЛОВ', CON: 'ТЕЛ', INT: 'ИНТ', WIS: 'МДР', CHA: 'ХАР' }; // короткие названия для экрана
  D.ABIL_HELP = {
    STR: 'Мышцы: тяжёлое оружие, лазание, захваты',
    DEX: 'Ловкость: меткость, скрытность, реакция, КД в лёгком доспехе',
    CON: 'Выносливость: больше хитов, удержание концентрации',
    INT: 'Знания и логика. Магия волшебника',
    WIS: 'Внимательность и сила воли. Жрец, друид, следопыт, монах',
    CHA: 'Обаяние и напор. Бард, паладин, чародей, колдун'
  };

  D.SKILLS = {
    'Acrobatics': 'DEX', 'Animal Handling': 'WIS', 'Arcana': 'INT', 'Athletics': 'STR',
    'Deception': 'CHA', 'History': 'INT', 'Insight': 'WIS', 'Intimidation': 'CHA',
    'Investigation': 'INT', 'Medicine': 'WIS', 'Nature': 'INT', 'Perception': 'WIS',
    'Performance': 'CHA', 'Persuasion': 'CHA', 'Religion': 'INT', 'Sleight of Hand': 'DEX',
    'Stealth': 'DEX', 'Survival': 'WIS'
  };
  D.ALL_SKILLS = Object.keys(D.SKILLS);
  Object.assign(D.RU, {
    'Acrobatics': 'Акробатика', 'Animal Handling': 'Уход за животными', 'Arcana': 'Магия', 'Athletics': 'Атлетика',
    'Deception': 'Обман', 'History': 'История', 'Insight': 'Проницательность', 'Intimidation': 'Запугивание',
    'Investigation': 'Анализ', 'Medicine': 'Медицина', 'Nature': 'Природа', 'Perception': 'Внимательность',
    'Performance': 'Выступление', 'Persuasion': 'Убеждение', 'Religion': 'Религия', 'Sleight of Hand': 'Ловкость рук',
    'Stealth': 'Скрытность', 'Survival': 'Выживание'
  });

  D.pb = lvl => 2 + Math.floor((lvl - 1) / 4);
  D.MAX_LEVEL = 20; // уровни 1–20 (данные для 4–20 — в levels.js)

  D.POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  D.POINT_TOTAL = 27;
  D.STANDARD = [15, 14, 13, 12, 10, 8];

  // Ячейки заклинаний по уровню персонажа (индекс 0 = уровень 1).
  D.SLOTS = {
    full: [[2], [3], [4, 2]],
    half: [[2], [2], [3]],
  };
  // Магия договора колдуна: {count, level}
  D.PACT = [{ count: 1, level: 1 }, { count: 2, level: 1 }, { count: 2, level: 2 }];

  // Состояния. Ключ — английский (так хранится), текст — русский.
  D.CONDITIONS = {
    'Blinded': 'Ничего не видит. Его атаки — с помехой, атаки по нему — с преимуществом.',
    'Charmed': 'Не может атаковать того, кто очаровал. Тот получает преимущество в общении с ним.',
    'Deafened': 'Ничего не слышит.',
    'Exhaustion': 'Каждый уровень: −2 ко всем броскам d20, −5 фт скорости. 6 уровень = смерть. Долгий отдых снимает 1.',
    'Frightened': 'Помеха на проверки и атаки, пока видит источник страха. Не может подойти к нему ближе.',
    'Grappled': 'Скорость 0. Помеха на атаки по всем, кроме того, кто схватил.',
    'Incapacitated': 'Не может совершать действия, бонусные действия и реакции. Концентрация прерывается.',
    'Invisible': 'Его атаки — с преимуществом, атаки по нему — с помехой.',
    'Paralyzed': 'Недееспособен, скорость 0. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом; попадание вблизи (5 фт) — критическое.',
    'Poisoned': 'Помеха на броски атаки и проверки характеристик.',
    'Prone': 'Может только ползти. Его атаки с помехой. Атаки вблизи (5 фт) по нему — с преимуществом, издалека — с помехой.',
    'Restrained': 'Скорость 0. Его атаки и спасброски ЛОВ с помехой; атаки по нему с преимуществом.',
    'Stunned': 'Недееспособен. Проваливает спасброски СИЛ и ЛОВ. Атаки по нему с преимуществом.',
    'Unconscious': 'Недееспособен, лежит, роняет всё из рук. Проваливает спасброски СИЛ и ЛОВ. Попадания вблизи — критические.',
    'Concentrating': '(напоминание) Получил урон → спасбросок ТЕЛ, СЛ 10 или половина урона (макс. 30).',
    'Raging': '(напоминание) Ярость варвара активна.',
    'Hidden': '(напоминание) Враги не знают, где он.'
  };
  Object.assign(D.RU, {
    'Blinded': 'Ослеплён', 'Charmed': 'Очарован', 'Deafened': 'Оглох', 'Exhaustion': 'Истощение', 'Frightened': 'Испуган',
    'Grappled': 'Схвачен', 'Incapacitated': 'Недееспособен', 'Invisible': 'Невидим', 'Paralyzed': 'Парализован',
    'Poisoned': 'Отравлен', 'Prone': 'Лежит (сбит с ног)', 'Restrained': 'Опутан', 'Stunned': 'Ошеломлён',
    'Unconscious': 'Без сознания', 'Concentrating': 'Концентрируется', 'Raging': 'В ярости', 'Hidden': 'Спрятался'
  });

  // Приёмы оружия (Weapon Mastery)
  D.MASTERIES = {
    Cleave: 'Попал → можешь атаковать ещё одно существо в 5 фт от цели (без модификатора характеристики к урону). Раз в ход.',
    Graze: 'Промах → цель всё равно получает урон, равный твоему модификатору характеристики.',
    Nick: 'Дополнительная атака лёгким оружием входит в действие Атака (не тратит бонусное действие). Раз в ход.',
    Push: 'Попал → толкаешь цель (Большую или меньше) на 10 фт от себя.',
    Sap: 'Попал → у цели помеха на её следующий бросок атаки до начала твоего хода.',
    Slow: 'Попал и нанёс урон → скорость цели −10 фт до начала твоего следующего хода.',
    Topple: 'Попал → цель делает спасбросок ТЕЛ (СЛ 8 + модификатор + бонус мастерства) или падает (Лежит).',
    Vex: 'Попал и нанёс урон → у тебя преимущество на следующую атаку по этой цели до конца твоего следующего хода.'
  };
  Object.assign(D.RU, {
    Cleave: 'Рассечение', Graze: 'Задевание', Nick: 'Подрез', Push: 'Толчок', Sap: 'Ослабление', Slow: 'Замедление', Topple: 'Опрокидывание', Vex: 'Раздражение'
  });

  // Типы урона и свойства оружия (для экрана)
  Object.assign(D.RU, {
    slashing: 'рубящий', piercing: 'колющий', bludgeoning: 'дробящий', fire: 'огонь', cold: 'холод', lightning: 'молния',
    thunder: 'звук', poison: 'яд', acid: 'кислота', necrotic: 'некротический', radiant: 'излучение', force: 'силовой', psychic: 'психический',
    simple: 'простое', martial: 'воинское', light: 'лёгкий', medium: 'средний', heavy: 'тяжёлый', shield: 'щит',
    long: 'долгий отдых', short: 'короткий отдых', short1: 'короткий отдых (1)'
  });
  const PROP = { 'Finesse': 'Фехтовальное', 'Light': 'Лёгкое', 'Thrown': 'Метательное', 'Two-Handed': 'Двуручное', 'Versatile': 'Универсальное',
    'Heavy': 'Тяжёлое', 'Reach': 'Досягаемость', 'Ammunition': 'Боеприпасы', 'Loading': 'Перезарядка', 'unless mounted': 'если не верхом' };
  D.tProp = p => String(p).replace(/Two-Handed|unless mounted|[A-Z][a-z]+/g, w => PROP[w] || w);

  // Оружие. range: melee|ranged. props — ключи (англ.), на экран идут через D.tProp.
  D.WEAPONS = {
    club: { name: 'Дубинка', cat: 'simple', range: 'melee', dmg: '1d4', type: 'bludgeoning', props: ['Light'], mastery: 'Slow' },
    dagger: { name: 'Кинжал', cat: 'simple', range: 'melee', dmg: '1d4', type: 'piercing', props: ['Finesse', 'Light', 'Thrown (20/60)'], mastery: 'Nick', thrown: true },
    greatclub: { name: 'Палица', cat: 'simple', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: ['Two-Handed'], mastery: 'Push' },
    handaxe: { name: 'Ручной топор', cat: 'simple', range: 'melee', dmg: '1d6', type: 'slashing', props: ['Light', 'Thrown (20/60)'], mastery: 'Vex', thrown: true },
    javelin: { name: 'Метательное копьё', cat: 'simple', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Thrown (30/120)'], mastery: 'Slow', thrown: true },
    lighthammer: { name: 'Лёгкий молот', cat: 'simple', range: 'melee', dmg: '1d4', type: 'bludgeoning', props: ['Light', 'Thrown (20/60)'], mastery: 'Nick', thrown: true },
    mace: { name: 'Булава', cat: 'simple', range: 'melee', dmg: '1d6', type: 'bludgeoning', props: [], mastery: 'Sap' },
    quarterstaff: { name: 'Боевой посох', cat: 'simple', range: 'melee', dmg: '1d6', type: 'bludgeoning', props: ['Versatile (1d8)'], mastery: 'Topple', versatile: '1d8' },
    sickle: { name: 'Серп', cat: 'simple', range: 'melee', dmg: '1d4', type: 'slashing', props: ['Light'], mastery: 'Nick' },
    spear: { name: 'Копьё', cat: 'simple', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Thrown (20/60)', 'Versatile (1d8)'], mastery: 'Sap', thrown: true, versatile: '1d8' },
    dart: { name: 'Дротик', cat: 'simple', range: 'ranged', dmg: '1d4', type: 'piercing', props: ['Finesse', 'Thrown (20/60)'], mastery: 'Vex', thrown: true },
    lightcrossbow: { name: 'Лёгкий арбалет', cat: 'simple', range: 'ranged', dmg: '1d8', type: 'piercing', props: ['Ammunition (80/320)', 'Loading', 'Two-Handed'], mastery: 'Slow' },
    shortbow: { name: 'Короткий лук', cat: 'simple', range: 'ranged', dmg: '1d6', type: 'piercing', props: ['Ammunition (80/320)', 'Two-Handed'], mastery: 'Vex' },
    sling: { name: 'Праща', cat: 'simple', range: 'ranged', dmg: '1d4', type: 'bludgeoning', props: ['Ammunition (30/120)'], mastery: 'Slow' },
    battleaxe: { name: 'Боевой топор', cat: 'martial', range: 'melee', dmg: '1d8', type: 'slashing', props: ['Versatile (1d10)'], mastery: 'Topple', versatile: '1d10' },
    flail: { name: 'Цеп', cat: 'martial', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: [], mastery: 'Sap' },
    glaive: { name: 'Глефа', cat: 'martial', range: 'melee', dmg: '1d10', type: 'slashing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Graze' },
    greataxe: { name: 'Секира', cat: 'martial', range: 'melee', dmg: '1d12', type: 'slashing', props: ['Heavy', 'Two-Handed'], mastery: 'Cleave' },
    greatsword: { name: 'Двуручный меч', cat: 'martial', range: 'melee', dmg: '2d6', type: 'slashing', props: ['Heavy', 'Two-Handed'], mastery: 'Graze' },
    halberd: { name: 'Алебарда', cat: 'martial', range: 'melee', dmg: '1d10', type: 'slashing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Cleave' },
    lance: { name: 'Рыцарское копьё', cat: 'martial', range: 'melee', dmg: '1d10', type: 'piercing', props: ['Heavy', 'Reach', 'Two-Handed (unless mounted)'], mastery: 'Topple' },
    longsword: { name: 'Длинный меч', cat: 'martial', range: 'melee', dmg: '1d8', type: 'slashing', props: ['Versatile (1d10)'], mastery: 'Sap', versatile: '1d10' },
    maul: { name: 'Молот', cat: 'martial', range: 'melee', dmg: '2d6', type: 'bludgeoning', props: ['Heavy', 'Two-Handed'], mastery: 'Topple' },
    morningstar: { name: 'Моргенштерн', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: [], mastery: 'Sap' },
    pike: { name: 'Пика', cat: 'martial', range: 'melee', dmg: '1d10', type: 'piercing', props: ['Heavy', 'Reach', 'Two-Handed'], mastery: 'Push' },
    rapier: { name: 'Рапира', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Finesse'], mastery: 'Vex' },
    scimitar: { name: 'Скимитар', cat: 'martial', range: 'melee', dmg: '1d6', type: 'slashing', props: ['Finesse', 'Light'], mastery: 'Nick' },
    shortsword: { name: 'Короткий меч', cat: 'martial', range: 'melee', dmg: '1d6', type: 'piercing', props: ['Finesse', 'Light'], mastery: 'Vex' },
    trident: { name: 'Трезубец', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Thrown (20/60)', 'Versatile (1d10)'], mastery: 'Topple', thrown: true, versatile: '1d10' },
    warhammer: { name: 'Боевой молот', cat: 'martial', range: 'melee', dmg: '1d8', type: 'bludgeoning', props: ['Versatile (1d10)'], mastery: 'Push', versatile: '1d10' },
    warpick: { name: 'Боевая кирка', cat: 'martial', range: 'melee', dmg: '1d8', type: 'piercing', props: ['Versatile (1d10)'], mastery: 'Sap', versatile: '1d10' },
    whip: { name: 'Кнут', cat: 'martial', range: 'melee', dmg: '1d4', type: 'slashing', props: ['Finesse', 'Reach'], mastery: 'Slow' },
    blowgun: { name: 'Духовая трубка', cat: 'martial', range: 'ranged', dmg: '1', type: 'piercing', props: ['Ammunition (25/100)', 'Loading'], mastery: 'Vex' },
    handcrossbow: { name: 'Ручной арбалет', cat: 'martial', range: 'ranged', dmg: '1d6', type: 'piercing', props: ['Ammunition (30/120)', 'Light', 'Loading'], mastery: 'Vex' },
    heavycrossbow: { name: 'Тяжёлый арбалет', cat: 'martial', range: 'ranged', dmg: '1d10', type: 'piercing', props: ['Ammunition (100/400)', 'Heavy', 'Loading', 'Two-Handed'], mastery: 'Push' },
    longbow: { name: 'Длинный лук', cat: 'martial', range: 'ranged', dmg: '1d8', type: 'piercing', props: ['Ammunition (150/600)', 'Heavy', 'Two-Handed'], mastery: 'Slow' }
  };

  // Доспехи. dexMax: null = вся ЛОВ, 2 = максимум +2, 0 = без ЛОВ.
  D.ARMOR = {
    padded: { name: 'Стёганый доспех', type: 'light', base: 11, dexMax: null, stealthDis: true },
    leather: { name: 'Кожаный доспех', type: 'light', base: 11, dexMax: null },
    studded: { name: 'Проклёпанная кожа', type: 'light', base: 12, dexMax: null },
    hide: { name: 'Шкурный доспех', type: 'medium', base: 12, dexMax: 2 },
    chainshirt: { name: 'Кольчужная рубаха', type: 'medium', base: 13, dexMax: 2 },
    scale: { name: 'Чешуйчатый доспех', type: 'medium', base: 14, dexMax: 2, stealthDis: true },
    breastplate: { name: 'Кираса', type: 'medium', base: 14, dexMax: 2 },
    halfplate: { name: 'Полулаты', type: 'medium', base: 15, dexMax: 2, stealthDis: true },
    ringmail: { name: 'Колечный доспех', type: 'heavy', base: 14, dexMax: 0, stealthDis: true },
    chainmail: { name: 'Кольчуга', type: 'heavy', base: 16, dexMax: 0, stealthDis: true, str: 13 },
    splint: { name: 'Наборный доспех', type: 'heavy', base: 17, dexMax: 0, stealthDis: true, str: 15 },
    plate: { name: 'Латы', type: 'heavy', base: 18, dexMax: 0, stealthDis: true, str: 15 },
    shield: { name: 'Щит', type: 'shield', base: 2 }
  };

  D.FIGHTING_STYLES = {
    archery: { name: 'Стрельба', desc: '+2 к броскам атаки дальнобойным оружием.' },
    defense: { name: 'Оборона', desc: '+1 к КД, пока носишь лёгкий, средний или тяжёлый доспех.' },
    dueling: { name: 'Дуэлянт', desc: '+2 к урону оружием ближнего боя в одной руке (без второго оружия).' },
    gwf: { name: 'Сражение большим оружием', desc: 'С двуручным или универсальным оружием в двух руках: выпавшие 1 и 2 на костях урона считаются как 3.' },
    protection: { name: 'Защита', desc: 'Реакция (со щитом): атака по союзнику в 5 фт от тебя делается с помехой.' },
    twf: { name: 'Бой двумя оружиями', desc: 'Добавляешь модификатор характеристики к урону дополнительной атаки лёгким оружием.' },
    thrown: { name: 'Бой метательным оружием', desc: '+2 к урону метательным оружием при броске. Достаёшь его прямо во время атаки.' },
    blind: { name: 'Слепой бой', desc: 'Слепое зрение 10 фт.' },
    interception: { name: 'Перехват', desc: 'Реакция: уменьшить урон союзнику в 5 фт на 1d10 + бонус мастерства (нужен щит или оружие).' },
    unarmed: { name: 'Безоружный бой', desc: 'Безоружный удар: 1d6 + СИЛ (1d8, если обе руки свободны). Схваченный тобой враг получает 1d4 в начале твоего хода.' }
  };

  // Черты происхождения (дают предыстории; человек получает ещё одну).
  D.FEATS = {
    alert: { name: 'Бдительный', desc: 'Добавляешь бонус мастерства к инициативе. Можешь поменяться инициативой с согласным союзником.' },
    crafter: { name: 'Ремесленник', desc: 'Владение 3 инструментами ремесленника, скидка 20% на немагические предметы, создаёшь вещи быстрее.' },
    healer: { name: 'Лекарь', desc: 'Набором целителя позволяешь существу потратить кость хитов и вылечиться (+бонус мастерства). Перебрасываешь единицы на костях лечения.' },
    lucky: { name: 'Везунчик', desc: 'Очки удачи = бонус мастерства на долгий отдых. Потрать одно: преимущество на свой бросок d20 или помеха атакующему тебя.', uses: { max: 'PB', reset: 'long' } },
    magicinitiate: { name: 'Посвящённый в магию', desc: 'Учишь 2 заговора и 1 заклинание 1 уровня из списка жреца, друида или волшебника. Это заклинание можно раз в долгий отдых сотворить бесплатно (или ячейками).' },
    musician: { name: 'Музыкант', desc: 'Владение 3 инструментами. После отдыха играешь песню: даёшь героическое вдохновение союзникам (до бонуса мастерства).' },
    savage: { name: 'Свирепый атакующий', desc: 'Раз в ход, попав оружием, бросаешь кости урона дважды и выбираешь любой результат.' },
    skilled: { name: 'Одарённый', desc: 'Владение любыми 3 навыками или инструментами.' },
    tavern: { name: 'Трактирный драчун', desc: 'Безоружный удар: 1d4 + СИЛ. Перебрасываешь единицы на этом уроне. Раз в ход: толкаешь на 5 фт при попадании. Владеешь импровизированным оружием.' },
    tough: { name: 'Крепкий', desc: '+2 хита за каждый уровень.' }
  };


  // Эффекты для своих умений и магических предметов.
  D.EFFECT_TYPES = {
    ac: 'КД +',
    attack: 'Бросок атаки (попадание) +',
    damage: 'Урон +',
    damageMult: 'Урон × (множитель)',
    speed: 'Скорость + (фт)',
    hpMax: 'Макс. хиты +',
    initiative: 'Инициатива +',
    save: 'Все спасброски +',
    skills: 'Все проверки навыков +',
    ability: 'Характеристика +',
    spellDC: 'СЛ заклинаний +',
    spellAttack: 'Атака заклинанием +'
  };
  D.EFFECT_SCOPES = { all: 'на всё', melee: 'только ближний бой', ranged: 'только дальний бой', spell: 'только заклинания' };
})(window.DND_RU);
(function (D) {
  // gear names (stored in English, shown in Russian)
  Object.assign(D.RU, {
    'Backpack': 'Рюкзак', 'Bedroll': 'Спальник', 'Rope (50 ft)': 'Верёвка (50 фт)', 'Torch': 'Факел', 'Tinderbox': 'Трутница',
    'Rations (1 day)': 'Рационы (1 день)', 'Waterskin': 'Бурдюк', 'Crowbar': 'Ломик', 'Hammer': 'Молоток', 'Pitons': 'Крюки',
    'Lantern': 'Фонарь', 'Oil flask': 'Фляга масла', 'Healer\'s Kit': 'Набор целителя', 'Thieves\' Tools': 'Воровские инструменты',
    'Holy Symbol': 'Священный символ', 'Arcane Focus': 'Магическая фокусировка', 'Druidic Focus': 'Друидическая фокусировка',
    'Spellbook': 'Книга заклинаний', 'Musical Instrument': 'Музыкальный инструмент', 'Quiver': 'Колчан', 'Arrows (20)': 'Стрелы (20)',
    'Bolts (20)': 'Болты (20)', 'Explorer\'s Pack': 'Набор путешественника', 'Dungeoneer\'s Pack': 'Набор исследователя подземелий',
    'Priest\'s Pack': 'Набор священника', 'Scholar\'s Pack': 'Набор учёного', 'Burglar\'s Pack': 'Набор взломщика',
    'Entertainer\'s Pack': 'Набор артиста', 'Herbalism Kit': 'Набор травника', 'Potion of Healing': 'Зелье лечения'
  });
})(window.DND_RU);
