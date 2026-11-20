import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    fromCharacter: vi.fn(),
    fromUnit: vi.fn(),
    assertJoinGuards: vi.fn(async () => undefined),
}));

vi.mock('@/lib/db', () => ({
    prisma: {
        character: { findMany: vi.fn(async () => [{ id: 'h1' }]) },
        unit: { findMany: vi.fn(async () => [{ id: 'u1' }]) },
    },
}));
vi.mock('@/lib/server/battles/mutations/start/start-build-context', () => ({
    buildCampaignContextForStart: vi.fn(async () => ({
        campaignContext: {},
        racesById: {},
    })),
}));
vi.mock('@/lib/server/battles/mutations/start/start-fair-scaling', () => ({
    scaleEnemiesForFairBattle: vi.fn(
        async (_c: string, _s: unknown, built: Array<{ battleData: object }>) =>
            built.map((p) => ({
                ...p,
                battleData: { ...p.battleData, hpMultiplier: 1.5 },
            }))
    ),
}));
vi.mock('@/lib/server/battles/participant-sources', () => ({
    assertJoinGuards: mocks.assertJoinGuards,
}));
vi.mock('@/lib/server/battles/participant/from-character', () => ({
    createBattleParticipantFromCharacter: mocks.fromCharacter,
}));
vi.mock('@/lib/utils/battle/participant', () => ({
    createBattleParticipantFromUnit: mocks.fromUnit,
}));

import { ParticipantSide } from '@/lib/constants/battle';
import { prisma } from '@/lib/db';
import { buildStartOrder } from '@/lib/server/battles/mutations/start/start-battle-handler';
import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

describe('buildStartOrder: резерв', () => {
    it('резерв не отримує ауру й не потрапляє в чергу, але лишається масштабованим', async () => {
        const aura = resolved({
            trigger: { event: 'passive' },
            effects: [
                {
                    kind: 'modifyStat',
                    stat: 'initiative',
                    flat: 5,
                    target: 'allAllies',
                },
            ],
        });

        const hero = makeParticipant({ id: 'h1', abilities: [aura] });

        mocks.fromCharacter.mockResolvedValue(hero);
        mocks.fromUnit.mockImplementation(
            async (_u: unknown, _b: string, _s: unknown, n: number) =>
                makeParticipant({ id: `w${n}`, side: ParticipantSide.ALLY })
        );

        const { order, reserve } = await buildStartOrder(
            'b1',
            'c1',
            [
                { id: 'h1', type: 'character', side: 'ally' },
                {
                    id: 'u1',
                    type: 'unit',
                    side: 'ally',
                    quantity: 2,
                    reserved: 1,
                },
            ],
            null,
            DEFAULT_RULES
        );

        expect(prisma.character.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    campaignId: 'c1',
                    status: 'active',
                }),
            })
        );
        expect(order.map((p) => p.basicInfo.id).sort()).toEqual(['h1', 'w1']);
        expect(reserve.map((p) => p.basicInfo.id)).toEqual(['w2']);
        expect(reserve[0].battleData).toMatchObject({
            reserved: true,
            hpMultiplier: 1.5,
        });
        expect(
            order.find((p) => p.basicInfo.id === 'w1')?.abilities.initiative
        ).toBe(15);
        expect(reserve[0].abilities.initiative).toBe(10);
    });

    it('персонаж іншої кампанії не стає учасником', async () => {
        mocks.fromCharacter.mockClear();
        vi.mocked(prisma.character.findMany).mockResolvedValueOnce([]);
        mocks.fromUnit.mockResolvedValue(makeParticipant({ id: 'w1' }));

        const { order } = await buildStartOrder(
            'b1',
            'c1',
            [{ id: 'foreign', type: 'character', side: 'ally' }],
            null,
            DEFAULT_RULES
        );

        expect(order.map((p) => p.basicInfo.id)).not.toContain('foreign');
        expect(mocks.fromCharacter).not.toHaveBeenCalled();
    });
});

describe('buildStartOrder: join guards', () => {
    it('a rejected join guard aborts the start', async () => {
        mocks.assertJoinGuards.mockRejectedValueOnce(new Error('soul lost'));

        await expect(
            buildStartOrder(
                'b1',
                'c1',
                [{ id: 'h1', type: 'character', side: 'ally' }],
                null,
                DEFAULT_RULES
            )
        ).rejects.toThrow('soul lost');
        expect(mocks.assertJoinGuards).toHaveBeenCalledWith('c1', [
            { id: 'h1' },
        ]);
    });
});
