import type { FieldMeta } from "../fields";
import { CONDITION_LABELS } from "../labels";
import { abilityArg, flag, optionArg, parenList, refMap } from "../text";

import { ABILITY_KEYS, DEFAULT_AREA_TARGETS } from "@/lib/constants/abilities";
import { PROFICIENCY_KINDS } from "@/lib/constants/artifacts";
import { AttackType } from "@/lib/constants/battle";
import { MONSTER_SENSE_LABELS } from "@/lib/constants/monster";
import { DND_SKILLS } from "@/lib/constants/skills";
import { dynamicTextRef, joinLines, textRef } from "@/lib/i18n/text-ref";
import type { FlagEffect, FlagKey } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/common/format";
import type { LogLine } from "@/types/text";

type FlagOf<K extends FlagKey> = Extract<FlagEffect, { flag: K }>;

interface FlagDefinition<K extends FlagKey> {
  fields: readonly FieldMeta[];
  defaults: Record<string, unknown>;
  describe: (e: FlagOf<K>) => LogLine;
}

const values = (list: readonly string[]) => list.map((value) => ({ value }));

const ATTACK_KIND_ALL = values(["all", AttackType.MELEE, AttackType.RANGED]);

const MELEE_RANGED = values([AttackType.MELEE, AttackType.RANGED]);

const ABILITY_OPTIONS = values(ABILITY_KEYS);

const SAVE_ABILITY_OPTIONS = values(["all", ...ABILITY_KEYS]);

const SKILL_OPTIONS = values(DND_SKILLS);

const SKILL_OR_ALL_OPTIONS = values(["all", ...DND_SKILLS]);

const PROFICIENCY_OPTIONS = values(PROFICIENCY_KINDS);

const plain = (key: FlagKey) => ({ fields: [] as readonly FieldMeta[], defaults: {} as Record<string, unknown>, describe: (): LogLine => dynamicTextRef(`abilityText.flags.${key}`) });

const abilitiesList = (a: readonly string[] | "all") => parenList(a === "all" ? "all" : a.map((k) => abilityArg(k)));

const skillsList = (a: readonly string[] | "all") => parenList(a, "skills");

const CONDITION_SHORT = new Set(["fear", "berserk", "charm"]);

