import type { FieldMeta } from "../fields";
import { CONDITION_KEYS_ALL, conditionKeySegment, damageTypeSegment } from "../labels";

import { ABILITY_OPTIONS, DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { MONSTER_SENSE_LABELS } from "@/lib/constants/monster";
import { DND_SKILLS } from "@/lib/constants/skills";
import type { FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";
import { seg, type Segment,type SegmentParam } from "@/lib/utils/abilities/segments";
import { signed } from "@/lib/utils/common/format";

type FlagOf<K extends FlagKey> = Extract<FlagEffect, { flag: K }>;

interface FlagDefinition<K extends FlagKey> {
  fields: readonly FieldMeta[];
  defaults: Record<string, unknown>;
  describe: (e: FlagOf<K>) => Segment[];
}

const ATTACK_KIND_ALL = [
  { value: "all" },
  { value: AttackType.MELEE },
  { value: AttackType.RANGED },
] as const;

const MELEE_RANGED = [{ value: AttackType.MELEE }, { value: AttackType.RANGED }];

const plain = (key: FlagKey) => ({ fields: [] as readonly FieldMeta[], defaults: {} as Record<string, unknown>, describe: () => [flagSeg(key)] });

const SAVE_ABILITY_OPTIONS = [{ value: "all" }, ...ABILITY_OPTIONS];

const SKILL_OPTIONS = DND_SKILLS.map((value) => ({ value }));

const SKILL_OR_ALL_OPTIONS = [{ value: "all" }, ...SKILL_OPTIONS];

const PROFICIENCY_OPTIONS = PROFICIENCY_KINDS.map((value) => ({ value }));

const flagSeg = (key: FlagKey, params?: Record<string, SegmentParam>) => seg(`summary.flags.${key}`, params);

const listParams = (group: string, a: readonly string[] | "all") => ({
  hasList: a === "all" ? "no" : "yes",
  list: { join: ", ", items: a === "all" ? [] : a.map((k) => seg(`options.${group}.${k}`)) },
});

export const FLAG_REGISTRY: { [K in FlagKey]: FlagDefinition<K> } = {
  sense: {
    fields: [{ name: "sense", input: "select", options: Object.keys(MONSTER_SENSE_LABELS).map((value) => ({ value })) }, { name: "range", input: "number" }],
    defaults: { sense: "blindsight", range: 30 },
    describe: (e) => [flagSeg("sense", { sense: seg(`options.sense.${e.sense}`), range: e.range })],
  },
  advantage: {
    fields: [
      { name: "attackKind", input: "select", options: ATTACK_KIND_ALL },
      { name: "attackAbility", input: "select", optional: true, options: ABILITY_OPTIONS },
      { name: "consumeOn", input: "select", optional: true, options: [{ value: "ownAttack" }] },
      { name: "until", input: "select", optional: true, options: [{ value: "turnEnd" }] },
    ],
    defaults: { attackKind: "all" },
    describe: (e) => [
      flagSeg("advantage", { kind: e.attackKind, hasAbility: e.attackAbility ? "yes" : "no", ability: e.attackAbility ? seg(`options.attackAbility.${e.attackAbility}`) : "", consume: e.consumeOn ? "yes" : "no" }),
    ],
  },
  disadvantage: plain("disadvantage"),
  disadvantageForAttackers: plain("disadvantageForAttackers"),
  advantageForAttackers: plain("advantageForAttackers"),
  guaranteedHit: plain("guaranteedHit"),
  resistance: {
    fields: [
      { name: "damageType", input: "text" },
      { name: "percent", input: "number" },
      { name: "attackKind", input: "select", options: MELEE_RANGED, optional: true },
      { name: "school", input: "text", optional: true },
    ],
    defaults: { damageType: "physical", percent: 25 },
    describe: (e) => [
      flagSeg("resistance", {
        mode: e.percent >= 100 ? "immune" : e.percent < 0 ? "vuln" : "resist",
        type: damageTypeSegment(e.damageType),
        n: Math.abs(e.percent),
        kind: e.attackKind ?? "none",
        hasSchool: e.school ? "yes" : "no",
        school: e.school ?? "",
      }),
    ],
  },
  spellAbsorb: {
    fields: [
      { name: "school", input: "text" },
      { name: "percent", input: "number" },
    ],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("spellAbsorb", { percent: e.percent, school: e.school })],
  },
  castSpellOnHit: {
    fields: [
      { name: "spellIds", input: "spells" },
      { name: "attackKind", input: "select", options: MELEE_RANGED, optional: true },
    ],
    defaults: { spellIds: [] },
    describe: (e) => [flagSeg("castSpellOnHit", { count: e.spellIds.length })],
  },
  spellImmunity: {
    fields: [{ name: "spellIds", input: "spells", optional: true }],
    defaults: {},
    describe: (e) => [flagSeg("spellImmunity", { hasIds: e.spellIds ? "yes" : "no", count: e.spellIds?.length ?? 0 })],
  },
  spellTargeting: {
    fields: [
      { name: "mode", input: "select", options: [{ value: "area" }, { value: "all" }] },
      { name: "spellIds", input: "spells", optional: true },
      { name: "school", input: "text", optional: true },
      { name: "maxTargets", input: "number", optional: true },
      { name: "maxLevel", input: "number", optional: true },
    ],
    defaults: { mode: "area" },
    describe: (e) => [
      flagSeg("spellTargeting", { scope: e.school ? "school" : e.spellIds ? "ids" : "none", school: e.school ?? "", count: e.spellIds?.length ?? 0, mode: e.mode, max: e.maxTargets ?? DEFAULT_AREA_TARGETS }),
    ],
  },
  counterAttack: {
    fields: [
      { name: "attackKinds", input: "multiselect", options: MELEE_RANGED },
      { name: "bonusPercent", input: "number" },
    ],
    defaults: { attackKinds: [AttackType.MELEE], bonusPercent: 15 },
    describe: (e) => [flagSeg("counterAttack", { ranged: e.attackKinds.includes(AttackType.RANGED) ? "yes" : "no", percent: e.bonusPercent })],
  },
  attackHitsAllEnemies: plain("attackHitsAllEnemies"),
  seeEnemyHp: plain("seeEnemyHp"),
  multiTargetFalloff: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("multiTargetFalloff", { percent: e.percent })],
  },
  chainShot: {
    fields: [
      { name: "jumps", input: "number" },
      { name: "percent", input: "number" },
    ],
    defaults: { jumps: 2, percent: 50 },
    describe: (e) => [flagSeg("chainShot", { jumps: e.jumps, percent: e.percent })],
  },
  lifesteal: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("lifesteal", { percent: e.percent })],
  },
  moraleChance: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 10 },
    describe: (e) => [flagSeg("moraleChance", { percent: e.percent })],
  },
  noRetaliation: plain("noRetaliation"),
  strikeAndReturn: plain("strikeAndReturn"),
  unlimitedRetaliation: plain("unlimitedRetaliation"),
  extraRetaliations: {
    fields: [{ name: "count", input: "number" }],
    defaults: { count: 1 },
    describe: (e) => [flagSeg("extraRetaliations", { count: e.count })],
  },
  noNegativeMorale: plain("noNegativeMorale"),
  ignoreMorale: plain("ignoreMorale"),
  minMorale: {
    fields: [{ name: "value", input: "number" }],
    defaults: { value: 1 },
    describe: (e) => [flagSeg("minMorale", { value: signed(e.value) })],
  },
  extraSummons: {
    fields: [
      { name: "count", input: "number" },
      { name: "spellIds", input: "spells", optional: true },
    ],
    defaults: { count: 1 },
    describe: (e) => [flagSeg("extraSummons", { hasIds: e.spellIds ? "yes" : "no", ids: e.spellIds?.length ?? 0, count: e.count })],
  },
  piercingShot: plain("piercingShot"),
  fireWave: {
    fields: [
      { name: "percent", input: "number" },
      { name: "size", input: "number" },
    ],
    defaults: { percent: 50, size: 15 },
    describe: (e) => [flagSeg("fireWave", { size: e.size, percent: e.percent })],
  },
  banishSummons: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => [flagSeg("banishSummons", { percent: e.percent })],
  },
  saveAdvantage: {
    fields: [
      { name: "abilities", input: "multiselect", options: SAVE_ABILITY_OPTIONS },
      { name: "vsSpells", input: "toggle", optional: true },
    ],
    defaults: { abilities: "all" },
    describe: (e) => [flagSeg("saveAdvantage", { ...listParams("abilities", e.abilities), vsSpells: e.vsSpells ? "yes" : "no" })],
  },
  saveDisadvantage: {
    fields: [{ name: "abilities", input: "multiselect", options: SAVE_ABILITY_OPTIONS }],
    defaults: { abilities: "all" },
    describe: (e) => [flagSeg("saveDisadvantage", listParams("abilities", e.abilities))],
  },
  autoFailSave: {
    fields: [{ name: "abilities", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["strength", "dexterity"] },
    describe: (e) => [flagSeg("autoFailSave", listParams("abilities", e.abilities))],
  },
  saveProficiency: {
    fields: [{ name: "abilities", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["wisdom"] },
    describe: (e) => [flagSeg("saveProficiency", listParams("abilities", e.abilities))],
  },
  checkAdvantage: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => [flagSeg("checkAdvantage", listParams("skills", e.skills))],
  },
  checkDisadvantage: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => [flagSeg("checkDisadvantage", listParams("skills", e.skills))],
  },
  skillProficiency: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["perception"] },
    describe: (e) => [flagSeg("skillProficiency", listParams("skills", e.skills))],
  },
  skillExpertise: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["stealth"] },
    describe: (e) => [flagSeg("skillExpertise", listParams("skills", e.skills))],
  },
  proficiency: {
    fields: [{ name: "kinds", input: "multiselect", options: PROFICIENCY_OPTIONS }],
    defaults: { kinds: ["heavy"] },
    describe: (e) => [flagSeg("proficiency", { list: { join: ", ", items: e.kinds.map((k) => seg(`options.kinds.${k}`)) } })],
  },
  autoCritAdjacent: plain("autoCritAdjacent"),
  twoWeaponFighting: plain("twoWeaponFighting"),
  critImmunity: plain("critImmunity"),
  cunningAction: plain("cunningAction"),
  evasion: plain("evasion"),
  proneDefense: plain("proneDefense"),
  conditionImmunity: {
    fields: [
      {
        name: "conditions",
        input: "multiselect",
        options: [
          { value: "all" },
          { value: "fear" },
          { value: "berserk" },
          { value: "charm" },
          ...CONDITION_KEYS_ALL.map((value) => ({ value })),
        ],
      },
    ],
    defaults: { conditions: "all" },
    describe: (e) => [
      flagSeg("conditionImmunity", {
        all: e.conditions === "all" ? "yes" : "no",
        list: { join: ", ", items: e.conditions === "all" ? [] : e.conditions.map((c) => (c === "fear" || c === "berserk" || c === "charm" ? seg(`summary.flags.cond.${c}`) : conditionKeySegment(c))) },
      }),
    ],
  },
};

const entries = Object.entries(FLAG_REGISTRY) as [FlagKey, FlagDefinition<FlagKey>][];

export const FLAG_KEYS = entries.map(([k]) => k);

export const FLAG_FIELDS = Object.fromEntries(entries.map(([k, d]) => [k, d.fields])) as Record<FlagKey, readonly FieldMeta[]>;

export const FLAG_DEFAULTS = Object.fromEntries(entries.map(([k, d]) => [k, d.defaults])) as Record<FlagKey, Record<string, unknown>>;

export function describeFlag(e: FlagEffect): Segment[] {
  return (FLAG_REGISTRY[e.flag] as FlagDefinition<FlagKey>).describe(e as never);
}
