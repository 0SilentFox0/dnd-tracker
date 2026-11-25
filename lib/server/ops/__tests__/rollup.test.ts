import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeRaw, deleteBuckets, deleteHourly, deleteEvents } = vi.hoisted(
    () => ({
        executeRaw: vi.fn(),
        deleteBuckets: vi.fn(),
        deleteHourly: vi.fn(),
        deleteEvents: vi.fn(),
    })
);

vi.mock('@/lib/db', () => ({
    prisma: {
        $executeRaw: executeRaw,
        opsMetricBucket: { deleteMany: deleteBuckets },
        opsMetricHourly: { deleteMany: deleteHourly },
        opsAlertEvent: { deleteMany: deleteEvents },
    },
}));

import { rollupAndPrune } from '../rollup';

beforeEach(() => vi.clearAllMocks());

describe('rollupAndPrune', () => {
    it('rolls up completed hours and prunes by retention', async () => {
        const now = new Date('2026-03-10T12:30:00Z');

        await rollupAndPrune(now);

        const [, from, to] = executeRaw.mock.calls[0];

        expect(from).toEqual(new Date('2026-03-10T09:00:00Z'));
        expect(to).toEqual(new Date('2026-03-10T12:00:00Z'));
        expect(deleteBuckets.mock.calls[0][0].where.bucket.lt).toEqual(
            new Date('2026-03-08T12:30:00Z')
        );
        expect(deleteHourly.mock.calls[0][0].where.bucket.lt).toEqual(
            new Date('2025-12-10T12:30:00Z')
        );
        expect(deleteEvents).toHaveBeenCalledOnce();
    });
});
