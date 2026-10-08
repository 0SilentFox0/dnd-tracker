import type { LibraryRace, LibrarySkill } from "./types";

import type { Ability } from "@/lib/utils/abilities/schema";

/** Максимум слотів рівнів магії 1–5; відкриваються за кривою заклинача 5e (див. calculateSpellSlotsForLevel). */
const STANDARD_SLOTS = [
  { level: 1, slots: 4 },
  { level: 2, slots: 3 },
  { level: 3, slots: 3 },
  { level: 4, slots: 2 },
  { level: 5, slots: 1 },
];

const LEVELS = ["basic", "advanced", "expert"] as const;

const LEVEL_NAMES = { basic: "Базовий", advanced: "Просунутий", expert: "Експерт" } as const;

type Level = (typeof LEVELS)[number];

interface RacialLevel {
  description: string;
  appearanceDescription: string;
  abilities: Ability[];
}

const LEVEL_ICON_OVERRIDES: Partial<Record<string, Record<Level, string>>> = {
  "dark-elves": {
    basic: "dark-elves-dark-ritual",
    advanced: "dark-elves-elemental-vision",
    expert: "dark-elves-rage-of-the-elements",
  },
};

const ULTIMATE_ICON_OVERRIDES: Partial<Record<string, string>> = { "dark-elves": "dark-elves-empowered-spells" };

function racialLevels(race: string, skillName: string, build: (level: Level, i: number) => RacialLevel): LibrarySkill[] {
  return LEVELS.map((level, i) => ({
    key: `racial-${race}-${level}`,
    name: `${skillName} (${LEVEL_NAMES[level]})`,
    iconKey: LEVEL_ICON_OVERRIDES[race]?.[level] ?? `racial-${race}-${level}`,
    ...build(level, i),
  }));
}

function ultimate(race: string, skill: Omit<LibrarySkill, "key" | "iconKey">): LibrarySkill {
  return { key: `racial-${race}-ultimate`, iconKey: ULTIMATE_ICON_OVERRIDES[race] ?? `racial-${race}-ultimate`, ...skill };
}

const COUNTER_BONUS = [15, 25, 40];

const GATE_TIERS = [3, 5, 7];

const HUNTER_TARGETS = [1, 2, 3];

const RAISE_TARGETS = [1, 2, 3];

const ARCANE_SLOTS = [1, 2, 3];

const BLOODLUST_STACKS = [1, 2, 3];

const RUNE_ARMOR = [10, 15, 20];

const humans: LibraryRace = {
  key: "humans",
  branchKeys: ["leadership", "ranged", "attack", "defense", "light"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Люди",
  color: "#c9a227",
  iconKey: "racial-humans-basic",
  description:
    "Орден Священної Імперії Грифона: лицарі, ченці й арбалетники, що тримають стрій і відповідають ударом на удар. Расовий навик — Контр-атака, ультимейт — Ангел Хранитель.",
  appearanceDescription:
    "Над рядами в начищених кірасах майорять стяги з золотим грифоном, і дзвони каплиць відбивають ритм маршу. Ці воїни не тікають — вони чекають на удар, щоб повернути його стократ.",
  levels: racialLevels("humans", "Контр-атака", (level, i) => ({
    description: `Першому, хто атакує героя в ближньому бою за раунд, герой відповідає відсіччю (реакція) з бонусом +${COUNTER_BONUS[i]} % шкоди.`,
    appearanceDescription: [
      "Щит здригається від удару, і в ту ж мить меч вислизає з-під його краю у коротку, злу відповідь. Ворог ще не встиг відступити, а вже відчуває сталь.",
      "Лицар приймає удар на наплічник, розвертається на п'яті й б'є у відкритий бік нападника. Рух відточений тисячами тренувань на плацу під наглядом сивих ветеранів.",
      "Кожна атака на воїна Імперії — це запрошення. Він ловить чужий клинок гардою, відводить його вбік і повертає удар з такою силою, що лунає гул, ніби вдарили в храмовий дзвін.",
    ][i],
    abilities: [
      {
        id: `humans-counter-${level}`,
        name: `Контр-атака (${LEVEL_NAMES[level]})`,
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "counterAttack", attackKinds: ["melee"], bonusPercent: COUNTER_BONUS[i] }],
      },
    ],
  })),
  ultimate: ultimate("humans", {
    name: "Ангел Хранитель",
    description: "Дія, 1 раз за бій: воскрешає мертвого союзника з 50 % його максимального HP.",
    appearanceDescription:
      "Небо над полем бою розколюється сліпучою смугою, і з неї спускається крилатий вартовий у срібних латах. Він схиляється над полеглим, торкається його чола — і той вдихає знову, ніби прокинувшись від важкого сну.",
    abilities: [
      {
        id: "humans-guardian-angel",
        name: "Ангел Хранитель",
        trigger: { event: "action" },
        condition: { type: "targetDead" },
        limits: { perBattle: 1 },
        effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true, target: "eventTarget" }],
      },
    ],
  }),
};

