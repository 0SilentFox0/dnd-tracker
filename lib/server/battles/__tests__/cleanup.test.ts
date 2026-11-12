import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db', () => ({ prisma: {} }));

import { cleanupBattleSnapshots } from '../cleanup';

const NOW = new Date('2026-11-30T00:00:00Z');

describe('cleanupBattleSnapshots', () => {
    it('deletes snapshots only of battles completed more than 90 days ago', async () => {
        const deleteMany = vi.fn().mockResolvedValue({ count: 17 });

        const result = await cleanupBattleSnapshots(NOW, {
            battleSnapshot: { deleteMany },
        } as never);

        expect(deleteMany).toHaveBeenCalledExactlyOnceWith({
            where: {
                battle: {
                    status: 'completed',
                    completedAt: { lt: new Date('2026-09-01T00:00:00Z') },
                },
            },
        });
        expect(result).toEqual({ snapshots: 17 });
    });
});
