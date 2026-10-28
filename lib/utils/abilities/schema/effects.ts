import { z } from "zod";

import { AbilityTargetSchema, AmountSchema, DurationSchema, FlatSchema } from "./common";
import { ATTACK_KINDS, CONDITION_5E_KEYS, CONDITION_KEYS, CUSTOM_CONDITION_KEY_RE, type CustomConditionKey, DAMAGE_FILTER_KINDS, DICE_RE, STAT_KEYS, type StatKey } from "./kinds";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { DND_SKILLS } from "@/lib/constants/skills";

export {
  type AnyConditionKey,
  BAKED_STATS,
  CONDITION_5E_KEYS,
  CONDITION_KEYS,
  type Condition5eKey,
  type ConditionImmunityKey,
  type CustomConditionKey,
  DYNAMIC_STATS,
  isBakedStat,
  isStaticEffect,
  STAT_KEYS,
  type StatKey,
  TIMED_STATS,
} from "./kinds";

const target = { target: AbilityTargetSchema.optional() };

const timed = { ...target, duration: DurationSchema.optional() };

const AT_LEAST_TIMED = ["armor", "speed"] as const;

const hasValue = (e: { flat?: unknown; percent?: unknown }) => e.flat !== undefined || e.percent !== undefined;

function atLeastAllowed(e: { stat: StatKey; atLeast?: number; duration?: unknown }): boolean {
  if ((ABILITY_KEYS as readonly string[]).includes(e.stat)) return (e.atLeast ?? 0) <= 30;

  return (AT_LEAST_TIMED as readonly string[]).includes(e.stat) && e.duration !== undefined;
}

const ModifyStatSchema = z
  .object({
    kind: z.literal("modifyStat"),
    stat: z.enum(STAT_KEYS),
    flat: FlatSchema.optional(),
    percent: FlatSchema.optional(),
    atLeast: z.number().int().min(1).max(120).optional(),
    attackKind: z.enum(ATTACK_KINDS).optional(),
    spellLevels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
    ...timed,
  })
  .refine((e) => hasValue(e) || e.atLeast !== undefined, { message: "Потрібен flat, percent або atLeast" })
  .refine((e) => e.atLeast === undefined || (e.flat === undefined && e.percent === undefined), { message: "atLeast — без flat/percent", path: ["atLeast"] })
  .refine((e) => e.atLeast === undefined || atLeastAllowed(e), {
    message: "atLeast — для характеристик (до 30) або для броні й швидкості з тривалістю",
    path: ["atLeast"],
  });

const SpellRollFlatSchema = z.object({ spellRoll: z.number().int().min(-500).max(500).refine((n) => n !== 0) });

const DamageBonusSchema = z
  .object({
    kind: z.literal("damageBonus"),
    filter: z.object({ kind: z.enum(DAMAGE_FILTER_KINDS), school: z.string().min(1).optional() }),
    flat: z.union([FlatSchema, SpellRollFlatSchema]).optional(),
    percent: FlatSchema.optional(),
    perMark: z.string().min(1).optional(),
    ...timed,
  })
  .refine(hasValue, { message: "Потрібен flat або percent" });

const flagBase = { kind: z.literal("flag"), ...timed };

export const AbilityKeySchema = z.enum(ABILITY_KEYS);

export const AnyConditionSchema = z.enum([...CONDITION_KEYS, ...CONDITION_5E_KEYS]);

export const CustomConditionKeySchema = z.string().regex(CUSTOM_CONDITION_KEY_RE) as unknown as z.ZodType<CustomConditionKey>;

const DndSkillSchema = z.enum(DND_SKILLS);

const SkillsOrAll = z.union([z.literal("all"), z.array(DndSkillSchema).min(1)]);

const AbilitiesOrAll = z.union([z.literal("all"), z.array(AbilityKeySchema).min(1)]);

