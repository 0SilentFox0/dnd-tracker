import { describe, expect, it } from 'vitest';

import {
    SpellEffectSchema,
    SpellTargetingSchema,
    SpellZoneSchema,
    ZONE_MAX_ROUNDS,
    ZoneTriggerSchema,
} from '@/lib/utils/spells/model/schema';

describe('zone durations follow canon', () => {
    it('accepts one hour of rounds and rejects beyond the cap', () => {
        expect(SpellZoneSchema.safeParse({ rounds: 600 }).success).toBe(true);
        expect(
            SpellZoneSchema.safeParse({ rounds: ZONE_MAX_ROUNDS + 1 }).success
        ).toBe(false);
    });

    it('anchored zones and terrain take long durations too', () => {
        expect(
            SpellEffectSchema.safeParse({
                kind: 'anchoredZone',
                radiusFeet: 15,
                side: 'enemies',
                duration: { rounds: 100 },
            }).success
        ).toBe(true);
        expect(
            SpellEffectSchema.safeParse({
                kind: 'createTerrain',
                terrain: 'wall',
                shape: 'cell',
                cells: 4,
                rounds: 600,
            }).success
        ).toBe(true);
    });

    it('template spells can hit everyone; chosen-target areas cannot', () => {
        const template = {
            kind: 'template',
            shape: 'circle',
            size: 20,
            maxTargets: 20,
        };

        expect(
            SpellTargetingSchema.safeParse({ ...template, side: 'all' }).success
        ).toBe(true);
        expect(
            SpellTargetingSchema.safeParse({
                kind: 'area',
                maxTargets: 3,
                side: 'all',
            }).success
        ).toBe(false);
    });

    it('zone triggers accept saveHalf', () => {
        expect(
            ZoneTriggerSchema.safeParse({
                save: { ability: 'wisdom' },
                saveHalf: true,
                effects: [],
            }).success
        ).toBe(true);
    });
});
