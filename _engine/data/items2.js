// More items for the catalog + the 5 power TIERS and item LEVEL.
// Tier = how special it is (Common → Divine). Level = from which hero level it fits (stats strength).
// D&D rarity → tier: none/Common → Common, Uncommon → Rare, Rare/Very Rare → Epic, Legendary → Legendary, Artifact → Divine.
// The DM can change price, level and tier of any item (🎒 Equipment → ✎ on a card); that is saved in the game.
window.DND = window.DND || {};
(function (D) {
  D.TIERS = {
    common: { icon: '⚪', name: 'Common', ru: 'Обычное', lvl: 1 },
    rare: { icon: '🔵', name: 'Rare', ru: 'Редкое', lvl: 3 },
    epic: { icon: '🟣', name: 'Epic', ru: 'Эпическое', lvl: 6 },
    legendary: { icon: '🟠', name: 'Legendary', ru: 'Легендарное', lvl: 12 },
    divine: { icon: '🌟', name: 'Divine', ru: 'Божественное', lvl: 18 }
  };
  D.TIER_KEYS = Object.keys(D.TIERS);
  const R2T = { Common: 'common', Uncommon: 'rare', Rare: 'epic', 'Very Rare': 'epic', Legendary: 'legendary', Artifact: 'divine' };
  const R2L = { Common: 1, Uncommon: 3, Rare: 6, 'Very Rare': 11, Legendary: 17, Artifact: 20 };
  D.RARITY_PRICE.Artifact = 1000000;
  D.RARITY_RU.Artifact = 'Артефакт';
  const rkey = r => { const s = String(r || ''); return Object.keys(R2T).sort((a, b) => b.length - a.length).find(k => s.indexOf(k) === 0) || ''; };
  D.tierOf = e => e.tier || (/homebrew/i.test(e.rarity || '') && /Legendary/.test(e.rarity || '') ? 'divine' : R2T[rkey(e.rarity)]) || (e.magicBonus >= 3 ? 'legendary' : e.magicBonus === 2 ? 'epic' : e.magicBonus === 1 ? 'rare' : 'common');
  D.levelOf = e => (e.level != null && e.level !== '' ? Number(e.level) : R2L[rkey(e.rarity)] || (e.magicBonus ? [1, 3, 6, 11][e.magicBonus] : e.cost >= 1000 ? 5 : e.cost >= 200 ? 3 : 1));

  // ---------- stats grow with the item LEVEL (the special power in the text never changes) ----------
  // Power step: level 1-4 = 1, 5-8 = 2, 9-12 = 3, 13-16 = 4, 17-20 = 5.
  // Going up one step: weapon / armor +1 (max +5), small bonuses (AC, saves, spell DC…) +1 (max +5),
  // speed +5 ft, ability +1, dice and flat numbers × (step+1)/(old step+1). Going down works the same way back.
  D.powerStep = L => 1 + Math.floor((Math.max(1, Math.min(20, Number(L) || 1)) - 1) / 4);
  D.baseLevelOf = e => (e.baseLevel != null ? Number(e.baseLevel) : D.levelOf(Object.assign({}, e, { level: e.def0 ? e.def0.level : undefined })));
  const scaleRoll = (r, f) => String(r).split(/(?=[+-])/).map(p => {
    const s = p[0] === '+' || p[0] === '-' ? p[0] : ''; const body = s ? p.slice(1) : p;
    const m = body.match(/^(\d*)d(\d+)$/i);
    if (m) return s + Math.max(1, Math.round((Number(m[1]) || 1) * f)) + 'd' + m[2];
    if (/^\d+$/.test(body)) return s + Math.max(1, Math.round(Number(body) * f));
    return p;
  }).join('');
  D.scaleItem = function (b, L0, L) {
    const d = D.powerStep(L) - D.powerStep(L0); const f = (D.powerStep(L) + 1) / (D.powerStep(L0) + 1);
    const mb0 = Number(b.magicBonus) || 0;
    const out = { magicBonus: mb0, effects: JSON.parse(JSON.stringify(b.effects || [])), roll: b.roll };
    if (!d) return out;
    if (b.weapon || b.armor) out.magicBonus = Math.max(0, Math.min(5, mb0 + d));
    out.effects.forEach(x => {
      const v = Number(x.value) || 0;
      if (x.type === 'damageMult' || v <= 0) return;
      if (x.type === 'speed') x.value = Math.max(5, v + 5 * d);
      else if (x.type === 'hpMax') x.value = Math.max(1, Math.round(v * f));
      else x.value = Math.min(Math.max(5, v), Math.max(1, v + d));
    });
    if (b.roll) out.roll = scaleRoll(b.roll, f);
    return out;
  };
  // an item / catalog entry shown at its (possibly changed) level
  D.atLevel = (e, L) => { const L0 = D.baseLevelOf(e); const lv = L != null ? L : D.levelOf(e); return Object.assign({}, e, D.scaleItem(e, L0, lv), { level: lv }); };

  // [English name, icon, D&D rarity, attunement, description, Russian name, Russian description, extra]
  const MG = [
    // ---- weapons ----
    ['Sun Blade', '☀️', 'Rare', true, '+2 longsword with a blade of light; +1d8 radiant against undead. Sheds bright light.', 'Солнечный клинок', '+2 длинный меч из света; +1d8 излучением по нежити. Светит.', { weapon: 'longsword', magicBonus: 2, roll: '1d8' }],
    ['Frost Brand', '❄️', 'Very Rare', true, '+1d6 cold on hits, resistance to fire, puts out flames nearby.', 'Ледяной клинок', '+1d6 холодом при попадании, сопротивление огню, гасит пламя рядом.', { weapon: 'greatsword', roll: '1d6' }],
    ['Dragon Slayer', '🐉', 'Rare', false, '+1 weapon; +3d6 damage against dragons.', 'Убийца драконов', 'Оружие +1; +3d6 урона по драконам.', { weapon: 'longsword', magicBonus: 1, roll: '3d6' }],
    ['Giant Slayer', '🪓', 'Rare', false, '+1 weapon; +2d6 against giants and knocks them Prone (STR DC 15).', 'Убийца великанов', 'Оружие +1; +2d6 по великанам и сбивает их с ног.', { weapon: 'greataxe', magicBonus: 1, roll: '2d6' }],
    ['Vicious Weapon', '🩸', 'Rare', false, 'On a natural 20 it deals 7 extra damage.', 'Жестокое оружие', 'При натуральной 20 наносит 7 доп. урона.', { weapon: 'rapier' }],
    ['Mace of Disruption', '🔨', 'Rare', true, '+2d6 radiant to fiends and undead; they may be destroyed at 25 HP or less.', 'Булава разрушения', '+2d6 излучением исчадиям и нежити; слабых может уничтожить.', { weapon: 'mace', roll: '2d6' }],
    ['Berserker Axe', '🪓', 'Rare', true, '+1 axe, +1 max HP per level. Cursed: you go berserk when hurt.', 'Топор берсерка', 'Топор +1, +1 хит за уровень. Проклят: впадаешь в ярость от ран.', { weapon: 'battleaxe', magicBonus: 1 }],
    ['Dancing Sword', '🗡️', 'Very Rare', true, 'Toss it: it floats and attacks on its own for 4 turns.', 'Танцующий меч', 'Подбрось — он летает и бьёт сам 4 хода.', { weapon: 'longsword' }],
    ['Dwarven Thrower', '🔨', 'Very Rare', true, '+3 warhammer that flies back to your hand; +1d8 (2d8 vs giants) when thrown.', 'Дварфийский метатель', 'Боевой молот +3, возвращается в руку; +1d8 при броске.', { weapon: 'warhammer', magicBonus: 3, roll: '1d8' }],
    ['Oathbow', '🏹', 'Very Rare', true, 'Swear an enemy: Advantage and +3d6 piercing against it.', 'Лук клятвы', 'Назови врага: преимущество и +3d6 урона по нему.', { weapon: 'longbow', roll: '3d6' }],
    ['Nine Lives Stealer', '💀', 'Very Rare', true, '+2 weapon. On a crit, a creature under 100 HP must save or die (9 charges).', 'Похититель девяти жизней', 'Оружие +2. При крите существо до 100 хитов может умереть.', { weapon: 'longsword', magicBonus: 2 }],
    ['Holy Avenger', '⚜️', 'Legendary', true, '+3 longsword, +2d10 radiant vs fiends and undead; allies near you get Advantage on saves vs spells.', 'Святой мститель', 'Длинный меч +3, +2d10 излучением по исчадиям и нежити; аура защиты от заклинаний.', { weapon: 'longsword', magicBonus: 3, roll: '2d10' }],
    ['Vorpal Sword', '⚔️', 'Legendary', true, '+3 sword that ignores slashing resistance. On a natural 20 it cuts off the head.', 'Обезглавливающий меч', 'Меч +3, игнорирует сопротивление. При натуральной 20 отрубает голову.', { weapon: 'longsword', magicBonus: 3 }],
    ['Defender', '🛡️', 'Legendary', true, '+3 sword; move any of the +3 to your AC each turn.', 'Защитник', 'Меч +3; каждый ход можно перенести бонус в КД.', { weapon: 'longsword', magicBonus: 3 }],
    ['Luck Blade', '🍀', 'Legendary', true, '+1 sword, +1 to saves, reroll once per day; may hold a Wish.', 'Клинок удачи', 'Меч +1, +1 к спасброскам, переброс раз в день; может хранить желание.', { weapon: 'longsword', magicBonus: 1, effects: [{ type: 'save', value: 1 }] }],
    // ---- armor ----
    ['Adamantine Armor', '🦾', 'Uncommon', false, 'Critical hits against you become normal hits.', 'Адамантиновый доспех', 'Критические удары по тебе становятся обычными.', { armor: 'plate' }],
    ['Mithral Armor', '✨', 'Uncommon', false, 'Light as cloth: no STR needed and no Stealth Disadvantage.', 'Мифриловый доспех', 'Лёгкий как ткань: без требований к СИЛ и без помехи Скрытности.', { armor: 'halfplate' }],
    ['Elven Chain', '🧝', 'Rare', false, '+1 chain shirt anyone can wear, even without training.', 'Эльфийская кольчуга', 'Кольчужная рубаха +1, носит кто угодно.', { armor: 'chainshirt', magicBonus: 1 }],
    ['Dragon Scale Mail', '🐲', 'Very Rare', true, '+1 AC, resistance to one damage type, Advantage vs dragon fear.', 'Доспех из драконьей чешуи', '+1 КД, сопротивление одному типу урона.', { armor: 'scale', magicBonus: 1 }],
    ['Armor of Resistance', '🛡️', 'Rare', true, 'Resistance to one damage type (fire, cold…).', 'Доспех сопротивления', 'Сопротивление одному типу урона.', { armor: 'breastplate' }],
    ['Sentinel Shield', '🛡️', 'Uncommon', false, 'Advantage on Initiative and Perception.', 'Щит часового', 'Преимущество на инициативу и Внимательность.', { armor: 'shield' }],
    ['Animated Shield', '🛡️', 'Very Rare', true, 'It floats and protects you, leaving both hands free.', 'Оживлённый щит', 'Летает и защищает, руки свободны.', { armor: 'shield' }],
    ['Plate Armor of Etherealness', '👻', 'Legendary', true, 'Once per day walk through walls (Etherealness) for 10 minutes.', 'Латы эфирности', 'Раз в день 10 минут проходишь сквозь стены.', { armor: 'plate' }],
    // ---- rings, amulets, cloaks ----
    ['Ring of Free Action', '💍', 'Rare', true, 'Difficult terrain and magic can\'t slow or paralyze you.', 'Кольцо свободы действий', 'Ничто не замедляет и не парализует.'],
    ['Ring of Evasion', '💍', 'Rare', true, '3 charges: turn a failed DEX save into a success.', 'Кольцо увёртливости', '3 заряда: проваленный спасбросок ЛОВ становится успехом.'],
    ['Ring of Feather Falling', '🪶', 'Rare', true, 'You fall slowly and take no falling damage.', 'Кольцо падения пёрышком', 'Падаешь медленно, без урона.'],
    ['Ring of Water Walking', '💧', 'Uncommon', false, 'Walk on water and other liquids.', 'Кольцо хождения по воде', 'Ходишь по воде.'],
    ['Ring of Spell Storing', '💍', 'Rare', true, 'Holds up to 5 levels of spells; anyone wearing it can cast them.', 'Кольцо хранения заклинаний', 'Хранит до 5 уровней заклинаний.'],
    ['Ring of Regeneration', '💍', 'Very Rare', true, 'Regain 1d6 HP every 10 minutes; lost body parts regrow.', 'Кольцо регенерации', '1d6 хитов каждые 10 минут; отрастают части тела.', { roll: '1d6', heal: true }],
    ['Ring of Invisibility', '💍', 'Legendary', true, 'Turn Invisible at will.', 'Кольцо невидимости', 'Становишься невидимым по желанию.'],
    ['Ring of Three Wishes', '💍', 'Legendary', false, 'Three charges of the Wish spell.', 'Кольцо трёх желаний', 'Три заряда заклинания Исполнение желаний.'],
    ['Amulet of Proof against Detection', '📿', 'Uncommon', true, 'You can\'t be found by divination or scrying.', 'Амулет защиты от обнаружения', 'Тебя нельзя найти магией прорицания.'],
    ['Periapt of Wound Closure', '📿', 'Uncommon', true, 'You stabilize automatically; healing from Hit Dice is doubled.', 'Талисман закрытия ран', 'Сам стабилизируешься; лечение костями хитов удвоено.'],
    ['Stone of Good Luck', '🍀', 'Uncommon', true, '+1 to ability checks and saving throws.', 'Камень удачи', '+1 к проверкам и спасброскам.', { effects: [{ type: 'save', value: 1 }, { type: 'skills', value: 1 }] }],
    ['Ioun Stone of Protection', '💠', 'Rare', true, 'A stone orbiting your head: +1 AC.', 'Ионный камень защиты', 'Камень вокруг головы: +1 КД.', { effects: [{ type: 'ac', value: 1 }] }],
    ['Cloak of Displacement', '🧥', 'Rare', true, 'You look a few feet away: attacks against you have Disadvantage until you are hit.', 'Плащ смещения', 'Ты кажешься в стороне: атаки по тебе с помехой, пока не попадут.'],
    ['Cloak of the Bat', '🦇', 'Rare', true, 'Fly in darkness; turn into a bat.', 'Плащ летучей мыши', 'Летаешь в темноте, превращаешься в мышь.'],
    ['Mantle of Spell Resistance', '🧥', 'Rare', true, 'Advantage on saves against spells.', 'Мантия сопротивления заклинаниям', 'Преимущество на спасброски от заклинаний.'],
    ['Robe of Eyes', '👁️', 'Rare', true, 'See in all directions, see invisible things and into the Ethereal Plane.', 'Мантия глаз', 'Видишь во все стороны и невидимое.'],
    ['Robe of the Archmagi', '🧙', 'Legendary', true, 'AC 13 + DEX without armor, +2 spell save DC and spell attacks, Advantage vs spells.', 'Мантия архимага', 'КД 13 + ЛОВ, +2 к СЛ и атакам заклинаний, преимущество против магии.', { effects: [{ type: 'spellDC', value: 2 }, { type: 'spellAttack', value: 2 }] }],
    // ---- boots, gloves, belts, helms ----
    ['Boots of Speed', '👢', 'Rare', true, 'Click your heels: double Speed for 10 minutes per day.', 'Сапоги скорости', 'Щёлкни каблуками: скорость ×2 на 10 минут в день.'],
    ['Boots of Levitation', '👢', 'Rare', true, 'Levitate at will.', 'Сапоги левитации', 'Паришь по желанию.'],
    ['Winged Boots', '🪽', 'Uncommon', true, 'Fly Speed = walking Speed, 4 hours per day.', 'Крылатые сапоги', 'Летаешь со скоростью ходьбы 4 часа в день.'],
    ['Boots of the Winterlands', '🥾', 'Uncommon', true, 'Resistance to cold; ice and snow are normal ground.', 'Сапоги зимних земель', 'Сопротивление холоду, лёд и снег не мешают.'],
    ['Gloves of Thievery', '🧤', 'Uncommon', false, '+5 to Sleight of Hand and lockpicking.', 'Перчатки воровства', '+5 к Ловкости рук и взлому.'],
    ['Gloves of Missile Snaring', '🧤', 'Uncommon', true, 'Reaction: reduce ranged weapon damage by 1d10 + DEX, maybe catch it.', 'Перчатки ловли снарядов', 'Реакция: урон от стрелы меньше на 1d10 + ЛОВ.', { roll: '1d10+@DEX' }],
    ['Belt of Hill Giant Strength', '🥋', 'Rare', true, 'Your STR becomes 21.', 'Пояс силы холмового великана', 'СИЛ становится 21.'],
    ['Belt of Storm Giant Strength', '🥋', 'Legendary', true, 'Your STR becomes 29.', 'Пояс силы штормового великана', 'СИЛ становится 29.'],
    ['Helm of Telepathy', '⛑️', 'Uncommon', true, 'Read thoughts and speak mind to mind.', 'Шлем телепатии', 'Читаешь мысли и говоришь мысленно.'],
    ['Hat of Disguise', '🎩', 'Uncommon', true, 'Disguise Self at will.', 'Шляпа маскировки', 'Маскировка по желанию.'],
    ['Eyes of the Eagle', '🦅', 'Uncommon', true, 'Advantage on sight-based Perception; see 1 mile clearly.', 'Глаза орла', 'Преимущество на Внимательность зрением.'],
    ['Circlet of Blasting', '👑', 'Uncommon', false, 'Once per day cast Scorching Ray (+5 to hit, 3 rays of 2d6 fire).', 'Венец разрушения', 'Раз в день Палящий луч (+5, 3 луча по 2d6).', { roll: '6d6' }],
    // ---- wands, staffs, rods ----
    ['Wand of the War Mage +1', '🪄', 'Uncommon', true, '+1 to spell attack rolls; ignore half cover.', 'Палочка боевого мага +1', '+1 к атакам заклинаниями; игнорирует укрытие.', { effects: [{ type: 'spellAttack', value: 1 }] }],
    ['Wand of the War Mage +3', '🪄', 'Very Rare', true, '+3 to spell attack rolls; ignore half cover.', 'Палочка боевого мага +3', '+3 к атакам заклинаниями.', { effects: [{ type: 'spellAttack', value: 3 }] }],
    ['Rod of the Pact Keeper +1', '🪄', 'Uncommon', true, 'Warlock: +1 spell DC and spell attacks; regain a pact slot once per day.', 'Жезл хранителя договора +1', 'Колдун: +1 к СЛ и атакам заклинаний; раз в день вернуть ячейку.', { effects: [{ type: 'spellDC', value: 1 }, { type: 'spellAttack', value: 1 }] }],
    ['Wand of Fireballs', '🔥', 'Rare', true, '7 charges: cast Fireball (8d6, DEX save DC 15).', 'Палочка огненных шаров', '7 зарядов: Огненный шар (8d6, ЛОВ СЛ 15).', { roll: '8d6' }],
    ['Wand of Lightning Bolts', '⚡', 'Rare', true, '7 charges: cast Lightning Bolt (8d6, DEX save DC 15).', 'Палочка молний', '7 зарядов: Молния (8d6, ЛОВ СЛ 15).', { roll: '8d6' }],
    ['Staff of Healing', '🌿', 'Rare', true, '10 charges: Cure Wounds, Lesser Restoration, Mass Cure Wounds.', 'Посох лечения', '10 зарядов: Лечение ран, Малое восстановление, Множественное лечение.', { weapon: 'quarterstaff', roll: '1d8+4', heal: true }],
    ['Staff of Fire', '🔥', 'Very Rare', true, 'Resistance to fire; 10 charges: Burning Hands, Fireball, Wall of Fire.', 'Посох огня', 'Сопротивление огню; заряды: Огненные ладони, Огненный шар, Стена огня.', { weapon: 'quarterstaff' }],
    ['Staff of Power', '⚡', 'Very Rare', true, '+2 to hit/damage, AC, saves and spell attacks; 20 charges of strong spells.', 'Посох силы', '+2 к атакам, КД, спасброскам и атакам заклинаниями; 20 зарядов.', { weapon: 'quarterstaff', magicBonus: 2, effects: [{ type: 'ac', value: 2 }, { type: 'save', value: 2 }, { type: 'spellAttack', value: 2 }] }],
    ['Staff of the Magi', '🌌', 'Legendary', true, '+2 weapon and spell attacks, Advantage vs spells, 50 charges, can explode.', 'Посох магов', '+2 к атакам и заклинаниям, 50 зарядов, может взорваться.', { weapon: 'quarterstaff', magicBonus: 2, effects: [{ type: 'spellAttack', value: 2 }] }],
    ['Rod of Lordly Might', '👑', 'Legendary', true, '+3 mace that turns into an axe, sword, ladder or battering ram.', 'Жезл повелителя', 'Булава +3, превращается в топор, меч, лестницу, таран.', { weapon: 'mace', magicBonus: 3 }],
    // ---- wondrous ----
    ['Portable Hole', '🕳️', 'Rare', false, 'A cloth circle that opens a 10-ft deep hole to store things.', 'Переносная дыра', 'Ткань, открывающая яму глубиной 10 фт.'],
    ['Necklace of Fireballs', '📿', 'Rare', false, 'Throw a bead: it explodes as a Fireball (8d6 fire, DEX DC 15).', 'Ожерелье огненных шаров', 'Брось бусину — взрыв огненного шара (8d6).', { roll: '8d6' }],
    ['Horn of Blasting', '📯', 'Rare', false, 'Blow it: 30-ft cone, 5d6 thunder and Deafened (CON DC 15). Might explode.', 'Рог взрыва', 'Подуй: конус 30 фт, 5d6 громом. Может взорваться.', { roll: '5d6' }],
    ['Bag of Tricks', '👜', 'Uncommon', false, 'Pull out a fuzzy ball, throw it: it becomes a random animal ally.', 'Сумка фокусов', 'Брось пушистый шарик — он станет случайным зверем-союзником.'],
    ['Decanter of Endless Water', '🏺', 'Uncommon', false, 'Pours fresh or salt water — up to a 30-ft geyser.', 'Графин бесконечной воды', 'Льёт воду — вплоть до гейзера.'],
    ['Broom of Flying', '🧹', 'Uncommon', false, 'Fly at 50 ft Speed.', 'Летающая метла', 'Летаешь со скоростью 50 фт.'],
    ['Carpet of Flying', '🧶', 'Very Rare', false, 'A flying carpet for up to 4 people.', 'Ковёр-самолёт', 'Летающий ковёр для 4 человек.'],
    ['Crystal Ball', '🔮', 'Very Rare', true, 'Cast Scrying: see and hear far away.', 'Хрустальный шар', 'Наблюдение: видишь и слышишь далёкое.'],
    ['Cube of Force', '🧊', 'Rare', true, 'Creates walls of force around you.', 'Куб силы', 'Создаёт силовые стены вокруг тебя.'],
    ['Figurine of Wondrous Power', '🐦', 'Rare', false, 'A statue that turns into a living animal for hours.', 'Чудесная статуэтка', 'Статуэтка оживает зверем на несколько часов.'],
    ['Lantern of Revealing', '🏮', 'Uncommon', false, 'Its light reveals invisible creatures.', 'Фонарь обнаружения', 'Свет показывает невидимых существ.'],
    ['Gem of Seeing', '💎', 'Rare', true, 'Look through it: Truesight 120 ft.', 'Самоцвет зрения', 'Смотри сквозь него: истинное зрение 120 фт.'],
    ['Manual of Bodily Health', '📕', 'Very Rare', false, 'Read it for 48 hours: CON +2 forever (max 22).', 'Учебник здоровья', 'Прочти за 48 часов: ТЕЛ +2 навсегда.'],
    ['Tome of Clear Thought', '📘', 'Very Rare', false, 'Read it for 48 hours: INT +2 forever (max 22).', 'Том ясной мысли', 'Прочти за 48 часов: ИНТ +2 навсегда.'],
    ['Deck of Many Things', '🃏', 'Legendary', false, 'Draw a card: wealth, power… or disaster. Pure chaos.', 'Колода многих вещей', 'Тяни карту: богатство, сила… или катастрофа. Чистый хаос.'],
    ['Sphere of Annihilation', '⚫', 'Legendary', false, 'A ball of nothing that destroys all it touches (4d10 force... and worse).', 'Сфера аннигиляции', 'Шар пустоты, уничтожающий всё, чего касается.', { roll: '4d10' }],
    ['Efreeti Bottle', '🍾', 'Very Rare', false, 'Open it: a fire genie appears — it may serve you, grant a wish or attack.', 'Бутылка ифрита', 'Открой — появится огненный джинн: служит, исполняет желание или нападает.'],
    // ---- potions and scrolls ----
    ['Potion of Heroism', '🧪', 'Rare', false, '10 temp HP and Bless for 1 hour.', 'Зелье героизма', '10 временных хитов и Благословение на час.', { cat: 'consumable', roll: '10', temp: true }],
    ['Potion of Speed', '🧪', 'Very Rare', false, 'Haste for 1 minute (no Concentration).', 'Зелье скорости', 'Ускорение на минуту.', { cat: 'consumable' }],
    ['Potion of Flying', '🧪', 'Very Rare', false, 'Fly Speed = walking Speed for 1 hour.', 'Зелье полёта', 'Летаешь час.', { cat: 'consumable' }],
    ['Potion of Fire Breath', '🧪', 'Uncommon', false, 'Breathe fire 3 times: 4d6 fire, DEX DC 13.', 'Зелье огненного дыхания', '3 раза дыхание огнём: 4d6, ЛОВ СЛ 13.', { cat: 'consumable', roll: '4d6' }],
    ['Potion of Growth', '🧪', 'Uncommon', false, 'Become Large for 10 minutes (+1d4 weapon damage).', 'Зелье роста', 'Становишься большим на 10 минут.', { cat: 'consumable' }],
    ['Potion of Water Breathing', '🧪', 'Uncommon', false, 'Breathe underwater for 1 hour.', 'Зелье подводного дыхания', 'Дышишь под водой час.', { cat: 'consumable' }],
    ['Potion of Vitality', '🧪', 'Very Rare', false, 'Removes exhaustion and disease; Hit Dice heal the maximum for a day.', 'Зелье жизненной силы', 'Снимает истощение и болезни.', { cat: 'consumable' }],
    ['Elixir of Health', '🧪', 'Rare', false, 'Cures diseases and Blinded, Deafened, Paralyzed, Poisoned.', 'Эликсир здоровья', 'Излечивает болезни и состояния.', { cat: 'consumable' }],
    ['Oil of Sharpness', '🫗', 'Very Rare', false, 'A weapon becomes +3 for 1 hour.', 'Масло остроты', 'Оружие становится +3 на час.', { cat: 'consumable' }],
    ['Spell Scroll (level 3)', '📜', 'Uncommon', false, 'Cast the level 3 spell written on it once.', 'Свиток заклинания (3 ур.)', 'Сотвори записанное заклинание 3 уровня один раз.', { cat: 'consumable' }],
    ['Spell Scroll (level 5)', '📜', 'Rare', false, 'Cast the level 5 spell written on it once.', 'Свиток заклинания (5 ур.)', 'Заклинание 5 уровня один раз.', { cat: 'consumable' }],
    ['Spell Scroll (level 9)', '📜', 'Legendary', false, 'Cast the level 9 spell written on it once.', 'Свиток заклинания (9 ур.)', 'Заклинание 9 уровня один раз.', { cat: 'consumable' }],
    // ---- new, made for this game (homebrew) ----
    ['Coin of Second Chances', '🪙', 'Rare', true, 'Homebrew. Once per day, after any roll, flip the coin and roll that die again.', 'Монета второго шанса', 'Самоделка. Раз в день после любого броска переброс этой кости.', { tier: 'epic', level: 5 }],
    ['Mug of Endless Ale', '🍺', 'Common', false, 'Homebrew. Always full. A big gulp: 1d4 temp HP (once per Short Rest).', 'Кружка бесконечного эля', 'Самоделка. Всегда полна. Большой глоток: 1d4 временных хита (раз за короткий отдых).', { roll: '1d4', temp: true }],
    ['Boots of the Bouncing Goblin', '👟', 'Uncommon', false, 'Homebrew. Jump three times as far, half falling damage. They squeak.', 'Сапоги прыгучего гоблина', 'Самоделка. Прыжок втрое дальше, урон от падения вдвое меньше. Пищат.'],
    ['Thunder Gauntlets', '🥊', 'Rare', true, 'Homebrew. Unarmed strikes deal 1d8 thunder and push 10 ft.', 'Громовые перчатки', 'Самоделка. Безоружные удары: 1d8 громом и толчок на 10 фт.', { roll: '1d8' }],
    ['Grim Lantern', '🏮', 'Rare', true, 'Homebrew. Undead within 30 ft glow; 3 charges: undead WIS DC 15 or flee.', 'Мрачный фонарь', 'Самоделка. Нежить в 30 фт светится; 3 заряда: нежить бежит (МДР СЛ 15).'],
    ['Blade of Echoes', '🗡️', 'Legendary', true, 'Homebrew. +2 longsword; each hit echoes: 1d6 force to another enemy within 10 ft.', 'Клинок эха', 'Самоделка. Длинный меч +2; каждое попадание эхом бьёт другого врага на 1d6.', { weapon: 'longsword', magicBonus: 2, roll: '1d6' }],
    ['Shield of the Last Stand', '🛡️', 'Legendary', true, 'Homebrew. +2 shield; when an ally next to you drops to 0 HP, you may take that hit instead.', 'Щит последнего рубежа', 'Самоделка. Щит +2; когда союзник рядом падает до 0, можешь принять удар на себя.', { armor: 'shield', magicBonus: 2 }],
    ['Cloak of Stars', '🌌', 'Artifact', true, 'Homebrew. Fly 60 ft, +2 AC, 3 times per day teleport 30 ft as a Bonus Action.', 'Плащ звёзд', 'Самоделка. Полёт 60 фт, +2 КД, 3 раза в день телепорт на 30 фт.', { effects: [{ type: 'ac', value: 2 }] }],
    ['Dragonheart Amulet', '❤️‍🔥', 'Artifact', true, 'Homebrew. CON +2 (max 22), resistance to fire, once per day 10d6 fire breath (DEX DC 18).', 'Амулет драконьего сердца', 'Самоделка. ТЕЛ +2, сопротивление огню, раз в день огненное дыхание 10d6.', { roll: '10d6', effects: [{ type: 'ability', ability: 'CON', value: 2 }] }],
    ['Ring of the Phoenix', '🔥', 'Artifact', true, 'Homebrew. Once ever: when you die, you rise with full HP in a burst of fire (8d6 to enemies nearby).', 'Кольцо феникса', 'Самоделка. Один раз: умерев, восстаёшь с полными хитами во взрыве огня (8d6 врагам рядом).', { roll: '8d6' }],
    ['Bag of Infinite Rations', '🥖', 'Uncommon', false, 'Homebrew. Food and water for 6 people every day.', 'Мешок бесконечных припасов', 'Самоделка. Еда и вода на 6 человек каждый день.']
  ];
  const GR = [
    ['Abacus', 'gear', '🧮', 2, 2, 'Count things.', 'Счёты', 'Считать.'], ['Bell', 'gear', '🔔', 1, 0, 'Ring it.', 'Колокольчик', 'Звенеть.'],
    ['Blanket', 'gear', '🧣', 0.5, 3, 'Keeps you warm.', 'Одеяло', 'Греет.'], ['Bucket', 'gear', '🪣', 0.05, 2, 'Holds 3 gallons.', 'Ведро', 'Вмещает ведро воды.'],
    ['Chalk', 'gear', '🖍️', 0.01, 0, 'Mark walls and floors.', 'Мел', 'Метки на стенах.'], ['Flask', 'gear', '🍶', 0.02, 1, 'Holds a pint.', 'Фляга', 'Небольшая фляга.'],
    ['Hunting Trap', 'gear', '🪤', 5, 25, 'Steel jaws: 1d4 piercing, Restrained (DC 13 STR).', 'Капкан', 'Стальные челюсти: 1d4 урона и опутан.', { roll: '1d4' }],
    ['Ink and Pen', 'gear', '🖋️', 10, 0, 'Write letters and maps.', 'Чернила и перо', 'Писать письма и карты.'], ['Ladder (10 ft)', 'gear', '🪜', 0.1, 25, 'Climb up.', 'Лестница (10 фт)', 'Залезть наверх.'],
    ['Magnifying Glass', 'gear', '🔍', 100, 0, 'Advantage when examining small details; start fires.', 'Лупа', 'Преимущество при изучении мелочей.'], ['Net', 'gear', '🕸️', 1, 3, 'Throw: target Restrained (DC 10 STR).', 'Сеть', 'Брось: цель опутана.'],
    ['Paper', 'gear', '📄', 0.2, 0, 'One sheet.', 'Бумага', 'Один лист.'], ['Perfume', 'gear', '🌸', 5, 0, 'Smell nice.', 'Духи', 'Пахнуть приятно.'],
    ['Pole (10 ft)', 'gear', '🦯', 0.05, 7, 'Poke things from far away.', 'Шест (10 фт)', 'Тыкать в подозрительное издалека.'], ['Pouch', 'gear', '👝', 0.5, 1, 'Small bag for coins.', 'Кошель', 'Для монет.'],
    ['Signal Whistle', 'gear', '📢', 0.05, 0, 'Heard far away.', 'Сигнальный свисток', 'Слышно издалека.'], ['Soap', 'gear', '🧼', 0.02, 0, 'Stay clean.', 'Мыло', 'Чистота.'],
    ['Smith\'s Tools', 'tool', '⚒️', 20, 8, 'Repair metal, make weapons.', 'Инструменты кузнеца', 'Чинить металл, ковать.'], ['Carpenter\'s Tools', 'tool', '🪚', 8, 6, 'Build and repair wood.', 'Инструменты плотника', 'Строить и чинить дерево.'],
    ['Cook\'s Utensils', 'tool', '🍳', 1, 8, 'Cook tasty food.', 'Кухонная утварь', 'Готовить вкусную еду.'], ['Alchemist\'s Supplies', 'tool', '⚗️', 50, 8, 'Make acid, alchemist\'s fire, antitoxin.', 'Инструменты алхимика', 'Делать кислоту, огонь, противоядие.'],
    ['Navigator\'s Tools', 'tool', '🧭', 25, 2, 'Find your way.', 'Инструменты навигатора', 'Находить путь.'], ['Gaming Set', 'tool', '🎲', 1, 0, 'Dice or cards.', 'Игровой набор', 'Кости или карты.'],
    ['Mule', 'gear', '🫏', 8, 0, 'Carries your stuff.', 'Мул', 'Тащит вещи.'], ['Warhorse', 'gear', '🐴', 400, 0, 'Trained for battle. Speed 60 ft.', 'Боевой конь', 'Обучен для боя.'],
    ['Cart', 'gear', '🛒', 15, 200, 'Pulled by a horse or mule.', 'Телега', 'Тянет лошадь или мул.'], ['Rowboat', 'gear', '🛶', 50, 100, 'Small boat for 3.', 'Лодка', 'На троих.']
  ];
  const CAT = D.CATALOG;
  GR.forEach(g => { if (!CAT.some(e => e.name === g[0])) CAT.push(Object.assign({ id: 'g:' + g[0], cat: g[1], icon: g[2], name: g[0], cost: g[3], weight: g[4], desc: g[5], ru: [g[6], g[7]] }, g[8] || {})); });
  MG.forEach(m => { if (!CAT.some(e => e.name === m[0])) CAT.push(Object.assign({ id: 'm:' + m[0], cat: 'magic', icon: m[1], name: m[0], rarity: m[2], requiresAttunement: m[3], desc: m[4], ru: [m[5], m[6]], cost: D.RARITY_PRICE[m[2]] }, m[7] || {})); });
  // Gravemaw (doubles ALL damage) is beyond legendary
  const gm = CAT.find(e => e.name === 'Gravemaw'); if (gm) { gm.tier = 'divine'; gm.level = 20; }
  // every weapon lives in Weapons and every armor/shield in Armor, whatever its tier (magic ones too)
  CAT.forEach(e => { if (e.cat === 'consumable') return; if (e.weapon) e.cat = 'weapon'; else if (e.armor) e.cat = 'armor'; });
  // remember defaults (the DM can change price / level / tier per game)
  CAT.forEach(e => { e.def0 = { cost: e.cost, level: e.level, tier: e.tier }; });
  (D.AFTER_LANG = D.AFTER_LANG || []).push(function (lang) { Object.values(D.TIERS).forEach(x => { x.en = x.en || x.name; if (lang === 'ru') x.name = x.ru; }); });
})(window.DND);
