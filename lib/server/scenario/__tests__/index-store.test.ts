import { describe, expect, it, vi } from 'vitest';

const queryRaw = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock('server-only', () => ({}));

import { loadSummaryRelations } from '@/lib/server/scenario/index-store';

describe('loadSummaryRelations', () => {
    it('returns relations of present pages, skipping missing, legacy and invalid summaries', async () => {
        queryRaw.mockResolvedValueOnce([
            {
                pageId: 'p1',
                relations: [{ a: 'unit:1', b: 'unit:2', label: 'allies' }],
            },
            { pageId: 'p2', relations: null },
            {
                pageId: 'p3',
                relations: [
                    { a: 'unit:1', b: 'unit:2', label: 'x'.repeat(500) },
                ],
            },
            {
                pageId: 'gone',
                relations: [{ a: 'unit:1', b: 'unit:2', label: 'late' }],
            },
        ]);

        expect(
            await loadSummaryRelations('camp', new Set(['p1', 'p2', 'p3']))
        ).toEqual([{ a: 'unit:1', b: 'unit:2', label: 'allies' }]);
    });
});
