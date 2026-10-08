import type { LibraryBranch, LibrarySkill } from "./types";

import type { Ability } from "@/lib/utils/abilities/schema";

const LIGHT = "Світло";

const DARK = "Темрява";

const CHAOS = "Хаос";

const NATURE = "Природа";

const AREA_TARGETS = 3;

const LEVEL_KEYS = ["basic", "advanced", "expert"] as const;

function ability(key: string, name: string, rest: Omit<Ability, "id" | "name">): Ability {
  return { id: key, name, ...rest };
}

function passive(key: string, name: string, effects: Ability["effects"]): Ability {
  return ability(key, name, { trigger: { event: "passive" }, effects });
}

interface LevelText {
  name: string;
  description: string;
  appearanceDescription: string;
}

function levels(branchKey: string, texts: LevelText[], effects: (index: number) => Ability["effects"]): LibrarySkill[] {
  return LEVEL_KEYS.map((level, i) => {
    const key = `${branchKey}-${level}`;

    return { key, iconKey: key, ...texts[i], abilities: [passive(key, texts[i].name, effects(i))] };
  });
}

const SPELL_ACCESS = [
  { levels: "1–2 рівня", die: "к6" },
  { levels: "1–4 рівня", die: "к8" },
  { levels: "1–5 рівня", die: "к10" },
];

const spellAccessText = (school: string, i: number) =>
  `Відкриває доступ до заклять школи «${school}» ${SPELL_ACCESS[i].levels}; кубики заклять цієї школи — ${SPELL_ACCESS[i].die}.`;

const spellAccess = (school: string) => (i: number): Ability["effects"] => [{ kind: "note", text: spellAccessText(school, i) }];

const HOSTILE_NATURE_SPELLS = ["roots", "thorny-vines", "moonbeam", "wasp-swarm", "entangle", "earthquake", "nature-storm"];


