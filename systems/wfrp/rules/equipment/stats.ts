import { z } from 'zod';

import type { HitLocation } from '../combat/constants';
import {
    AP_MAX_PER_LAYER,
    ARMOUR_KINDS,
    QUALITY_VALUE_MAX,
    WEAPON_GROUPS,
    WEAPON_REACHES,
} from './constants';
import { QUALITY_KEYS, QUALITY_REGISTRY, type QualityRef } from './qualities';

export const QualityRefSchema: z.ZodType<QualityRef> = z
    .strictObject({
        key: z.enum(QUALITY_KEYS),
        value: z.number().int().min(1).max(QUALITY_VALUE_MAX).optional(),
    })
    .refine(
        (r) => QUALITY_REGISTRY[r.key].hasValue === (r.value !== undefined),
        { message: 'quality value mismatch', path: ['value'] }
    );

const weight = z.number().min(0).max(1000);

const price = z.number().min(0).max(1_000_000);

const ap = z.number().int().min(0).max(AP_MAX_PER_LAYER);

const qualities = z.array(QualityRefSchema).max(20);

export const WfrpArmourStatsSchema = z.strictObject({
    type: z.literal('armour'),
    locations: z.strictObject({ head: ap, arm: ap, body: ap, leg: ap }),
    kind: z.enum(ARMOUR_KINDS),
    qualities,
    weight,
    price,
});

export const WfrpWeaponStatsSchema = z
    .strictObject({
        type: z.literal('weapon'),
        group: z.enum(WEAPON_GROUPS),
        reach: z.enum(WEAPON_REACHES).optional(),
        range: z.number().int().min(1).max(100_000).optional(),
        damage: z.strictObject({
            addSb: z.boolean(),
            flat: z.number().int().min(-100).max(100),
        }),
        qualities,
        flaws: qualities,
        twoHanded: z.boolean(),
        ammoCapacity: z.number().int().min(1).max(1000).optional(),
        weight,
        price,
    })
    .refine((w) => (w.reach === undefined) !== (w.range === undefined), {
        message: 'weapon needs reach xor range',
        path: ['reach'],
    });

export const WfrpGearStatsSchema = z.strictObject({
    type: z.literal('gear'),
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
    weight: number;
    price: number;
};

export type WfrpWeaponStats = {
    type: 'weapon';
    group: (typeof WEAPON_GROUPS)[number];
    reach?: (typeof WEAPON_REACHES)[number];
    range?: number;
    damage: { addSb: boolean; flat: number };
    qualities: QualityRef[];
    flaws: QualityRef[];
    twoHanded: boolean;
    ammoCapacity?: number;
    weight: number;
    price: number;
};

export type WfrpGearStats = {
    type: 'gear';
    weight: number;
    price: number;
    qualities: QualityRef[];
};

export type WfrpItemStats = WfrpArmourStats | WfrpWeaponStats | WfrpGearStats;
