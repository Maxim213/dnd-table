// Monster types (creature kinds) for filters. Loads after all monster files.
// A scenario or a home-made monster can set its own "type" (one of the keys of D.MON_TYPES).
window.DND = window.DND || {};
(function (D) {
  D.MON_TYPES = {
    aberration: { icon: '🐙', name: 'Aberration', ru: 'Аберрация' },
    beast: { icon: '🐺', name: 'Beast', ru: 'Зверь' },
    celestial: { icon: '😇', name: 'Celestial', ru: 'Небожитель' },
    construct: { icon: '🤖', name: 'Construct', ru: 'Конструкт' },
    dragon: { icon: '🐉', name: 'Dragon', ru: 'Дракон' },
    elemental: { icon: '🔥', name: 'Elemental', ru: 'Элементаль' },
    fey: { icon: '🧚', name: 'Fey', ru: 'Фея' },
    fiend: { icon: '😈', name: 'Fiend', ru: 'Исчадие' },
    giant: { icon: '🗿', name: 'Giant', ru: 'Великан' },
    humanoid: { icon: '🧑', name: 'Humanoid', ru: 'Гуманоид' },
    monstrosity: { icon: '🦂', name: 'Monstrosity', ru: 'Чудовище' },
    ooze: { icon: '🟢', name: 'Ooze', ru: 'Слизь' },
    plant: { icon: '🌿', name: 'Plant', ru: 'Растение' },
    undead: { icon: '💀', name: 'Undead', ru: 'Нежить' }
  };
  const BY = {
    aberration: 'aboleth chuul otyugh gibberingmouther cloaker',
    beast: 'giantrat wolf spider cat rat owl mastiff flyingsnake boar panther wolfspider centipede giantbat blackbear crocodile insectswarm brownbear direwolf lion constrictor giantape trex ' +
      'baboon badger bat crab deer eagle frog firebeetle goat hawk hyena jackal lizard octopus raven scorpion spidertiny vulture weasel bloodhawk camel giantcrab giantweasel mule pony venomoussnake ' +
      'axebeak drafthorse elk giantbadger giantfrog giantlizard giantowl giantpoisonsnake pteranodon ridinghorse swarmbats swarmrats swarmravens ape giantgoat giantseahorse giantwasp reefshark warhorse ' +
      'swarmpiranhas gianteagle gianthyena giantoctopus gianttoad giantvulture tiger allosaurus giantboar giantconstrictor giantelk huntershark plesiosaurus polarbear rhinoceros sabertooth swarmsnakes ' +
      'ankylosaurus giantscorpion killerwhale elephant giantcrocodile giantshark triceratops mammoth',
    celestial: 'deva solar pegasus couatl unicorn planetar',
    construct: 'animatedarmor claygolem stonegolem irongolem homunculus flyingsword rugsmothering fleshgolem shieldguardian',
    dragon: 'wyvern pseudodragon dragonturtle youngwhite youngblack younggreen youngblue youngred adultwhite adultblack adultgreen adultblue adultred ancientwhite ancientblack ancientgreen ancientblue ancientred ' +
      'whitewyrmling blackwyrmling greenwyrmling bluewyrmling redwyrmling brasswyrmling copperwyrmling bronzewyrmling silverwyrmling goldwyrmling youngbrass youngcopper youngbronze youngsilver younggold ' +
      'adultbrass adultcopper adultbronze adultsilver adultgold ancientbrass ancientcopper ancientbronze ancientsilver ancientgold',
    elemental: 'fireelemental earthelemental airelemental waterelemental gargoyle steammephit dustmephit icemephit magmamephit magmin azer salamander xorn invisiblestalker djinni efreeti',
    fey: 'greenhag blinkdog sprite satyr dryad seahag worg centaur',
    fiend: 'imp hellhound erinyes rakshasa icedevil marilith balor pitfiend lemure dretch quasit nightmare beardeddevil succubus incubus barbeddevil nighthag vrock chaindevil hezrou bonedevil glabrezu horneddevil nalfeshnee',
    giant: 'ogre hillgiant troll ettin stonegiant frostgiant firegiant stormgiant cyclops oni cloudgiant',
    humanoid: 'goblin goblinboss kobold bandit cultist guard orc bugbear commoner acolyte drow hobgoblin gnoll scout thug lizardfolk spy banditcaptain berserker priest knight veteran gladiator mage assassin archmage ' +
      'noble infantry merfolk sahuagin pirate cultfanatic druidnpc hobgoblincaptain bugbearstalker guardcaptain toughboss piratecaptain',
    monstrosity: 'stirge harpy deathdog griffon mimic owlbear basilisk manticore minotaur doppelganger phasespider bulette chimera medusa hydra behir roc remorhaz purpleworm kraken tarrasque umberhulk ' +
      'werewolf wereboar wererat weretiger werebear cockatrice darkmantle rustmonster hippogriff ankheg carrioncrawler ettercap grick merrow winterwolf lamia gorgon roper drider spiritnaga guardiannaga sphinxwonder sphinxlore sphinxvalor',
    ooze: 'gelcube blackpudding grayooze ochrejelly',
    plant: 'shrieker twigblight treant awakenedshrub violetfungus awakenedtree shamblingmound',
    undead: 'skeleton zombie shadow ghoul specter ghast wight mummy banshee ghost wraith vampirespawn vampire mummylord demilich lich warhorseskeleton minotaurskeleton ogrezombie willowisp'
  };
  Object.keys(BY).forEach(t => BY[t].split(' ').forEach(k => { if (D.MONSTERS[k] && !D.MONSTERS[k].type) D.MONSTERS[k].type = t; }));
  (D.AFTER_LANG = D.AFTER_LANG || []).push(function (lang) { Object.values(D.MON_TYPES).forEach(x => { x.en = x.en || x.name; if (lang === 'ru') x.name = x.ru; }); });
})(window.DND);
