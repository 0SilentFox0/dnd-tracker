import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bakedStatsFor } from '../list-baked-stats';

import { buildCampaignContextForStart } from '@/lib/server/battles/mutations/start/start-build-context';
import { createBattleParticipantFromCharacter } from '@/lib/server/battles/participant/from-character';

vi.mock('@/lib/server/battles/mutations/start/start-build-context', () => ({
    buildCampaignContextForStart: vi.fn(),
}));
vi.mock('@/lib/server/battles/participant/from-character', () => ({
    createBattleParticipantFromCharacter: vi.fn(),
}));

const participant = {
    basicInfo: { id: 'p' },
    combatStats: { maxHp: 15, armorClass: 12 },
    battleData: {
        activeEffects: [],
        resolvedAbilities: [
            {
                id: 'ud',
                name: 'Unarmored Defense',
                trigger: { event: 'passive' },
                effects: [{ kind: 'modifyStat', stat: 'armor', flat: 3 }],
                source: { type: 'class', id: 'c', name: 'c' },
                key: 'class:c:ud',
            },
        ],
    },
};

describe('bakedStatsFor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(buildCampaignContextForStart).mockResolvedValue({
            campaignContext: {},
            racesById: {},
        } as never);
    });

    it('returns maxHp and AC per character in one batched context and skips failures', async () => {
        vi.mocked(createBattleParticipantFromCharacter).mockImplementation(((
            c: { id: string }
        ) =>
            c.id === 'a'
                ? Promise.resolve(participant)
                : Promise.reject(new Error('boom'))) as never);

        const map = await bakedStatsFor('camp', [
            { id: 'a' },
            { id: 'b' },
        ] as never);

        expect([...map]).toEqual([['a', { maxHp: 15, armorClass: 15 }]]);
        expect(buildCampaignContextForStart).toHaveBeenCalledTimes(1);
        expect(console.error).toHaveBeenCalled();
    });

    it('does nothing for an empty list', async () => {
        expect((await bakedStatsFor('camp', [])).size).toBe(0);
        expect(buildCampaignContextForStart).not.toHaveBeenCalled();
    });
});
