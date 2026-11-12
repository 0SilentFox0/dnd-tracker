import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFirst = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: { slideDeck: { findFirst } } }));

import { getDeck } from '@/lib/server/show/deck-store';

describe('getDeck', () => {
    beforeEach(() => vi.clearAllMocks());

    it('loads one deck scoped to the campaign and converts its slides', async () => {
        const row = {
            id: 'd1',
            title: 'Deck',
            campaignId: 'c1',
            scenarioPageId: null,
            slides: [{ id: 'slide001', imageUrl: 'https://cdn.test/1.jpg' }],
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        findFirst.mockResolvedValue(row);

        await expect(getDeck('c1', 'd1')).resolves.toMatchObject({
            id: 'd1',
            title: 'Deck',
            slides: row.slides,
        });
        expect(findFirst).toHaveBeenCalledWith({
            where: { id: 'd1', campaignId: 'c1' },
        });
    });

    it('returns null for a missing deck', async () => {
        findFirst.mockResolvedValue(null);
        await expect(getDeck('c1', 'missing')).resolves.toBeNull();
    });
});