export const FLAG_REGISTRY: { [K in FlagKey]: FlagDefinition<K> } = {
  sense: {
    fields: [{ name: "sense", input: "select", options: values(Object.keys(MONSTER_SENSE_LABELS)) }, { name: "range", input: "number" }],
    defaults: { sense: "blindsight", range: 30 },
    describe: (e) => textRef("abilityText.flags.sense", { sense: optionArg("sense", e.sense), range: e.range }),
  },
  advantage: {
    fields: [
      { name: "attackKind", input: "select", options: ATTACK_KIND_ALL },
      { name: "attackAbility", input: "select", optional: true, options: ABILITY_OPTIONS },
      { name: "consumeOn", input: "select", optional: true, options: values(["ownAttack"]) },
      { name: "until", input: "select", optional: true, options: values(["turnEnd"]) },
    ],
    defaults: { attackKind: "all" },
    describe: (e) =>
      textRef("abilityText.flags.advantage", {
        kind: dynamicTextRef(`abilityText.attackKind.${e.attackKind}`),
        hasAbility: flag(e.attackAbility),
        ability: e.attackAbility ? abilityArg(e.attackAbility) : "",
        consumeOn: flag(e.consumeOn),
      }),
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
    describe: (e) =>
      textRef("abilityText.flags.resistance", {
        mode: e.percent >= 100 ? "immune" : e.percent < 0 ? "vulnerable" : "resist",
        type: e.damageType,
        percent: Math.abs(e.percent),
        kind: e.attackKind === "ranged" ? "ranged" : e.attackKind ? "melee" : "",
        hasSchool: flag(e.school),
        school: e.school ?? "",
      }),
  },
  spellAbsorb: {
    fields: [
      { name: "school", input: "text" },
      { name: "percent", input: "number" },
    ],
    defaults: { percent: 50 },
    describe: (e) => textRef("abilityText.flags.spellAbsorb", { percent: e.percent, school: e.school }),
  },
  castSpellOnHit: {
    fields: [
      { name: "spellIds", input: "spells" },
      { name: "attackKind", input: "select", options: MELEE_RANGED, optional: true },
    ],
    defaults: { spellIds: [] },
    describe: (e) => textRef("abilityText.flags.castSpellOnHit", { count: e.spellIds.length }),
  },
  spellImmunity: {
    fields: [{ name: "spellIds", input: "spells", optional: true }],
    defaults: {},
    describe: (e) => textRef("abilityText.flags.spellImmunity", { all: flag(!e.spellIds), count: e.spellIds?.length ?? 0 }),
  },
  spellTargeting: {
    fields: [
      { name: "mode", input: "select", options: values(["area", "all"]) },
      { name: "spellIds", input: "spells", optional: true },
      { name: "school", input: "text", optional: true },
      { name: "maxTargets", input: "number", optional: true },
      { name: "maxLevel", input: "number", optional: true },
    ],
    defaults: { mode: "area" },
    describe: (e) =>
      textRef("abilityText.flags.spellTargeting", {
        scope: e.school ? "school" : e.spellIds ? "ids" : "any",
        school: e.school ?? "",
        count: e.spellIds?.length ?? 0,
        mode: e.mode,
        max: e.maxTargets ?? DEFAULT_AREA_TARGETS,
      }),
  },
  counterAttack: {
    fields: [
      { name: "attackKinds", input: "multiselect", options: MELEE_RANGED },
      { name: "bonusPercent", input: "number" },
    ],
    defaults: { attackKinds: [AttackType.MELEE], bonusPercent: 15 },
    describe: (e) => textRef("abilityText.flags.counterAttack", { ranged: flag(e.attackKinds.includes(AttackType.RANGED)), percent: e.bonusPercent }),
  },
  attackHitsAllEnemies: plain("attackHitsAllEnemies"),
  seeEnemyHp: plain("seeEnemyHp"),
  multiTargetFalloff: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => textRef("abilityText.flags.multiTargetFalloff", { percent: e.percent }),
  },
  chainShot: {
    fields: [
      { name: "jumps", input: "number" },
      { name: "percent", input: "number" },
    ],
    defaults: { jumps: 2, percent: 50 },
    describe: (e) => textRef("abilityText.flags.chainShot", { jumps: e.jumps, percent: e.percent }),
  },
  lifesteal: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => textRef("abilityText.flags.lifesteal", { percent: e.percent }),
  },
  moraleChance: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 10 },
    describe: (e) => textRef("abilityText.flags.moraleChance", { percent: e.percent }),
  },
  noRetaliation: plain("noRetaliation"),
  strikeAndReturn: plain("strikeAndReturn"),
  unlimitedRetaliation: plain("unlimitedRetaliation"),
  extraRetaliations: {
    fields: [{ name: "count", input: "number" }],
    defaults: { count: 1 },
    describe: (e) => textRef("abilityText.flags.extraRetaliations", { count: e.count }),
  },
  noNegativeMorale: plain("noNegativeMorale"),
  ignoreMorale: plain("ignoreMorale"),
  minMorale: {
    fields: [{ name: "value", input: "number" }],
    defaults: { value: 1 },
    describe: (e) => textRef("abilityText.flags.minMorale", { value: signed(e.value) }),
  },
  extraSummons: {
    fields: [
      { name: "count", input: "number" },
      { name: "spellIds", input: "spells", optional: true },
    ],
    defaults: { count: 1 },
    describe: (e) => textRef("abilityText.flags.extraSummons", { spells: flag(e.spellIds), count: e.spellIds?.length ?? 0, extra: e.count }),
  },
  piercingShot: plain("piercingShot"),
  fireWave: {
    fields: [
      { name: "percent", input: "number" },
      { name: "size", input: "number" },
    ],
    defaults: { percent: 50, size: 15 },
    describe: (e) => textRef("abilityText.flags.fireWave", { size: e.size, percent: e.percent }),
  },
  banishSummons: {
    fields: [{ name: "percent", input: "number" }],
    defaults: { percent: 50 },
    describe: (e) => textRef("abilityText.flags.banishSummons", { percent: e.percent }),
  },
  saveAdvantage: {
    fields: [
      { name: "abilities", input: "multiselect", options: SAVE_ABILITY_OPTIONS },
      { name: "vsSpells", input: "toggle", optional: true },
    ],
    defaults: { abilities: "all" },
    describe: (e) => textRef("abilityText.flags.saveAdvantage", { list: abilitiesList(e.abilities), vsSpells: flag(e.vsSpells) }),
  },
  saveDisadvantage: {
    fields: [{ name: "abilities", input: "multiselect", options: SAVE_ABILITY_OPTIONS }],
    defaults: { abilities: "all" },
    describe: (e) => textRef("abilityText.flags.saveDisadvantage", { list: abilitiesList(e.abilities) }),
  },
  autoFailSave: {
    fields: [{ name: "abilities", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["strength", "dexterity"] },
    describe: (e) => textRef("abilityText.flags.autoFailSave", { list: abilitiesList(e.abilities) }),
  },
  saveProficiency: {
    fields: [{ name: "abilities", input: "multiselect", options: ABILITY_OPTIONS }],
    defaults: { abilities: ["wisdom"] },
    describe: (e) => textRef("abilityText.flags.saveProficiency", { list: abilitiesList(e.abilities) }),
  },
  checkAdvantage: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => textRef("abilityText.flags.checkAdvantage", { list: skillsList(e.skills) }),
  },
  checkDisadvantage: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OR_ALL_OPTIONS }],
    defaults: { skills: "all" },
    describe: (e) => textRef("abilityText.flags.checkDisadvantage", { list: skillsList(e.skills) }),
  },
  skillProficiency: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["perception"] },
    describe: (e) => textRef("abilityText.flags.skillProficiency", { list: skillsList(e.skills) }),
  },
  skillExpertise: {
    fields: [{ name: "skills", input: "multiselect", options: SKILL_OPTIONS }],
    defaults: { skills: ["stealth"] },
    describe: (e) => textRef("abilityText.flags.skillExpertise", { list: skillsList(e.skills) }),
  },
  proficiency: {
    fields: [{ name: "kinds", input: "multiselect", options: PROFICIENCY_OPTIONS }],
    defaults: { kinds: ["heavy"] },
    describe: (e) => textRef("abilityText.flags.proficiency", { list: joinLines(e.kinds.map((k) => optionArg("kinds", k)), ", ") }),
  },
  autoCritAdjacent: plain("autoCritAdjacent"),
  twoWeaponFighting: plain("twoWeaponFighting"),
  critImmunity: plain("critImmunity"),
  cunningAction: plain("cunningAction"),
  evasion: plain("evasion"),
  proneDefense: plain("proneDefense"),
  conditionImmunity: {
    fields: [{ name: "conditions", input: "multiselect", options: values(["all", "fear", "berserk", "charm", ...Object.keys(CONDITION_LABELS)]) }],
    defaults: { conditions: "all" },
    describe: (e) =>
      textRef("abilityText.flags.conditionImmunity", {
        all: flag(e.conditions === "all"),
        list: e.conditions === "all" ? "" : joinLines(e.conditions.map((c) => (CONDITION_SHORT.has(c) ? dynamicTextRef(`abilityText.conditionShort.${c}`) : c)), ", "),
      }),
  },
};

const entries = Object.entries(FLAG_REGISTRY) as [FlagKey, FlagDefinition<FlagKey>][];

export const FLAG_LABELS = refMap("abilityRegistry.flags", Object.keys(FLAG_REGISTRY) as FlagKey[]);

export const FLAG_FIELDS = Object.fromEntries(entries.map(([k, d]) => [k, d.fields])) as Record<FlagKey, readonly FieldMeta[]>;

export const FLAG_DEFAULTS = Object.fromEntries(entries.map(([k, d]) => [k, d.defaults])) as Record<FlagKey, Record<string, unknown>>;

export function describeFlag(e: FlagEffect): LogLine {
  return (FLAG_REGISTRY[e.flag] as FlagDefinition<FlagKey>).describe(e as never);
}
