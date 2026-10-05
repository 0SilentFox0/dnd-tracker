import { z } from "zod";

export const DICE_RE = /^(\d+)d(\d+)([+-]\d+)?$/;

export const ABILITY_TARGETS = ["self", "eventTarget", "eventActor", "allAllies", "allEnemies"] as const;

export const AbilityTargetSchema = z.enum(ABILITY_TARGETS);

export const ATTACK_KINDS = ["melee", "ranged"] as const;

export const DAMAGE_KINDS = ["melee", "ranged", "magic"] as const;

export const DAMAGE_FILTER_KINDS = ["melee", "ranged", "magic", "physical", "all"] as const;

export const DurationSchema = z.object({ rounds: z.number().int().min(1).max(99) });

export const FormulaSchema = z.object({ formula: z.string().min(1) });

export const FlatSchema = z.union([z.number(), FormulaSchema]);

export const AmountSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(DICE_RE),
  FormulaSchema,
  z.object({ percentOf: z.enum(["eventDamage", "maxHp"]), value: z.number().positive() }),
]);

export type AbilityTarget = z.infer<typeof AbilityTargetSchema>;

export type AttackKind = (typeof ATTACK_KINDS)[number];

export type DamageKind = (typeof DAMAGE_KINDS)[number];

export type DamageFilterKind = (typeof DAMAGE_FILTER_KINDS)[number];

export type Duration = z.infer<typeof DurationSchema>;

export type Flat = z.infer<typeof FlatSchema>;

export type Amount = z.infer<typeof AmountSchema>;
