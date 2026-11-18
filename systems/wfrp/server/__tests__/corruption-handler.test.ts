import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { prisma } from '@/lib/db';
import { assertNotInActiveBattle } from '@/lib/server/characters/battle-lock';
import { lockCharacters } from '@/lib/server/characters/lock';
import { writeCharacterLog } from '@/lib/server/characters/log';
import { ContentError } from '@/lib/server/content/errors';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { planGrant } from '@/systems/wfrp/rules/corruption/plan-grant';
import {
    grantCorruption,
    undoCorruption,
} from '@/systems/wfrp/server/corruption-handler';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({
    prisma: { $transaction: vi.fn(), character: { update: vi.fn() } },
}));
vi.mock('@/lib/server/characters/battle-lock', () => ({
    assertNotInActiveBattle: vi.fn(),
}));
vi.mock('@/lib/server/characters/lock', () => ({ lockCharacters: vi.fn() }));
vi.mock('@/lib/server/characters/log', () => ({ writeCharacterLog: vi.fn() }));
vi.mock('@/lib/utils/rules/systems', () => ({ ruleSystemOf: vi.fn() }));
vi.mock('@/systems/wfrp/rules/corruption/plan-grant', () => ({
    planGrant: vi.fn(),
}));

type Gate = Parameters<typeof grantCorruption>[0];

const db = vi.mocked(prisma, true);

const gate = (status = 'active'): Gate =>
    ({
        access: {
            userId: 'u1',
            campaign: { id: 'camp', rules: { tables: {} } },
        },
        character: { id: 'c1', status },
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

const lastGrant = {
    id: 'g1',
    at: '2026-01-01T00:00:00.000Z',
    reason: 'dark ritual',
    before: { points: 1 },
    after: { points: 4 },
    summary: { points: 3, total: 4, threshold: 5 },
};

const corruptionState = { points: 4, mutations: [], last: lastGrant };

beforeEach(() => {
    vi.resetAllMocks();
    db.$transaction.mockImplementation(((fn: (tx: unknown) => unknown) =>
        fn(db)) as never);
    vi.mocked(ruleSystemOf).mockReturnValue({
        corruption: {},
    } as unknown as ReturnType<typeof ruleSystemOf>);
});

describe.each([
    ['grant', () => grantCorruption(gate(), { points: 2, reason: 'r' })],
    ['undo', () => undoCorruption(gate(), { grantId: 'g1' })],
])('%s guards', (_name, run) => {
    it('409 when the rule system has no corruption', async () => {
        vi.mocked(ruleSystemOf).mockReturnValue({} as never);

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.CORRUPTION_UNSUPPORTED,
            status: 409,
        });
        expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('404 when the character row cannot be locked', async () => {
        lockWith(null);

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.CHARACTER_NOT_FOUND,
            status: 404,
        });
    });

    it('rejects inside an active battle and writes nothing', async () => {
        lockWith({});
        vi.mocked(assertNotInActiveBattle).mockRejectedValue(
            new ContentError(API_ERRORS.CORRUPTION_IN_BATTLE, 409)
        );

        await expect(run()).rejects.toMatchObject({
            message: API_ERRORS.CORRUPTION_IN_BATTLE,
        });
        expect(assertNotInActiveBattle).toHaveBeenCalledWith(
            'camp',
            ['c1'],
            API_ERRORS.CORRUPTION_IN_BATTLE
        );
        expect(db.character.update).not.toHaveBeenCalled();
        expect(writeCharacterLog).not.toHaveBeenCalled();
    });
});

describe('corruption status guard', () => {
    it.each([
        ['grant', (g: Gate) => grantCorruption(g, { points: 1, reason: 'r' })],
        ['undo', (g: Gate) => undoCorruption(g, { grantId: 'g1' })],
    ])('%s: 400 for a non-active character', async (_n, run) => {
        await expect(run(gate('dead'))).rejects.toMatchObject({
            message: API_ERRORS.REST_CHARACTERS_INVALID,
            status: 400,
        });
    });
});

