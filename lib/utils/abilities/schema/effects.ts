import { z } from "zod";

import {
  AbilityTargetSchema,
  AmountSchema,
  ATTACK_KINDS,
  DAMAGE_FILTER_KINDS,
  DurationSchema,
  FlatSchema,
} from "./common";

import { ABILITY_KEYS } from "@/lib/constants/abilities";

export const DYNAMIC_STATS = ["armor", "attackBonus", "critThreshold"] as const;

export const BAKED_STATS = [
  "initiative",
  "maxHp",
  "speed",
  "morale",
  "minTargets",
  "maxTargets",
  "spellSlots",
  ...ABILITY_KEYS,
] as const;

export const STAT_KEYS = [...DYNAMIC_STATS, ...BAKED_STATS] as const;

export const TIMED_STATS = ["armor", "attackBonus", "critThreshold", "initiative"] as const;

export const CONDITION_KEYS = [
  "no_bonus_action",
  "no_reaction",
  "disable_melee_attacks",
  "disable_ranged_attacks",
  "disable_spell_casting",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type ConditionImmunityKey = (typeof CONDITION_KEYS)[number] | "fear";

const target = { target: AbilityTargetSchema.optional() };

const timed = { ...target, duration: DurationSchema.optional() };

const hasValue = (e: { flat?: unknown; percent?: unknown }) => e.flat !== undefined || e.percent !== undefined;

const ModifyStatSchema = z
  .object({
    kind: z.literal("modifyStat"),
    stat: z.enum(STAT_KEYS),
    flat: FlatSchema.optional(),
    percent: z.number().optional(),
    attackKind: z.enum(ATTACK_KINDS).optional(),
    spellLevels: z.array(z.number().int().min(1).max(9)).min(1).optional(),
    ...timed,
  })
  .refine(hasValue, { message: "Потрібен flat або percent" });

const DamageBonusSchema = z
  .object({
    kind: z.literal("damageBonus"),
    filter: z.object({ kind: z.enum(DAMAGE_FILTER_KINDS), school: z.string().min(1).optional() }),
    flat: FlatSchema.optional(),
    percent: z.number().optional(),
    ...timed,
  })
  .refine(hasValue, { message: "Потрібен flat або percent" });

const flagBase = { kind: z.literal("flag"), ...timed };

const FlagSchema = z.discriminatedUnion("flag", [
  z.object({ ...flagBase, flag: z.literal("advantage"), attackKind: z.enum([...ATTACK_KINDS, "all"]) }),
  z.object({ ...flagBase, flag: z.literal("disadvantage") }),
  z.object({ ...flagBase, flag: z.literal("disadvantageForAttackers") }),
  z.object({ ...flagBase, flag: z.literal("guaranteedHit") }),
  z.object({
    ...flagBase,
    flag: z.literal("resistance"),
    damageType: z.string().min(1),
    percent: z.number().min(1).max(100),
  }),
  z.object({ ...flagBase, flag: z.literal("spellImmunity"), spellIds: z.array(z.string().min(1)).min(1) }),
  z.object({
    ...flagBase,
    flag: z.literal("counterAttack"),
    // old records may hold "magic" — spells never trigger retaliation
    attackKinds: z.preprocess((v) => (Array.isArray(v) ? v.filter((k) => k !== "magic") : v), z.array(z.enum(ATTACK_KINDS))),
    bonusPercent: z.number().min(0),
  }),
  z.object({ ...flagBase, flag: z.literal("seeEnemyHp") }),
  z.object({ ...flagBase, flag: z.literal("noNegativeMorale") }),
  z.object({ ...flagBase, flag: z.literal("ignoreMorale") }),
  z.object({
    ...flagBase,
    flag: z.literal("conditionImmunity"),
    conditions: z.union([z.literal("all"), z.array(z.enum([...CONDITION_KEYS, "fear"])).min(1)]),
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

const ApplyConditionSchema = z.object({
  kind: z.literal("applyCondition"),
  condition: z.enum(CONDITION_KEYS),
  duration: DurationSchema,
  ...target,
});

const RestoreSpellSlotSchema = z.object({ kind: z.literal("restoreSpellSlot"), count: z.number().int().min(1), ...target });

const ChangeMoraleSchema = z.object({
  kind: z.literal("changeMorale"),
  delta: z.number().int().refine((d) => d !== 0),
  ...target,
});

const CleanseSchema = z.object({ kind: z.literal("cleanse"), ...target });

const BASE_EFFECTS = [
  ModifyStatSchema,
  DamageBonusSchema,
  FlagSchema,
  NoteSchema,
  GrantActionSchema,
  DealDamageSchema,
  HealSchema,
  DotSchema,
  ApplyConditionSchema,
  RestoreSpellSlotSchema,
  ChangeMoraleSchema,
  CleanseSchema,
] as const;

export const NonRandomEffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS]);

const RandomOfSchema = z.object({ kind: z.literal("randomOf"), options: z.array(NonRandomEffectSchema).min(2) });

export const EffectSchema = z.discriminatedUnion("kind", [...BASE_EFFECTS, RandomOfSchema]);

export type Effect = z.infer<typeof EffectSchema>;

export type EffectKind = Effect["kind"];

export type StaticEffect = Extract<Effect, { kind: "modifyStat" | "damageBonus" | "flag" }>;

export type FlagEffect = Extract<Effect, { kind: "flag" }>;

export type FlagKey = FlagEffect["flag"];

export function isStaticEffect(e: Effect): e is StaticEffect {
  return e.kind === "modifyStat" || e.kind === "damageBonus" || e.kind === "flag";
}

export function isBakedStat(stat: StatKey): boolean {
  return (BAKED_STATS as readonly string[]).includes(stat);
}
