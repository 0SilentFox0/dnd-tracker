import type { FieldMeta } from "../fields";
import { CONDITION_LABELS } from "../labels";

import { ABILITY_OPTIONS, DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { MONSTER_SENSE_LABELS } from "@/lib/constants/monster";
import { DND_SKILL_META, DND_SKILLS } from "@/lib/constants/skills";
import type { FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";
import { seg, type Segment,type SegmentParam } from "@/lib/utils/abilities/segments";
import { signed } from "@/lib/utils/common/format";

type FlagOf<K extends FlagKey> = Extract<FlagEffect, { flag: K }>;

interface FlagDefinition<K extends FlagKey> {
  label: string;
  fields: readonly FieldMeta[];
  defaults: Record<string, unknown>;
  describe: (e: FlagOf<K>) => Segment[];
}

const ATTACK_KIND_ALL = [
  { value: "all", label: "усі" },
  { value: AttackType.MELEE, label: "ближні" },
  { value: AttackType.RANGED, label: "дальні" },
] as const;

const meleeRanged = (melee: string, ranged: string) => [{ value: AttackType.MELEE, label: melee }, { value: AttackType.RANGED, label: ranged }];

const plain = (label: string, key: FlagKey) => ({ label, fields: [] as readonly FieldMeta[], defaults: {} as Record<string, unknown>, describe: () => [flagSeg(key)] });

const SAVE_ABILITY_OPTIONS = [{ value: "all", label: "усі" }, ...ABILITY_OPTIONS];

const SKILL_OPTIONS = DND_SKILLS.map((k) => ({ value: k, label: DND_SKILL_META[k].label }));

const SKILL_OR_ALL_OPTIONS = [{ value: "all", label: "усі" }, ...SKILL_OPTIONS];

const PROFICIENCY_LABELS = { light: "легка броня", medium: "середня броня", heavy: "важка броня", shield: "щити", simple: "проста зброя", martial: "бойова зброя" } as const;

const PROFICIENCY_OPTIONS = PROFICIENCY_KINDS.map((value) => ({ value, label: PROFICIENCY_LABELS[value] }));

const flagSeg = (key: FlagKey, params?: Record<string, SegmentParam>) => seg(`summary.flags.${key}`, params);

const listParams = (group: string, a: readonly string[] | "all") => ({
  hasList: a === "all" ? "no" : "yes",
  list: { join: ", ", items: a === "all" ? [] : a.map((k) => seg(`options.${group}.${k}`)) },
});

export const FLAG_REGISTRY: { [K in FlagKey]: FlagDefinition<K> } = {
  sense: {
    label: "Чуття",
    fields: [{ name: "sense", label: "Чуття", input: "select", options: Object.entries(MONSTER_SENSE_LABELS).map(([value, label]) => ({ value, label })) }, { name: "range", label: "Дальність, фути", input: "number" }],
    defaults: { sense: "blindsight", range: 30 },
    describe: (e) => [flagSeg("sense", { sense: seg(`options.sense.${e.sense}`), range: e.range })],
  },
  advantage: {
    label: "Перевага",
    fields: [
      { name: "attackKind", label: "Атаки", input: "select", options: ATTACK_KIND_ALL },
      { name: "attackAbility", label: "Лише атаки цією характеристикою", input: "select", optional: true, options: ABILITY_OPTIONS },
      { name: "consumeOn", label: "Зникає після першої атаки", input: "select", optional: true, options: [{ value: "ownAttack", label: "так" }] },
      { name: "until", label: "Зникає в кінці мого ходу", input: "select", optional: true, options: [{ value: "turnEnd", label: "так" }] },
    ],
    defaults: { attackKind: "all" },
    describe: (e) => [
      flagSeg("advantage", { kind: e.attackKind, hasAbility: e.attackAbility ? "yes" : "no", ability: e.attackAbility ? seg(`options.attackAbility.${e.attackAbility}`) : "", consume: e.consumeOn ? "yes" : "no" }),
    ],
  },
  disadvantage: plain("Недолік на свої атаки", "disadvantage"),
  disadvantageForAttackers: plain("Недолік для атакувальників", "disadvantageForAttackers"),
  advantageForAttackers: plain("Перевага для атакувальників", "advantageForAttackers"),
  guaranteedHit: plain("Гарантоване влучання", "guaranteedHit"),
  resistance: {
    label: "Опір / імунітет до шкоди",
    fields: [
      { name: "damageType", label: "Тип шкоди (all, physical, spell, fire…)", input: "text" },
      { name: "percent", label: "%, 100 = імунітет, від'ємне = вразливість", input: "number" },
      { name: "attackKind", label: "Лише проти атак", input: "select", options: meleeRanged("ближніх", "дальніх"), optional: true },
      { name: "school", label: "Лише від заклинань школи", input: "text", optional: true },
    ],
    defaults: { damageType: "physical", percent: 25 },
    describe: (e) => [
      flagSeg("resistance", {
        mode: e.percent >= 100 ? "immune" : e.percent < 0 ? "vuln" : "resist",
        type: e.damageType,
        n: Math.abs(e.percent),
        kind: e.attackKind ?? "none",
        hasSchool: e.school ? "yes" : "no",
        school: e.school ?? "",
      }),
    ],
  },
  spellAbsorb: {
    label: "Поглинання шкоди заклинань",
    fields: [
      { name: "school", label: "Школа заклинань", input: "text" },
      { name: "percent", label: "% шкоди, що лікує", input: "number" },
    ],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("spellAbsorb", { percent: e.percent, school: e.school })],
  },
  castSpellOnHit: {
    label: "Закляття при влучанні",
    fields: [
      { name: "spellIds", label: "Заклинання (одне з них, випадково)", input: "spells" },
      { name: "attackKind", label: "Лише атаки", input: "select", options: meleeRanged("ближні", "дальні"), optional: true },
    ],
    defaults: { spellIds: [] },
    describe: (e) => [flagSeg("castSpellOnHit", { count: e.spellIds.length })],
  },
  spellImmunity: {
    label: "Імунітет до заклинань",
    fields: [{ name: "spellIds", label: "Заклинання (порожньо = усі)", input: "spells", optional: true }],
    defaults: {},
    describe: (e) => [flagSeg("spellImmunity", { hasIds: e.spellIds ? "yes" : "no", count: e.spellIds?.length ?? 0 })],
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
    describe: (e) => [
      flagSeg("spellTargeting", { scope: e.school ? "school" : e.spellIds ? "ids" : "none", school: e.school ?? "", count: e.spellIds?.length ?? 0, mode: e.mode, max: e.maxTargets ?? DEFAULT_AREA_TARGETS }),
    ],
  },
  counterAttack: {
    label: "Контратака",
    fields: [
      { name: "attackKinds", label: "На атаки", input: "multiselect", options: meleeRanged("ближня", "дальня") },
      { name: "bonusPercent", label: "Бонус шкоди, %", input: "number" },
    ],
    defaults: { attackKinds: [AttackType.MELEE], bonusPercent: 15 },
    describe: (e) => [flagSeg("counterAttack", { ranged: e.attackKinds.includes(AttackType.RANGED) ? "yes" : "no", percent: e.bonusPercent })],
  },
  attackHitsAllEnemies: plain("Атака б'є всіх ворогів", "attackHitsAllEnemies"),
  seeEnemyHp: plain("Бачить HP ворогів", "seeEnemyHp"),
  multiTargetFalloff: {
    label: "Шкода додаткових цілей дальньої атаки",
    fields: [{ name: "percent", label: "% шкоди додаткових цілей", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("multiTargetFalloff", { percent: e.percent })],
  },
  chainShot: {
    label: "Ланцюговий постріл",
    fields: [
      { name: "jumps", label: "Стрибків", input: "number" },
      { name: "percent", label: "% шкоди від попереднього", input: "number" },
    ],
    defaults: { jumps: 2, percent: 50 },
    describe: (e) => [flagSeg("chainShot", { jumps: e.jumps, percent: e.percent })],
  },
  lifesteal: {
    label: "Вампіризм (лікування від шкоди атак)",
    fields: [{ name: "percent", label: "% завданої шкоди", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("lifesteal", { percent: e.percent })],
  },
  moraleChance: {
    label: "Шанс додаткового ходу від моралі",
    fields: [{ name: "percent", label: "+% до шансу додаткового ходу", input: "number" }],
    defaults: { percent: 10 },
    describe: (e) => [flagSeg("moraleChance", { percent: e.percent })],
  },
  noRetaliation: plain("Без відповіді", "noRetaliation"),
  strikeAndReturn: plain("Удар і повернення", "strikeAndReturn"),
  unlimitedRetaliation: plain("Безмежна відсіч", "unlimitedRetaliation"),
  extraRetaliations: {
    label: "Додаткові відсічі за раунд",
    fields: [{ name: "count", label: "Додаткових відсічей", input: "number" }],
    defaults: { count: 1 },
    describe: (e) => [flagSeg("extraRetaliations", { count: e.count })],
  },
  noNegativeMorale: plain("Мораль не нижче 0", "noNegativeMorale"),
  ignoreMorale: plain("Мораль не діє", "ignoreMorale"),
  minMorale: {
    label: "Мінімальна мораль",
    fields: [{ name: "value", label: "Мінімум (−3…3)", input: "number" }],
    defaults: { value: 1 },
    describe: (e) => [flagSeg("minMorale", { value: signed(e.value) })],
  },
  extraSummons: {
    label: "Додаткові прикликані істоти",
    fields: [
      { name: "count", label: "Додаткових істот", input: "number" },
      { name: "spellIds", label: "Заклинання (порожньо = усі прикликання заклять)", input: "spells", optional: true },
    ],
    defaults: { count: 1 },
    describe: (e) => [flagSeg("extraSummons", { hasIds: e.spellIds ? "yes" : "no", ids: e.spellIds?.length ?? 0, count: e.count })],
  },
  piercingShot: plain("Наскрізний постріл", "piercingShot"),
  fireWave: {
    label: "Вогняна хвиля",
    fields: [
      { name: "percent", label: "% шкоди удару", input: "number" },
      { name: "size", label: "Конус, фт", input: "number" },
    ],
    defaults: { percent: 50, size: 15 },
    describe: (e) => [flagSeg("fireWave", { size: e.size, percent: e.percent })],
  },
  banishSummons: {
    label: "Вигнання прикликаних ворогом",
    fields: [{ name: "percent", label: "% HP, які втрачають", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("banishSummons", { percent: e.percent })],
  },
  saveAdvantage: {
    label: "Перевага на рятівні кидки",
    fields: [
      { name: "abilities", label: "Характеристики", input: "multiselect", options: SAVE_ABILITY_OPTIONS },
      { name: "vsSpells", label: "Лише проти заклинань", input: "toggle", optional: true },
    ],
    defaults: { abilities: "all" },
    describe: (e) => [flagSeg("saveAdvantage", { ...listParams("abilities", e.abilities), vsSpells: e.vsSpells ? "yes" : "no" })],
  },
  saveDisadvantage: {
    label: "Недолік на рятівні кидки",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: SAVE_ABILITY_OPTIONS }],
    defaults: { abilities: "all" },
    describe: (e) => [flagSeg("saveDisadvantage", listParams("abilities", e.abilities))],
  },
  autoFailSave: {
    label: "Автопровал рятівних кидків",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["strength", "dexterity"] },
    describe: (e) => [flagSeg("autoFailSave", listParams("abilities", e.abilities))],
  },
  saveProficiency: {
    label: "Майстерність в рятівних кидках",
    fields: [{ name: "abilities", label: "Характеристики", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["wisdom"] },
    describe: (e) => [flagSeg("saveProficiency", listParams("abilities", e.abilities))],
  },
  checkAdvantage: {
    label: "Перевага на перевірки",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => [flagSeg("checkAdvantage", listParams("skills", e.skills))],
  },
  checkDisadvantage: {
    label: "Недолік на перевірки",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => [flagSeg("checkDisadvantage", listParams("skills", e.skills))],
  },
  skillProficiency: {
    label: "Майстерність у навичках",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["perception"] },
    describe: (e) => [flagSeg("skillProficiency", listParams("skills", e.skills))],
  },
  skillExpertise: {
    label: "Експертиза в навичках",
    fields: [{ name: "skills", label: "Навички", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["stealth"] },
    describe: (e) => [flagSeg("skillExpertise", listParams("skills", e.skills))],
  },
  proficiency: {
    label: "Володіння бронею й зброєю",
    fields: [{ name: "kinds", label: "Володіння", input: "multiselect", options: PROFICIENCY_OPTIONS }],
    defaults: { kinds: ["heavy"] },
    describe: (e) => [flagSeg("proficiency", { list: { join: ", ", items: e.kinds.map((k) => seg(`options.kinds.${k}`)) } })],
  },
  autoCritAdjacent: plain("Криті від сусідів", "autoCritAdjacent"),
  twoWeaponFighting: plain("Бій двома зброями", "twoWeaponFighting"),
  critImmunity: plain("Імунітет до критів", "critImmunity"),
  cunningAction: plain("Хитра дія (Cunning Action)", "cunningAction"),
  evasion: plain("Ухилення (Evasion)", "evasion"),
  proneDefense: plain("Захист повалених", "proneDefense"),
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
    describe: (e) => [
      flagSeg("conditionImmunity", {
        all: e.conditions === "all" ? "yes" : "no",
        list: { join: ", ", items: e.conditions === "all" ? [] : e.conditions.map((c) => (c === "fear" || c === "berserk" || c === "charm" ? seg(`summary.flags.cond.${c}`) : seg("summary.text", { value: c }))) },
      }),
    ],
  },
};

const entries = Object.entries(FLAG_REGISTRY) as [FlagKey, FlagDefinition<FlagKey>][];

export const FLAG_LABELS = Object.fromEntries(entries.map(([k, d]) => [k, d.label])) as Record<FlagKey, string>;

export const FLAG_FIELDS = Object.fromEntries(entries.map(([k, d]) => [k, d.fields])) as Record<FlagKey, readonly FieldMeta[]>;

export const FLAG_DEFAULTS = Object.fromEntries(entries.map(([k, d]) => [k, d.defaults])) as Record<FlagKey, Record<string, unknown>>;

export function describeFlag(e: FlagEffect): Segment[] {
  return (FLAG_REGISTRY[e.flag] as FlagDefinition<FlagKey>).describe(e as never);
}
