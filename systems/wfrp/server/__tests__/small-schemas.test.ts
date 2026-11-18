import { describe, expect, it } from 'vitest';

import { FORTUNE_INPUT } from '@/systems/wfrp/rules/percentile/fortune';
import { WfrpFortuneInputSchema } from '@/systems/wfrp/server/attack-input';
import {
    corruptionGrantSchema,
    corruptionUndoSchema,
} from '@/systems/wfrp/server/corruption-schemas';
import {
    parseSpeciesProfile,
    profileRefIds,
} from '@/systems/wfrp/server/profile-refs';
import {
    advanceSchema,
    careerAdvanceSchema,
    careerSetSchema,
} from '@/systems/wfrp/server/progression-schemas';

describe('WfrpFortuneInputSchema', () => {
    it('is undefined without a system block', () => {
        expect(WfrpFortuneInputSchema.parse({})).toBeUndefined();
        expect(
            WfrpFortuneInputSchema.parse({ secondRoll: 40 })
        ).toBeUndefined();
    });

    it('writes a reroll slot with the manual second roll', () => {
        const slot = WfrpFortuneInputSchema.parse({
            system: { key: 'wfrp', data: { kind: 'reroll' } },
            secondRoll: 42,
        });

        expect(FORTUNE_INPUT.read(slot)).toEqual({
            kind: 'reroll',
            manualReroll: 42,
        });
    });

    it('omits the second roll for reroll without one and for sl', () => {
        const reroll = WfrpFortuneInputSchema.parse({
            system: { key: 'wfrp', data: { kind: 'reroll' } },
        });

        expect(FORTUNE_INPUT.read(reroll)).toEqual({ kind: 'reroll' });

        const sl = WfrpFortuneInputSchema.parse({
            system: { key: 'wfrp', data: { kind: 'sl' } },
            secondRoll: 42,
        });

        expect(FORTUNE_INPUT.read(sl)).toEqual({ kind: 'sl' });
    });

    it('rejects a wrong key, kind or an out-of-range roll', () => {
        const bad = (v: unknown) => WfrpFortuneInputSchema.safeParse(v).success;

        expect(bad({ system: { key: 'dnd5e', data: { kind: 'sl' } } })).toBe(
            false
        );
        expect(bad({ system: { key: 'wfrp', data: { kind: 'x' } } })).toBe(
            false
        );
        expect(
            bad({
                system: { key: 'wfrp', data: { kind: 'reroll' } },
                secondRoll: 101,
            })
        ).toBe(false);
        expect(
            bad({
                system: { key: 'wfrp', data: { kind: 'reroll' } },
                secondRoll: 0,
            })
        ).toBe(false);
    });
});

describe('corruption schemas', () => {
    it('limits points to 1..10 integers and trims a 1..80 char reason', () => {
        const ok = (points: number, reason: string) =>
            corruptionGrantSchema.safeParse({ points, reason }).success;

        expect(ok(1, 'r')).toBe(true);
        expect(ok(10, 'r')).toBe(true);
        expect(ok(0, 'r')).toBe(false);
        expect(ok(11, 'r')).toBe(false);
        expect(ok(1.5, 'r')).toBe(false);
        expect(ok(1, '   ')).toBe(false);
        expect(ok(1, 'x'.repeat(80))).toBe(true);
        expect(ok(1, 'x'.repeat(81))).toBe(false);
        expect(
            corruptionGrantSchema.parse({ points: 1, reason: '  hi ' }).reason
        ).toBe('hi');
    });

    it('requires a grantId up to 64 chars', () => {
        expect(corruptionUndoSchema.safeParse({ grantId: '' }).success).toBe(
            false
        );
        expect(
            corruptionUndoSchema.safeParse({ grantId: 'g'.repeat(65) }).success
        ).toBe(false);
        expect(corruptionUndoSchema.safeParse({ grantId: 'g' }).success).toBe(
            true
        );
    });
});

describe('progression schemas', () => {
    it('advanceSchema accepts only known kinds and bounded keys', () => {
        expect(
            advanceSchema.safeParse({ kind: 'talent', key: 't' }).success
        ).toBe(true);
        expect(
            advanceSchema.safeParse({ kind: 'spell', key: 't' }).success
        ).toBe(false);
        expect(
            advanceSchema.safeParse({ kind: 'skill', key: '' }).success
        ).toBe(false);
        expect(
            advanceSchema.safeParse({ kind: 'skill', key: 'k'.repeat(61) })
                .success
        ).toBe(false);
    });

    it('careerSetSchema requires an id; careerAdvanceSchema force is optional boolean', () => {
        expect(careerSetSchema.safeParse({}).success).toBe(false);
        expect(careerSetSchema.safeParse({ careerId: 'c' }).success).toBe(true);
        expect(careerAdvanceSchema.safeParse({}).success).toBe(true);
        expect(careerAdvanceSchema.safeParse({ force: true }).success).toBe(
            true
        );
        expect(careerAdvanceSchema.safeParse({ force: 'yes' }).success).toBe(
            false
        );
    });
});

describe('profile-refs', () => {
    it('collects career ids and both fixed and random talent ids', () => {
        expect(
            profileRefIds({
                careerTable: [
                    { max: 50, careerId: 'c1' },
                    { max: 100, careerId: 'c2' },
                ],
                talents: ['f1'],
                randomTalents: [{ max: 100, featId: 'f2' }],
            })
        ).toEqual({ careers: ['c1', 'c2'], feats: ['f1', 'f2'] });
    });

    it('parseSpeciesProfile returns a parsed profile with defaults, or null when invalid', () => {
        const ok = parseSpeciesProfile({
            careerTable: [{ max: 100, careerId: 'c1' }],
        });

        expect(ok).toMatchObject({ move: 4, fate: 0, talents: [] });
        expect(parseSpeciesProfile({ move: 99 })).toBeNull();
        expect(parseSpeciesProfile({ unknown: 1 })).toBeNull();
        expect(parseSpeciesProfile('nope')).toBeNull();
    });
});