describe('grantCorruption', () => {
    it('stores the planned state, logs the grant and returns it', async () => {
        lockWith({ fate: 2 });

        const summary = {
            points: 3,
            total: 4,
            threshold: 5,
            mutation: {
                kind: 'physical',
                typeRoll: 10,
                roll: 20,
                text: 'Horns',
                effects: [],
            },
        };

        const state = { points: 4, mutations: [] };

        vi.mocked(planGrant).mockReturnValue({ state, summary } as never);

        const result = await grantCorruption(gate(), {
            points: 3,
            reason: 'dark ritual',
        });

        expect(result.corruption).toEqual(state);
        expect(result.summary).toEqual(summary);
        expect(result.grantId).toMatch(/^[0-9a-f-]{36}$/);

        const plan = vi.mocked(planGrant).mock.calls[0]![0];

        expect(plan).toMatchObject({
            points: 3,
            reason: 'dark ritual',
            id: result.grantId,
        });
        expect(plan.characteristics.fate).toBe(2);

        const update = db.character.update.mock.calls[0]![0];

        expect(update.where).toEqual({ id: 'c1' });
        expect(
            (update.data.characteristics as { corruption: unknown }).corruption
        ).toEqual(state);
        expect((update.data.characteristics as { fate: number }).fate).toBe(2);
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.CORRUPTION,
                data: {
                    grantId: result.grantId,
                    reason: 'dark ritual',
                    points: 3,
                    total: 4,
                    threshold: 5,
                    mutation: true,
                    summary,
                },
            },
        ]);
    });

    it('logs mutation=false when the grant produced none', async () => {
        lockWith({});
        vi.mocked(planGrant).mockReturnValue({
            state: { points: 1, mutations: [] },
            summary: { points: 1, total: 1, threshold: 5 },
        } as never);

        await grantCorruption(gate(), { points: 1, reason: 'r' });

        expect(
            vi.mocked(writeCharacterLog).mock.calls[0]![1][0]!.data
        ).toMatchObject({ mutation: false });
    });
});

describe('undoCorruption', () => {
    it('409 stale when there is no corruption state or the grant id differs', async () => {
        lockWith({});

        await expect(
            undoCorruption(gate(), { grantId: 'g1' })
        ).rejects.toMatchObject({
            message: API_ERRORS.CORRUPTION_STALE,
            status: 409,
        });

        lockWith({ corruption: corruptionState });

        await expect(
            undoCorruption(gate(), { grantId: 'other' })
        ).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_STALE });
        expect(db.character.update).not.toHaveBeenCalled();
    });

    it('409 stale when points moved after the grant', async () => {
        lockWith({ corruption: { ...corruptionState, points: 5 } });

        await expect(
            undoCorruption(gate(), { grantId: 'g1' })
        ).rejects.toMatchObject({ message: API_ERRORS.CORRUPTION_STALE });
    });

    it('restores the previous points, keeps the rest of the sheet and logs the undo', async () => {
        lockWith({ fate: 3, corruption: corruptionState });

        const result = await undoCorruption(gate(), { grantId: 'g1' });

        expect(result).toEqual({ corruption: { points: 1, mutations: [] } });

        const update = db.character.update.mock.calls[0]![0];

        expect(update.where).toEqual({ id: 'c1' });
        expect(update.data.characteristics).toMatchObject({
            fate: 3,
            corruption: { points: 1, mutations: [] },
        });
        expect(vi.mocked(writeCharacterLog).mock.calls[0]![1]).toEqual([
            {
                campaignId: 'camp',
                characterId: 'c1',
                actorUserId: 'u1',
                kind: CharacterLogKind.CORRUPTION,
                data: { grantId: 'g1', undo: true },
            },
        ]);
    });
});