const attack: LibraryBranch = {
  key: "attack",
  name: "Напад",
  iconKey: "attack",
  color: "#b3312c",
  description: "Мистецтво ближнього бою: рівні гілки дають +10 / +20 / +30 % шкоди ближніх атак (найвищий вивчений рівень замінює нижчі), а вміння калічать, оглушають і роздягають ворога від броні.",
  appearanceDescription:
    "Іржа на гарді, зарубки на щиті й запах розпеченого заліза — так пахне шлях Нападу. Тут не чекають, поки ворог помилиться: його змушують помилитися під градом ударів.",
  levels: levels(
    "attack",
    [
      {
        name: "Базовий напад",
        description: "Шкода ближніх атак +10 %.",
        appearanceDescription:
          "Перші уроки фехтувального двору: тримати лікоть, бити з плеча, не відводити очей. Клинок ще важкуватий, але вже знає, куди йти.",
      },
      {
        name: "Просунутий напад",
        description: "Шкода ближніх атак +20 % (замінює Базовий напад).",
        appearanceDescription:
          "Удари лягають один за одним, як цвяхи під молотом теслі. Воїн уже не думає про стійку — тіло саме знаходить щілину в обороні.",
      },
      {
        name: "Експертний напад",
        description: "Шкода ближніх атак +30 % (замінює Просунутий напад).",
        appearanceDescription:
          "Сталь співає коротко й глухо, і кожна нота — чиясь розколота кіраса. Ветерани кажуть, що такий воїн б'є раніше, ніж противник встигає вирішити, як захищатися.",
      },
    ],
    (i) => [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 * (i + 1) }],
  ),
  slots: [
    [
      {
        key: "cleaving-strike",
        name: "Рублячий удар",
        iconKey: "cleaving-strike",
        description: "Влучання в ближньому бою з шансом 40 % викликає кровотечу: ціль щораунду отримує 20 % середньої шкоди вашої атаки (рубляча), 2 раунди.",
        appearanceDescription:
          "Лезо входить навскіс і виходить із хрипким шелестом, лишаючи рану, що не хоче закриватися. Ворог ще тримається на ногах, але під ним уже темніє трава.",
        abilities: [
          ability("cleaving-strike", "Рублячий удар", {
            trigger: { event: "hit", role: "attacker", attackKind: "melee" },
            limits: { chance: 40 },
            effects: [{ kind: "dot", damagePerRound: { percentOf: "ownerAttack", value: 20 }, damageType: "slashing", duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "stunning-strike",
        name: "Оглушаючий удар",
        iconKey: "stunning-strike",
        description: "Влучання в ближньому бою з шансом 40 % знижує ініціативу цілі на 2 на 2 раунди.",
        appearanceDescription:
          "Руків'я б'є в шолом із дзвоном, від якого в противника пливе світ. Він ще замахується, але рухи стали повільними, наче крізь густий мед.",
        abilities: [
          ability("stunning-strike", "Оглушаючий удар", {
            trigger: { event: "hit", role: "attacker", attackKind: "melee" },
            limits: { chance: 40 },
            effects: [{ kind: "modifyStat", stat: "initiative", flat: -2, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "armor-break",
        name: "Пошкодження броні",
        iconKey: "armor-break",
        description: "Влучання в ближньому бою з шансом 40 % знижує AC цілі на 1 на 2 раунди.",
        appearanceDescription:
          "Удар припадає точно на заклепки, і наплічник повисає на одному ремені. Крізь розсічену кольчугу видно сорочку — і наступний удар уже знає, куди цілити.",
        abilities: [
          ability("armor-break", "Пошкодження броні", {
            trigger: { event: "hit", role: "attacker", attackKind: "melee" },
            limits: { chance: 40 },
            effects: [{ kind: "modifyStat", stat: "armor", flat: -1, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
    [
      {
        key: "brutality",
        name: "Жорстокість",
        iconKey: "brutality",
        description: "Атаки ближнього бою стають критичними на 19–20 на кидку d20.",
        appearanceDescription:
          "В очах воїна спалахує холодний азарт різника. Він не шукає красивого удару — він шукає той, після якого противник більше не підводиться.",
        abilities: [
          ability("brutality", "Жорстокість", {
            trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "melee" },
            effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -1 }],
          }),
        ],
      },
      {
        key: "sequence",
        name: "Послідовність",
        iconKey: "sequence",
        description:
          "Кожне ваше влучання ставить на ціль мітку «Послідовність» на 2 раунди (мітки стакаються). Фізична шкода по цілі +2 % за кожну вашу мітку на ній.",
        appearanceDescription:
          "Перший удар — розвідка, другий — обіцянка, третій — вирок. Воїн б'є в те саме місце знову і знову, і щит противника тріщить усе голосніше.",
        abilities: [
          ability("sequence-mark", "Послідовність", {
            trigger: { event: "hit", role: "attacker" },
            effects: [{ kind: "mark", markId: "sequence", duration: { rounds: 2 }, target: "eventTarget" }],
          }),
          passive("sequence-bonus", "Послідовність", [{ kind: "damageBonus", filter: { kind: "physical" }, percent: 2, perMark: "sequence" }]),
        ],
      },
    ],
    [
      {
        key: "reward",
        name: "Нагорода",
        iconKey: "reward",
        description: "Коли ви вбиваєте ворога, ви одразу відновлюєте основну дію (не частіше 1 разу за хід).",
        appearanceDescription:
          "Тіло ворога ще падає, а воїн уже розвертається до наступного. Кров на клинку не встигає захолонути — бій для нього лише розігрівся.",
        abilities: [
          ability("reward", "Нагорода", {
            trigger: { event: "kill", role: "killer" },
            limits: { perTurn: 1 },
            effects: [{ kind: "grantAction", refreshAction: true }],
          }),
        ],
      },
    ],
  ],
  spares: [
    {
      key: "zeal",
      name: "Завзятість",
      iconKey: "zeal",
      description: "Бонусна дія: на 1 раунд фізична шкода +15 %, але AC −1.",
      appearanceDescription:
        "Воїн відкидає обережність разом зі щитом і йде вперед із бойовим ревом. Він відкритий — але кожен його удар тепер важчий за два.",
      abilities: [
        ability("zeal", "Завзятість", {
          trigger: { event: "bonusAction" },
          effects: [
            { kind: "damageBonus", filter: { kind: "physical" }, percent: 15, duration: { rounds: 1 } },
            { kind: "modifyStat", stat: "armor", flat: -1, duration: { rounds: 1 } },
          ],
        }),
      ],
    },
  ],
};

const ranged: LibraryBranch = {
  key: "ranged",
  name: "Стрільба",
  iconKey: "ranged",
  color: "#3d7a3a",
  description: "Мистецтво далекого бою: рівні гілки дають +10 / +20 / +30 % шкоди дальніх атак (найвищий вивчений рівень замінює нижчі), а вміння калічать, пробивають броню й засипають ворога стрілами.",
  appearanceDescription:
    "Скрип тятиви, шурхіт пір'я об щоку і коротка тиша перед пострілом. Стрілець не поспішає — він обирає мить, коли ворог уже нічого не встигне змінити.",
  levels: levels(
    "ranged",
    [
      {
        name: "Базова стрільба",
        description: "Шкода дальніх атак +10 %.",
        appearanceDescription:
          "Солом'яні опудала на краю табору поступово обростають стрілами саме там, де в людини серце. Рука ще тремтить на довгому натягу, але око вже не помиляється.",
      },
      {
        name: "Просунута стрільба",
        description: "Шкода дальніх атак +20 % (замінює Базову стрільбу).",
        appearanceDescription:
          "Стрілець бере поправку на вітер, не дивлячись на прапорці, — він відчуває його шкірою. Друга стріла вже на тятиві, поки перша ще летить.",
      },
      {
        name: "Експертна стрільба",
        description: "Шкода дальніх атак +30 % (замінює Просунуту стрільбу).",
        appearanceDescription:
          "Кажуть, такі лучники влучають у щілину забрала з двохсот кроків. Ворог чує лише свист — а потім уже нічого.",
      },
    ],
    (i) => [{ kind: "damageBonus", filter: { kind: "ranged" }, percent: 10 * (i + 1) }],
  ),
  slots: [
    [
      {
        key: "crippling-shot",
        name: "Травмуючий постріл",
        iconKey: "crippling-shot",
        description: "Влучання дальньою атакою з шансом 40 %: ціль атакує з невигідністю 1 раунд.",
        appearanceDescription:
          "Стріла впивається в зап'ясток, і меч у руці ворога раптом стає важким і чужим. Він ще б'є, але кожен замах дається через біль.",
        abilities: [
          ability("crippling-shot", "Травмуючий постріл", {
            trigger: { event: "hit", role: "attacker", attackKind: "ranged" },
            limits: { chance: 40 },
            effects: [{ kind: "flag", flag: "disadvantage", duration: { rounds: 1 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "piercing-bolt",
        name: "Бронебійний снаряд",
        iconKey: "piercing-bolt",
        description: "Влучання дальньою атакою з шансом 40 % знижує AC цілі на 1 на 2 раунди.",
        appearanceDescription:
          "Гранений наконечник, загартований у маслі й попелі, прошиває пластину, як вощений папір. Крізь пробоїну вже видно, де броня тримає слабше.",
        abilities: [
          ability("piercing-bolt", "Бронебійний снаряд", {
            trigger: { event: "hit", role: "attacker", attackKind: "ranged" },
            limits: { chance: 40 },
            effects: [{ kind: "modifyStat", stat: "armor", flat: -1, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "deflecting-arrow",
        name: "Відбиваюча стріла",
        iconKey: "deflecting-arrow",
        description: "Влучання дальньою атакою з шансом 40 % знижує ініціативу цілі на 2 на 2 раунди.",
        appearanceDescription:
          "Стріла б'є в край щита з такою силою, що ворога розвертає на півкроку. Поки він ловить рівновагу, бій уже пішов далі без нього.",
        abilities: [
          ability("deflecting-arrow", "Відбиваюча стріла", {
            trigger: { event: "hit", role: "attacker", attackKind: "ranged" },
            limits: { chance: 40 },
            effects: [{ kind: "modifyStat", stat: "initiative", flat: -2, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
    [
      {
        key: "bullseye",
        name: "В яблучко",
        iconKey: "bullseye",
        description: "Раз за бій ваша дальня атака гарантовано влучає.",
        appearanceDescription:
          "Стрілець затримує подих, і світ навколо стихає: ні криків, ні брязкоту — лише ціль і тонка лінія до неї. Стріла йде так, ніби її тягне нитка.",
        abilities: [
          ability("bullseye", "В яблучко", {
            trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
            limits: { perBattle: 1 },
            effects: [{ kind: "flag", flag: "guaranteedHit" }],
          }),
        ],
      },
      {
        key: "arrow-cloud",
        name: "Хмара стріл",
        iconKey: "arrow-cloud",
        description: "Бонусна дія, раз за бій: кожен ворог отримує 50 % середньої шкоди вашої атаки (колюча).",
        appearanceDescription:
          "Небо над ворожим строєм на мить темніє, ніби набігла зграя шпаків. Потім зграя падає — і не лишає жодного місця, де можна було б сховатися.",
        abilities: [
          ability("arrow-cloud", "Хмара стріл", {
            trigger: { event: "bonusAction" },
            limits: { perBattle: 1 },
            effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 50 }, damageType: "piercing", target: "allEnemies" }],
          }),
        ],
      },
    ],
    [
      {
        key: "double-shot",
        name: "Постріл по 2 цілям",
        iconKey: "double-shot",
        description: "Дальня атака може вражати на 1 ціль більше (+1 до максимуму цілей).",
        appearanceDescription:
          "Дві стріли лягають на тятиву разом, розведені на ширину пальця. Вони розходяться в польоті, як ластівки, і кожна знаходить свого ворога.",
        abilities: [passive("double-shot", "Постріл по 2 цілям", [{ kind: "modifyStat", stat: "maxTargets", flat: 1, attackKind: "ranged" }])],
      },
    ],
  ],
  spares: [
    {
      key: "force-arrow",
      name: "Стріла сили",
      iconKey: "force-arrow",
      description: "Стріла прошиває ціль наскрізь і зачіпає ворога за нею (50 % шкоди). Без сітки поля механіки немає — ефект відіграє DM.",
      appearanceDescription:
        "Стріла, пущена з такою силою, що тятива гуде ще кілька секунд, проходить крізь першого ворога, не сповільнюючись. Другий навіть не встигає зрозуміти, звідки вона взялася.",
      abilities: [passive("force-arrow", "Стріла сили", [{ kind: "note", text: "Стріла вражає й ворога позаду цілі (50 % шкоди) — відіграє DM." }])],
    },
  ],
};

const defense: LibraryBranch = {
  key: "defense",
  name: "Захист",
  iconKey: "defense",
  color: "#4f6d8a",
  description: "Мистецтво вистояти: рівні гілки дають опір фізичній шкоді 10 / 20 / 30 % (найвищий вивчений рівень замінює нижчі), а вміння тримають героя на ногах і прикривають союзників.",
  appearanceDescription:
    "Щит, побитий так, що на ньому вже не розібрати герба, і воїн, що стоїть за ним, не відступивши ні на крок. Захист — це не страх перед ударом, а впевненість, що він нічого не змінить.",
  levels: levels(
    "defense",
    [
      {
        name: "Базовий захист",
        description: "Опір фізичній шкоді 10 %.",
        appearanceDescription:
          "Новобранець учиться приймати удар на щит під кутом, щоб сталь ковзала, а не била. Синці ще болять, але руки вже не опускаються.",
      },
      {
        name: "Просунутий захист",
        description: "Опір фізичній шкоді 20 % (замінює Базовий захист).",
        appearanceDescription:
          "Воїн ловить удари так спокійно, наче відмахується від мух. Важкі сокири гаснуть на окуті щита, лишаючи тільки глухий гул.",
      },
      {
        name: "Експертний захист",
        description: "Опір фізичній шкоді 30 % (замінює Просунутий захист).",
        appearanceDescription:
          "Він стоїть посеред сутички, мов скеля серед прибою: хвилі б'ють, розбиваються й відкочуються. Ворогам починає здаватися, що їхня зброя затупилася.",
      },
    ],
    (i) => [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 10 * (i + 1) }],
  ),
  slots: [
    [
      {
        key: "endurance",
        name: "Стійкість",
        iconKey: "endurance",
        description: "Максимальне HP + 2 × рівень героя.",
        appearanceDescription:
          "Роки в сідлі й на марші зробили тіло жорстким, як сиром'ятний ремінь. Там, де інший уже впав би, цей лише сплюне кров і підніме меч.",
        abilities: [passive("endurance", "Стійкість", [{ kind: "modifyStat", stat: "maxHp", flat: { formula: "2*hero_level" } }])],
      },
      {
        key: "resilience",
        name: "Супротив",
        iconKey: "resilience",
        description: "Раз за бій, коли вас вражають при HP ≤ 15 %, з вас знімаються всі негативні ефекти та стани.",
        appearanceDescription:
          "На краю загибелі в грудях спалахує щось уперте й первісне. Отрута випаровується з крові, чари обсипаються з плечей, мов іній, — і герой знову бачить ясно.",
        abilities: [
          ability("resilience", "Супротив", {
            trigger: { event: "hit", role: "target" },
            condition: { type: "hpBelow", who: "self", percent: 15 },
            limits: { perBattle: 1 },
            effects: [{ kind: "cleanse", includeConditions: true }],
          }),
        ],
      },
      {
        key: "guardian",
        name: "Перенаправлення",
        iconKey: "guardian",
        description: "Бонусна дія на союзника: 1 раунд ви берете на себе 50 % шкоди від атак по ньому.",
        appearanceDescription:
          "Герой стає поруч із пораненим товаришем і підставляє щит під удари, призначені не йому. Сталь б'є по сталі, і половина болю дістається тому, хто сам її обрав.",
        abilities: [
          ability("guardian", "Перенаправлення", {
            trigger: { event: "bonusAction" },
            effects: [{ kind: "guard", percent: 50, duration: { rounds: 1 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
    [
      {
        key: "last-stand",
        name: "Битва до останнього",
        iconKey: "last-stand",
        description: "Раз за бій смертельна шкода не вбиває вас — ви лишаєтеся з 1 HP.",
        appearanceDescription:
          "Удар, що мав стати останнім, кидає героя на коліна — але не на землю. Він підводиться, тримаючись за древко прапора, і вороги на мить відступають.",
        abilities: [
          ability("last-stand", "Битва до останнього", {
            trigger: { event: "lethalDamage" },
            limits: { perBattle: 1 },
            effects: [{ kind: "heal", amount: 1, revive: true }],
          }),
        ],
      },
      {
        key: "magic-ward",
        name: "Магічний захист",
        iconKey: "magic-ward",
        description: "Опір шкоді заклять +15 %.",
        appearanceDescription:
          "Обереги, вшиті під підкладку плаща, тихо теплішають, коли поруч твориться ворожа волшба. Полум'я заклять обтікає героя, мов вода камінь.",
        abilities: [passive("magic-ward", "Магічний захист", [{ kind: "flag", flag: "resistance", damageType: "spell", percent: 15 }])],
      },
    ],
    [
      {
        key: "readiness",
        name: "Готовність",
        iconKey: "readiness",
        description:
          "Раз за раунд, перед атакою ближнього бою по вас, атакуючий отримує 50 % середньої шкоди вашої атаки. Якщо він від цього гине, його атака скасовується.",
        appearanceDescription:
          "Герой не чекає удару — він зустрічає його. Ворог робить крок для замаху й наштовхується на вістря, що вже чекало саме там.",
        abilities: [
          ability("readiness", "Готовність", {
            trigger: { event: "attack", phase: "before", role: "target", attackKind: "melee" },
            limits: { perRound: 1 },
            effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 50 }, target: "eventActor" }],
          }),
        ],
      },
    ],
  ],
  spares: [
    {
      key: "thorn-armor",
      name: "Колюча броня",
      iconKey: "thorn-armor",
      description: "Раз за бій, коли вас вражає фізична атака, атакуючий отримує 100 % завданої вам шкоди.",
      appearanceDescription:
        "Обладунок укритий дрібними шипами, як шкура їжака, і кожен, хто вдарить надто сильно, залишає на них власну плоть. Брязкіт удару й крик нападника звучать одночасно.",
      abilities: [
        ability("thorn-armor", "Колюча броня", {
          trigger: { event: "hit", role: "target" },
          condition: { type: "not", condition: { type: "attackKind", kind: "magic" } },
          limits: { perBattle: 1 },
          effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 100 }, target: "eventActor" }],
        }),
      ],
    },
  ],
};

const leadership: LibraryBranch = {
  key: "leadership",
  name: "Лідерство",
  iconKey: "leadership",
  color: "#c9a227",
  description: "Мистецтво вести за собою: рівні гілки дають мораль +1 / +2 / +3 і всім союзникам +5 / +10 / +15 % до шансу додаткового ходу від моралі (найвищий вивчений рівень замінює нижчі), а вміння перетворюють бойовий дух загону на ініціативу й шкоду.",
  appearanceDescription:
    "Прапор над головою, голос, що перекриває гул битви, і погляд, під яким утомлені солдати знову стають у стрій. Лідер не завжди б'є першим — але за ним завжди йдуть.",
  levels: levels(
    "leadership",
    [
      {
        name: "Базове лідерство",
        description: "Мораль +1; ви і союзники отримуєте +5 % до шансу додаткового ходу від моралі.",
        appearanceDescription:
          "Кілька влучних слів біля вогнища — і загін сміється вперше за тиждень. Наступного ранку вони марширують бадьоріше, ніж учора.",
      },
      {
        name: "Просунуте лідерство",
        description: "Мораль +2; ви і союзники отримуєте +10 % до шансу додаткового ходу від моралі (замінює Базове лідерство).",
        appearanceDescription:
          "Солдати шукають командира очима посеред сутички й заспокоюються, побачивши його прапор. Стрій тримається там, де інший давно розсипався б.",
      },
      {
        name: "Експертне лідерство",
        description: "Мораль +3; ви і союзники отримуєте +15 % до шансу додаткового ходу від моралі (замінює Просунуте лідерство).",
        appearanceDescription:
          "Його ім'я вигукують, ідучи в атаку, і шепочуть, перев'язуючи рани. За таким полководцем ідуть навіть у безнадійний бій — і часом його виграють.",
      },
    ],
    (i) => [
      { kind: "modifyStat", stat: "morale", flat: i + 1 },
      { kind: "flag", flag: "moraleChance", percent: 5 * (i + 1), target: "allAllies" },
    ],
  ),
  slots: [
    [
      {
        key: "empathy",
        name: "Співпереживання",
        iconKey: "empathy",
        description: "Коли союзник проходить перевірку моралі, він отримує +1 ініціативи на 2 раунди (ефект стакається).",
        appearanceDescription:
          "Чужа відвага передається, як іскра по сухій траві. Один солдат кидається вперед — і ті, хто поруч, уже не можуть стояти на місці.",
        abilities: [
          ability("empathy", "Співпереживання", {
            trigger: { event: "moraleCheck", result: "success", whose: "ally" },
            stackable: true,
            effects: [{ kind: "modifyStat", stat: "initiative", flat: 1, duration: { rounds: 2 }, target: "eventActor" }],
          }),
        ],
      },
      {
        key: "restoration",
        name: "Відновлення",
        iconKey: "restoration",
        description: "Ваша від'ємна мораль вважається рівною 0.",
        appearanceDescription:
          "Навіть після найгіршої поразки герой першим підводиться з багна й обтрушує плащ. Відчай стікає з нього, як дощова вода з обладунку.",
        abilities: [passive("restoration", "Відновлення", [{ kind: "flag", flag: "noNegativeMorale" }])],
      },
      {
        key: "retribution",
        name: "Відплата",
        iconKey: "retribution",
        description: "Фізична шкода +5 % за кожне очко вашої моралі.",
        appearanceDescription:
          "Що вище дух загону, то важче падає його меч. Бойовий клич перетворюється на силу в руках, і кожен удар несе в собі гнів усіх, хто стоїть поруч.",
        abilities: [passive("retribution", "Відплата", [{ kind: "damageBonus", filter: { kind: "physical" }, percent: { formula: "5*morale" } }])],
      },
    ],
    [
      {
        key: "inspiration",
        name: "Натхнення",
        iconKey: "inspiration",
        description: "Бонусна дія, 2 рази за бій: союзник отримує +1 моралі на 2 раунди.",
        appearanceDescription:
          "Командир кладе руку на плече бійцеві й каже кілька слів, яких ніхто більше не чує. Боєць розправляє плечі, і в його погляді знову горить вогонь.",
        abilities: [
          ability("inspiration", "Натхнення", {
            trigger: { event: "bonusAction" },
            limits: { perBattle: 2 },
            effects: [{ kind: "modifyStat", stat: "morale", flat: 1, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "vengeance",
        name: "Помста",
        iconKey: "vengeance",
        description: "Кожне вбивство ворога вашою стороною дає вам +1 моралі; кожна загибель союзника — −2 моралі (мораль у межах ±3).",
        appearanceDescription:
          "Кожен повалений ворог розпалює в серці героя холодну радість, кожен загиблий товариш — чорну тугу. Він рахує їх усіх, і рахунок цей видно в його очах.",
        abilities: [
          ability("vengeance-kill", "Помста", {
            trigger: { event: "kill", role: "killerSide" },
            effects: [{ kind: "changeMorale", delta: 1 }],
          }),
          ability("vengeance-loss", "Помста", {
            trigger: { event: "kill", role: "victimSide" },
            effects: [{ kind: "changeMorale", delta: -2 }],
          }),
        ],
      },
    ],
    [
      {
        key: "success",
        name: "Успіх",
        iconKey: "success",
        description: "Кожна ваша успішна перевірка моралі дає +8 % до всієї шкоди на 3 раунди (ефект стакається).",
        appearanceDescription:
          "Удача любить сміливих, і герой відчуває її подих на потилиці. Кожен вдалий порив додає йому сили, і він мчить уперед на хвилі власного запалу.",
        abilities: [
          ability("success", "Успіх", {
            trigger: { event: "moraleCheck", result: "success", whose: "self" },
            stackable: true,
            effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 8, duration: { rounds: 3 } }],
          }),
        ],
      },
    ],
  ],
  spares: [],
};

const light: LibraryBranch = {
  key: "light",
  name: "Світло",
  iconKey: "light",
  color: "#e8c547",
  spellSchool: LIGHT,
  description: "Магія баффів і зцілення: рівні гілки відкривають закляття Світла, а вміння поширюють їх на кількох або всіх союзників.",
  appearanceDescription:
    "Тепле золоте сяйво, запах ладану й тихий дзвін, що чути лише серцем. Магія Світла не руйнує — вона робить сильнішими тих, кого торкається.",
  levels: levels(
    "light",
    [
      {
        name: "Базова магія Світла",
        description: spellAccessText(LIGHT, 0),
        appearanceDescription:
          "Перші молитви звучать невпевнено, але над долонями вже тремтить ледь помітне сяйво. Рани від нього не гояться — та біль стихає.",
      },
      {
        name: "Просунута магія Світла",
        description: spellAccessText(LIGHT, 1),
        appearanceDescription:
          "Світло вже не тремтить, а ллється рівно, як мед із глечика. Союзники відчувають його спиною ще до того, як закляття завершене.",
      },
      {
        name: "Експертна магія Світла",
        description: spellAccessText(LIGHT, 2),
        appearanceDescription:
          "Коли маг підносить руки, тіні на полі бою коротшають, а в очах поранених запалюються іскри. Його світло видно з-за пагорбів, як світанок.",
      },
    ],
    spellAccess(LIGHT),
  ),
  slots: [
    [
      {
        key: "righteous-wrath",
        name: "Гнів праведний",
        iconKey: "righteous-wrath",
        description: `Закляття «Праведна міць» і «Поспіх» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Священний гнів розливається від мага хвилею, і кілька воїнів одночасно відчувають, як їхні руки наливаються силою. Над їхніми головами на мить спалахують золоті німби.",
        abilities: [
          passive("righteous-wrath", "Гнів праведний", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["righteous-might", "haste"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
      {
        key: "granting-protection",
        name: "Даруючий захист",
        iconKey: "granting-protection",
        description: `Закляття «Ухилення» і «Кам'яна шкіра» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Маг розкидає руки, і над загоном розгортаються прозорі щити, схожі на крила бабки. Стріли й клинки ковзають по них, викрешуючи бліді іскри.",
        abilities: [
          passive("granting-protection", "Даруючий захист", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["evasion", "stoneskin"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
      {
        key: "granting-blessing",
        name: "Даруючий благословення",
        iconKey: "granting-blessing",
        description: `Закляття «Божественна сила» і «Очищення» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Благословення падає на загін, як теплий літній дощ, змиваючи прокляття й наливаючи зброю світлом. Воїни переглядаються, не розуміючи, звідки взялася ця легкість.",
        abilities: [
          passive("granting-blessing", "Даруючий благословення", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["divine-strength", "cleansing"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
    ],
    [
      {
        key: "eternal-light",
        name: "Вічне світло",
        iconKey: "eternal-light",
        newSpellKey: "eternal-light",
        description: "Відкриває нове закляття «Вічне світло» — сильне лікування союзника з подальшою регенерацією.",
        appearanceDescription:
          "Маг пізнає світло, що горить не в небі, а глибоко в кожній живій істоті. Тепер він уміє роздмухати цей вогник навіть у тому, хто вже ледь дихає.",
        abilities: [passive("eternal-light", "Вічне світло", [{ kind: "note", text: "Дає закляття «Вічне світло»." }])],
      },
      {
        key: "divine-power",
        name: "Божа сила",
        iconKey: "divine-power",
        description: "Шкода заклять школи Світла +25 %.",
        appearanceDescription:
          "Мана стає чистою, як гірське джерело, без жодної каламуті сумніву. Кожне закляття Світла звучить гучніше й сяє яскравіше, ніж раніше.",
        abilities: [passive("divine-power", "Божа сила", [{ kind: "damageBonus", filter: { kind: "magic", school: LIGHT }, percent: 25 }])],
      },
    ],
    [
      {
        key: "benediction",
        name: "Благословення",
        iconKey: "benediction",
        description: "Закляття Світла до 4 рівня включно діють на всіх союзників.",
        appearanceDescription:
          "Над полем бою розкриваються незримі крила, і їхня тінь падає на кожного союзника одночасно. Одне слово мага — і весь загін сяє, як вітраж на сонці.",
        abilities: [passive("benediction", "Благословення", [{ kind: "flag", flag: "spellTargeting", mode: "all", school: LIGHT, maxLevel: 4 }])],
      },
    ],
  ],
  spares: [],
};

const dark: LibraryBranch = {
  key: "dark",
  name: "Темрява",
  iconKey: "dark",
  color: "#5b3a7a",
  spellSchool: DARK,
  description: "Магія прокльонів і дебаффів: рівні гілки відкривають закляття Темряви, а вміння поширюють їх на кількох або всіх ворогів.",
  appearanceDescription:
    "Холод, що підкрадається від ніг, шепіт без джерела й тіні, які рухаються трохи не в такт. Темрява не палить — вона повільно висмоктує з ворога силу й волю.",
  levels: levels(
    "dark",
    [
      {
        name: "Базова магія Темряви",
        description: spellAccessText(DARK, 0),
        appearanceDescription:
          "Перші прокльони виходять кволими, як подих у морозну ніч. Та ворог уже відчуває незрозумілу важкість у руках і не знає, звідки вона.",
      },
      {
        name: "Просунута магія Темряви",
        description: spellAccessText(DARK, 1),
        appearanceDescription:
          "Тіні слухаються мага, як зграя гончаків, і самі знаходять жертву. Прокляття лягають густо й надовго, мов сажа на стіни.",
      },
      {
        name: "Експертна магія Темряви",
        description: spellAccessText(DARK, 2),
        appearanceDescription:
          "Коли цей маг промовляє закляття, свічки в таборі ворога гаснуть самі собою. Навіть хоробрі ветерани відчувають, як щось чуже ворушиться в їхніх думках.",
      },
    ],
    spellAccess(DARK),
  ),
  slots: [
    [
      {
        key: "master-of-pain",
        name: "Повелитель болі",
        iconKey: "master-of-pain",
        description: `Закляття «Чума» і «Страждання» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Біль розповзається від однієї жертви до іншої, як тріщина по кризі. Ворожі воїни корчаться один за одним, не розуміючи, хто їх уразив.",
        abilities: [
          passive("master-of-pain", "Повелитель болі", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["plague", "suffering"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
      {
        key: "master-of-mind",
        name: "Повелитель розуму",
        iconKey: "master-of-mind",
        description: `Закляття «Сповільнення» і «Розсіяність» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Над ворожим строєм пливе сірий туман, і думки солдатів стають в'язкими, мов болото. Наказ командира доходить до них, наче крізь товщу води.",
        abilities: [
          passive("master-of-mind", "Повелитель розуму", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["slow", "confusion"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
      {
        key: "master-of-curses",
        name: "Повелитель проклять",
        iconKey: "master-of-curses",
        description: `Закляття «Ослаблення» і «Немічність» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Маг вимовляє одне слово, а прокляття чіпляється одразу до кількох ворогів, як реп'яхи до плаща. Їхні обладунки тьмяніють, а мечі важчають.",
        abilities: [
          passive("master-of-curses", "Повелитель проклять", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["weakness", "frailty"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
    ],
    [
      {
        key: "deaths-march",
        name: "Поступ смерті",
        iconKey: "deaths-march",
        description: "Шкода заклять школи Темряви +25 %.",
        appearanceDescription:
          "На пальцях мага проступають чорні печатки, що пульсують у такт серцю. Його прокляття тепер мають присмак могильної землі й тримаються міцніше.",
        abilities: [passive("deaths-march", "Поступ смерті", [{ kind: "damageBonus", filter: { kind: "magic", school: DARK }, percent: 25 }])],
      },
      {
        key: "devourer",
        name: "Пожирач",
        iconKey: "devourer",
        description: "Бонусна дія по мертвому юніту, 2 рази за бій: відновлює 1 слот заклять.",
        appearanceDescription:
          "Маг схиляється над полеглим, і з тіла здіймається блідий дим, що втягується в його ніздрі. Мертвому ця сила вже ні до чого — а живому знадобиться.",
        abilities: [
          ability("devourer", "Пожирач", {
            trigger: { event: "bonusAction" },
            condition: { type: "targetDead" },
            limits: { perBattle: 2 },
            effects: [{ kind: "restoreSpellSlot", count: 1 }],
          }),
        ],
      },
    ],
    [
      {
        key: "dark-master",
        name: "Майстер темряви",
        iconKey: "dark-master",
        description: "Закляття Темряви до 4 рівня включно діють на всіх ворогів.",
        appearanceDescription:
          "Тінь мага витягується через усе поле бою й торкається кожного ворога водночас. Одне прокляття — і цілий загін схиляє голови під невидимим тягарем.",
        abilities: [passive("dark-master", "Майстер темряви", [{ kind: "flag", flag: "spellTargeting", mode: "all", school: DARK, maxLevel: 4 }])],
      },
    ],
  ],
  spares: [
    {
      key: "compensation",
      name: "Компенсація",
      iconKey: "compensation",
      description: "Під час атаки іноді спрацьовує випадкове закляття 1–3 рівня. Рушій не кастує випадкових заклять — ефект відіграє DM.",
      appearanceDescription:
        "Мана в жилах мага неспокійна й час від часу виривається сама, без дозволу. Ніхто — навіть він — не знає, яким закляттям вона спалахне цього разу.",
      abilities: [passive("compensation", "Компенсація", [{ kind: "note", text: "Атака може викликати випадкове закляття 1–3 рівня — відіграє DM." }])],
    },
  ],
};

const chaos: LibraryBranch = {
  key: "chaos",
  name: "Хаос",
  iconKey: "chaos",
  color: "#d4561e",
  spellSchool: CHAOS,
  description: "Магія руйнування: рівні гілки відкривають закляття Хаосу, а вміння додають до стихійних заклять ослаблення, підпал і відплату ворожим магам.",
  appearanceDescription:
    "Запах озону й паленого волосся, тріск повітря, що не витримує напруги. Хаос не просить — він бере, і за кожне закляття хтось платить попелом.",
  levels: levels(
    "chaos",
    [
      {
        name: "Базова магія Хаосу",
        description: spellAccessText(CHAOS, 0),
        appearanceDescription:
          "Між пальцями учня проскакують іскри, і він ще не завжди знає, куди вони полетять. Та навіть ці перші спалахи лишають на щитах ворога чорні плями.",
      },
      {
        name: "Просунута магія Хаосу",
        description: spellAccessText(CHAOS, 1),
        appearanceDescription:
          "Полум'я і грім тепер слухаються мага, як дресировані звірі. Він кидає закляття недбало, майже ліниво — і земля під ворогами починає диміти.",
      },
      {
        name: "Експертна магія Хаосу",
        description: spellAccessText(CHAOS, 2),
        appearanceDescription:
          "Небо над цим магом темніє від хмар, що з'являються нізвідки. Коли він підносить посох, навіть союзники мимоволі відступають на крок.",
      },
    ],
    spellAccess(CHAOS),
  ),
  slots: [
    [
      {
        key: "master-of-storms",
        name: "Повелитель бурі",
        iconKey: "master-of-storms",
        description: "Ціль ваших заклять «Блискавка» і «Ланцюгова блискавка» отримує −5 ініціативи на 2 раунди.",
        appearanceDescription:
          "Блискавка лишає в тілі ворога тремтливий гул, від якого сіпаються м'язи й тремтять коліна. Він ще довго рухається уривками, як маріонетка з переплутаними нитками.",
        abilities: [
          ability("master-of-storms", "Повелитель бурі", {
            trigger: { event: "spellCast", phase: "after", role: "caster", spellIds: ["lightning-bolt", "chain-lightning"] },
            effects: [{ kind: "modifyStat", stat: "initiative", flat: -5, duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "master-of-fire",
        name: "Повелитель вогню",
        iconKey: "master-of-fire",
        description: "Ціль ваших заклять «Вогняна куля», «Вогняна стіна» і «Армагеддон» отримує −30 % AC на 1 раунд.",
        appearanceDescription:
          "Полум'я мага не просто палить — воно розм'якшує метал. Обладунки ворогів червоніють і обвисають, а ремені на них тліють і рвуться.",
        abilities: [
          ability("master-of-fire", "Повелитель вогню", {
            trigger: { event: "spellCast", phase: "after", role: "caster", spellIds: ["fireball", "fire-wall", "armageddon"] },
            effects: [{ kind: "modifyStat", stat: "armor", percent: -30, duration: { rounds: 1 }, target: "eventTarget" }],
          }),
        ],
      },
      {
        key: "master-of-ice",
        name: "Повелитель холоду",
        iconKey: "master-of-ice",
        description: "Ціль ваших заклять «Крижаний болт», «Коло зими» і «Глибока заморозка» атакує з невигідністю 1 раунд.",
        appearanceDescription:
          "Іній укриває пальці ворога, і руків'я меча примерзає до рукавиці. Кожен його замах тепер скутий і запізнілий, як рух уві сні.",
        abilities: [
          ability("master-of-ice", "Повелитель холоду", {
            trigger: { event: "spellCast", phase: "after", role: "caster", spellIds: ["ice-bolt", "circle-of-winter", "deep-freeze"] },
            effects: [{ kind: "flag", flag: "disadvantage", duration: { rounds: 1 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
    [
      {
        key: "mana-burst",
        name: "Вибух мани",
        iconKey: "mana-burst",
        description:
          "Коли ворог чаклує закляття, ціллю якого є ви, з шансом 50 % (до 2 разів за бій) заклинатель отримує 50 % середньої шкоди вашої атаки (силова).",
        appearanceDescription:
          "Чуже закляття врізається в героя й розколюється, як скло, — а уламки летять назад у того, хто його кинув. Ворожий маг відсахується, витираючи кров із носа.",
        abilities: [
          ability("mana-burst", "Вибух мани", {
            trigger: { event: "spellCast", phase: "after", role: "target" },
            condition: { type: "actorIsEnemy" },
            limits: { perBattle: 2, chance: 50 },
            effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 50 }, damageType: "force", target: "eventActor" }],
          }),
        ],
      },
      {
        key: "infernal-power",
        name: "Пекельна сила",
        iconKey: "infernal-power",
        description: "Шкода заклять школи Хаосу +25 %.",
        appearanceDescription:
          "Маг осягає таємниці руйнування, записані попелом на сторінках, що не горять. Його вогонь стає білим, а грім — оглушливим.",
        abilities: [passive("infernal-power", "Пекельна сила", [{ kind: "damageBonus", filter: { kind: "magic", school: CHAOS }, percent: 25 }])],
      },
    ],
    [
      {
        key: "pyrokinesis",
        name: "Пірокінез",
        iconKey: "pyrokinesis",
        description: "Ціль кожного вашого закляття Хаосу загоряється: щораунду 20 % середньої шкоди вашої атаки вогнем, 3 раунди.",
        appearanceDescription:
          "Після кожного закляття на ворогах лишаються вогники, що не гаснуть ні від води, ні від піску. Вони повзуть по одягу й волоссю, доки не доїдять своє.",
        abilities: [
          ability("pyrokinesis", "Пірокінез", {
            trigger: { event: "spellCast", phase: "after", role: "caster", school: CHAOS },
            effects: [{ kind: "dot", damagePerRound: { percentOf: "ownerAttack", value: 20 }, damageType: "fire", duration: { rounds: 3 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
  ],
  spares: [
    {
      key: "fire-attack",
      name: "Вогняна атака",
      iconKey: "fire-attack",
      description: "Кожне ваше влучання атакою додатково завдає 15 % середньої шкоди вашої атаки вогнем.",
      appearanceDescription:
        "Клинок героя жевріє, як щойно вийнятий із горна, і кожен удар лишає на ворогові обпечений слід. Повітря навколо леза дрижить від жару.",
      abilities: [
        ability("fire-attack", "Вогняна атака", {
          trigger: { event: "hit", role: "attacker" },
          condition: { type: "not", condition: { type: "attackKind", kind: "magic" } },
          effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: 15 }, damageType: "fire", target: "eventTarget" }],
        }),
      ],
    },
  ],
};

const nature: LibraryBranch = {
  key: "nature",
  name: "Природа",
  iconKey: "nature",
  color: "#6b8e23",
  spellSchool: NATURE,
  description: "Магія друїдів: рівні гілки відкривають закляття Природи, а вміння зцілюють загін, ранять нападників шипами й отруюють ворогів.",
  appearanceDescription:
    "Запах вологого моху, гудіння бджіл і коріння, що ворушиться під ногами. Природа не знає жалю, але й не знає злості — вона просто бере своє.",
  levels: levels(
    "nature",
    [
      {
        name: "Базова магія Природи",
        description: spellAccessText(NATURE, 0),
        appearanceDescription:
          "Друїд прикладає долоню до землі, і трава під нею відгукується легким тремтінням. Ліс поки лише прислухається до нього — але вже не відвертається.",
      },
      {
        name: "Просунута магія Природи",
        description: spellAccessText(NATURE, 1),
        appearanceDescription:
          "Лози тягнуться до друїда, як пси до господаря, а птахи замовкають, коли він говорить. Його закляття пахнуть живицею й грозою.",
      },
      {
        name: "Експертна магія Природи",
        description: spellAccessText(NATURE, 2),
        appearanceDescription:
          "Там, де ступає цей друїд, крізь каміння пробиваються паростки. Ліс говорить його голосом, і горе тому, хто прийшов у нього з сокирою.",
      },
    ],
    spellAccess(NATURE),
  ),
  slots: [
    [
      {
        key: "forest-lord",
        name: "Повелитель лісу",
        iconKey: "forest-lord",
        description: `Закляття контролю Природи «Корені» і «Сплутування» діють по області — до ${AREA_TARGETS} цілей.`,
        appearanceDescription:
          "Друїд тупає ногою, і земля під ворожим строєм тріскається, випускаючи вузлувате коріння. Воно хапає за щиколотки одразу кількох, тягне вниз і не відпускає.",
        abilities: [
          passive("forest-lord", "Повелитель лісу", [
            { kind: "flag", flag: "spellTargeting", mode: "area", spellIds: ["roots", "entangle"], maxTargets: AREA_TARGETS },
          ]),
        ],
      },
      {
        key: "life-force",
        name: "Сила життя",
        iconKey: "life-force",
        description: "На початку кожного раунду кожен ваш союзник відновлює 3 % свого максимального HP.",
        appearanceDescription:
          "Від друїда розходиться ледь помітне зелене світло, як від світляків у літню ніч. Подряпини затягуються, а втома тане, наче роса на сонці.",
        abilities: [
          ability("life-force", "Сила життя", {
            trigger: { event: "roundStart" },
            effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 3 }, target: "allAllies" }],
          }),
        ],
      },
      {
        key: "thorns",
        name: "Шипи",
        iconKey: "thorns",
        description: "Коли вас або будь-якого вашого союзника вражає атака ближнього бою, нападник отримує 15 % завданої цілі шкоди (колюча).",
        appearanceDescription:
          "Шкіра друїда і його побратимів вкривається тонкою корою з гострими, як терен, колючками. Кожен, хто б'є впритул, відсмикує руку, закривавлену до ліктя.",
        abilities: [
          ability("thorns", "Шипи", {
            trigger: { event: "hit", role: "target", attackKind: "melee" },
            effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 15 }, damageType: "piercing", target: "eventActor" }],
          }),
          ability("thorns-allies", "Шипи", {
            trigger: { event: "hit", role: "target", whose: "ally", attackKind: "melee" },
            effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: 15 }, damageType: "piercing", target: "eventActor" }],
          }),
        ],
      },
    ],
    [
      {
        key: "call-of-the-beast",
        name: "Поклик звіра",
        iconKey: "call-of-the-beast",
        newSpellKey: "call-of-the-beast",
        description: "Відкриває нове закляття «Поклик звіра» — призив істоти, яку DM обирає в закляття.",
        appearanceDescription:
          "Друїд сурмить у ріг, вирізаний з оленячого рогу, і ліс відповідає ревом. З-за дерев виходить звір, що пам'ятає ще стародавні присяги.",
        abilities: [passive("call-of-the-beast", "Поклик звіра", [{ kind: "note", text: "Дає закляття «Поклик звіра»." }])],
      },
      {
        key: "natures-poison",
        name: "Отрута природи",
        iconKey: "natures-poison",
        description: "Ціль кожного вашого ворожого закляття Природи отруюється: щораунду 15 % середньої шкоди вашої атаки отрутою, 2 раунди.",
        appearanceDescription:
          "Кожне закляття друїда несе в собі пилок, сік і жало. Рани ворогів набрякають і синіють, а дихання стає хрипким і важким.",
        abilities: [
          ability("natures-poison", "Отрута природи", {
            trigger: { event: "spellCast", phase: "after", role: "caster", spellIds: HOSTILE_NATURE_SPELLS },
            effects: [{ kind: "dot", damagePerRound: { percentOf: "ownerAttack", value: 15 }, damageType: "poison", duration: { rounds: 2 }, target: "eventTarget" }],
          }),
        ],
      },
    ],
    [
      {
        key: "natures-wrath",
        name: "Гнів природи",
        iconKey: "natures-wrath",
        description: "Закляття Природи до 4 рівня включно діють на всіх: зцілення — на всіх союзників, шкода й контроль — на всіх ворогів.",
        appearanceDescription:
          "Друїд розкидає руки, і весь ліс довкола вдихає разом із ним. Одне закляття котиться полем, як вітер по траві, і не оминає жодної стеблини.",
        abilities: [passive("natures-wrath", "Гнів природи", [{ kind: "flag", flag: "spellTargeting", mode: "all", school: NATURE, maxLevel: 4 }])],
      },
    ],
  ],
  spares: [
    {
      key: "banish",
      name: "Вигнання",
      iconKey: "banish",
      description: "Призвані ворогом істоти слабшають: DM знімає їм 50 % HP. Рушій не розрізняє призваних істот — ефект відіграє DM.",
      appearanceDescription:
        "Друїд промовляє старе слово, і чужі, прикликані з інших світів істоти починають мерехтіти й блякнути. Їхні обриси пливуть, як дим над вогнищем.",
      abilities: [passive("banish", "Вигнання", [{ kind: "note", text: "Ворожі призвані істоти втрачають 50 % HP — відіграє DM." }])],
    },
    {
      key: "chosen-elemental",
      name: "Обраний елементаль",
      iconKey: "chosen-elemental",
      description: "Дає закляття призиву обраного елементаля (у бібліотеці його немає — DM додає закляття вручну).",
      appearanceDescription:
        "Друїд укладає договір з однією зі стихій, і вона відтепер приходить на його поклик у звичній подобі. Хтось чує в ній тріск полум'я, хтось — шум прибою.",
      abilities: [passive("chosen-elemental", "Обраний елементаль", [{ kind: "note", text: "Закляття призиву обраного елементаля додає DM." }])],
    },
    {
      key: "forest-roots",
      name: "Корені лісу",
      iconKey: "forest-roots",
      grantedSpellKey: "roots",
      description: "Дає закляття «Корені».",
      appearanceDescription:
        "Друїд вивчає мову коріння, що тисячоліттями тримає ліс на місці. Тепер він може попросити його втримати й ворога.",
      abilities: [passive("forest-roots", "Корені лісу", [{ kind: "note", text: "Дає закляття «Корені»." }])],
    },
    {
      key: "eternal-warriors",
      name: "Вічні воїни",
      iconKey: "eternal-warriors",
      description: "Закляття призиву елементалів прикликають по 2 істоти. Рушій не змінює кількість призваних — ефект відіграє DM.",
      appearanceDescription:
        "Замість одного вартового з полум'я чи каменю з'являються двоє — близнюки, що рухаються в одному ритмі. Вони не знають утоми й не знають страху.",
      abilities: [passive("eternal-warriors", "Вічні воїни", [{ kind: "note", text: "Призив елементалів дає по 2 істоти — відіграє DM." }])],
    },
    {
      key: "life-lord",
      name: "Повелитель життя",
      iconKey: "life-lord",
      description: "Шкода заклять школи Природи +15 %.",
      appearanceDescription:
        "Друїд чує, як б'ються серця всіх живих істот навколо, і може вплести їхній ритм у свої закляття. Його магія пульсує, як жива плоть.",
      abilities: [passive("life-lord", "Повелитель життя", [{ kind: "damageBonus", filter: { kind: "magic", school: NATURE }, percent: 15 }])],
    },
  ],
};

export const BRANCHES: LibraryBranch[] = [attack, ranged, defense, leadership, light, dark, chaos, nature];

export const REFERENCED_SPELL_KEYS = [
  "righteous-might",
  "haste",
  "evasion",
  "stoneskin",
  "divine-strength",
  "cleansing",
  "eternal-light",
  "plague",
  "suffering",
  "slow",
  "confusion",
  "weakness",
  "frailty",
  "lightning-bolt",
  "chain-lightning",
  "fireball",
  "fire-wall",
  "armageddon",
  "ice-bolt",
  "circle-of-winter",
  "deep-freeze",
  "call-of-the-beast",
  ...HOSTILE_NATURE_SPELLS,
];
