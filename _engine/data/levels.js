// Levels 1-20: experience, spell slot tables, features for levels 4-20, feats for Ability Score Improvements.
// Loads AFTER classes.js and only ADDS to it (new features go at the end of each list).
// Text is written in both languages: ru: ['Название', 'Описание'] (the app picks the language).
// 2024 rules (SRD 5.2), short summaries in our own words.
window.DND = window.DND || {};
(function (D) {
  D.MAX_LEVEL = 20;
  // XP needed to REACH each level (index 0 = level 1)
  D.XP_LEVELS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  D.levelForXp = xp => { let l = 1; D.XP_LEVELS.forEach((v, i) => { if (xp >= v) l = i + 1; }); return l; };

  D.SLOTS = {
    full: [[2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2],
      [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
      [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]],
    half: [[2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
      [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]]
  };
  D.PACT = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4].map((count, i) => ({ count, level: Math.min(5, [1, 1, 2, 2, 3, 3, 4, 4, 5][i] || 5) }));

  const tier = (lvl, steps) => { let v = steps[0][1]; steps.forEach(s => { if (lvl >= s[0]) v = s[1]; }); return v; };
  D.tier = tier;
  const CAST = {
    bard: { cantrips: [[1, 2], [4, 3], [10, 4]], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    cleric: { cantrips: [[1, 3], [4, 4], [10, 5]], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    druid: { cantrips: [[1, 2], [4, 3], [10, 4]], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    paladin: { cantrips: [[1, 0]], prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15] },
    ranger: { cantrips: [[1, 0]], prepared: [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15] },
    sorcerer: { cantrips: [[1, 4], [4, 5], [10, 6]], prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22] },
    warlock: { cantrips: [[1, 2], [4, 3], [10, 4]], prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15] },
    wizard: { cantrips: [[1, 3], [4, 4], [10, 5]], prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25] }
  };
  Object.keys(CAST).forEach(k => {
    const cs = D.CLASSES[k].casting;
    cs.cantrips = Array.from({ length: 20 }, (_, i) => tier(i + 1, CAST[k].cantrips));
    cs.prepared = CAST[k].prepared;
  });
  D.CLASSES.warlock.invocations = [1, 3, 3, 3, 5, 5, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10];
  D.METAMAGIC_COUNT = lvl => (lvl >= 17 ? 6 : lvl >= 10 ? 4 : lvl >= 2 ? 2 : 0);
  D.CLASSES.bard.expertise = { 2: 2, 9: 2 };
  D.CLASSES.rogue.expertise = { 1: 2, 6: 2 };
  D.CLASSES.ranger.expertise = { 2: 1, 9: 2 };

  // levels that give an Ability Score Improvement (or a feat). 19 = Epic Boon.
  Object.values(D.CLASSES).forEach(C => { C.asi = [4, 8, 12, 16, 19]; });
  D.CLASSES.fighter.asi = [4, 6, 8, 12, 14, 16, 19];
  D.CLASSES.rogue.asi = [4, 8, 10, 12, 16, 19];

  // extra attacks (number of attacks with the Attack action)
  D.CLASSES.fighter.attacks = [[5, 2], [11, 3], [20, 4]];
  ['barbarian', 'monk', 'paladin', 'ranger'].forEach(k => { D.CLASSES[k].attacks = [[5, 2]]; });
  D.attacksOf = (C, lvl) => (C && C.attacks ? tier(lvl, [[1, 1]].concat(C.attacks)) : 1);
  D.monkDie = lvl => tier(lvl, [[1, '1d6'], [5, '1d8'], [11, '1d10'], [17, '1d12']]);
  D.monkSpeed = lvl => tier(lvl, [[2, 10], [6, 15], [10, 20], [14, 25], [18, 30]]);

  // ---------- numbers that grow with level (patch the level 1-3 features) ----------
  // runs after the language layer is laid on top (the Russian file repeats the level 1-3 numbers)
  (D.AFTER_LANG = D.AFTER_LANG || []).push(function () {
  const feat = (cls, name) => D.CLASSES[cls].features.find(f => (f.key || f.name) === name);
  const RAGE = [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6];
  feat('barbarian', 'Rage').uses.max = x => RAGE[x.lvl - 1];
  feat('barbarian', 'Rage').effects = [{ type: 'damage', value: x => tier(x.lvl, [[1, 2], [9, 3], [16, 4]]), scope: 'melee' }];
  const bi = feat('bard', 'Bardic Inspiration');
  bi.roll = x => tier(x.lvl, [[1, '1d6'], [5, '1d8'], [10, '1d10'], [15, '1d12']]);
  bi.uses.reset = x => (x.lvl >= 5 ? 'short' : 'long');
  feat('cleric', 'Channel Divinity').uses.max = x => tier(x.lvl, [[1, 2], [6, 3], [18, 4]]);
  feat('druid', 'Wild Shape').uses.max = x => tier(x.lvl, [[1, 2], [6, 3], [17, 4]]);
  feat('fighter', 'Second Wind').uses.max = x => tier(x.lvl, [[1, 2], [4, 3], [10, 4]]);
  feat('fighter', 'Action Surge').uses.max = x => (x.lvl >= 17 ? 2 : 1);
  feat('monk', 'Uncanny Metabolism').roll = x => D.monkDie(x.lvl) + '+' + x.lvl;
  feat('paladin', 'Channel Divinity').uses.max = x => (x.lvl >= 11 ? 3 : 2);
  feat('ranger', 'Favored Enemy').uses.max = x => tier(x.lvl, [[1, 2], [5, 3], [9, 4], [13, 5], [17, 6]]);
  });

  // ---------- features for levels 4-20 ----------
  // F(level, English name, English text, Russian name, Russian text, extra fields)
  const F = (lvl, name, desc, rn, rd, x) => Object.assign({ lvl, name, desc, ru: [rn, rd] }, x || {});
  const ADD = {
    barbarian: [
      F(5, 'Extra Attack', 'Attack twice when you take the Attack action (auto-applied).', 'Дополнительная атака', 'Две атаки за действие «Атака» (считается само).'),
      F(5, 'Fast Movement', '+10 ft Speed while not wearing Heavy armor (auto-applied).', 'Быстрое передвижение', '+10 фт скорости без тяжёлого доспеха (считается само).'),
      F(7, 'Feral Instinct', 'Advantage on Initiative rolls.', 'Дикий инстинкт', 'Преимущество на броски инициативы.'),
      F(7, 'Instinctive Pounce', 'When you enter Rage, move up to half your Speed.', 'Инстинктивный рывок', 'Входя в ярость, можешь пройти до половины скорости.'),
      F(9, 'Brutal Strike', 'Instead of Reckless Attack Advantage on one attack: if it hits, +1d10 damage and push 15 ft or slow the target.', 'Жестокий удар', 'Откажись от преимущества Безрассудной атаки на одну атаку: при попадании +1d10 урона и толчок на 15 фт или замедление цели.', { roll: '1d10', dmgx: true }),
      F(11, 'Relentless Rage', 'When you drop to 0 HP while raging: CON save DC 10 (+5 each time) to stay at HP = twice your level.', 'Неутомимая ярость', 'Если в ярости падаешь до 0 хитов: спасбросок ТЕЛ СЛ 10 (+5 каждый раз), при успехе хиты = 2 × уровень.'),
      F(13, 'Improved Brutal Strike', 'New Brutal Strike effects: Staggering Blow and Sundering Blow.', 'Улучшенный жестокий удар', 'Новые эффекты Жестокого удара: Ошеломляющий и Раскалывающий удар.'),
      F(15, 'Persistent Rage', 'Rage lasts 10 minutes without upkeep. Once per Long Rest, regain all Rage uses when you roll Initiative.', 'Непрерывная ярость', 'Ярость длится 10 минут без поддержки. Раз за длинный отдых при броске инициативы восстанавливаешь все ярости.'),
      F(17, 'Improved Brutal Strike II', 'Brutal Strike deals 2d10 and you can use two effects.', 'Улучшенный жестокий удар II', 'Жестокий удар наносит 2d10, можно выбрать два эффекта.'),
      F(18, 'Indomitable Might', 'A STR check or save lower than your STR score uses your STR score instead.', 'Неукротимая мощь', 'Если проверка или спасбросок СИЛ меньше значения Силы — берёшь значение Силы.'),
      F(20, 'Primal Champion', 'STR and CON +4 (max 25) (auto-applied).', 'Первобытный чемпион', 'СИЛ и ТЕЛ +4 (максимум 25) (считается само).', { effects: [{ type: 'ability', ability: 'STR', value: 4 }, { type: 'ability', ability: 'CON', value: 4 }] })
    ],
    bard: [
      F(5, 'Font of Inspiration', 'Bardic Inspiration comes back on a Short Rest too. Spend a spell slot to regain one use.', 'Источник вдохновения', 'Вдохновение барда восстанавливается и после короткого отдыха. Можно потратить ячейку, чтобы вернуть одно.'),
      F(7, 'Countercharm', 'Reaction: an ally within 30 ft rerolls a failed save against Charmed or Frightened with Advantage.', 'Контрочарование', 'Реакция: союзник в 30 фт перебрасывает проваленный спасбросок от очарования или испуга с преимуществом.'),
      F(10, 'Magical Secrets', 'You can prepare spells from the Bard, Cleric, Druid and Wizard lists.', 'Тайны магии', 'Можешь готовить заклинания из списков барда, жреца, друида и волшебника.'),
      F(18, 'Superior Inspiration', 'When you roll Initiative, regain Bardic Inspiration up to 2 uses.', 'Превосходное вдохновение', 'При броске инициативы восстанавливаешь вдохновение минимум до 2.'),
      F(20, 'Words of Creation', 'Power Word Heal and Power Word Kill are always prepared; each can target a second creature.', 'Слова творения', 'Слово силы: исцеление и Слово силы: смерть всегда подготовлены, можно выбрать вторую цель.')
    ],
    cleric: [
      F(5, 'Sear Undead', 'When you Turn Undead, each undead that fails takes radiant damage = WIS mod d8.', 'Испепеление нежити', 'При Изгнании нежити каждая провалившая нежить получает урон излучением: d8 × мод. МДР.'),
      F(7, 'Blessed Strikes', 'Once per turn: +1d8 radiant on a weapon hit, or add WIS to a cantrip\'s damage.', 'Благословенные удары', 'Раз в ход: +1d8 излучением при попадании оружием, или +МДР к урону заговора.', { roll: '1d8', dmgx: true }),
      F(10, 'Divine Intervention', 'Magic action: cast any Cleric spell of level 5 or lower without a slot. Once per Long Rest.', 'Божественное вмешательство', 'Действие Магия: сотвори любое заклинание жреца до 5 уровня без ячейки. Раз за длинный отдых.', { uses: { max: 1, reset: 'long' } }),
      F(14, 'Improved Blessed Strikes', 'Blessed Strikes deal 2d8 (or give 5 × WIS temp HP with a cantrip).', 'Улучшенные благословенные удары', 'Благословенные удары наносят 2d8.', { roll: '2d8', dmgx: true }),
      F(20, 'Greater Divine Intervention', 'Divine Intervention can cast Wish. After that, wait 2d4 Long Rests.', 'Великое божественное вмешательство', 'Божественное вмешательство может сотворить Исполнение желаний. Потом ждёшь 2d4 длинных отдыха.')
    ],
    druid: [
      F(4, 'Wild Shape Improvement', 'Wild Shape: beasts up to CR 1/2, swimming allowed.', 'Улучшение облика зверя', 'Дикий облик: звери до ПО 1/2, можно плавать.'),
      F(5, 'Wild Resurgence', 'No Wild Shape left? Spend a spell slot for one. Once per Long Rest, spend a Wild Shape use for a level 1 slot.', 'Дикое возрождение', 'Нет Дикого облика? Потрать ячейку. Раз за длинный отдых: потрать облик и получи ячейку 1 уровня.'),
      F(7, 'Elemental Fury', 'Choose: +1d8 cold/fire/lightning/thunder on weapon hits once per turn, or add WIS to cantrip damage.', 'Ярость стихий', 'Выбери: +1d8 урона стихией при попадании оружием раз в ход, или +МДР к урону заговоров.', { roll: '1d8', dmgx: true }),
      F(8, 'Wild Shape: Flying', 'Wild Shape: beasts up to CR 1, flying allowed.', 'Облик зверя: полёт', 'Дикий облик: звери до ПО 1, можно летать.'),
      F(15, 'Improved Elemental Fury', 'Elemental Fury: 2d8, or +300 ft range on cantrips.', 'Улучшенная ярость стихий', 'Ярость стихий: 2d8.', { roll: '2d8', dmgx: true }),
      F(18, 'Beast Spells', 'Cast spells while in Wild Shape.', 'Звериная магия', 'Можешь колдовать в Диком облике.'),
      F(20, 'Archdruid', 'Regain a Wild Shape use on Initiative if you have none. Turn Wild Shape uses into spell slots. Age slowly.', 'Архидруид', 'При инициативе получаешь Дикий облик, если их нет. Облики можно превращать в ячейки. Почти не стареешь.')
    ],
    fighter: [
      F(5, 'Extra Attack', 'Attack twice with the Attack action (auto-applied).', 'Дополнительная атака', 'Две атаки за действие «Атака» (считается само).'),
      F(5, 'Tactical Shift', 'When you use Second Wind, move up to half your Speed without Opportunity Attacks.', 'Тактический манёвр', 'Используя Второе дыхание, можешь пройти половину скорости без провоцированных атак.'),
      F(9, 'Indomitable', 'Reroll a failed saving throw with a bonus equal to your Fighter level.', 'Несгибаемость', 'Перебрось проваленный спасбросок с бонусом = уровень воина.', { uses: { max: x => (x.lvl >= 17 ? 3 : x.lvl >= 13 ? 2 : 1), reset: 'long' } }),
      F(9, 'Tactical Master', 'Swap a weapon\'s mastery for Push, Sap or Slow on an attack.', 'Мастер тактики', 'При атаке можно заменить приём оружия на Толчок, Ослабление или Замедление.'),
      F(11, 'Two Extra Attacks', 'Attack three times with the Attack action (auto-applied).', 'Две дополнительные атаки', 'Три атаки за действие «Атака» (считается само).'),
      F(13, 'Studied Attacks', 'If you miss a creature, you have Advantage on your next attack against it.', 'Изученные атаки', 'Промахнулся по существу — следующая атака по нему с преимуществом.'),
      F(20, 'Three Extra Attacks', 'Attack four times with the Attack action (auto-applied).', 'Три дополнительные атаки', 'Четыре атаки за действие «Атака» (считается само).')
    ],
    monk: [
      F(4, 'Slow Fall', 'Reaction: reduce falling damage by 5 × Monk level.', 'Медленное падение', 'Реакция: урон от падения меньше на 5 × уровень монаха.'),
      F(5, 'Extra Attack', 'Attack twice with the Attack action (auto-applied).', 'Дополнительная атака', 'Две атаки за действие «Атака» (считается само).'),
      F(5, 'Stunning Strike', 'Once per turn on a hit, spend 1 Focus Point: CON save or Stunned until your next turn (on success: half Speed, next attack vs it has Advantage).', 'Ошеломляющий удар', 'Раз в ход при попадании, 1 очко сосредоточенности: спасбросок ТЕЛ или Ошеломлён до твоего следующего хода.'),
      F(6, 'Empowered Strikes', 'Your Unarmed Strikes can deal force damage.', 'Усиленные удары', 'Безоружные удары могут наносить урон силовым полем.'),
      F(7, 'Evasion', 'DEX save for half damage: take none on a success, half on a failure.', 'Увёртливость', 'Спасбросок ЛОВ на половину урона: при успехе — 0, при провале — половина.'),
      F(9, 'Acrobatic Movement', 'Move along walls and across liquids on your turn.', 'Акробатическое движение', 'В свой ход можешь бегать по стенам и по воде.'),
      F(10, 'Heightened Focus', 'Flurry of Blows makes 3 strikes; Patient Defense and Step of the Wind get better.', 'Обострённое сосредоточение', 'Шквал ударов — 3 удара; Терпеливая защита и Шаг ветра становятся сильнее.'),
      F(10, 'Self-Restoration', 'At the end of your turn, end Charmed, Frightened or Poisoned on yourself. No exhaustion from skipping food.', 'Самовосстановление', 'В конце хода снимаешь с себя очарование, испуг или отравление.'),
      F(13, 'Deflect Energy', 'Deflect Attacks works against any damage type.', 'Отражение энергии', 'Отражение атак работает против любого типа урона.'),
      F(14, 'Disciplined Survivor', 'Proficiency in all saving throws. Spend 1 Focus Point to reroll a failed save.', 'Дисциплинированный выживший', 'Владение всеми спасбросками. 1 очко — перебросить проваленный спасбросок.'),
      F(15, 'Perfect Focus', 'Roll Initiative with 3 or fewer Focus Points → regain up to 4.', 'Идеальное сосредоточение', 'Если при инициативе у тебя 3 очка или меньше — восстанавливаешь до 4.'),
      F(18, 'Superior Defense', 'Spend 3 Focus Points: Resistance to all damage except force for 1 minute.', 'Превосходная защита', '3 очка: сопротивление всему урону, кроме силового поля, на 1 минуту.'),
      F(20, 'Body and Mind', 'DEX and WIS +4 (max 25) (auto-applied).', 'Тело и разум', 'ЛОВ и МДР +4 (максимум 25) (считается само).', { effects: [{ type: 'ability', ability: 'DEX', value: 4 }, { type: 'ability', ability: 'WIS', value: 4 }] })
    ],
    paladin: [
      F(5, 'Extra Attack', 'Attack twice with the Attack action (auto-applied).', 'Дополнительная атака', 'Две атаки за действие «Атака» (считается само).'),
      F(5, 'Faithful Steed', 'Find Steed is always prepared; cast it once per Long Rest without a slot.', 'Верный скакун', 'Призыв скакуна всегда подготовлен, раз за длинный отдых без ячейки.'),
      F(6, 'Aura of Protection', 'You and allies within 10 ft add your CHA mod (min +1) to saving throws (auto-applied to you).', 'Аура защиты', 'Ты и союзники в 10 фт добавляете твой мод. ХАР (мин. +1) к спасброскам (тебе считается само).'),
      F(9, 'Abjure Foes', 'Channel Divinity: up to CHA creatures in 60 ft make a WIS save or are Frightened for 1 minute.', 'Отречение врагов', 'Божественный канал: до ХАР существ в 60 фт — спасбросок МДР или Испуганы на 1 минуту.'),
      F(10, 'Aura of Courage', 'You and allies in your aura can\'t be Frightened.', 'Аура отваги', 'Ты и союзники в ауре не могут быть испуганы.'),
      F(11, 'Radiant Strikes', 'Your melee weapon hits deal +1d8 radiant damage.', 'Сияющие удары', 'Твои попадания оружием ближнего боя наносят +1d8 урона излучением.', { roll: '1d8', dmgx: true }),
      F(14, 'Restoring Touch', 'Lay On Hands can also remove conditions (5 HP from the pool each).', 'Исцеляющее касание', 'Наложение рук может снимать состояния (5 хитов из запаса за каждое).'),
      F(18, 'Aura Expansion', 'Your auras reach 30 ft.', 'Расширение ауры', 'Твои ауры достают до 30 фт.')
    ],
    ranger: [
      F(5, 'Extra Attack', 'Attack twice with the Attack action (auto-applied).', 'Дополнительная атака', 'Две атаки за действие «Атака» (считается само).'),
      F(6, 'Roving', '+10 ft Speed without Heavy armor, plus Climb and Swim Speed (auto-applied).', 'Странник', '+10 фт скорости без тяжёлого доспеха, плюс лазание и плавание (считается само).'),
      F(9, 'Expertise', 'Expertise in two more skills.', 'Компетентность', 'Компетентность ещё в двух навыках.'),
      F(10, 'Tireless', 'Magic action: gain 1d8 + WIS temp HP (WIS times per Long Rest). Short Rests reduce Exhaustion.', 'Неутомимый', 'Действие Магия: 1d8 + МДР временных хитов (МДР раз за длинный отдых).', { roll: '1d8+@WIS', uses: { max: 'WIS', reset: 'long' } }),
      F(13, 'Relentless Hunter', 'Damage can\'t break your Concentration on Hunter\'s Mark.', 'Неотступный охотник', 'Урон не сбивает концентрацию на Метке охотника.'),
      F(14, 'Nature\'s Veil', 'Bonus Action: Invisible until the end of your next turn (WIS times per Long Rest).', 'Покров природы', 'Бонусное действие: невидим до конца следующего хода (МДР раз за длинный отдых).', { uses: { max: 'WIS', reset: 'long' } }),
      F(17, 'Precise Hunter', 'Advantage on attacks against the creature marked by your Hunter\'s Mark.', 'Меткий охотник', 'Преимущество на атаки по цели твоей Метки охотника.'),
      F(18, 'Feral Senses', 'Blindsight 30 ft.', 'Дикие чувства', 'Слепое зрение 30 фт.'),
      F(20, 'Foe Slayer', 'Hunter\'s Mark damage die becomes d10.', 'Убийца врагов', 'Кость урона Метки охотника становится d10.')
    ],
    rogue: [
      F(5, 'Cunning Strike', 'Pay Sneak Attack dice for effects: Poison (1d6), Trip (1d6), Withdraw (1d6).', 'Хитрый удар', 'Потрать кости Скрытой атаки на эффекты: Яд, Подсечка, Отход (по 1d6).'),
      F(5, 'Uncanny Dodge', 'Reaction: halve the damage of an attack that hits you.', 'Невероятное уклонение', 'Реакция: вдвое меньше урона от попавшей атаки.'),
      F(7, 'Evasion', 'DEX save for half damage: take none on a success, half on a failure.', 'Увёртливость', 'Спасбросок ЛОВ на половину урона: при успехе — 0, при провале — половина.'),
      F(7, 'Reliable Talent', 'Any roll under 10 on a skill you are proficient in counts as 10.', 'Надёжный талант', 'Проверка навыка, которым владеешь: всё ниже 10 на кости считается 10.'),
      F(11, 'Improved Cunning Strike', 'Use two Cunning Strike effects at once.', 'Улучшенный хитрый удар', 'Можно два эффекта Хитрого удара сразу.'),
      F(14, 'Devious Strikes', 'New Cunning Strike effects: Daze, Knock Out, Obscure.', 'Коварные удары', 'Новые эффекты: Оглушение, Нокаут, Ослепление.'),
      F(15, 'Slippery Mind', 'Proficiency in WIS and CHA saving throws (auto-applied).', 'Скользкий разум', 'Владение спасбросками МДР и ХАР (считается само).'),
      F(18, 'Elusive', 'Attacks against you never have Advantage unless you are Incapacitated.', 'Неуловимый', 'Атаки по тебе не бывают с преимуществом, если ты не недееспособен.'),
      F(20, 'Stroke of Luck', 'Turn a failed d20 test into a 20. Once per Short Rest.', 'Удача', 'Превращаешь проваленный бросок d20 в 20. Раз за короткий отдых.', { uses: { max: 1, reset: 'short' } })
    ],
    sorcerer: [
      F(5, 'Sorcerous Restoration', 'After a Short Rest, regain Sorcery Points = half your level. Once per Long Rest.', 'Чародейское восстановление', 'После короткого отдыха восстанавливаешь очки чародейства = половина уровня. Раз за длинный отдых.'),
      F(7, 'Sorcery Incarnate', 'Innate Sorcery can be activated with 2 Sorcery Points; use two Metamagic options per spell while it is on.', 'Воплощённое чародейство', 'Врождённое чародейство можно включить за 2 очка; пока оно активно — два метамагических приёма на заклинание.'),
      F(10, 'Metamagic II', 'Learn 2 more Metamagic options.', 'Метамагия II', 'Ещё 2 приёма метамагии.'),
      F(17, 'Metamagic III', 'Learn 2 more Metamagic options.', 'Метамагия III', 'Ещё 2 приёма метамагии.'),
      F(20, 'Arcane Apotheosis', 'While Innate Sorcery is active, one Metamagic per turn costs no points.', 'Магический апофеоз', 'Пока Врождённое чародейство активно, один приём метамагии в ход бесплатно.')
    ],
    warlock: [
      F(9, 'Contact Patron', 'Contact Other Plane always prepared; cast it once per Long Rest without a slot and succeed automatically.', 'Связь с покровителем', 'Связь с иными планами всегда подготовлена, раз за длинный отдых без ячейки и с автоуспехом.'),
      F(11, 'Mystic Arcanum (level 6)', 'Choose one level 6 Warlock spell: cast it once per Long Rest without a slot.', 'Таинственный арканум (6 ур.)', 'Выбери заклинание колдуна 6 уровня: раз за длинный отдых без ячейки.', { uses: { max: 1, reset: 'long' } }),
      F(13, 'Mystic Arcanum (level 7)', 'One level 7 spell once per Long Rest.', 'Таинственный арканум (7 ур.)', 'Одно заклинание 7 уровня раз за длинный отдых.', { uses: { max: 1, reset: 'long' } }),
      F(15, 'Mystic Arcanum (level 8)', 'One level 8 spell once per Long Rest.', 'Таинственный арканум (8 ур.)', 'Одно заклинание 8 уровня раз за длинный отдых.', { uses: { max: 1, reset: 'long' } }),
      F(17, 'Mystic Arcanum (level 9)', 'One level 9 spell once per Long Rest.', 'Таинственный арканум (9 ур.)', 'Одно заклинание 9 уровня раз за длинный отдых.', { uses: { max: 1, reset: 'long' } }),
      F(20, 'Eldritch Master', 'Magical Cunning regains ALL Pact Magic slots.', 'Мастер таинств', 'Магическая хитрость восстанавливает ВСЕ ячейки договора.')
    ],
    wizard: [
      F(5, 'Memorize Spell', 'After a Short Rest, swap one prepared spell for another from your spellbook.', 'Запоминание заклинания', 'После короткого отдыха можешь заменить одно подготовленное заклинание.'),
      F(18, 'Spell Mastery', 'Pick one level 1 and one level 2 spell: cast them at their lowest level without a slot.', 'Мастерство заклинаний', 'Выбери заклинание 1 и 2 уровня: колдуешь их без ячеек.'),
      F(20, 'Signature Spells', 'Two level 3 spells are always prepared; cast each once per Short Rest without a slot.', 'Фирменные заклинания', 'Два заклинания 3 уровня всегда подготовлены, каждое раз за короткий отдых без ячейки.', { uses: { max: 2, reset: 'short' } })
    ]
  };
  // subclass features 6-20
  const SUB = {
    'barbarian.berserker': [
      F(6, 'Mindless Rage', 'Immune to Charmed and Frightened while raging.', 'Бездумная ярость', 'В ярости невосприимчив к очарованию и испугу.'),
      F(10, 'Retaliation', 'Reaction: when a creature within 5 ft damages you, make a melee attack against it.', 'Ответный удар', 'Реакция: если существо в 5 фт ранит тебя — атакуешь его в ответ.'),
      F(14, 'Intimidating Presence', 'Bonus Action: creatures of your choice in 30 ft make a WIS save or are Frightened for 1 minute.', 'Устрашающее присутствие', 'Бонусное действие: выбранные существа в 30 фт — спасбросок МДР или Испуганы на минуту.', { uses: { max: 1, reset: 'long' } })
    ],
    'bard.lore': [
      F(6, 'Magical Discoveries', 'Learn two spells from the Cleric, Druid or Wizard list; they are always prepared.', 'Магические открытия', 'Два заклинания из списков жреца, друида или волшебника, всегда подготовлены.'),
      F(14, 'Peerless Skill', 'When you fail an ability check or attack roll, add a Bardic Inspiration die; the use is spent only if it then succeeds.', 'Непревзойдённое мастерство', 'Провалил проверку или атаку — добавь кость вдохновения; тратится, только если помогло.')
    ],
    'cleric.life': [
      F(6, 'Blessed Healer', 'When you heal another creature with a spell slot, you heal 2 + slot level.', 'Благословенный целитель', 'Лечишь другого заклинанием — сам лечишься на 2 + уровень ячейки.'),
      F(17, 'Supreme Healing', 'Healing dice always roll their maximum.', 'Высшее исцеление', 'Кости лечения всегда выпадают на максимум.')
    ],
    'druid.land': [
      F(6, 'Natural Recovery', 'Cast one Circle spell without a slot once per Long Rest; recover slots on a Short Rest.', 'Природное восстановление', 'Раз за длинный отдых одно заклинание круга без ячейки; восстановление ячеек на коротком отдыхе.', { uses: { max: 1, reset: 'long' } }),
      F(10, 'Nature\'s Ward', 'Immune to Poisoned; Resistance to the damage type of your land.', 'Защита природы', 'Невосприимчив к отравлению; сопротивление урону своей земли.'),
      F(14, 'Nature\'s Sanctuary', 'Magic action: spectral trees give you and allies Half Cover and your land\'s Resistance.', 'Святилище природы', 'Действие Магия: призрачные деревья дают тебе и союзникам укрытие и сопротивление.')
    ],
    'fighter.champion': [
      F(7, 'Additional Fighting Style', 'Gain another Fighting Style.', 'Дополнительный боевой стиль', 'Ещё один боевой стиль.'),
      F(10, 'Heroic Warrior', 'At the start of your turn in combat, gain Heroic Inspiration if you don\'t have it.', 'Героический воин', 'В начале хода в бою получаешь Героическое вдохновение, если его нет.'),
      F(15, 'Superior Critical', 'Critical hits on 18–20 (auto-applied).', 'Превосходный критический удар', 'Критический удар на 18–20 (считается само).'),
      F(18, 'Survivor', 'Advantage on death saves. At the start of your turn while Bloodied, regain 5 + CON HP.', 'Выживший', 'Преимущество на спасброски от смерти. В начале хода, если хитов меньше половины, восстанавливаешь 5 + ТЕЛ.', { roll: '5+@CON', heal: true })
    ],
    'monk.openhand': [
      F(6, 'Wholeness of Body', 'Bonus Action: heal Martial Arts die + WIS (WIS times per Long Rest).', 'Целостность тела', 'Бонусное действие: лечишь кость боевых искусств + МДР (МДР раз за длинный отдых).', { uses: { max: 'WIS', reset: 'long' }, roll: x => D.monkDie(x.lvl) + '+' + x.mod.WIS, heal: true }),
      F(11, 'Fleet Step', 'After any Bonus Action, use Step of the Wind too.', 'Быстрый шаг', 'После любого бонусного действия можешь использовать Шаг ветра.'),
      F(17, 'Quivering Palm', 'Spend 4 Focus Points on a hit: later, end it to force a CON save — 10d12 force damage (half on success).', 'Дрожащая ладонь', '4 очка при попадании: позже активируешь — спасбросок ТЕЛ, 10d12 урона силовым полем (половина при успехе).', { roll: '10d12', dmgx: true })
    ],
    'paladin.devotion': [
      F(7, 'Aura of Devotion', 'You and allies in your aura are immune to Charmed.', 'Аура преданности', 'Ты и союзники в ауре невосприимчивы к очарованию.'),
      F(15, 'Smite of Protection', 'When you cast Divine Smite, allies in your aura get Half Cover until your next turn.', 'Защищающая кара', 'Когда используешь Божественную кару, союзники в ауре получают укрытие до твоего хода.'),
      F(20, 'Holy Nimbus', 'Bonus Action, 10 minutes: enemies starting their turn in your aura take CHA + PB radiant; Advantage on saves vs fiends and undead.', 'Священный нимб', 'Бонусное действие, 10 минут: враги в ауре получают ХАР + БМ урона излучением в начале хода.', { uses: { max: 1, reset: 'long' } })
    ],
    'ranger.hunter': [
      F(7, 'Defensive Tactics', 'Choose: Escape the Horde (OAs vs you have Disadvantage) or Multiattack Defense.', 'Защитная тактика', 'Выбери: Уход от толпы или Защита от мультиатаки.'),
      F(11, 'Superior Hunter\'s Prey', 'Once per turn, Hunter\'s Mark extra damage also hits another creature within 30 ft.', 'Превосходная добыча охотника', 'Раз в ход урон Метки охотника задевает ещё одно существо в 30 фт.'),
      F(15, 'Superior Hunter\'s Defense', 'Reaction when you take damage: Resistance to that and the same type until the end of the turn.', 'Превосходная защита охотника', 'Реакция при уроне: сопротивление этому типу урона до конца хода.')
    ],
    'rogue.thief': [
      F(9, 'Supreme Sneak', 'New Cunning Strike: Stealth Attack — stay hidden after attacking.', 'Превосходная скрытность', 'Новый Хитрый удар: остаёшься спрятанным после атаки.'),
      F(13, 'Use Magic Device', 'Attune to 4 items; charges may not be spent; use any Spell Scroll.', 'Использование магических предметов', 'Настройка на 4 предмета, заряды иногда не тратятся, любые свитки.'),
      F(17, 'Thief\'s Reflexes', 'Take two turns in the first round of combat.', 'Рефлексы вора', 'В первом раунде боя ходишь дважды.')
    ],
    'sorcerer.draconic': [
      F(6, 'Elemental Affinity', 'Resistance to your dragon\'s damage type; add CHA to one damage roll of that type.', 'Стихийное родство', 'Сопротивление урону твоего дракона; +ХАР к урону этого типа.'),
      F(14, 'Dragon Wings', 'Bonus Action: Fly Speed 60 ft for 1 hour. Once per Long Rest (or 3 Sorcery Points).', 'Драконьи крылья', 'Бонусное действие: летаешь 60 фт час. Раз за длинный отдых.', { uses: { max: 1, reset: 'long' } }),
      F(18, 'Dragon Companion', 'Summon Dragon without material components, once per Long Rest without a slot.', 'Драконий спутник', 'Призыв дракона раз за длинный отдых без ячейки.', { uses: { max: 1, reset: 'long' } })
    ],
    'warlock.fiend': [
      F(6, 'Dark One\'s Own Luck', 'Add 1d10 to an ability check or saving throw (CHA times per Long Rest).', 'Удача тёмного', 'Добавь 1d10 к проверке или спасброску (ХАР раз за длинный отдых).', { roll: '1d10', uses: { max: 'CHA', reset: 'long' } }),
      F(10, 'Fiendish Resilience', 'After a rest, choose a damage type (not force): you have Resistance to it.', 'Дьявольская стойкость', 'После отдыха выбери тип урона: у тебя к нему сопротивление.'),
      F(14, 'Hurl Through Hell', 'Once per turn on an attack hit: CHA save or the target takes 8d10 psychic and is Incapacitated. Once per Long Rest.', 'Бросок через ад', 'Раз за длинный отдых при попадании: спасбросок ХАР или 8d10 урона психической энергией и недееспособность.', { roll: '8d10', dmgx: true, uses: { max: 1, reset: 'long' } })
    ],
    'wizard.evoker': [
      F(6, 'Sculpt Spells', 'Chosen creatures automatically succeed on saves vs your Evocation spells and take no damage.', 'Формирование заклинаний', 'Выбранные существа автоматически проходят спасбросок от твоего воплощения и не получают урона.'),
      F(10, 'Empowered Evocation', 'Add INT to one damage roll of your Wizard Evocation spells.', 'Усиленное воплощение', '+ИНТ к урону твоих заклинаний воплощения.'),
      F(14, 'Overchannel', 'Deal maximum damage with a level 1–5 spell. Again before a Long Rest hurts you.', 'Перегрузка', 'Максимальный урон заклинанием 1–5 уровня. Повтор до длинного отдыха ранит тебя.', { uses: { max: 1, reset: 'long' } })
    ]
  };
  Object.keys(ADD).forEach(k => { D.CLASSES[k].features.push(...ADD[k]); delete D.CLASSES[k].later; });
  Object.keys(SUB).forEach(p => { const [k, s] = p.split('.'); D.CLASSES[k].subclasses[s].features.push(...SUB[p]); });

  // ---------- feats you can take instead of +2 ability points ----------
  // abil = abilities the feat can raise by +1. boon = Epic Boon (level 19+, ability can go up to 30).
  const G = (name, abil, desc, rn, rd, x) => Object.assign({ name, abil, desc, ru: [rn, rd] }, x || {});
  D.GENERAL_FEATS = {
    grappler: G('Grappler', ['STR', 'DEX'], 'Advantage on attacks vs creatures you grapple; grapple as part of an Unarmed Strike hit.', 'Борец', 'Преимущество на атаки по схваченным; хватаешь при попадании безоружным ударом.'),
    gwm: G('Great Weapon Master', ['STR'], 'Heavy weapon hit: + Proficiency Bonus damage. Crit or kill: one more attack as a Bonus Action.', 'Мастер большого оружия', 'Попадание тяжёлым оружием: + бонус мастерства к урону. Крит или убийство: ещё атака бонусным действием.'),
    sharpshooter: G('Sharpshooter', ['DEX'], 'Ignore Half and Three-Quarters Cover; no Disadvantage at long range or in melee with ranged weapons.', 'Меткий стрелок', 'Игнорируешь укрытия; нет помехи на дальней дистанции и вблизи.'),
    warcaster: G('War Caster', ['INT', 'WIS', 'CHA'], 'Advantage on Concentration saves; cast a spell as an Opportunity Attack.', 'Боевой маг', 'Преимущество на спасброски концентрации; заклинание вместо провоцированной атаки.'),
    resilient: G('Resilient', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], 'Proficiency in saving throws of the ability you raise (auto-applied).', 'Устойчивый', 'Владение спасбросками той характеристики, которую повышаешь (считается само).', { saveProf: true }),
    sentinel: G('Sentinel', ['STR', 'DEX'], 'Opportunity Attack hits stop the target\'s movement; react when a nearby enemy hits an ally.', 'Страж', 'Попадание провоцированной атакой останавливает цель; реагируешь, когда враг рядом бьёт союзника.'),
    polearm: G('Polearm Master', ['STR', 'DEX'], 'Bonus Action butt-end attack (1d4) with a quarterstaff, spear or polearm; Opportunity Attack when enemies enter your reach.', 'Мастер древкового оружия', 'Бонусная атака тупым концом (1d4); провоцированная атака, когда враг входит в досягаемость.'),
    speedy: G('Speedy', ['DEX', 'CON'], '+10 ft Speed (auto-applied); Dash ignores difficult terrain; OAs vs you have Disadvantage.', 'Быстрый', '+10 фт скорости (считается само); рывок игнорирует труднопроходимую местность.', { effects: [{ type: 'speed', value: 10 }] }),
    durable: G('Durable', ['CON'], 'Advantage on death saves; Bonus Action: spend a Hit Die to heal.', 'Крепкий', 'Преимущество на спасброски от смерти; бонусным действием трать кость хитов на лечение.'),
    inspiring: G('Inspiring Leader', ['WIS', 'CHA'], 'After a rest, give up to 6 allies temp HP = level + ability modifier.', 'Вдохновляющий лидер', 'После отдыха до 6 союзников получают временные хиты = уровень + модификатор.'),
    mageslayer: G('Mage Slayer', ['STR', 'DEX'], 'Your hits make Concentration saves harder; once per Long Rest succeed on a failed INT/WIS/CHA save.', 'Убийца магов', 'Попадания мешают концентрации; раз за длинный отдых проваленный спасбросок ИНТ/МДР/ХАР становится успехом.'),
    dualwielder: G('Dual Wielder', ['STR', 'DEX'], 'Two-weapon fighting with non-Light weapons; extra attack as part of the Attack action.', 'Боец с двумя оружиями', 'Сражаешься двумя не лёгкими оружиями; дополнительная атака.'),
    heavyarmor: G('Heavy Armor Master', ['STR', 'CON'], 'In heavy armor, reduce bludgeoning/piercing/slashing damage by your Proficiency Bonus.', 'Мастер тяжёлых доспехов', 'В тяжёлом доспехе урон дробящий/колющий/рубящий меньше на бонус мастерства.'),
    // Epic Boons (level 19)
    boonfortitude: G('Boon of Fortitude', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], '+40 max HP (auto-applied).', 'Дар стойкости', '+40 к максимуму хитов (считается само).', { boon: true, effects: [{ type: 'hpMax', value: 40 }] }),
    boonspeed: G('Boon of Speed', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], '+30 ft Speed (auto-applied); Disengage as a Bonus Action.', 'Дар скорости', '+30 фт скорости (считается само); отход бонусным действием.', { boon: true, effects: [{ type: 'speed', value: 30 }] }),
    boonprowess: G('Boon of Combat Prowess', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], 'Once per turn, turn a missed attack into a hit.', 'Дар боевого мастерства', 'Раз в ход промах превращается в попадание.', { boon: true }),
    boonfate: G('Boon of Fate', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], 'Add or subtract 2d4 to a nearby creature\'s d20 test. Once per Short Rest.', 'Дар судьбы', 'Добавь или отними 2d4 у броска d20 существа рядом. Раз за короткий отдых.', { boon: true, uses: { max: 1, reset: 'short' } }),
    boonspellrecall: G('Boon of Spell Recall', ['INT', 'WIS', 'CHA'], 'Cast a spell of level 1–4 without a slot once per Long Rest.', 'Дар вспоминания заклинаний', 'Раз за длинный отдых заклинание 1–4 уровня без ячейки.', { boon: true, uses: { max: 1, reset: 'long' } }),
    boontruesight: G('Boon of Truesight', ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], 'Truesight 60 ft.', 'Дар истинного зрения', 'Истинное зрение 60 фт.', { boon: true })
  };
})(window.DND);
