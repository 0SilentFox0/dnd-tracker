import { z } from 'zod';

import { type HitLocation, LOCATIONS } from '../combat/constants';
import {
    AP_MAX_PER_LAYER,
    ARMOUR_KINDS,
    ARMOUR_PENALTY_MAX,
    GEAR_CATEGORIES,
    QUALITY_VALUE_MAX,
    WEAPON_GROUPS,
    WEAPON_REACHES,
} from './constants';
import { QUALITY_KEYS, QUALITY_REGISTRY, type QualityRef } from './qualities';

import { WFRP_CONDITION_KEYS } from '@/systems/wfrp/constants/conditions';

export const QualityRefSchema: z.ZodType<QualityRef> = z
    .strictObject({
        key: z.enum(QUALITY_KEYS),
        value: z.number().int().min(1).max(QUALITY_VALUE_MAX).optional(),
        condition: z.enum(WFRP_CONDITION_KEYS).optional(),
        location: z.enum(LOCATIONS).optional(),
        strength: z
            .union([z.number().int().min(1).max(100), z.literal('wielder')])
            .optional(),
    })
    .refine(
        (r) => QUALITY_REGISTRY[r.key].hasValue === (r.value !== undefined),
        { message: 'quality value mismatch', path: ['value'] }
    )
    .refine((r) => r.condition === undefined || r.key === 'inflict', {
        message: 'condition only on inflict',
        path: ['condition'],
    })
    .refine(
        (r) =>
            r.strength === undefined ||
            (r.key === 'inflict' && r.condition === 'entangled'),
        { message: 'strength only on inflict entangled', path: ['strength'] }
    )
    .refine((r) => r.location === undefined || r.key === 'inflict', {
        message: 'location only on inflict',
        path: ['location'],
    });

const weight = z.number().min(0).max(1000);

const price = z.number().min(0).max(1_000_000);

const ap = z.number().int().min(0).max(AP_MAX_PER_LAYER);

const qualities = z.array(QualityRefSchema).max(20);

const penalties = z
    .array(
        z.strictObject({
            skill: z.string().min(1).max(40),
            sl: z.number().int().min(1).max(ARMOUR_PENALTY_MAX),
        })
    )
    .max(8);

export const WfrpArmourStatsSchema = z.strictObject({
    type: z.literal('armour'),
    locations: z.strictObject({ head: ap, arm: ap, body: ap, leg: ap }),
    kind: z.enum(ARMOUR_KINDS),
    qualities,
    penalty: penalties.optional(),
    weight,
    price,
});

export const WfrpWeaponStatsSchema = z
    .strictObject({
        type: z.literal('weapon'),
        group: z.enum(WEAPON_GROUPS),
        reach: z.enum(WEAPON_REACHES).optional(),
        range: z.number().int().min(1).max(100_000).optional(),
        rangeSb: z.number().int().min(1).max(10).optional(),
        damage: z.strictObject({
            addSb: z.boolean(),
            flat: z.number().int().min(-100).max(100),
        }),
        qualities,
        flaws: qualities,
        twoHanded: z.boolean(),
        bladed: z.boolean().optional(),
        ammoCapacity: z.number().int().min(1).max(1000).optional(),
        weight,
        price,
    })
    .refine((w) => (w.reach === undefined) !== (w.range === undefined), {
        message: 'weapon needs reach xor range',
        path: ['reach'],
    })
    .refine((w) => w.rangeSb === undefined || w.range !== undefined, {
        message: 'rangeSb needs range',
        path: ['rangeSb'],
    });

export const WfrpGearStatsSchema = z.strictObject({
    type: z.literal('gear'),
    category: z.enum(GEAR_CATEGORIES).optional(),
    weight,
    price,
    qualities,
});

export const WfrpItemStatsSchema = z.discriminatedUnion('type', [
    WfrpArmourStatsSchema,
    WfrpWeaponStatsSchema,
    WfrpGearStatsSchema,
]);

export type WfrpArmourStats = {
    type: 'armour';
    locations: Record<HitLocation, number>;
    kind: (typeof ARMOUR_KINDS)[number];
    qualities: QualityRef[];
    /** SL lost on tests of the skill while the armour is worn */
    penalty?: { skill: string; sl: number }[];
    weight: number;
    price: number;
};

export type WfrpWeaponStats = {
    type: 'weapon';
    group: (typeof WEAPON_GROUPS)[number];
    reach?: (typeof WEAPON_REACHES)[number];
    range?: number;
    /** Thrown: Range is Strength Bonus times this in yards; `range` stays the fallback */
    rangeSb?: number;
    damage: { addSb: boolean; flat: number };
    qualities: QualityRef[];
    flaws: QualityRef[];
    twoHanded: boolean;
    /** Blade weapon: a Trap Blade defender can catch it (p305) */
    bladed?: boolean;
    ammoCapacity?: number;
    weight: number;
    price: number;
};

export type WfrpGearStats = {
    type: 'gear';
    category?: (typeof GEAR_CATEGORIES)[number];
    weight: number;
    price: number;
    qualities: QualityRef[];
};

export type WfrpItemStats = WfrpArmourStats | WfrpWeaponStats | WfrpGearStats;
