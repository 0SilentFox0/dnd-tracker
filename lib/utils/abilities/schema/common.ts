import { z } from "zod";

import { ABILITY_TARGETS, DICE_RE } from "./kinds";

export {
  ABILITY_TARGETS,
  type AbilityTarget,
  ATTACK_KINDS,
  type AttackKind,
  DAMAGE_FILTER_KINDS,
  DAMAGE_KINDS,
  type DamageFilterKind,
  type DamageKind,
  DICE_RE,
} from "./kinds";

export const AbilityTargetSchema = z.enum(ABILITY_TARGETS);

export const DurationSchema = z.object({ rounds: z.number().int().min(1).max(99) });

export const FormulaSchema = z.object({ formula: z.string().min(1) });

export const FlatSchema = z.union([z.number(), FormulaSchema]);

export const AmountSchema = z.union([
  z.number().nonnegative(),
  z.string().regex(DICE_RE),
  FormulaSchema,
  z.object({ spellRoll: z.number().positive().max(500) }),
  z.object({ percentOf: z.enum(["eventDamage", "maxHp", "ownerAttack"]), value: z.number().positive() }),
]);

export type Duration = z.infer<typeof DurationSchema>;

export type Flat = z.infer<typeof FlatSchema>;

export type Amount = z.infer<typeof AmountSchema>;