const FlagSchema = z.discriminatedUnion("flag", [
  z.object({ ...flagBase, flag: z.literal("sense"), sense: z.enum(["darkvision", "blindsight", "tremorsense", "truesight"]), range: z.number().int().min(5).max(1000) }),
  z.object({ ...flagBase, flag: z.literal("advantage"), attackKind: z.enum([...ATTACK_KINDS, "all"]) }),
  z.object({ ...flagBase, flag: z.literal("disadvantage") }),
  z.object({ ...flagBase, flag: z.literal("disadvantageForAttackers") }),
  z.object({ ...flagBase, flag: z.literal("advantageForAttackers") }),
  z.object({ ...flagBase, flag: z.literal("guaranteedHit") }),
  z.object({
    ...flagBase,
    flag: z.literal("resistance"),
    damageType: z.string().min(1),
    percent: z.number().min(-100).max(100).refine((n) => n !== 0),
    attackKind: z.enum(ATTACK_KINDS).optional(),
    school: z.string().min(1).optional(),
  }),
  z.object({ ...flagBase, flag: z.literal("spellAbsorb"), school: z.string().min(1), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("castSpellOnHit"), spellIds: z.array(z.string().min(1)).min(1), attackKind: z.enum(ATTACK_KINDS).optional() }),
  z.object({ ...flagBase, flag: z.literal("spellImmunity"), spellIds: z.array(z.string().min(1)).min(1).optional() }),
  z.object({
    ...flagBase,
    flag: z.literal("counterAttack"),
    // old records may hold "magic" — spells never trigger retaliation
    attackKinds: z.preprocess((v) => (Array.isArray(v) ? v.filter((k) => k !== "magic") : v), z.array(z.enum(ATTACK_KINDS))),
    bonusPercent: z.number().min(0),
  }),
  z.object({
    ...flagBase,
    flag: z.literal("spellTargeting"),
    mode: z.enum(["area", "all"]),
    spellIds: z.array(z.string().min(1)).min(1).optional(),
    school: z.string().min(1).optional(),
    maxTargets: z.number().int().min(2).optional(),
    maxLevel: z.number().int().min(1).max(9).optional(),
  }),
  z.object({ ...flagBase, flag: z.literal("attackHitsAllEnemies") }),
  z.object({ ...flagBase, flag: z.literal("seeEnemyHp") }),
  z.object({ ...flagBase, flag: z.literal("moraleChance"), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("lifesteal"), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("multiTargetFalloff"), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("chainShot"), jumps: z.number().int().min(1).max(5), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("noRetaliation") }),
  z.object({ ...flagBase, flag: z.literal("strikeAndReturn") }),
  z.object({ ...flagBase, flag: z.literal("unlimitedRetaliation") }),
  z.object({ ...flagBase, flag: z.literal("extraRetaliations"), count: z.number().int().min(1).max(5) }),
  z.object({ ...flagBase, flag: z.literal("noNegativeMorale") }),
  z.object({ ...flagBase, flag: z.literal("ignoreMorale") }),
  z.object({ ...flagBase, flag: z.literal("minMorale"), value: z.number().int().min(-3).max(3) }),
  z.object({ ...flagBase, flag: z.literal("extraSummons"), count: z.number().int().min(1).max(5), spellIds: z.array(z.string().min(1)).min(1).optional() }),
  z.object({ ...flagBase, flag: z.literal("piercingShot") }),
  z.object({ ...flagBase, flag: z.literal("fireWave"), percent: z.number().int().min(1).max(100), size: z.number().int().min(5).max(120) }),
  z.object({ ...flagBase, flag: z.literal("banishSummons"), percent: z.number().int().min(1).max(100) }),
  z.object({ ...flagBase, flag: z.literal("saveAdvantage"), abilities: AbilitiesOrAll, vsSpells: z.boolean().optional() }),
  z.object({ ...flagBase, flag: z.literal("saveDisadvantage"), abilities: AbilitiesOrAll }),
  z.object({ ...flagBase, flag: z.literal("autoFailSave"), abilities: z.array(AbilityKeySchema).min(1) }),
  z.object({ ...flagBase, flag: z.literal("saveProficiency"), abilities: z.array(AbilityKeySchema).min(1) }),
  z.object({ ...flagBase, flag: z.literal("checkAdvantage"), skills: SkillsOrAll }),
  z.object({ ...flagBase, flag: z.literal("checkDisadvantage"), skills: SkillsOrAll }),
  z.object({ ...flagBase, flag: z.literal("skillProficiency"), skills: z.array(DndSkillSchema).min(1) }),
  z.object({ ...flagBase, flag: z.literal("skillExpertise"), skills: z.array(DndSkillSchema).min(1) }),
  z.object({ ...flagBase, flag: z.literal("autoCritAdjacent") }),
  z.object({ ...flagBase, flag: z.literal("proneDefense") }),
  z.object({ ...flagBase, flag: z.literal("twoWeaponFighting") }),
  z.object({ ...flagBase, flag: z.literal("evasion") }),
  z.object({ ...flagBase, flag: z.literal("cunningAction") }),
  z.object({ ...flagBase, flag: z.literal("critImmunity") }),
  z.object({
    ...flagBase,
    flag: z.literal("conditionImmunity"),
    conditions: z.union([z.literal("all"), z.array(z.union([AnyConditionSchema, z.enum(["fear", "berserk", "charm"])])).min(1)]),
  }),
]);

const NoteSchema = z.object({ kind: z.literal("note"), text: z.string().min(1) });

const GrantActionSchema = z
  .object({
    kind: z.literal("grantAction"),
    extraActions: z.number().int().min(1).optional(),
    refreshAction: z.boolean().optional(),
    refreshBonusAction: z.boolean().optional(),
    refreshReaction: z.boolean().optional(),
    ...target,
  })
  .refine((e) => e.extraActions || e.refreshAction || e.refreshBonusAction || e.refreshReaction, {
    message: "Порожня дія",
  });

