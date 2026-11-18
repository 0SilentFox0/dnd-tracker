import { describe, expect, it } from 'vitest';

import {
    downtimePeriodSchema,
    downtimePeriodUndoSchema,
    downtimeSetSchema,
} from '@/systems/wfrp/server/downtime-schemas';

const ailment = { kind: 'injury', daysLeft: 3, label: 'Leg' };

describe('downtimeSetSchema', () => {
    it('requires endeavour (nullable) and accepts rest', () => {
        expect(downtimeSetSchema.safeParse({}).success).toBe(false);
        expect(downtimeSetSchema.safeParse({ endeavour: null }).success).toBe(
            true
        );
        expect(
            downtimeSetSchema.safeParse({
                endeavour: { kind: 'rest', params: {} },
            }).success
        ).toBe(true);
    });

    it('rejects unknown endeavour kinds and extra params', () => {
        expect(
            downtimeSetSchema.safeParse({
                endeavour: { kind: 'fly', params: {} },
            }).success
        ).toBe(false);
        expect(
            downtimeSetSchema.safeParse({
                endeavour: { kind: 'rest', params: { x: 1 } },
            }).success
        ).toBe(false);
    });

    it('validates ailments: kind, daysLeft range, trimmed label, max 20', () => {
        const parse = (ailments: unknown) =>
            downtimeSetSchema.safeParse({ endeavour: null, ailments });

        expect(parse([ailment]).success).toBe(true);
        expect(parse([{ ...ailment, kind: 'cold' }]).success).toBe(false);
        expect(parse([{ ...ailment, daysLeft: 0 }]).success).toBe(false);
        expect(parse([{ ...ailment, daysLeft: 366 }]).success).toBe(false);
        expect(parse([{ ...ailment, label: '   ' }]).success).toBe(false);
        expect(parse(Array(20).fill(ailment)).success).toBe(true);
        expect(parse(Array(21).fill(ailment)).success).toBe(false);

        const trimmed = parse([{ ...ailment, label: '  Leg  ' }]);

        expect(trimmed.success && trimmed.data.ailments![0]!.label).toBe('Leg');
    });
});

describe('downtimePeriodSchema', () => {
    it('requires integer days and 1..50 non-empty character ids', () => {
        const parse = (v: unknown) => downtimePeriodSchema.safeParse(v).success;

        expect(parse({ days: 3, characterIds: ['a'] })).toBe(true);
        expect(parse({ days: 1.5, characterIds: ['a'] })).toBe(false);
        expect(parse({ days: 3, characterIds: [] })).toBe(false);
        expect(parse({ days: 3, characterIds: [''] })).toBe(false);
        expect(parse({ days: 3, characterIds: ['a'.repeat(65)] })).toBe(false);
        expect(
            parse({
                days: 3,
                characterIds: Array.from({ length: 50 }, (_, i) => `c${i}`),
            })
        ).toBe(true);
        expect(
            parse({
                days: 3,
                characterIds: Array.from({ length: 51 }, (_, i) => `c${i}`),
            })
        ).toBe(false);
    });
});

describe('downtimePeriodUndoSchema', () => {
    it('requires a non-empty periodId up to 64 chars', () => {
        const parse = (periodId: string) =>
            downtimePeriodUndoSchema.safeParse({
                periodId,
                characterIds: ['a'],
            }).success;

        expect(parse('p')).toBe(true);
        expect(parse('')).toBe(false);
        expect(parse('p'.repeat(65))).toBe(false);
    });
});
