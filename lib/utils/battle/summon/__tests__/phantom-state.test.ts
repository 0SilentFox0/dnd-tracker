import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyAbilitySummons } from '@/lib/utils/battle/summon/ability-summons';
import { DEFAULT_RULES } from '@/lib/utils/rules';

describe('phantom clone does not inherit the source system state', () => {
    it('drops the slot and the dying flag', async () => {
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
                rules: DEFAULT_RULES,
                deps: { loadPool: async () => ({ units: [], races: [] }) },
            }
        );

        const phantom = order.find((p) =>
            p.basicInfo.id.startsWith('phantom:')
        );

        expect(phantom).toBeDefined();
        expect(phantom?.battleData.system).toBeUndefined();
        expect(phantom?.battleData.dying).toBeUndefined();
    });
});
