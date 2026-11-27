import { beforeEach, describe, expect, it, vi } from 'vitest';

import { bakedMaxHpById } from '../list-max-hp';

import { prisma } from '@/lib/db';
import { buildCharacterParticipant } from '@/lib/server/characters/participant';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

vi.mock('@/lib/db', () => ({ prisma: { character: { findMany: vi.fn() } } }));
vi.mock('@/lib/server/characters/participant', () => ({
    buildCharacterParticipant: vi.fn(),
}));

const campaign = { maxLevel: 20, rules: DEFAULT_RULES };

describe('bakedMaxHpById', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns the participant maxHp per character and skips failures', async () => {
        vi.mocked(prisma.character.findMany).mockResolvedValue([
            { id: 'a' },
            { id: 'b' },
        ] as never);
        vi.mocked(buildCharacterParticipant).mockImplementation(((c: {
            id: string;
        }) =>
            c.id === 'a'
                ? Promise.resolve({ participant: { combatStats: { maxHp: 15 } } })
                : Promise.reject(new Error('boom'))) as never);

        const map = await bakedMaxHpById(['a', 'b'], campaign);

        expect([...map]).toEqual([['a', 15]]);
    });

    it('does not query for an empty list', async () => {
        expect((await bakedMaxHpById([], campaign)).size).toBe(0);
        expect(prisma.character.findMany).not.toHaveBeenCalled();
    });
});