const DealDamageSchema = z.object({
  kind: z.literal("dealDamage"),
  amount: AmountSchema,
  damageType: z.string().min(1).optional(),
  falloff: z.array(z.number().min(0).max(100)).min(1).optional(),
  byDistance: z
    .array(z.object({ maxFeet: z.number().int().min(5).max(600).multipleOf(5), dice: z.string().regex(DICE_RE) }))
    .min(2)
    .max(6)
    .refine((r) => r.every((x, i) => i === 0 || x.maxFeet > r[i - 1].maxFeet), { message: "Межі відстані мають зростати" })
    .optional(),
  ...target,
});

const HealSchema = z.object({ kind: z.literal("heal"), amount: AmountSchema, revive: z.boolean().optional(), ...target });

const DotSchema = z.object({
  kind: z.literal("dot"),
  damagePerRound: AmountSchema,
  damageType: z.string().min(1),
  duration: DurationSchema,
  ...target,
});

const HotSchema = z.object({
  kind: z.literal("hot"),
  healPerRound: AmountSchema,
  duration: DurationSchema,
  ...target,
});

const BerserkSchema = z.object({
  kind: z.literal("berserk"),
  damageBonusPercent: z.number().min(0).max(300),
  duration: DurationSchema,
  ...target,
});

const CharmSchema = z.object({ kind: z.literal("charm"), duration: DurationSchema, ...target });

const ApplyConditionSchema = z.object({
  kind: z.literal("applyCondition"),
  condition: z.union([AnyConditionSchema, CustomConditionKeySchema]),
  duration: DurationSchema,
  levels: z.number().int().min(1).max(6).optional(),
  saveEnds: z.object({ ability: AbilityKeySchema }).optional(),
  percent: z.number().int().min(1).max(100).optional(),
  breakOnDamage: z.boolean().optional(),
  onlyIfAffected: z.boolean().optional(),
  ...target,
});

const RestoreSpellSlotSchema = z.object({ kind: z.literal("restoreSpellSlot"), count: z.number().int().min(1), ...target });

const DrainSpellSlotSchema = z.object({ kind: z.literal("drainSpellSlot"), count: z.number().int().min(1), ...target });

const ChangeMoraleSchema = z.object({
  kind: z.literal("changeMorale"),
  delta: z.number().int().refine((d) => d !== 0),
  ...target,
});

const CleanseSchema = z.object({ kind: z.literal("cleanse"), includeConditions: z.boolean().optional(), ...target });

const GuardSchema = z.object({ kind: z.literal("guard"), percent: z.number().int().min(1).max(100), duration: DurationSchema, ...target });

const SummonSchema = z
  .object({
    kind: z.literal("summon"),
    group: z.string().min(1).optional(),
    tier: z.number().int().min(1).max(7).optional(),
    unitId: z.string().min(1).optional(),
    count: z.number().int().min(1).max(10).optional(),
  })
  .refine((e) => !!e.unitId || (!!e.group && e.tier !== undefined), { message: "Потрібен unitId або group і tier" });

const RaiseDeadSchema = z.object({ kind: z.literal("raiseDead"), hpPercent: z.number().int().min(1).max(100), ...target });

const HelpSchema = z.object({ kind: z.literal("help"), ...target });

const PushSchema = z.object({ kind: z.literal("push"), feet: z.number().int().min(5).max(30).multipleOf(5), from: z.literal("caster"), ...target });

const CopySpellBuffsSchema = z.object({ kind: z.literal("copySpellBuffs"), ...target });

const MarkSchema = z.object({ kind: z.literal("mark"), markId: z.string().min(1), duration: DurationSchema, ...target });

export const MANEUVERS = ["dive", "squall", "fireBurst"] as const;

export type Maneuver = (typeof MANEUVERS)[number];

const ManeuverSchema = z.object({ kind: z.literal("maneuver"), maneuver: z.enum(MANEUVERS), percentOfAttack: z.number().int().min(1).max(500) });

export const BASE_EFFECTS = [
  ModifyStatSchema,
  DamageBonusSchema,
  FlagSchema,
  NoteSchema,
  GrantActionSchema,
  DealDamageSchema,
  HealSchema,
  DotSchema,
  HotSchema,
  BerserkSchema,
  CharmSchema,
  ApplyConditionSchema,
  RestoreSpellSlotSchema,
  DrainSpellSlotSchema,
  ChangeMoraleSchema,
  CleanseSchema,
  MarkSchema,
  CopySpellBuffsSchema,
  GuardSchema,
  SummonSchema,
  RaiseDeadSchema,
  ManeuverSchema,
  HelpSchema,
  PushSchema,
] as const;

export const StaticEffectSchema = z.discriminatedUnion("kind", [ModifyStatSchema, DamageBonusSchema, FlagSchema]);

export const NonRandomEffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS]);

export const RandomOfSchema = z.object({ kind: z.literal("randomOf"), options: z.array(NonRandomEffectSchema).min(2) });

export const EffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, RandomOfSchema]);

export type Effect = z.infer<typeof EffectSchema>;

export type EffectKind = Effect["kind"];

export type StaticEffect = Extract<Effect, { kind: "modifyStat" | "damageBonus" | "flag" }>;

export type FlagEffect = Extract<Effect, { kind: "flag" }>;

export type FlagKey = FlagEffect["flag"];
