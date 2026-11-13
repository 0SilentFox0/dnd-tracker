import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyAbilitySummons } from '@/lib/utils/battle/summon/ability-summons';

describe('phantom clone does not inherit the source system state', () => {
    it('drops the slot, the dying flag, the counters and the inspiration', async () => {
        const mage = makeParticipant({
            id: 'mage',
            side: ParticipantSide.ALLY,
        });

        const source = makeParticipant({
            id: 'knight',
            side: ParticipantSide.ENEMY,
        });

        const knight = {
            ...source,
            battleData: {
                ...source.battleData,
                system: {
                    key: 'd20',
                    data: { inspiration: true, attackedWithLight: true },
                },
                dying: true as const,
                deathSaves: { successes: 0, failures: 1, stable: false },
                inspiration: true,
                inspirationSpent: true,
            },
        };

        const { order } = await applyAbilitySummons(
            [
                {
                    ownerId: 'mage',
                    cloneOf: 'knight',
                    count: 1,
                    spellId: 'sp',
                    castId: 'c1',
                },
            ],
            [mage, knight],
            {
                campaignId: 'c1',
                battleId: 'b1',
                rng: () => 0,
                deps: { loadPool: async () => ({ units: [], races: [] }) },
            }
        );

        const phantom = order.find((p) =>
            p.basicInfo.id.startsWith('phantom:')
        );

        expect(phantom).toBeDefined();
        expect(phantom?.battleData.system).toBeUndefined();
        expect(phantom?.battleData.dying).toBeUndefined();
        expect(phantom?.battleData.deathSaves).toBeUndefined();
        expect(phantom?.battleData.inspiration).toBeUndefined();
        expect(phantom?.battleData.inspirationSpent).toBeUndefined();
    });
});
