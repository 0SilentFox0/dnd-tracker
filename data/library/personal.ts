import type { LibraryPersonal } from "./types";

import type { Ability } from "@/lib/utils/abilities/schema";

const AVATAR_SPELL = "avatar";

// Беатріс: control spells from the spells spec §2 «Спеціальні»
const CONTROL_SPELLS = ["roots", "entangle", "slow", "blindness", "confusion", "berserk", "puppet-master"];

// seed maps school keys to SpellGroup ids
const SPELL_SCHOOLS = [
  { key: "light", name: "Світло" },
  { key: "dark", name: "Темрява" },
  { key: "chaos", name: "Хаос" },
  { key: "nature", name: "Природа" },
];

const SEMGRUN_MARK = "semgrun-evaded";

const zehirSchoolAbilities: Ability[] = SPELL_SCHOOLS.map(({ key, name }) => ({
  id: `zehir-school-${key}`,
  name: `Учень усіх шкіл: ${name}`,
  trigger: { event: "spellCast", phase: "after", role: "caster", school: key },
  limits: { perBattle: 1 },
  effects: [{ kind: "damageBonus", filter: { kind: "magic" }, percent: 15, duration: { rounds: 99 }, target: "self" }],
}));

export const PERSONAL: LibraryPersonal[] = [
  {
    key: "personal-isabel",
    name: "Ізабель: Сурми світанку",
    description: "На початку бою всі союзники отримують +2 ініціативи і +10 % шкоди на 2 раунди.",
    appearanceDescription:
      "Ізабель підносить до вуст срібний ріг, і його чистий поклик котиться полем, як перший промінь сонця над туманом. Воїни розправляють плечі, стискають руків'я мечів і рушають уперед раніше, ніж ворог устигає вишикуватися.",
    abilities: [
      {
        id: "isabel-dawn-horns",
        name: "Сурми світанку",
        trigger: { event: "battleStart" },
        effects: [
          { kind: "modifyStat", stat: "initiative", flat: 2, duration: { rounds: 2 }, target: "allAllies" },
          { kind: "damageBonus", filter: { kind: "all" }, percent: 10, duration: { rounds: 2 }, target: "allAllies" },
        ],
      },
    ],
  },
  {
    key: "personal-godric",
    name: "Годрик: Непохитний",
    description: "Мораль Годрика ніколи не опускається нижче +1. Поки будь-який союзник має ≤ 15 % HP, Годрик завдає +20 % шкоди.",
    appearanceDescription:
      "Сивий лицар стоїть, мов скеля посеред бурі, і жоден жах не стирає спокою з його обличчя. Та коли поруч падає побратим, у його очах спалахує холодний гнів, а булава опускається з силою гірського обвалу.",
    abilities: [
      {
        id: "godric-steadfast",
        name: "Непохитний",
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "minMorale", value: 1 }],
      },
      {
        id: "godric-wrath",
        name: "Непохитний: гнів за своїх",
        trigger: { event: "passive" },
        condition: { type: "hpBelow", who: "anyAlly", percent: 15 },
        effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 20 }],
      },
    ],
  },
  {
    key: "personal-agrael",
    name: "Аграїл: Полум'яна аура",
    description: "Усі союзники (зокрема сам Аграїл) завдають +10 % шкоди. Тип шкоди не змінюється.",
    appearanceDescription:
      "Довкола Аграїла тремтить марево жару, і в ньому танцюють тонкі язики багряного полум'я. Кожен, хто стоїть поруч, відчуває, як вогонь проникає в кров, роблячи удари гарячішими й злішими.",
    abilities: [
      {
        id: "agrael-fire-aura",
        name: "Полум'яна аура",
        trigger: { event: "passive" },
        effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 10, target: "allAllies" }],
      },
    ],
  },
  {
    key: "personal-beatrice",
    name: "Беатріс: Подвійні пута",
    description:
      "Закляття контролю (Корені, Сплутування, Сповільнення, Сліпота, Розсіяність, Шал, Ляльковод) діють по області — до 2 цілей.",
    appearanceDescription:
      "Беатріс плете чари, як павук павутину: з її пальців тягнуться дві мерехтливі нитки, і кожна знаходить свою жертву. Двоє ворогів одночасно завмирають, мов маріонетки, чиї мотузки смикнула одна рука.",
    abilities: [
      {
        id: "beatrice-double-bind",
        name: "Подвійні пута",
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "spellTargeting", mode: "area", maxTargets: 2, spellIds: CONTROL_SPELLS }],
      },
    ],
  },
  {
    key: "personal-kha-beleth",
    name: "Кха-Белех: Кара Безодні",
    description: "Кожна атака Кха-Белеха б'є всіх ворогів з повною шкодою.",
    appearanceDescription:
      "Кха-Белех замахується, і за його клинком тягнеться хвіст чорного полум'я, що розтікається полем, як прилив. Удар призначався одному, але вогонь Безодні знаходить кожного ворога, хоч би де той стояв.",
    abilities: [
      {
        id: "kha-beleth-abyss-wrath",
        name: "Кара Безодні",
        trigger: { event: "passive" },
        effects: [{ kind: "flag", flag: "attackHitsAllEnemies" }],
      },
    ],
  },
  {
    key: "personal-ivan",
    name: "Айвен: Перший постріл",
    description: "Ініціатива 999 — Айвен завжди ходить першим. Перша дальня атака бою — з перевагою.",
    appearanceDescription:
      "Айвен рухається ще до того, як сурми встигають прозвучати: тятива вже натягнута, погляд уже знайшов ціль. Перша стріла летить у тиші, поки вороги тільки тягнуться до зброї.",
    abilities: [
      {
        id: "ivan-swift",
        name: "Перший постріл: швидкість",
        trigger: { event: "passive" },
        effects: [{ kind: "modifyStat", stat: "initiative", flat: 999 }],
      },
      {
        id: "ivan-first-shot",
        name: "Перший постріл",
        trigger: { event: "attack", phase: "before", role: "attacker", attackKind: "ranged" },
        limits: { perBattle: 1 },
        effects: [{ kind: "flag", flag: "advantage", attackKind: "ranged" }],
      },
    ],
  },
  {
    key: "personal-raelag",
    name: "Раїлаг: Отрута Ігг-Шайла",
    description: "Після влучання ціль отруєна: 10 % середньої шкоди атаки Раїлага щораунду, 3 раунди. Не стакається — повторне влучання оновлює тривалість.",
    appearanceDescription:
      "Клинки Раїлага вкриті тьмяною зеленою плівкою, що ледь димить на повітрі. Подряпина від них здається дрібницею, доки рана не починає пекти й чорніти, а по жилах не розповзається крижаний вогонь.",
    abilities: [
      {
        id: "raelag-venom",
        name: "Отрута Ігг-Шайла",
        trigger: { event: "hit", role: "attacker" },
        effects: [
          { kind: "dot", damagePerRound: { percentOf: "ownerAttack", value: 10 }, damageType: "poison", duration: { rounds: 3 }, target: "eventTarget" },
        ],
      },
    ],
  },
  {
    key: "personal-semgrun",
    name: "Семгрун: Невловима",
    description: "Перша атака кожного ворога по Семгрун за раунд — з невигідністю (ворог отримує мітку на 1 раунд).",
    appearanceDescription:
      "Семгрун ніби розчиняється в повітрі саме тоді, коли на неї опускається клинок: лишається тільки тінь і легкий подих вітру. Ворог б'є в порожнечу, а вона вже стоїть на крок лівіше й усміхається.",
    abilities: [
      {
        id: "semgrun-elusive",
        name: "Невловима",
        trigger: { event: "attack", phase: "before", role: "target" },
        condition: { type: "not", condition: { type: "hasMark", who: "eventActor", markId: SEMGRUN_MARK, bySelf: true } },
        effects: [
          { kind: "flag", flag: "disadvantageForAttackers" },
          { kind: "mark", markId: SEMGRUN_MARK, duration: { rounds: 1 }, target: "eventActor" },
        ],
      },
    ],
  },
  {
    key: "personal-zehir",
    name: "Зехір: Учень усіх шкіл",
    description:
      "Перше закляття кожної школи (Світло, Темрява, Хаос, Природа) за бій дає +15 % до шкоди заклять до кінця бою; бонуси шкіл складаються (до +60 %). Може вивчати закляття всіх шкіл (DM відкриває їх у дереві).",
    appearanceDescription:
      "Довкола Зехіра кружляють чотири сфери — золота, чорна, вогняна й зелена, — і кожна спалахує, коли він уперше черпає з неї силу. Що більше сфер прокинулося, то яскравіше палає його погляд і то важче гудуть його закляття.",
    abilities: [
      ...zehirSchoolAbilities,
      {
        id: "zehir-all-schools",
        name: "Учень усіх шкіл",
        trigger: { event: "passive" },
        effects: [{ kind: "note", text: "Може вивчати закляття всіх шкіл — DM відкриває їх у дереві навичок." }],
      },
    ],
  },
  {
    key: "personal-markel",
    name: "Маркел: Поклик Аватара",
    description: "Маркел знає додаткове закляття «Аватар» — прикликає юніта, якого DM обирає в заклятті.",
    appearanceDescription:
      "Маркел вимовляє ім'я, яке не можна писати, і повітря перед ним густішає, набуваючи форми. З тіні й мерехтіння постає Аватар — тиха, велична постать, що схиляє голову лише перед ним.",
    grantedSpellKey: AVATAR_SPELL,
    abilities: [
      {
        id: "markel-avatar",
        name: "Поклик Аватара",
        trigger: { event: "passive" },
        effects: [{ kind: "note", text: "Дає закляття «Аватар»." }],
      },
    ],
  },
];
