import type { LibrarySpell } from "./types";

import type { Effect } from "@/lib/utils/abilities/schema";
import type { SpellDefinition } from "@/lib/utils/spells/model/schema";

const LIGHT = "Світло";

const DARK = "Темрява";

const CHAOS = "Хаос";

const NATURE = "Природа";

type Definition = LibrarySpell["definition"];

type Targeting = SpellDefinition["targeting"];

type Resolution = SpellDefinition["resolution"];

const AUTO: Resolution = { kind: "auto" };

const save = (ability: Extract<Resolution, { kind: "save" }>["ability"], onSuccess: "half" | "none"): Resolution => ({ kind: "save", ability, onSuccess });

const ALLY: Targeting = { kind: "ally" };

const ENEMY: Targeting = { kind: "enemy" };

const SELF: Targeting = { kind: "self" };

const ALL_ENEMIES: Targeting = { kind: "allEnemies" };

const enemies = (maxTargets: number): Targeting => ({ kind: "area", side: "enemy", maxTargets });

const rounds = (n: number) => ({ rounds: n });

const damage = (damageType: string, extra: { falloff?: number[]; amount?: Extract<Effect, { kind: "dealDamage" }>["amount"] } = {}): Effect => ({
  kind: "dealDamage",
  amount: { spellRoll: 100 },
  damageType,
  ...extra,
});

const heal = (): Effect => ({ kind: "heal", amount: { spellRoll: 100 } });

const stat = (s: "initiative" | "armor" | "attackBonus" | "morale", flat: number, n: number): Effect => ({
  kind: "modifyStat",
  stat: s,
  flat,
  duration: rounds(n),
});

const damagePercent = (percent: number, n: number): Effect => ({ kind: "damageBonus", filter: { kind: "all" }, percent, duration: rounds(n) });

const condition = (c: Extract<Effect, { kind: "applyCondition" }>["condition"], n: number, extra: { percent?: number; breakOnDamage?: boolean } = {}): Effect => ({
  kind: "applyCondition",
  condition: c,
  duration: rounds(n),
  ...extra,
});

const regen = (n: number): Effect => ({ kind: "hot", healPerRound: { percentOf: "maxHp", value: 10 }, duration: rounds(n) });

function def(dice: number, targeting: Targeting, effects: Effect[], over: Partial<Definition> = {}): Definition {
  return { dice, cost: "action", targeting, resolution: AUTO, effects, ...over };
}

function diceWord(n: number): string {
  if (n === 1) return "кубик";

  return n < 5 ? "кубики" : "кубиків";
}

// spec §1: (N + ⌊hero level / 3⌋)d{school die}, no flat bonus
const power = (n: number, what: string) =>
  `${n} ${diceWord(n)} ${what} (к6/к8/к10 залежно від майстерності школи; +1 кубик за кожні 3 рівні героя)`;

const NOT_HEROES = "Не діє на героїв.";

