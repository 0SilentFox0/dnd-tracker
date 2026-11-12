import { describe, expect, it } from 'vitest';

import { isUsableProfile, type SpeciesProfile } from '../profile';
import { parseProfile, SpeciesProfileSchema } from '../schema';

const parse = (raw: unknown) => SpeciesProfileSchema.safeParse(raw);

describe('SpeciesProfileSchema', () => {
    it('defaults on {}', () => {
        expect(parse({}).data).toEqual({
            mods: {},
            move: 4,
            fate: 0,
            extraWounds: 0,
            talents: [],
            randomTalentCount: 0,
            randomTalents: [],
            careerTable: [],
        });
    });

    it('accepts a valid table', () => {
        expect(
            parse({
                careerTable: [
                    { max: 50, careerId: 'a' },
                    { max: 100, careerId: 'b' },
                ],
            }).success
        ).toBe(true);
    });

    it.each([
        [
            'non-ascending',
            [
                { max: 60, careerId: 'a' },
                { max: 50, careerId: 'b' },
                { max: 100, careerId: 'c' },
            ],
        ],
        [
            'equal max',
            [
                { max: 50, careerId: 'a' },
                { max: 50, careerId: 'b' },
                { max: 100, careerId: 'c' },
            ],
        ],
        [
            'last not 100',
            [
                { max: 50, careerId: 'a' },
                { max: 99, careerId: 'b' },
            ],
        ],
        [
            'max 0',
            [
                { max: 0, careerId: 'a' },
                { max: 100, careerId: 'b' },
            ],
        ],
        ['max 101', [{ max: 101, careerId: 'a' }]],
    ])('rejects a career table: %s', (_n, careerTable) => {
        expect(parse({ careerTable }).success).toBe(false);
    });

    it('rejects the same for random talents', () => {
        expect(
            parse({ randomTalents: [{ max: 50, featId: 'a' }] }).success
        ).toBe(false);
    });

    it('rejects an unknown key and mods out of range', () => {
        expect(parse({ resilience: 1 }).success).toBe(false);
        expect(parse({ mods: { ws: 21 } }).success).toBe(false);
        expect(parse({ mods: { ws: -21 } }).success).toBe(false);
        expect(parse({ mods: { xx: 1 } }).success).toBe(false);
        expect(parse({ mods: { ws: -20, fel: 20 } }).success).toBe(true);
    });

    it('bounds scalars', () => {
        expect(parse({ move: 0 }).success).toBe(false);
        expect(parse({ move: 13 }).success).toBe(false);
        expect(parse({ fate: 10 }).success).toBe(false);
        expect(parse({ extraWounds: 4 }).success).toBe(false);
        expect(parse({ randomTalentCount: 6 }).success).toBe(false);
        expect(parse({ talents: Array(21).fill('a') }).success).toBe(false);
    });
});

describe('isUsableProfile / parseProfile', () => {
    it('is usable only with a career table', () => {
        expect(isUsableProfile(parseProfile({}))).toBe(false);
        expect(
            isUsableProfile(
                parseProfile({ careerTable: [{ max: 100, careerId: 'a' }] })
            )
        ).toBe(true);
    });

    it('falls back to defaults on garbage', () => {
        const p: SpeciesProfile = parseProfile('x');

        expect(p.move).toBe(4);
        expect(parseProfile(null).careerTable).toEqual([]);
    });
});
