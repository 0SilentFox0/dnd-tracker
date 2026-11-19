import { z } from 'zod';

import { ABILITY_TARGETS, DICE_RE } from './kinds';

import { CLASS_COLUMN_KEY_RE } from '@/lib/constants/classes';
import { MAX_DURATION_ROUNDS } from '@/lib/constants/duration';

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
} from './kinds';

export const AbilityTargetSchema = z.enum(ABILITY_TARGETS);

export const DurationSchema = z.object({
    rounds: z.number().int().min(1).max(MAX_DURATION_ROUNDS),
});

export const FormulaSchema = z.object({ formula: z.string().min(1) });

export const ScaleSchema = z.object({
    scale: z.string().regex(CLASS_COLUMN_KEY_RE).max(40),
});

export const FlatSchema = z.union([z.number(), FormulaSchema, ScaleSchema]);

export const AmountSchema = z.union([
    z.number().nonnegative(),
    z.string().regex(DICE_RE),
    FormulaSchema,
    ScaleSchema,
    z.object({
        spellRoll: z.union([z.number().positive().max(500), FormulaSchema]),
    }),
    z.object({
        percentOf: z.enum(['eventDamage', 'maxHp', 'ownerAttack']),
        value: z.number().positive(),
    }),
]);

export type Duration = z.infer<typeof DurationSchema>;

export type Flat = z.infer<typeof FlatSchema>;

export type Amount = z.infer<typeof AmountSchema>;

export type Scale = z.infer<typeof ScaleSchema>;