export const SPELLS: LibrarySpell[] = [
  // ── Світло ─────────────────────────────────────────────────────────────
  {
    key: "divine-strength",
    iconKey: "divine-strength",
    name: "Божественна сила",
    school: LIGHT,
    level: 1,
    description: "Союзник завдає на 25 % більше шкоди всіма атаками й заклинаннями протягом 3 раундів.",
    appearanceDescription:
      "Над головою союзника спалахує тонкий золотий німб, і зброя в його руках починає дзвеніти, наче дзвін собору. Кожен удар лишає у повітрі світлий слід, що пахне ладаном.",
    definition: def(0, ALLY, [damagePercent(25, 3)]),
    raceModifiers: [],
  },
  {
    key: "haste",
    iconKey: "haste",
    name: "Поспіх",
    school: LIGHT,
    level: 1,
    description: "Союзник отримує +3 до ініціативи на 3 раунди.",
    appearanceDescription:
      "Довкола ніг союзника закручується вихор білого пір'я, і світ навколо ніби сповільнюється. Його кроки стають легкими, а плащ тріпоче, хоча вітру немає.",
    definition: def(0, ALLY, [stat("initiative", 3, 3)]),
    raceModifiers: [],
  },
  {
    key: "regeneration",
    iconKey: "regeneration",
    name: "Регенерація",
    school: LIGHT,
    level: 2,
    description: "На початку кожного свого ходу союзник відновлює 10 % максимального HP. Триває 3 раунди.",
    appearanceDescription:
      "Під шкірою союзника розливається тепле бурштинове сяйво, і рани затягуються тонкими золотими нитками. З кожним подихом світло пульсує, мов друге серце.",
    definition: def(0, ALLY, [regen(3)]),
    raceModifiers: [],
  },
  {
    key: "cleansing",
    iconKey: "cleansing",
    name: "Очищення",
    school: LIGHT,
    level: 2,
    description: "Знімає із союзника всі негативні ефекти й стани (дебафи, отрути, контроль).",
    appearanceDescription:
      "Чиста біла вода стікає з небес на союзника, хоча над полем бою немає хмар. Темні плями прокльонів шиплять, як вугілля в джерелі, і розчиняються безслідно.",
    definition: def(0, ALLY, [{ kind: "cleanse", includeConditions: true }]),
    raceModifiers: [],
  },
  {
    key: "stoneskin",
    iconKey: "stoneskin",
    name: "Кам'яна шкіра",
    school: LIGHT,
    level: 3,
    description: "Союзник отримує +3 до AC на 3 раунди.",
    appearanceDescription:
      "Шкіра союзника вкривається сірим гранітним візерунком, що відблискує, як мармур храмових колон. Клинки ворогів дзенькають об неї, висікаючи іскри.",
    definition: def(0, ALLY, [stat("armor", 3, 3)]),
    raceModifiers: [],
  },
  {
    key: "righteous-might",
    iconKey: "righteous-might",
    name: "Праведна міць",
    school: LIGHT,
    level: 3,
    description: "Союзник отримує +3 до кидків атаки і +15 % до шкоди на 3 раунди.",
    appearanceDescription:
      "Постать союзника росте в сяйві, ніби за його спиною розправляє крила невидимий янгол. М'язи наливаються силою, а погляд стає твердим і ясним, як сталь на світанку.",
    definition: def(0, ALLY, [stat("attackBonus", 3, 3), damagePercent(15, 3)]),
    raceModifiers: [],
  },
  {
    key: "evasion",
    iconKey: "evasion",
    name: "Ухилення",
    school: LIGHT,
    level: 3,
    description: "Союзник отримує на 50 % менше шкоди від дальніх атак протягом 3 раундів.",
    appearanceDescription:
      "Довкола союзника мерехтить ледь помітна завіса світла, і стріли, влітаючи в неї, ухиляються вбік, наче їх штовхнула невидима долоня. Арбалетні болти з глухим стуком падають у траву.",
    definition: def(0, ALLY, [{ kind: "flag", flag: "resistance", damageType: "all", percent: 50, attackKind: "ranged", duration: rounds(3) }]),
    raceModifiers: [],
  },
  {
    key: "magic-immunity",
    iconKey: "magic-immunity",
    name: "Магічний імунітет",
    school: LIGHT,
    level: 4,
    description: "Протягом 2 раундів союзник не отримує шкоди від заклинань і має імунітет до всіх станів контролю.",
    appearanceDescription:
      "Союзника огортає кришталева сфера, по якій пробігають веселкові хвилі. Ворожі закляття розбиваються об неї, мов морська піна об скелю, і осипаються іскристим пилом.",
    definition: def(0, ALLY, [
      { kind: "flag", flag: "resistance", damageType: "spell", percent: 100, duration: rounds(2) },
      { kind: "flag", flag: "conditionImmunity", conditions: "all", duration: rounds(2) },
    ]),
    raceModifiers: [],
  },
  {
    key: "teleportation",
    iconKey: "teleportation",
    name: "Телепортація",
    school: LIGHT,
    level: 4,
    description: "Переносить союзника в будь-яку вільну точку поля бою. Механіки в трекері немає: витрачає слот і дію, переміщення відіграє DM на мапі.",
    appearanceDescription:
      "Союзник розсипається стовпом золотих іскор, що на мить зависають у повітрі. Деінде на полі бою іскри збираються знову — і він уже стоїть там, ледь похитуючись від запаморочення.",
    definition: def(0, ALLY, [{ kind: "note", text: "Телепортація: DM переносить ціль у будь-яку вільну точку поля бою." }]),
    raceModifiers: [],
  },
  {
    key: "divine-retribution",
    iconKey: "divine-retribution",
    name: "Божественна відплата",
    school: LIGHT,
    level: 5,
    description: `Завдає ворогу ${power(6, "шкоди світлом")}. Що більше поранений заклинатель, то сильніша відплата: шкода зростає на 1 % за кожен 1 % втраченого HP заклинателя (на половині HP — ×1,5).`,
    appearanceDescription:
      "Кров заклинателя, що стікає на землю, спалахує білим полум'ям. Із неба б'є стовп сліпучого світла, і що глибші рани праведника, то нещадніше палає кара, що падає на кривдника.",
    definition: def(6, ENEMY, [damage("radiant", { amount: { spellRoll: { formula: "100 + lost_hp_percent" } } })]),
    raceModifiers: [],
  },
  {
    key: "word-of-light",
    iconKey: "word-of-light",
    name: "Слово світла",
    school: LIGHT,
    level: 5,
    description: `Усі вороги отримують ${power(3, "шкоди світлом")}. Люди, Ельфи, Гноми й Маги мають до нього імунітет — світло не карає добрих.`,
    appearanceDescription:
      "Заклинатель вимовляє одне-єдине слово, і воно гримить, як тисяча дзвонів. Поле бою заливає біле сяйво: темні створіння горять і корчаться, а добрі серця лише відчувають теплий подих світанку.",
    definition: def(3, ALL_ENEMIES, [damage("radiant")]),
    raceModifiers: [
      { raceKey: "humans", percent: -100 },
      { raceKey: "elves", percent: -100 },
      { raceKey: "dwarves", percent: -100 },
      { raceKey: "mages", percent: -100 },
    ],
  },
  {
    key: "resurrection",
    iconKey: "resurrection",
    name: "Воскресіння",
    school: LIGHT,
    level: 5,
    description: "Повертає до бою полеглого союзника з 50 % максимального HP.",
    appearanceDescription:
      "Над тілом полеглого опускається колона м'якого світла, і в ній кружляють пелюстки білих лілій. Груди здіймаються в першому подиху, а очі відкриваються, сповнені тихого подиву.",
    definition: def(0, { kind: "allyDead" }, [{ kind: "heal", amount: { percentOf: "maxHp", value: 50 }, revive: true }]),
    raceModifiers: [],
  },
  {
    key: "eternal-light",
    iconKey: "eternal-light",
    name: "Вічне світло",
    school: LIGHT,
    level: 4,
    description: `Союзник відновлює ${power(4, "лікування")} HP, а потім ще 2 раунди лікується на 10 % максимального HP на початку кожного свого ходу. Дає скіл гілки Світла.`,
    appearanceDescription:
      "Над союзником розквітає маленьке сонце, і його промені проникають крізь обладунки просто до серця. Рани світяться зсередини і зникають, а сяйво ще довго не згасає, тихо зігріваючи плоть.",
    definition: def(4, ALLY, [heal(), regen(2)]),
    raceModifiers: [],
  },

  // ── Темрява ────────────────────────────────────────────────────────────
  {
    key: "weakness",
    iconKey: "weakness",
    name: "Ослаблення",
    school: DARK,
    level: 1,
    description: "Ворог робить рятівний кидок Мудрості; при провалі завдає на 25 % менше шкоди протягом 3 раундів. Успіх — без ефекту.",
    appearanceDescription:
      "Сірий туман заповзає ворогові в рукави, і зброя раптом важчає в його руках. Пальці слабнуть, плечі опускаються, а удари стають кволими, як у хворого.",
    definition: def(0, ENEMY, [damagePercent(-25, 3)], { resolution: save("wisdom", "none") }),
    raceModifiers: [],
  },
  {
    key: "slow",
    iconKey: "slow",
    name: "Сповільнення",
    school: DARK,
    level: 1,
    description: "Ворог робить рятівний кидок Мудрості; при провалі отримує −3 до ініціативи на 3 раунди. Успіх — без ефекту.",
    appearanceDescription:
      "Довкола ворога густішає повітря, наче він опинився під водою. Кожен рух розтягується, звуки глухнуть, а кліпання очей триває ціле століття.",
    definition: def(0, ENEMY, [stat("initiative", -3, 3)], { resolution: save("wisdom", "none") }),
    raceModifiers: [],
  },
  {
    key: "frailty",
    iconKey: "frailty",
    name: "Немічність",
    school: DARK,
    level: 2,
    description: "Ворог отримує −2 до AC на 3 раунди. Повторні накладання складаються, до трьох разів (−6 AC); кожне накладання триває 3 раунди окремо, а четверте оновлює тривалість найстарішого.",
    appearanceDescription:
      "По обладунках ворога розповзається чорна іржа, а шкіра під ними сіріє й тріскається, мов старий пергамент. Сталь, що вчора тримала удар сокири, тепер м'якне під пальцями.",
    definition: def(0, ENEMY, [stat("armor", -2, 3)], { stackable: true, maxStacks: 3 }),
    raceModifiers: [],
  },
  {
    key: "plague",
    iconKey: "plague",
    name: "Чума",
    school: DARK,
    level: 2,
    description: `Отруює ворога: кидок — ${power(1, "отрутою")} — визначає шкоду, яку ворог отримує на початку кожного свого ходу протягом 2 раундів.`,
    appearanceDescription:
      "З долоні заклинателя зривається хмарка зеленкуватих мух і впивається ворогові в обличчя. Шкіра вкривається чорними пухирями, а від подиху тхне гниллю склепу.",
    definition: def(1, ENEMY, [{ kind: "dot", damagePerRound: { spellRoll: 100 }, damageType: "poison", duration: rounds(2) }]),
    raceModifiers: [],
  },
  {
    key: "confusion",
    iconKey: "confusion",
    name: "Розсіяність",
    school: DARK,
    level: 3,
    description: "Ворог робить рятівний кидок Мудрості; при провалі 2 раунди на початку кожного свого ходу з шансом 50 % втрачає дію. Успіх — без ефекту.",
    appearanceDescription:
      "У голові ворога зринають сотні шепотів, і кожен кличе в інший бік. Він застигає з піднятою зброєю, озирається, не впізнаючи ні друзів, ні ворогів.",
    definition: def(0, ENEMY, [condition("skip_action", 2, { percent: 50 })], { resolution: save("wisdom", "none") }),
    raceModifiers: [],
  },
  {
    key: "suffering",
    iconKey: "suffering",
    name: "Страждання",
    school: DARK,
    level: 3,
    description: "Ворог отримує −3 до кидків атаки на 3 раунди.",
    appearanceDescription:
      "Невидимі гаки впиваються ворогові в жили, і кожен замах відгукується пекучим болем. Він кривиться, руки тремтять, а клинок раз у раз проходить повз ціль.",
    definition: def(0, ENEMY, [stat("attackBonus", -3, 3)]),
    raceModifiers: [],
  },
  {
    key: "sorrow",
    iconKey: "sorrow",
    name: "Смуток",
    school: DARK,
    level: 3,
    description: "Мораль ворога знижується на 2 на 3 раунди.",
    appearanceDescription:
      "Над ворогом збирається крихітна дощова хмара, і з неї сіється холодна мряка. В очах гасне вогонь, а в серці оселяється туга за домом, якого він, можливо, вже ніколи не побачить.",
    definition: def(0, ENEMY, [stat("morale", -2, 3)]),
    raceModifiers: [],
  },
  {
    key: "blindness",
    iconKey: "blindness",
    name: "Сліпота",
    school: DARK,
    level: 4,
    description:
      "Ворог робить рятівний кидок Статури; при провалі 2 раунди не може атакувати (ні в ближньому бою, ні здалеку) і чаклувати. Ефект спадає, щойно ворог отримує шкоду. Успіх — без ефекту.",
    appearanceDescription:
      "Чорна пелена затягує ворогові очі, наче хтось накинув на них оксамитову хустку. Він махає руками в порожнечі, а довкола лунає лише тихий сміх темряви.",
    definition: def(
      0,
      ENEMY,
      [
        condition("disable_melee_attacks", 2, { breakOnDamage: true }),
        condition("disable_ranged_attacks", 2, { breakOnDamage: true }),
        condition("disable_spell_casting", 2, { breakOnDamage: true }),
      ],
      { resolution: save("constitution", "none") },
    ),
    raceModifiers: [],
  },
  {
    key: "berserk",
    iconKey: "berserk",
    name: "Шал",
    school: DARK,
    level: 4,
    description: `Ворог робить рятівний кидок Мудрості; при провалі на 1 раунд впадає в шал: на свій хід автоматично атакує випадкову іншу істоту (зокрема своїх) з +50 % шкоди. ${NOT_HEROES}`,
    appearanceDescription:
      "Очі ворога наливаються кров'ю, а з горла виривається звіриний рев. Він більше не бачить облич — лише цілі, і кидається на першого, хто трапиться, хай то навіть його брат по зброї.",
    definition: def(0, ENEMY, [{ kind: "berserk", damageBonusPercent: 50, duration: rounds(1) }], { resolution: save("wisdom", "none") }),
    raceModifiers: [],
  },
  {
    key: "puppet-master",
    iconKey: "puppet-master",
    name: "Ляльковод",
    school: DARK,
    level: 5,
    description: `Ворог робить рятівний кидок Мудрості; при провалі на 1 раунд переходить на бік заклинателя і діє під контролем його гравця, потім повертається. ${NOT_HEROES}`,
    appearanceDescription:
      "З пальців заклинателя тягнуться тонкі срібні нитки й чіпляються за зап'ястя та шию ворога. Той смикається, як лялька на ярмарку, і слухняно розвертає зброю проти своїх.",
    definition: def(0, ENEMY, [{ kind: "charm", duration: rounds(1) }], { resolution: save("wisdom", "none") }),
    raceModifiers: [],
  },
  {
    key: "vampirism",
    iconKey: "vampirism",
    name: "Вампіризм",
    school: DARK,
    level: 5,
    description: "Протягом 3 раундів атаки союзника лікують його на 50 % завданої шкоди.",
    appearanceDescription:
      "Зуби союзника видовжуються, а шкіра набуває мертвотної блідості. Кожна рана, яку він завдає, сочиться червоним туманом, що тягнеться до його вуст і повертає йому сили.",
    definition: def(0, ALLY, [{ kind: "flag", flag: "lifesteal", percent: 50, duration: rounds(3) }]),
    raceModifiers: [],
  },
  {
    key: "curse-of-the-netherworld",
    iconKey: "curse-of-the-netherworld",
    name: "Прокляття Потойбіччя",
    school: DARK,
    level: 5,
    description: `Усі вороги отримують ${power(4, "некротичної шкоди")} і втрачають 1 мораль.`,
    appearanceDescription:
      "Земля під ворогами розступається, і з тріщин здіймаються примарні руки, холодні, як могильна плита. Вони хапають живих за щиколотки, висмоктуючи тепло й надію.",
    definition: def(4, ALL_ENEMIES, [damage("necrotic"), { kind: "changeMorale", delta: -1 }]),
    raceModifiers: [],
  },

  // ── Хаос ───────────────────────────────────────────────────────────────
  {
    key: "eldritch-arrow",
    iconKey: "eldritch-arrow",
    name: "Потойбічна стріла",
    school: CHAOS,
    level: 1,
    description: `Завдає ворогу ${power(3, "шкоди вогнем")}.`,
    appearanceDescription:
      "З долоні заклинателя зривається стріла фіолетового полум'я, що лишає по собі запах сірки. Вона ніколи не промахується — лише впивається в ціль і вибухає снопом іскор.",
    definition: def(3, ENEMY, [damage("fire")]),
    raceModifiers: [],
  },
  {
    key: "stone-spikes",
    iconKey: "stone-spikes",
    name: "Кам'яні шипи",
    school: CHAOS,
    level: 1,
    description: `До 2 ворогів отримують по ${power(2, "дробильної шкоди")}.`,
    appearanceDescription:
      "Земля під ворогами здригається, і з неї вистрибують гострі кам'яні шпилі, мов зуби величезного звіра. Уламки скель розлітаються, лишаючи по собі хмари пилу.",
    definition: def(2, enemies(2), [damage("bludgeoning")]),
    raceModifiers: [],
  },
  {
    key: "ice-bolt",
    iconKey: "ice-bolt",
    name: "Крижаний болт",
    school: CHAOS,
    level: 2,
    description: `Завдає ворогу ${power(3, "шкоди холодом")}; ворог 1 раунд атакує з невигідністю.`,
    appearanceDescription:
      "Повітря тріщить від морозу, і в руці заклинателя виростає синій крижаний спис. Він летить зі свистом і розбивається об ціль, вкриваючи її інеєм і скуваючи суглоби.",
    definition: def(3, ENEMY, [damage("cold"), { kind: "flag", flag: "disadvantage", duration: rounds(1) }]),
    raceModifiers: [],
  },
  {
    key: "lightning-bolt",
    iconKey: "lightning-bolt",
    name: "Блискавка",
    school: CHAOS,
    level: 2,
    description: `Завдає ворогу ${power(3, "шкоди блискавкою")}; ворог отримує −2 до ініціативи на 2 раунди.`,
    appearanceDescription:
      "Небо розколюється сліпучою гілкою, і грім б'є просто у ворога. Від нього валить дим, волосся стоїть дибки, а м'язи ще довго сіпаються в судомах.",
    definition: def(3, ENEMY, [damage("lightning"), stat("initiative", -2, 2)]),
    raceModifiers: [],
  },
  {
    key: "fireball",
    iconKey: "fireball",
    name: "Вогняна куля",
    school: CHAOS,
    level: 3,
    description: `До 3 ворогів роблять рятівний кидок Спритності; кожен отримує ${power(3, "шкоди вогнем")}, при успіху — половину.`,
    appearanceDescription:
      "Між долонями заклинателя набухає гаряча помаранчева куля, що гуде, мов розпечена кузня. Вона вибухає посеред ворогів, і полум'я розкочується колом, пожираючи траву й плащі.",
    definition: def(3, enemies(3), [damage("fire")], { resolution: save("dexterity", "half") }),
    raceModifiers: [],
  },
  {
    key: "fire-wall",
    iconKey: "fire-wall",
    name: "Вогняна стіна",
    school: CHAOS,
    level: 3,
    description: `Усі вороги горять: кидок — ${power(1, "шкоди вогнем")} — визначає шкоду, яку кожен отримує на початку свого ходу протягом 3 раундів.`,
    appearanceDescription:
      "Перед ворожим строєм із землі здіймається ревуча стіна вогню, вища за людський зріст. Жар обпікає обличчя, дим виїдає очі, і кожен, хто стоїть поряд, починає тліти.",
    definition: def(1, ALL_ENEMIES, [{ kind: "dot", damagePerRound: { spellRoll: 100 }, damageType: "fire", duration: rounds(3) }]),
    raceModifiers: [],
  },
  {
    key: "circle-of-winter",
    iconKey: "circle-of-winter",
    name: "Коло зими",
    school: CHAOS,
    level: 3,
    description: `До 3 ворогів роблять рятівний кидок Статури; кожен отримує ${power(3, "шкоди холодом")} і −2 до ініціативи на 1 раунд. При успіху — половина шкоди без штрафу ініціативи.`,
    appearanceDescription:
      "Від заклинателя розходиться крижане кільце, і трава на його шляху вкривається памороззю. Вороги застигають у хрусткому інеї, видихаючи хмарки білої пари.",
    definition: def(3, enemies(3), [damage("cold"), stat("initiative", -2, 1)], { resolution: save("constitution", "half") }),
    raceModifiers: [],
  },
  {
    key: "chain-lightning",
    iconKey: "chain-lightning",
    name: "Ланцюгова блискавка",
    school: CHAOS,
    level: 4,
    description: `Блискавка стрибає між ворогами (до 4): перша ціль отримує ${power(2, "шкоди блискавкою")}, кожна наступна — половину від попередньої (100 % → 50 % → 25 % → 13 %).`,
    appearanceDescription:
      "Сліпучий розряд вистрибує з пальців заклинателя і, вдаривши першого ворога, перескакує на наступного, і далі, і далі. Повітря тріщить і пахне грозою, а кожен стрибок трохи тьмяніший за попередній.",
    definition: def(2, enemies(4), [damage("lightning", { falloff: [100, 50, 25, 13] })]),
    raceModifiers: [],
  },
  {
    key: "meteor-shower",
    iconKey: "meteor-shower",
    name: "Метеоритний дощ",
    school: CHAOS,
    level: 4,
    description: `Усі вороги роблять рятівний кидок Спритності; кожен отримує ${power(2, "дробильної шкоди")}, при успіху — половину.`,
    appearanceDescription:
      "Небо темніє, і з нього падають розпечені брили, лишаючи по собі вогняні хвости. Земля здригається від ударів, вирви димлять, а уламки каміння свистять над головами.",
    definition: def(2, ALL_ENEMIES, [damage("bludgeoning")], { resolution: save("dexterity", "half") }),
    raceModifiers: [],
  },
  {
    key: "deep-freeze",
    iconKey: "deep-freeze",
    name: "Глибока заморозка",
    school: CHAOS,
    level: 5,
    description: `Ворог робить рятівний кидок Статури; отримує ${power(6, "шкоди холодом")} і 1 раунд не може діяти. При успіху — половина шкоди без заморозки.`,
    appearanceDescription:
      "Ворога за мить охоплює товща блакитного льоду, і він застигає, мов статуя в зимовому саду. Крізь кригу видно його розширені очі, а тиша навколо стає дзвінкою, як у морозну ніч.",
    definition: def(6, ENEMY, [damage("cold"), condition("skip_action", 1)], { resolution: save("constitution", "half") }),
    raceModifiers: [],
  },
  {
    key: "armageddon",
    iconKey: "armageddon",
    name: "Армагеддон",
    school: CHAOS,
    level: 5,
    description: `Кожен учасник бою — вороги, союзники і сам заклинатель — отримує ${power(4, "шкоди вогнем")}.`,
    appearanceDescription:
      "Небо стає багряним, і з нього ллється вогняний дощ, що не розбирає ні своїх, ні чужих. Земля плавиться, повітря реве, а заклинатель стоїть посеред пекла, сміючись крізь опіки.",
    definition: def(4, { kind: "everyone" }, [damage("fire")]),
    raceModifiers: [],
  },
  {
    key: "implosion",
    iconKey: "implosion",
    name: "Імплозія",
    school: CHAOS,
    level: 5,
    description: `Завдає ворогу ${power(8, "силової шкоди")}.`,
    appearanceDescription:
      "Простір довкола ворога стискається в точку, і світло гне свої промені, падаючи всередину. Обладунки зминаються, мов пергамент, а потім усе розривається глухим, нищівним вибухом.",
    definition: def(8, ENEMY, [damage("force")]),
    raceModifiers: [],
  },

  // ── Природа ────────────────────────────────────────────────────────────
  {
    key: "roots",
    iconKey: "roots",
    name: "Корені",
    school: NATURE,
    level: 1,
    description: "Ворог робить рятівний кидок Сили; при провалі 1 раунд не може атакувати в ближньому бою і отримує −2 до ініціативи. Успіх — без ефекту.",
    appearanceDescription:
      "Земля під ногами ворога розверзається, і з неї вириваються вузлуваті корені, обплітаючи щиколотки й коліна. Від них пахне вологою глиною і старим лісом.",
    definition: def(0, ENEMY, [condition("disable_melee_attacks", 1), stat("initiative", -2, 1)], { resolution: save("strength", "none") }),
    raceModifiers: [],
  },
  {
    key: "healing-word",
    iconKey: "healing-word",
    name: "Слово лікування",
    school: NATURE,
    level: 1,
    description: `Бонусною дією союзник відновлює ${power(3, "лікування")} HP.`,
    appearanceDescription:
      "Заклинатель шепоче коротке слово, і союзника огортає запах свіжої трави після дощу. Рани затягуються зеленкуватим світлом, мов молодою корою.",
    definition: def(3, ALLY, [heal()], { cost: "bonusAction" }),
    raceModifiers: [],
  },
  {
    key: "thorny-vines",
    iconKey: "thorny-vines",
    name: "Колючі лози",
    school: NATURE,
    level: 2,
    description: `Отруйні лози обвивають ворога: кидок — ${power(1, "отрутою")} — визначає шкоду, яку ворог отримує на початку кожного свого ходу протягом 3 раундів.`,
    appearanceDescription:
      "Із землі здіймаються темно-зелені пагони, вкриті шипами, з яких сочиться жовтий сік. Вони обплітають ворога і щільнішають з кожним його рухом.",
    definition: def(1, ENEMY, [{ kind: "dot", damagePerRound: { spellRoll: 100 }, damageType: "poison", duration: rounds(3) }]),
    raceModifiers: [],
  },
  {
    key: "moonbeam",
    iconKey: "moonbeam",
    name: "Місячний промінь",
    school: NATURE,
    level: 2,
    description: `Завдає ворогу ${power(3, "променевої шкоди")}, а наступні 2 раунди він на початку свого ходу отримує ще 14 % від цього кидка.`,
    appearanceDescription:
      "Навіть серед білого дня з неба падає срібний місячний стовп і пришпилює ворога до землі. Його шкіра світиться холодним сяйвом, що пече зсередини.",
    definition: def(3, ENEMY, [damage("radiant"), { kind: "dot", damagePerRound: { spellRoll: 14 }, damageType: "radiant", duration: rounds(2) }]),
    raceModifiers: [],
  },
  {
    key: "wasp-swarm",
    iconKey: "wasp-swarm",
    name: "Рій ос",
    school: NATURE,
    level: 3,
    description: `До 3 ворогів отримують по ${power(2, "колючої шкоди")} і −2 до ініціативи на 2 раунди.`,
    appearanceDescription:
      "З рукава друїда вилітає гудуча хмара ос завбільшки з палець. Вони облітають ворогів, жалять в обличчя й шию, і ті відмахуються, забувши про бій.",
    definition: def(2, enemies(3), [damage("piercing"), stat("initiative", -2, 2)]),
    raceModifiers: [],
  },
  {
    key: "forest-spirit",
    iconKey: "forest-spirit",
    name: "Дух лісу",
    school: NATURE,
    level: 3,
    description: "Протягом 3 раундів союзник на початку кожного свого ходу відновлює 10 % максимального HP і має опір 50 % до отрути.",
    appearanceDescription:
      "За спиною союзника з'являється напівпрозорий олень з гіллястими рогами, у яких сплять світлячки. Його подих пахне живицею і повертає силу кожній зраненій жилі.",
    definition: def(0, ALLY, [regen(3), { kind: "flag", flag: "resistance", damageType: "poison", percent: 50, duration: rounds(3) }]),
    raceModifiers: [],
  },
  {
    key: "entangle",
    iconKey: "entangle",
    name: "Сплутування",
    school: NATURE,
    level: 3,
    description: "До 3 ворогів роблять рятівний кидок Сили; хто провалить — 1 раунд не може атакувати в ближньому бою. Успіх — без ефекту.",
    appearanceDescription:
      "Трава довкола ворогів раптом оживає і стає жорсткою, як дріт. Стебла сплітаються в густу сітку, і кожен крок вперед обертається падінням.",
    definition: def(0, enemies(3), [condition("disable_melee_attacks", 1)], { resolution: save("strength", "none") }),
    raceModifiers: [],
  },
  {
    key: "earthquake",
    iconKey: "earthquake",
    name: "Землетрус",
    school: NATURE,
    level: 4,
    description: `Усі вороги роблять рятівний кидок Спритності; кожен отримує ${power(2, "дробильної шкоди")} і 1 раунд атакує з невигідністю. При успіху — половина шкоди без невигідності.`,
    appearanceDescription:
      "Друїд б'є посохом об землю, і поле бою здригається від глибокого гулу. Ґрунт тріскається, вороги падають навколішки, а з розломів здіймається пил і запах сирої глини.",
    definition: def(2, ALL_ENEMIES, [damage("bludgeoning"), { kind: "flag", flag: "disadvantage", duration: rounds(1) }], { resolution: save("dexterity", "half") }),
    raceModifiers: [],
  },
  {
    key: "healing-wave",
    iconKey: "healing-wave",
    name: "Хвиля зцілення",
    school: NATURE,
    level: 4,
    description: `Кожен союзник відновлює ${power(3, "лікування")} HP.`,
    appearanceDescription:
      "Від друїда котиться зелена хвиля, і там, де вона проходить, розквітають польові квіти. Союзники вдихають запах весняного лісу, і втома та рани відступають.",
    definition: def(3, { kind: "allAllies" }, [heal()]),
    raceModifiers: [],
  },
  {
    key: "nature-storm",
    iconKey: "nature-storm",
    name: "Шторм природи",
    school: NATURE,
    level: 5,
    description: `Усі вороги отримують ${power(3, "шкоди блискавкою")} і 1 раунд не можуть чаклувати.`,
    appearanceDescription:
      "Небо над полем бою чорніє, вітер виє, ламаючи дерева, і блискавки б'ють у ворожі лави одна за одною. Шум зливи заглушає слова закляття, а маги ворога лише безпорадно ковтають воду.",
    definition: def(3, ALL_ENEMIES, [damage("lightning"), condition("disable_spell_casting", 1)]),
    raceModifiers: [],
  },
  {
    key: "forest-rebirth",
    iconKey: "forest-rebirth",
    name: "Відродження лісу",
    school: NATURE,
    level: 5,
    description: "Повертає до бою полеглих союзників з 30 % максимального HP.",
    appearanceDescription:
      "Над полеглими проростають молоді паростки, що за мить стають квітучими кущами. Коли пелюстки опадають, на їхньому місці підводяться воїни, з волоссям, у якому заплуталося листя.",
    definition: def(0, { kind: "allAlliesDead" }, [{ kind: "heal", amount: { percentOf: "maxHp", value: 30 }, revive: true }]),
    raceModifiers: [],
  },
  {
    key: "call-of-the-beast",
    iconKey: "call-of-the-beast",
    name: "Поклик звіра",
    school: NATURE,
    level: 5,
    description: "Прикликає на бік заклинателя звіра, яким керує його гравець. Конкретного юніта обирає DM у редакторі заклинання (призив юніта бестіарію).",
    appearanceDescription:
      "Друїд підносить до вуст ріг, і з глибини лісу відповідає важкий рик. Кущі розступаються, і на поле бою виходить звір, що схиляє голову перед покликом, якого не можна не почути.",
    definition: def(0, SELF, [{ kind: "note", text: "Поклик звіра: DM обирає юніта для призиву в редакторі заклинання." }]),
    raceModifiers: [],
  },

  {
    key: "summon-fire-elemental",
    iconKey: "call-of-the-beast",
    name: "Прикликання елементаля: Вогонь",
    school: NATURE,
    level: 3,
    description: "Раз за бій прикликає елементаля вогню: його здоров'я, шкода та атака зростають з рівнем заклинателя. Елементалем керує гравець.",
    appearanceDescription:
      "Полум'я стискається в людиноподібну постать, що тріщить жаром і залишає на землі випалені сліди. Заклинатель простягає руку, і елементаль стає на його бік.",
    definition: def(0, SELF, [{ kind: "summon", unitId: "neutral-fire-elemental" }]),
    raceModifiers: [],
  },
  {
    key: "summon-water-elemental",
    iconKey: "call-of-the-beast",
    name: "Прикликання елементаля: Вода",
    school: NATURE,
    level: 3,
    description: "Раз за бій прикликає елементаля води: його здоров'я, шкода та атака зростають з рівнем заклинателя. Елементалем керує гравець.",
    appearanceDescription:
      "З повітря зривається водяний стовп і застигає постаттю з хвиль та льоду, холодною на дотик навіть здалеку. Заклинатель простягає руку, і елементаль стає на його бік.",
    definition: def(0, SELF, [{ kind: "summon", unitId: "neutral-water-elemental" }]),
    raceModifiers: [],
  },
  {
    key: "summon-air-elemental",
    iconKey: "call-of-the-beast",
    name: "Прикликання елементаля: Повітря",
    school: NATURE,
    level: 3,
    description: "Раз за бій прикликає елементаля повітря: його здоров'я, шкода та атака зростають з рівнем заклинателя. Елементалем керує гравець.",
    appearanceDescription:
      "Вихор злітає з-під ніг заклинателя, і серед пилу й блискавок проступає прозора постать, що ніколи не промахується. Заклинатель простягає руку, і елементаль стає на його бік.",
    definition: def(0, SELF, [{ kind: "summon", unitId: "neutral-air-elemental" }]),
    raceModifiers: [],
  },
  {
    key: "summon-earth-elemental",
    iconKey: "call-of-the-beast",
    name: "Прикликання елементаля: Земля",
    school: NATURE,
    level: 3,
    description: "Раз за бій прикликає елементаля землі: його здоров'я, шкода та атака зростають з рівнем заклинателя. Елементалем керує гравець.",
    appearanceDescription:
      "Земля розкривається, і з неї піднімається брила, що складається в масивного велета з очима з розжареного каменю. Заклинатель простягає руку, і елементаль стає на його бік.",
    definition: def(0, SELF, [{ kind: "summon", unitId: "neutral-earth-elemental" }]),
    raceModifiers: [],
  },

  // ── Спеціальні ─────────────────────────────────────────────────────────
  {
    key: "avatar",
    iconKey: "avatar",
    name: "Аватар",
    school: NATURE,
    level: 4,
    description: "Особисте закляття: Маркел прикликає Аватара — юніта, якого DM обирає в редакторі заклинання. Аватаром керує гравець.",
    appearanceDescription:
      "Повітря перед заклинателем густішає й мерехтить, ніби над розпеченим каменем. З тіні та світла складається велична постать без обличчя, що мовчки стає поруч, готова до бою.",
    definition: def(0, SELF, [{ kind: "note", text: "Аватар: DM обирає юніта для призиву в редакторі заклинання." }]),
    raceModifiers: [],
  },
];
