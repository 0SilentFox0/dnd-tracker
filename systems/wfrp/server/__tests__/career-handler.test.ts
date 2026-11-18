import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ruleSystemOf } from '@/lib/utils/rules/systems/lookup';
import {
    planCareerAdvance,
    planCareerSet,
} from '@/systems/wfrp/rules/advancement';
import { advanceCareer, setCareer } from '@/systems/wfrp/server/career-handler';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: {
        $transaction: vi.fn(),
        character: { update: vi.fn() },
        career: { findFirst: vi.fn() },
    },
}));
vi.mock('@/lib/server/characters/lock', () => ({ lockCharacters: vi.fn() }));
vi.mock('@/lib/server/characters/log', () => ({ writeCharacterLog: vi.fn() }));
vi.mock('@/lib/utils/rules/systems/lookup', () => ({ ruleSystemOf: vi.fn() }));
vi.mock('@/systems/wfrp/rules/advancement', () => ({
    planCareerSet: vi.fn(),
    planCareerAdvance: vi.fn(),
}));

type Gate = Parameters<typeof setCareer>[0];

const db = vi.mocked(prisma, true);

const gate = (status = 'active'): Gate =>
    ({
        access: {
            userId: 'u1',
            campaign: {
                id: 'camp',
                rules: {
                    advancement: { career: { ticksRequired: [3, 4, 5] } },
                },
            },
        },
        character: { id: 'c1', campaignId: 'camp', status },
    }) as unknown as Gate;

const lockWith = (characteristics: object | null) =>
    vi.mocked(lockCharacters).mockResolvedValue(
        new Map(
            characteristics
                ? [
                      [
                          'c1',
                          {
                              id: 'c1',
                              resources: {},
                              experience: 0,
                              characteristics,
                          },
                      ],
                  ]
                : []
        ) as unknown as Awaited<ReturnType<typeof lockCharacters>>
    );

const runs = [
    ['setCareer', () => setCareer(gate(), { careerId: 'k1' })],
    ['advanceCareer', () => advanceCareer(gate(), {})],
] as const;

beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
        fn(db)) as never);
    vi.mocked(ruleSystemOf).mockReturnValue({
        advancement: {},
    } as unknown as ReturnType<typeof ruleSystemOf>);
});

describe('career guards', () => {
    it.each(runs)('%s: 409 without advancement support', async (_n, run) => {
        vi.mocked(ruleSystemOf).mockReturnValue({} as never);

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.ADVANCE_NOT_SUPPORTED,
            status: 409,
        });
    });

    it.each(runs)('%s: 404 when the row cannot be locked', async (_n, run) => {
        lockWith(null);

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.CHARACTER_NOT_FOUND,
            status: 404,
        });
    });

    it('400 for a non-active character', async () => {
        await expect(
            setCareer(gate('dead'), { careerId: 'k1' })
        ).rejects.toMatchObject({
            message: API_ERRORS.XP_CHARACTERS_INVALID,
            status: 400,
        });
    });
});

describe('setCareer', () => {
    it('404 when the career is not in the character campaign', async () => {
        lockWith({});
        db.career.findFirst.mockResolvedValue(null);

        await expect(
            setCareer(gate(), { careerId: 'k1' })
        ).rejects.toMatchObject({
            message: API_ERRORS.CAREER_NOT_FOUND,
            status: 404,
        });
        expect(db.career.findFirst).toHaveBeenCalledWith({
            where: { id: 'k1', campaignId: 'camp' },
            select: { id: true, name: true },
        });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('stores the planned sheet and logs the career name', async () => {
        lockWith({ fate: 1 });
        db.career.findFirst.mockResolvedValue({
            id: 'k1',
            name: 'Soldier',
        } as never);

        const next = {
            fate: 1,
            career: { careerId: 'k1', tier: 1, ticks: [] },
        };

        vi.mocked(planCareerSet).mockReturnValue(next as never);

        const result = await setCareer(gate(), { careerId: 'k1' });

        expect(result).toEqual({ characteristics: next });
        expect(vi.mocked(planCareerSet).mock.calls[0]![1]).toBe('k1');
        expect(db.character.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { characteristics: next },
        });
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.CAREER_SET,
                data: { careerId: 'k1', name: 'Soldier' },
            },
        ]);
    });
});

describe('advanceCareer', () => {
    it.each([
        ['NO_CAREER', API_ERRORS.CAREER_NO_CAREER],
        ['MAX_TIER', API_ERRORS.CAREER_MAX_TIER],
    ])('%s: 409 without issues', async (error, message) => {
        lockWith({});
        vi.mocked(planCareerAdvance).mockReturnValue({
            ok: false,
            error,
        } as never);

        await expect(advanceCareer(gate(), {})).rejects.toMatchObject({
            message,
            status: 409,
            issues: undefined,
        });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('TICKS_MISSING reports needed ticks for the current tier and ticks held', async () => {
        lockWith({ career: { careerId: 'k1', tier: 2, ticks: ['a', 'b'] } });
        vi.mocked(planCareerAdvance).mockReturnValue({
            ok: false,
            error: 'TICKS_MISSING',
        } as never);

        await expect(advanceCareer(gate(), {})).rejects.toMatchObject({
            message: API_ERRORS.CAREER_TICKS_MISSING,
            status: 409,
            issues: { needed: 4, have: 2 },
        });
    });

    it('TICKS_MISSING without a career carries no issues', async () => {
        lockWith({});
        vi.mocked(planCareerAdvance).mockReturnValue({
            ok: false,
            error: 'TICKS_MISSING',
        } as never);

        await expect(advanceCareer(gate(), {})).rejects.toMatchObject({
            issues: undefined,
        });
    });

    it.each([
        [{ force: true }, true],
        [{}, false],
        [{ force: false }, false],
    ])('input %j: forced=%s in planner and log', async (input, forced) => {
        lockWith({});

        const next = { career: { careerId: 'k1', tier: 2, ticks: [] } };

        vi.mocked(planCareerAdvance).mockReturnValue({
            ok: true,
            next,
        } as never);

        const result = await advanceCareer(gate(), input);

        expect(result).toEqual({ characteristics: next });
        expect(vi.mocked(planCareerAdvance).mock.calls[0]![2]).toEqual({
            force: forced,
        });
        expect(db.character.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { characteristics: next },
        });
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.CAREER_ADVANCE,
                data: { careerId: 'k1', tier: 2, forced },
            },
        ]);
    });
});
