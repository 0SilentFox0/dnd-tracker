import { z } from 'zod';

import {
    BREATH_KINDS,
    CREATURE_TRAITS,
    GROUP_PASSIONS,
    PASSION_GROUP_MAX,
    PASSION_KINDS,
    PSYCHOLOGY_KINDS,
    TALENT_KINDS,
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

const WfrpPassionSchema = z
    .strictObject({
        kind: z.literal('wfrpPassion'),
        passion: z.enum(PASSION_KINDS),
        group: z.string().trim().min(1).max(PASSION_GROUP_MAX).optional(),
    })
    .refine(
        (e) => GROUP_PASSIONS.includes(e.passion) === (e.group !== undefined),
        {
            message: 'abilities.validation.traitPassionGroup',
            path: ['group'],
        }
    );

const WfrpAttackSchema = z
    .strictObject({
        kind: z.literal('wfrpAttack'),
        attack: z.enum(TRAIT_ATTACKS),
        damage: z.number().int().min(0).max(30),
        rangeFt: z.number().int().min(5).max(600).optional(),
        magical: z.literal(true).optional(),
        breath: z.enum(BREATH_KINDS).optional(),
        free: z.literal(true).optional(),
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

const WfrpTalentSchema = z.strictObject({
    kind: z.literal('wfrpTalent'),
    talent: z.enum(TALENT_KINDS),
});

const WfrpCreatureSchema = z.strictObject({
    kind: z.literal('wfrpCreature'),
    trait: z.enum(CREATURE_TRAITS),
    rating: z.number().int().min(1).max(10).optional(),
});

const WfrpRegenerateSchema = z.strictObject({
    kind: z.literal('wfrpRegenerate'),
});

export const WFRP_EFFECT_SCHEMAS = [
    WfrpArmourSchema,
    WfrpWardSchema,
    WfrpSizeSchema,
    WfrpPsychologySchema,
    WfrpPassionSchema,
    WfrpAttackSchema,
    WfrpTalentSchema,
    WfrpCreatureSchema,
    WfrpRegenerateSchema,
] as const;

export type WfrpEffect = z.infer<(typeof WFRP_EFFECT_SCHEMAS)[number]>;
