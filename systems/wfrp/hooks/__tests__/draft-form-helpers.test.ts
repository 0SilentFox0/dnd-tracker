import { describe, expect, it } from 'vitest';

import {
    careerPickValid,
    cleanIdentity,
    serverIssueCodes,
    STEP_ERRORS,
    VISIBLE_STEP_ERRORS,
} from '../draft-form-helpers';

import { ApiError } from '@/lib/api/client';

describe('careerPickValid', () => {
    const rolls = [
        { careerId: 'a', roll: 10 },
        { careerId: 'b', roll: 80 },
    ];

    it('rolled mode accepts only the first rolled career', () => {
        expect(careerPickValid('rolled', 'a', rolls)).toBe(true);
        expect(careerPickValid('rolled', 'b', rolls)).toBe(false);
        expect(careerPickValid('rolled', 'a', [])).toBe(false);
    });

    it('choice mode accepts any rolled career', () => {
        expect(careerPickValid('choice', 'b', rolls)).toBe(true);
        expect(careerPickValid('choice', 'z', rolls)).toBe(false);
    });

    it('free mode accepts anything', () => {
        expect(careerPickValid('free', 'z', [])).toBe(true);
    });
});

describe('cleanIdentity', () => {
    it('trims the name and drops empty optional fields', () => {
        expect(
            cleanIdentity({ name: '  Ульріх  ', background: '', goals: [] })
        ).toEqual({ name: 'Ульріх' });
    });

    it('drops the alignment because wfrp has none', () => {
        expect(
            cleanIdentity({ name: 'A', alignment: 'LG' } as Parameters<
                typeof cleanIdentity
            >[0])
        ).toEqual({ name: 'A' });
    });

    it('keeps background, avatar and a non-empty goals list', () => {
        expect(
            cleanIdentity({
                name: 'A',
                background: 'Bio',
                avatar: 'u.png',
                goals: [{ text: 'g', kind: 'main' }],
            })
        ).toEqual({
            name: 'A',
            background: 'Bio',
            avatar: 'u.png',
            goals: [{ text: 'g', kind: 'main' }],
        });
    });
});

describe('serverIssueCodes', () => {
    it('returns unique string issues of an ApiError', () => {
        const err = new ApiError('bad', 400, '/u', {
            issues: ['A', 'B', 'A', 5, null],
        });

        expect(serverIssueCodes(err)).toEqual(['A', 'B']);
    });

    it.each([
        ['a plain error', new Error('x')],
        ['an ApiError without a body', new ApiError('x', 500, '/u')],
        [
            'an ApiError with non-array issues',
            new ApiError('x', 400, '/u', { issues: 'A' }),
        ],
        ['a non-error', undefined],
    ])('returns [] for %s', (_n, err) => {
        expect(serverIssueCodes(err)).toEqual([]);
    });
});

describe('STEP_ERRORS', () => {
    it('routes error codes to the owning step', () => {
        expect(STEP_ERRORS.species('PROFILE_NOT_READY')).toBe(true);
        expect(STEP_ERRORS.career('CAREER_UNKNOWN')).toBe(true);
        expect(STEP_ERRORS.career('STATS_SUM')).toBe(false);
        expect(STEP_ERRORS.stats('STATS_SUM')).toBe(true);
        expect(STEP_ERRORS.stats('POINTS_OVER')).toBe(true);
        expect(STEP_ERRORS.talents('TALENT_DUPLICATE')).toBe(true);
        expect(STEP_ERRORS.talents('FEAT_UNKNOWN')).toBe(true);
        expect(STEP_ERRORS.identity('ANYTHING')).toBe(false);
    });

    it('visible step errors are the ones the user can act on', () => {
        expect([...VISIBLE_STEP_ERRORS].sort()).toEqual([
            'CAREER_UNKNOWN',
            'FEAT_UNKNOWN',
            'PROFILE_NOT_READY',
        ]);
    });
});
