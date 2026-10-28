import type { FieldMeta } from "../fields";
import { CONDITION_LABELS } from "../labels";

import { ABILITY_LABELS, ABILITY_OPTIONS, DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import { DND_SKILL_META, DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/common/format";

type FlagOf<K extends FlagKey> = Extract<FlagEffect, { flag: K }>;

interface FlagDefinition<K extends FlagKey> {
  label: string;
  fields: readonly FieldMeta[];
  defaults: Record<string, unknown>;
  describe: (e: FlagOf<K>) => string;
}

const ATTACK_KIND_ALL = [
  { value: "all", label: "усі" },
  { value: AttackType.MELEE, label: "ближні" },
  { value: AttackType.RANGED, label: "дальні" },
] as const;

const meleeRanged = (melee: string, ranged: string) => [{ value: AttackType.MELEE, label: melee }, { value: AttackType.RANGED, label: ranged }];

const plain = (label: string, text: string) => ({ label, fields: [] as readonly FieldMeta[], defaults: {} as Record<string, unknown>, describe: () => text });

const SAVE_ABILITY_OPTIONS = [{ value: "all", label: "усі" }, ...ABILITY_OPTIONS];

const SKILL_OPTIONS = DND_SKILLS.map((k) => ({ value: k, label: DND_SKILL_META[k].label }));

const SKILL_OR_ALL_OPTIONS = [{ value: "all", label: "усі" }, ...SKILL_OPTIONS];

const skillsText = (a: readonly string[] | "all") => (a === "all" ? "" : ` (${a.map((k) => DND_SKILL_META[k as DndSkill].label).join(", ")})`);

const abilitiesText = (a: readonly string[] | "all") => (a === "all" ? "" : ` (${a.map((k) => ABILITY_LABELS[k as keyof typeof ABILITY_LABELS]).join(", ")})`);

export const FLAG_REGISTRY: { [K in FlagKey]: FlagDefinition<K> } = {
  advantage: {
    label: "Перевага",
    fields: [{ name: "attackKind", label: "Атаки", input: "select", options: ATTACK_KIND_ALL }],
    defaults: { attackKind: "all" },
    describe: (e) => (e.attackKind === "all" ? "перевага на атаки" : `перевага на ${e.attackKind === AttackType.MELEE ? "ближні" : "дальні"} атаки`),
  },
  disadvantage: plain("Недолік на свої атаки", "недолік на атаки"),
  disadvantageForAttackers: plain("Недолік для атакувальників", "недолік для атакувальників"),
  advantageForAttackers: plain("Перевага для атакувальників", "атакуючі цю ціль мають перевагу"),
  guaranteedHit: plain("Гарантоване влучання", "гарантоване влучання"),
  resistance: {
    label: "Опір / імунітет до шкоди",
    fields: [
      { name: "damageType", label: "Тип шкоди (all, physical, spell, fire…)", input: "text" },
      { name: "percent", label: "%, 100 = імунітет, від'ємне = вразливість", input: "number" },
      { name: "attackKind", label: "Лише проти атак", input: "select", options: meleeRanged("ближніх", "дальніх"), optional: true },
      { name: "school", label: "Лише від заклинань школи", input: "text", optional: true },
    ],
    defaults: { damageType: "physical", percent: 25 },
    describe: (e) =>
      `${e.percent >= 100 ? `імунітет: ${e.damageType}` : e.percent < 0 ? `вразливість ${e.damageType} ${-e.percent}%` : `опір ${e.damageType} ${e.percent}%`}${e.attackKind ? ` (${e.attackKind === "ranged" ? "дальні атаки" : "ближні атаки"})` : ""}${e.school ? ` (заклинання школи ${e.school})` : ""}`,
  },
  spellAbsorb: {
    label: "Поглинання шкоди заклинань",
    fields: [
      { name: "school", label: "Школа заклинань", input: "text" },
      { name: "percent", label: "% шкоди, що лікує", input: "number" },
    ],
    defaults: { percent: 50 },
    describe: (e) => `лікується на ${e.percent}% шкоди від заклинань школи ${e.school}`,
  },
  castSpellOnHit: {
    label: "Закляття при влучанні",
    fields: [
      { name: "spellIds", label: "Заклинання (одне з них, випадково)", input: "spells" },
      { name: "attackKind", label: "Лише атаки", input: "select", options: meleeRanged("ближні", "дальні"), optional: true },
    ],
    defaults: { spellIds: [] },
    describe: (e) => `влучання накладає випадкове закляття (із ${e.spellIds.length})`,
  },
  spellImmunity: {
    label: "Імунітет до заклинань",
    fields: [{ name: "spellIds", label: "Заклинання (порожньо = усі)", input: "spells", optional: true }],
    defaults: {},
    describe: (e) => (e.spellIds ? `імунітет до заклинань (${e.spellIds.length})` : "імунітет до всіх заклинань"),
  },
  spellTargeting: {
    label: "Режим цілей заклять",
    fields: [
      { name: "mode", label: "Режим", input: "select", options: [{ value: "area", label: "по області" }, { value: "all", label: "на всіх" }] },
      { name: "spellIds", label: "Заклинання", input: "spells", optional: true },
      { name: "school", label: "Школа", input: "text", optional: true },
      { name: "maxTargets", label: "Макс. цілей (область)", input: "number", optional: true },
      { name: "maxLevel", label: "Макс. рівень закляття", input: "number", optional: true },
    ],
    defaults: { mode: "area" },
    describe: (e) => {
      const scope = e.school ? `закляття школи ${e.school}` : e.spellIds ? `закляття (${e.spellIds.length})` : "закляття";

      return e.mode === "all" ? `${scope} — на всіх` : `${scope} — по області (до ${e.maxTargets ?? DEFAULT_AREA_TARGETS} цілей)`;
    },
  },
  counterAttack: {
    label: "Контратака",
    fields: [
      { name: "attackKinds", label: "На атаки", input: "multiselect", options: meleeRanged("ближня", "дальня") },
      { name: "bonusPercent", label: "Бонус шкоди, %", input: "number" },
    ],
    defaults: { attackKinds: [AttackType.MELEE], bonusPercent: 15 },
    describe: (e) => `відсіч${e.attackKinds.includes(AttackType.RANGED) ? " (і на дальні)" : ""} +${e.bonusPercent}%`,
  },
  attackHitsAllEnemies: plain("Атака б'є всіх ворогів", "кожна атака б'є всіх ворогів"),
  seeEnemyHp: plain("Бачить HP ворогів", "бачить HP ворогів"),
  multiTargetFalloff: {
    label: "Шкода додаткових цілей дальньої атаки",
    fields: [{ name: "percent", label: "% шкоди додаткових цілей", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => `додаткові цілі дальньої атаки отримують ${e.percent}% шкоди`,
  },
  chainShot: {
    label: "Ланцюговий постріл",
    fields: [
      { name: "jumps", label: "Стрибків", input: "number" },
      { name: "percent", label: "% шкоди від попереднього", input: "number" },
    ],
    defaults: { jumps: 2, percent: 50 },
    describe: (e) => `після влучання постріл перескакує на найближчого ворога (${e.jumps}×), кожен стрибок — ${e.percent}% шкоди попереднього`,
  },
  lifesteal: {
    label: "Вампіризм (лікування від шкоди атак)",
    fields: [{ name: "percent", label: "% завданої шкоди", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => `атаки лікують на ${e.percent}% завданої шкоди`,
  },
  moraleChance: {
    label: "Шанс додаткового ходу від моралі",
    fields: [{ name: "percent", label: "+% до шансу додаткового ходу", input: "number" }],
    defaults: { percent: 10 },
    describe: (e) => `шанс додаткового ходу від моралі +${e.percent}%`,
  },
  noRetaliation: plain("Без відповіді", "атаки без відсічі"),
  strikeAndReturn: plain("Удар і повернення", "після атаки повертається на стартову клітинку"),
  unlimitedRetaliation: plain("Безмежна відсіч", "відповідає на кожну атаку"),
  extraRetaliations: {
    label: "Додаткові відсічі за раунд",
    fields: [{ name: "count", label: "Додаткових відсічей", input: "number" }],
    defaults: { count: 1 },
    describe: (e) => `+${e.count} відсіч за раунд`,
  },
  noNegativeMorale: plain("Мораль не нижче 0", "від'ємна мораль = 0"),
  ignoreMorale: plain("Мораль не діє", "мораль не діє"),
  minMorale: {
    label: "Мінімальна мораль",
    fields: [{ name: "value", label: "Мінімум (−3…3)", input: "number" }],
    defaults: { value: 1 },
    describe: (e) => `мораль не нижче ${signed(e.value)}`,
  },
  extraSummons: {
    label: "Додаткові прикликані істоти",
    fields: [
      { name: "count", label: "Додаткових істот", input: "number" },
      { name: "spellIds", label: "Заклинання (порожньо = усі прикликання заклять)", input: "spells", optional: true },
    ],
    defaults: { count: 1 },
    describe: (e) => `прикликання${e.spellIds ? ` заклять (${e.spellIds.length})` : ""} дають +${e.count} істот`,
  },
  piercingShot: plain("Наскрізний постріл", "дальня атака влучає в усіх ворогів на лінії за ціллю"),
  fireWave: {
    label: "Вогняна хвиля",
    fields: [
      { name: "percent", label: "% шкоди удару", input: "number" },
      { name: "size", label: "Конус, фт", input: "number" },
    ],
    defaults: { percent: 50, size: 15 },
    describe: (e) => `влучання обпікає ворогів позаду цілі (конус ${e.size} фт): ${e.percent}% шкоди вогнем`,
  },
  banishSummons: {
    label: "Вигнання прикликаних ворогом",
    fields: [{ name: "percent", label: "% HP, які втрачають", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => `прикликані ворогом істоти втрачають ${e.percent}% HP`,
  },
  saveAdvantage: {
    label: "Перевага на рятівні кидки",
    fields: [
      { name: "abilities", label: "Характеристики", input: "multiselect", options: SAVE_ABILITY_OPTIONS },
      { name: "vsSpells", label: "Лише проти заклинань", input: "toggle", optional: true },
    ],
    defaults: { abilities: "all" },
    describe: (e) => `перевага на рятівні кидки${abilitiesText(e.abilities)}${e.vsSpells ? " проти заклинань" : ""}`,
  },
  saveDisadvantage: {
    label: "Недолік на рятівні кидки",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: SAVE_ABILITY_OPTIONS }],
    defaults: { abilities: "all" },
    describe: (e) => `недолік на рятівні кидки${abilitiesText(e.abilities)}`,
  },
  autoFailSave: {
    label: "Автопровал рятівних кидків",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["strength", "dexterity"] },
    describe: (e) => `автопровал рятівних кидків${abilitiesText(e.abilities)}`,
  },
  saveProficiency: {
    label: "Майстерність в рятівних кидках",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["wisdom"] },
    describe: (e) => `майстерність в рятівних кидках${abilitiesText(e.abilities)}`,
  },
  checkAdvantage: {
    label: "Перевага на перевірки",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => `перевага на перевірки${skillsText(e.skills)}`,
  },
  checkDisadvantage: {
    label: "Недолік на перевірки",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => `недолік на перевірки${skillsText(e.skills)}`,
  },
  skillProficiency: {
    label: "Майстерність у навичках",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["perception"] },
    describe: (e) => `майстерність у навичках${skillsText(e.skills)}`,
  },
  autoCritAdjacent: plain("Криті від сусідів", "ближні атаки з 5 фт по цілі — критичні"),
  twoWeaponFighting: plain("Бій двома зброями", "модифікатор до шкоди другої руки"),
  evasion: plain("Ухилення (Evasion)", "рятівний кидок Спритності з половиною шкоди: успіх — 0, провал — половина"),
  proneDefense: plain("Захист повалених", "ближні атаки по цілі з перевагою, дальні — з недоліком"),
  conditionImmunity: {
    label: "Імунітет до станів",
    fields: [
      {
        name: "conditions",
        label: "Стани",
        input: "multiselect",
        options: [
          { value: "all", label: "усі (контроль)" },
          { value: "fear", label: "страх" },
          { value: "berserk", label: "шал" },
          { value: "charm", label: "чарування (Ляльковод)" },
          ...Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })),
        ],
      },
    ],
    defaults: { conditions: "all" },
    describe: (e) => (e.conditions === "all" ? "імунітет до контролю" : `імунітет: ${e.conditions.map((c) => (c === "fear" ? "страх" : c === "berserk" ? "шал" : c === "charm" ? "чарування" : c)).join(", ")}`),
  },
};

const entries = Object.entries(FLAG_REGISTRY) as [FlagKey, FlagDefinition<FlagKey>][];

export const FLAG_LABELS = Object.fromEntries(entries.map(([k, d]) => [k, d.label])) as Record<FlagKey, string>;

export const FLAG_FIELDS = Object.fromEntries(entries.map(([k, d]) => [k, d.fields])) as Record<FlagKey, readonly FieldMeta[]>;

export const FLAG_DEFAULTS = Object.fromEntries(entries.map(([k, d]) => [k, d.defaults])) as Record<FlagKey, Record<string, unknown>>;

export function describeFlag(e: FlagEffect): string {
  return (FLAG_REGISTRY[e.flag] as FlagDefinition<FlagKey>).describe(e as never);
}
