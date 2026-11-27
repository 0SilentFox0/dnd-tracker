import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bakedStatsById } from '../list-baked-stats';

import { prisma } from '@/lib/db';
import { buildCharacterParticipant } from '@/lib/server/characters/participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('@/lib/db', () => ({ prisma: { character: { findMany: vi.fn() } } }));
vi.mock('@/lib/server/characters/participant', () => ({
    buildCharacterParticipant: vi.fn(),
}));

const campaign = { maxLevel: 20, rules: DEFAULT_RULES };

describe('bakedStatsById', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns maxHp and AC per character and skips failures', async () => {
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'a' },
            { id: 'b' },
        ] as never);
        vi.mocked(buildCharacterParticipant).mockImplementation(((c: {
            id: string;
        }) =>
            c.id === 'a'
                ? Promise.resolve({
                      participant: {
                          basicInfo: { id: 'p' },
                          combatStats: { maxHp: 15, armorClass: 12 },
                          battleData: {
                              activeEffects: [],
                              resolvedAbilities: [
                                  {
                                      id: 'ud',
                                      name: 'Unarmored Defense',
                                      trigger: { event: 'passive' },
                                      effects: [
                                          {
                                              kind: 'modifyStat',
                                              stat: 'armor',
                                              flat: 3,
                                          },
                                      ],
                                      source: { type: 'class', id: 'c', name: 'c' },
                                      key: 'class:c:ud',
                                  },
                              ],
                          },
                      },
                  })
                : Promise.reject(new Error('boom'))) as never);

        const map = await bakedStatsById(['a', 'b'], campaign);

        expect([...map]).toEqual([['a', { maxHp: 15, armorClass: 15 }]]);
    });

    it('does not query for an empty list', async () => {
        expect((await bakedStatsById([], campaign)).size).toBe(0);
        expect(prisma.character.findMany).not.toHaveBeenCalled();
    });
});
