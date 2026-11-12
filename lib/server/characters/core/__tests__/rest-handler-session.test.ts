import { beforeEach, describe, expect, it, vi } from 'vitest';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { CharacterLogKind } from '@/lib/constants/character-log';
import { ContentError } from '@/lib/server/content/errors';
import { applyRest } from '@/lib/utils/characters/resources/rest';
import { DEFAULT_RULES } from '@/lib/utils/rules';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

vi.mock('server-only', () => ({}));

const writeCharacterLog = vi.fn();

const assertNotInActiveBattle = vi.fn();

const update = vi.fn();

const findMany = vi.fn();

const tx = { character: { update }, $queryRaw: vi.fn(async () => []) };

vi.mock('@/lib/db', () => ({
    prisma: {
        character: { findMany },
        $transaction: (fn: (t: unknown) => unknown) => fn(tx),
    },
}));
vi.mock('@/lib/server/characters/battle-lock', () => ({
    assertNotInActiveBattle: (...a: unknown[]) => assertNotInActiveBattle(...a),
}));
vi.mock('@/lib/server/characters/log', () => ({
    writeCharacterLog: (...a: unknown[]) => writeCharacterLog(...a),
}));

const { restParty } = await import('../rest-handler');

const access = (rules: unknown) =>
    ({ userId: 'u', campaign: { id: 'camp', rules } }) as never;

const persist = (rules: typeof DEFAULT_RULES) => ({
    ...rules,
    outOfCombat: { ...rules.outOfCombat, persistResources: true },
});

const body = { kind: 'session' as const, characterIds: ['c1'] };

describe('restParty session', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        findMany.mockResolvedValue([
            {
                id: 'c1',
                classes: [],
                resources: { fortune: 0, hp: 2 },
                characteristics: { fate: 3 },
            },
        ]);
    });

    it('d20 system is 409 and nothing is logged', async () => {
        await expect(
            restParty(access(persist(DEFAULT_RULES)), body)
        ).rejects.toMatchObject({
            status: 409,
            message: API_ERRORS.REST_KIND_UNSUPPORTED,
        });
        expect(writeCharacterLog).not.toHaveBeenCalled();
    });

    it('wfrp restores fortune to fate and logs SESSION', async () => {
        const out = await restParty(access(persist(WFRP_RULES)), body);

        expect(out.characters).toEqual([
            { id: 'c1', resources: { hp: 2, fortune: 3 } },
        ]);
        expect(writeCharacterLog.mock.calls[0][1]).toEqual([
            expect.objectContaining({
                kind: CharacterLogKind.SESSION,
                data: {},
                characterId: 'c1',
            }),
        ]);
    });

    it('wfrp during an active battle propagates the lock error', async () => {
        assertNotInActiveBattle.mockRejectedValueOnce(
            new ContentError(API_ERRORS.CHARACTER_IN_BATTLE, 409)
        );

        await expect(
            restParty(access(persist(WFRP_RULES)), body)
        ).rejects.toMatchObject({ message: API_ERRORS.CHARACTER_IN_BATTLE });
        expect(update).not.toHaveBeenCalled();
    });

    it('short rest keeps fortune', () => {
        expect(
            applyRest(
                'short',
                { fortune: 2, hp: 1 },
                { pool: [], longRestHitDice: 'half' }
            )
        ).toMatchObject({ fortune: 2 });
    });
});
