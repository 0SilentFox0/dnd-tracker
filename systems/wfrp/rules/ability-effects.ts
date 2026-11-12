import { z } from 'zod';

import {
    PSYCHOLOGY_KINDS,
    TRAIT_ATTACKS,
    TRAIT_SIZES,
} from '@/systems/wfrp/rules/trait-kinds';

const ap = z.number().int().min(0).max(12);

const WfrpArmourSchema = z.strictObject({
    kind: z.literal('wfrpArmour'),
    head: ap,
    body: ap,
    arm: ap,
    leg: ap,
});

const WfrpWardSchema = z.strictObject({
    kind: z.literal('wfrpWard'),
    value: z.number().int().min(1).max(10),
});

const WfrpSizeSchema = z.strictObject({
    kind: z.literal('wfrpSize'),
    size: z.enum(TRAIT_SIZES),
});

const WfrpPsychologySchema = z.strictObject({
    kind: z.literal('wfrpPsychology'),
    psychology: z.enum(PSYCHOLOGY_KINDS),
    value: z.number().int().min(1).max(10),
});

const WfrpAttackSchema = z
    .strictObject({
        kind: z.literal('wfrpAttack'),
        attack: z.enum(TRAIT_ATTACKS),
        damage: z.number().int().min(0).max(30),
        rangeFt: z.number().int().min(5).max(600).optional(),
        magical: z.literal(true).optional(),
    })
    .refine(
        (e) =>
            e.rangeFt === undefined ||
            e.attack === 'breath' ||
            e.attack === 'ranged',
        {
            message: 'abilities.validation.traitRangeOnlyBreathRanged',
            path: ['rangeFt'],
        }
    );

export const WFRP_EFFECT_SCHEMAS = [
    WfrpArmourSchema,
    WfrpWardSchema,
    WfrpSizeSchema,
    WfrpPsychologySchema,
    WfrpAttackSchema,
] as const;

export type WfrpEffect = z.infer<(typeof WFRP_EFFECT_SCHEMAS)[number]>;