const demons: LibraryRace = {
  key: "demons",
  branchKeys: ["attack", "defense", "ranged", "dark", "leadership", "chaos"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Демони",
  color: "#b3261e",
  iconKey: "racial-demons-basic",
  description:
    "Легіони Інферно, що проламують межу світів і кличуть підкріплення просто з полум'я. Расовий навик — Відкриття воріт, ультимейт — Пекельна Земля.",
  appearanceDescription:
    "Земля під їхніми копитами чорніє й тріскається, а повітря тремтить від жару, як над ковальським горном. З кожним кроком демонів пахне сіркою і паленою шерстю.",
  levels: racialLevels("demons", "Відкриття воріт", (level, i) => ({
    description: `Бонусна дія, 1 раз за бій: прикликає випадкового юніта групи «Демони» Tier ${GATE_TIERS[i]} з бестіарію кампанії. Заряд не залежить від слотів заклинань.`,
    appearanceDescription: [
      "Повітря поруч із героєм розривається багряною щілиною, з якої б'є жар і чути далеке виття. Крізь неї, обтрушуючи попіл, вилазить невеликий біс і шкірить ікла.",
      "Демон креслить у повітрі вогняне коло, і воно провалюється у вируючу безодню. З вихору виступає рогата постать, охоплена язиками полум'я, й одразу шукає здобич.",
      "Земля здіймається кам'яною аркою, всередині якої палає саме Інферно. Крізь браму, пригинаючи роги, проходить велетенський володар пекла, і від його кроків тріскається каміння.",
    ][i],
    abilities: [
      {
        id: `demons-gating-${level}`,
        name: `Відкриття воріт (${LEVEL_NAMES[level]})`,
        trigger: { event: "bonusAction" },
        limits: { perBattle: 1 },
        effects: [{ kind: "summon", group: "Демони", tier: GATE_TIERS[i] }],
      },
    ],
  })),
  ultimate: ultimate("demons", {
    name: "Пекельна Земля",
    description: "Дія, 1 раз за бій: до кінця бою всі вороги щораунду отримують 10 шкоди вогнем.",
    appearanceDescription:
      "Демон б'є долонею об землю, і по ній розбігаються жилки розпеченої лави. Трава спалахує, каміння червоніє, і кожен ворог відчуває, як підошви чобіт починають диміти. Вогонь не гасне, поки триває битва.",
    abilities: [
      {
        id: "demons-hellfire-land",
        name: "Пекельна Земля",
        trigger: { event: "action" },
        limits: { perBattle: 1 },
        effects: [{ kind: "dot", damagePerRound: 10, damageType: "fire", duration: { rounds: 99 }, target: "allEnemies" }],
      },
    ],
  }),
};

const elves: LibraryRace = {
  key: "elves",
  branchKeys: ["leadership", "ranged", "attack", "defense", "nature"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Ельфи",
  color: "#3f8f3a",
  iconKey: "racial-elves-basic",
  description:
    "Лісові ельфи Сильвану — мисливці й лучники, що обирають жертву заздалегідь і не відпускають її. Расовий навик — Мисливець, ультимейт — Неймовірна удача.",
  appearanceDescription:
    "Між стовбурами вікових дубів ковзають постаті в зелених плащах, і жодна гілка не тріскає під їхніми ногами. Їхні очі світяться спокійною уважністю хижака, що вже обрав ціль.",
  levels: racialLevels("elves", "Мисливець", (level, i) => ({
    description: `Бонусна дія: позначає ${i === 0 ? "1 ворога" : `до ${HUNTER_TARGETS[i]} ворогів`}; на 1 раунд усі атаки по позначених цілях — з перевагою.`,
    appearanceDescription: [
      "Ельф прищурюється, і над головою обраного ворога спалахує ледь помітний зелений знак, схожий на лист. Тепер кожен лучник загону бачить, куди цілити.",
      "Мисливець свистить, як лісовий птах, і два вороги раптом помічають на своїй броні світні відбитки листя. Від цих знаків не сховатися ні в диму, ні в натовпі.",
      "Погляд мисливця пробігає полем бою, і троє ворогів одразу відчувають холодок між лопатками. Над кожним тремтить смарагдова мітка, а стріли самі тягнуться до неї.",
    ][i],
    abilities: [
      {
        id: `elves-avenger-${level}`,
        name: `Мисливець (${LEVEL_NAMES[level]})`,
        trigger: { event: "bonusAction" },
        maxTargets: HUNTER_TARGETS[i],
        effects: [{ kind: "flag", flag: "advantageForAttackers", duration: { rounds: 1 }, target: "eventTarget" }],
      },
    ],
  })),
  ultimate: ultimate("elves", {
    name: "Неймовірна удача",
    description: "Атаки героя критичні на 18–20 на кубику (поріг криту −2).",
    appearanceDescription:
      "Здається, сам ліс веде руку цього ельфа: вітер стихає саме тоді, коли тятива дзвенить, а сонячний промінь падає на щілину в обладунку ворога. Стріла входить туди, куди не влучив би жоден смертний.",
    abilities: [
      {
        id: "elves-incredible-luck",
        name: "Неймовірна удача",
        trigger: { event: "passive" },
        effects: [{ kind: "modifyStat", stat: "critThreshold", flat: -2 }],
      },
    ],
  }),
};

const necromancers: LibraryRace = {
  key: "necromancers",
  branchKeys: ["ranged", "attack", "defense", "dark"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Некроманти",
  color: "#5b3f8c",
  iconKey: "racial-necromancers-basic",
  description:
    "Жерці Асхи в Хересі, для яких смерть — лише зміна служби. Повалені на полі бою встають під їхні прапори. Расовий навик — Підняття мертвих, ультимейт — Крик Банші.",
  appearanceDescription:
    "Там, де проходять некроманти, трава сивіє, а над землею стелиться зеленкуватий туман. Їхні мантії шелестять, як сухе листя на цвинтарі, і навіть ворони замовкають.",
  levels: racialLevels("necromancers", "Підняття мертвих", (level, i) => ({
    description: `Дія, 1 раз за бій: до ${RAISE_TARGETS[i]} повалених юнітів бою (не героїв, будь-якої сторони) оживають з 90 % max HP і переходять на бік некроманта.`,
    appearanceDescription: [
      "Некромант простягає кістляву руку, і з-під землі над тілом полеглого здіймаються бліді нитки світла. Мрець смикається, спирається на зброю і встає — тепер із порожнім зеленим вогнем в очницях.",
      "Шепіт некроманта розходиться полем, як холодний вітер. Двоє полеглих одночасно розплющують очі, підводяться, хитаючись, і повертаються обличчям до своїх колишніх товаришів.",
      "Над полем бою зависає важкий дзвін, і земля здригається, ніби під нею дихає щось величезне. Троє мерців підіймаються, обтрушуючи кров і пил, і мовчки стають у стрій позаду некроманта.",
    ][i],
    abilities: [
      {
        id: `necromancers-raise-${level}`,
        name: `Підняття мертвих (${LEVEL_NAMES[level]})`,
        trigger: { event: "action" },
        condition: { type: "targetDead" },
        limits: { perBattle: 1 },
        maxTargets: RAISE_TARGETS[i],
        effects: [{ kind: "raiseDead", hpPercent: 90, target: "eventTarget" }],
      },
    ],
  })),
  ultimate: ultimate("necromancers", {
    name: "Крик Банші",
    description: "Дія, 1 раз за бій: мораль усіх ворогів −3.",
    appearanceDescription:
      "Некромант розтуляє вуста, і з них виривається пронизливий вереск примари, від якого лопаються шибки й тремтять щити. Ворогам здається, що крижані пальці стискають їм серце, а зброя раптом стає неймовірно важкою.",
    abilities: [
      {
        id: "necromancers-banshee-howl",
        name: "Крик Банші",
        trigger: { event: "action" },
        limits: { perBattle: 1 },
        effects: [{ kind: "changeMorale", delta: -3, target: "allEnemies" }],
      },
    ],
  }),
};

const mages: LibraryRace = {
  key: "mages",
  branchKeys: ["light", "dark", "chaos", "nature", "defense", "leadership"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Маги",
  color: "#2f6fb3",
  iconKey: "racial-mages-basic",
  description:
    "Чарівники Срібних міст Академії, що збирають знання, як інші збирають золото. Їхня сила — у запасі високої магії. Расовий навик — Всезнання, ультимейт — Знак мага.",
  appearanceDescription:
    "Над головами магів кружляють мідні механізми й світні руни, а з рукавів сиплються іскри непогашених заклять. Від них пахне чорнилом, озоном і пергаментом із бібліотек під кришталевими куполами.",
  levels: racialLevels("mages", "Всезнання", (level, i) => ({
    description: `+${ARCANE_SLOTS[i]} ${ARCANE_SLOTS[i] === 1 ? "слот" : "слоти"} заклинань 4-го рівня і +${ARCANE_SLOTS[i]} ${ARCANE_SLOTS[i] === 1 ? "слот" : "слоти"} 5-го рівня.`,
    appearanceDescription: [
      "У пам'яті мага розгортається ще один сувій, списаний дрібними рунами. Те, що вчора здавалося недосяжним, тепер чекає на кінчиках його пальців.",
      "Довкола мага мерехтять два додаткові кільця рун, повільно обертаючись у протилежні боки. Він черпає з них силу, як воду з глибокої криниці.",
      "Сфера знань довкола мага розростається в ціле сузір'я рун, і кожна з них співає своєю нотою. Він тримає в голові закляття, на вивчення яких інші витрачають життя.",
    ][i],
    abilities: [
      {
        id: `mages-omniscience-${level}`,
        name: `Всезнання (${LEVEL_NAMES[level]})`,
        trigger: { event: "passive" },
        effects: [{ kind: "modifyStat", stat: "spellSlots", spellLevels: [4, 5], flat: ARCANE_SLOTS[i] }],
      },
    ],
  })),
  ultimate: ultimate("mages", {
    name: "Знак мага",
    description: "Бонусна дія, 2 рази за бій: оновлює основну дію цього ходу (можна сотворити друге закляття).",
    appearanceDescription:
      "Маг креслить у повітрі сяючий знак, і час навколо нього на мить застигає: краплі дощу зависають, полум'я завмирає. У цій тиші він встигає вимовити ще одне закляття, перш ніж світ знову рушить.",
    abilities: [
      {
        id: "mages-mage-sign",
        name: "Знак мага",
        trigger: { event: "bonusAction" },
        limits: { perBattle: 2 },
        effects: [{ kind: "grantAction", refreshAction: true, target: "self" }],
      },
    ],
  }),
};

const darkElves: LibraryRace = {
  key: "dark-elves",
  branchKeys: ["attack", "defense", "ranged", "dark", "chaos"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Темні ельфи",
  color: "#6b2d5c",
  iconKey: "racial-dark-elves-basic",
  description:
    "Вигнанці Ігг-Шайла з підземель, що живуть кров'ю і стають тим швидшими, чим більше вбивають. Расовий навик — Жага крові, ультимейт — Кривавий ритуал.",
  appearanceDescription:
    "Їхня шкіра сіра, як попіл, а очі палають фіалковим вогнем підземних печер. Темні ельфи рухаються безшумно й хижо, і на їхніх клинках завжди лишається темний блиск.",
  levels: racialLevels("dark-elves", "Жага крові", (level, i) => ({
    description: `Кожне вбивство, зроблене самим героєм, дає +1 дію на хід до кінця бою; максимум +${BLOODLUST_STACKS[i]}.`,
    appearanceDescription: [
      "Ворог падає, і темний ельф глибоко вдихає запах крові. Його зіниці розширюються, а рухи стають різкішими й швидшими, ніби хтось підкрутив тятиву в його тілі.",
      "З кожною смертю довкола темного ельфа густішає багряна імла. Він сміється тихо й радісно, і клинки в його руках мелькають уже вдвічі частіше.",
      "Після третьої жертви темний ельф стає майже розмитою тінню з фіалковими очима. Кров на його обладунку парує, а вороги не встигають навіть підняти щити.",
    ][i],
    abilities: [
      {
        id: `dark-elves-bloodlust-${level}`,
        name: `Жага крові (${LEVEL_NAMES[level]})`,
        trigger: { event: "kill", role: "killer" },
        stackable: true,
        maxStacks: BLOODLUST_STACKS[i],
        effects: [{ kind: "modifyStat", stat: "actionsPerTurn", flat: 1, duration: { rounds: 99 }, target: "self" }],
      },
    ],
  })),
  ultimate: ultimate("dark-elves", {
    name: "Кривавий ритуал",
    description: "Герой бачить HP ворогів. Атаки по цілях із HP ≤ 50 % — з перевагою і +20 % шкоди.",
    appearanceDescription:
      "Темний ельф проводить лезом по долоні, і його кров спалахує фіалковим сяйвом. Тепер він бачить, як б'ються серця ворогів, і чує, які з них уже слабшають. На поранених він кидається, як вовк на пораненого оленя.",
    abilities: [
      {
        id: "dark-elves-blood-ritual-sight",
        name: "Кривавий ритуал",
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "seeEnemyHp" }],
      },
      {
        id: "dark-elves-blood-ritual-strike",
        name: "Кривавий ритуал: добивання",
        trigger: { event: "attack", phase: "before", role: "attacker" },
        condition: { type: "hpBelow", who: "eventTarget", percent: 50 },
        effects: [
          { kind: "flag", flag: "advantage", attackKind: "all" },
          { kind: "damageBonus", filter: { kind: "all" }, percent: 20 },
        ],
      },
    ],
  }),
};

const dwarves: LibraryRace = {
  key: "dwarves",
  branchKeys: ["leadership", "ranged", "attack", "defense", "light"],
  spellSlotProgression: STANDARD_SLOTS,
  name: "Гноми",
  color: "#8a6a3b",
  iconKey: "racial-dwarves-basic",
  description:
    "Гірські клани Гротінгу, ковалі рун, що вирізають силу просто в сталь і камінь. Расовий навик — Рунна броня, ультимейт — Рунічна атака.",
  appearanceDescription:
    "Низькі, широкоплечі воїни з бородами, заплетеними в коси з бронзовими кільцями. Їхні обладунки вкриті рунами, що тьмяно жевріють, як вугілля в гірському горні.",
  levels: racialLevels("dwarves", "Рунна броня", (level, i) => ({
    description: `Опір усій шкоді ${RUNE_ARMOR[i]} %.`,
    appearanceDescription: [
      "На нагруднику гнома прокидається одна руна, і по металу пробігає тепле бурштинове світло. Удари, що влучають у нього, звучать глухо, ніби б'ють у скелю.",
      "Руни на обладунку гнома спалахують ланцюжком, з'єднуючись у мережу світних ліній. Полум'я, сталь і чари однаково розбиваються об неї, мов хвилі об берег.",
      "Уся броня гнома палає рунами, як ковальська заготовка, щойно витягнута з горна. Від нього пашить жаром, а ворожі клинки відскакують, лишаючи лише подряпини.",
    ][i],
    abilities: [
      {
        id: `dwarves-rune-armor-${level}`,
        name: `Рунна броня (${LEVEL_NAMES[level]})`,
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "resistance", damageType: "all", percent: RUNE_ARMOR[i] }],
      },
    ],
  })),
  ultimate: ultimate("dwarves", {
    name: "Рунічна атака",
    description:
      "Після кожного влучання герой отримує одну випадкову з 4 рун на 1 раунд: лють (+20 % шкоди), броня (+2 AC), швидкість (+3 ініціативи) або життя (лікування 10 % max HP).",
    appearanceDescription:
      "Коли молот гнома влучає, з металу вилітає іскра, що на льоту складається в руну. Вона спалахує червоним, синім, золотим або зеленим — і гном одразу відчуває її дар: лють у м'язах, камінь у шкірі, вітер у ногах чи тепло живого джерела.",
    abilities: [
      {
        id: "dwarves-rune-strike",
        name: "Рунічна атака",
        trigger: { event: "hit", role: "attacker" },
        effects: [
          {
            kind: "randomOf",
            options: [
              { kind: "damageBonus", filter: { kind: "all" }, percent: 20, duration: { rounds: 1 }, target: "self" },
              { kind: "modifyStat", stat: "armor", flat: 2, duration: { rounds: 1 }, target: "self" },
              { kind: "modifyStat", stat: "initiative", flat: 3, duration: { rounds: 1 }, target: "self" },
              { kind: "heal", amount: { percentOf: "maxHp", value: 10 }, target: "self" },
            ],
          },
        ],
      },
    ],
  }),
};

export const RACES: LibraryRace[] = [humans, demons, elves, necromancers, mages, darkElves, dwarves];
