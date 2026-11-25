import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeRaw, afterMock } = vi.hoisted(() => ({
    executeRaw: vi.fn(),
    afterMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ prisma: { $executeRaw: executeRaw } }));
vi.mock('next/server', () => ({ after: afterMock }));
vi.mock('@/lib/utils/common/logger', () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import {
    __resetForTests,
    flushMetrics,
    gauge,
    incr,
    observe,
} from '../metrics';

import { logger } from '@/lib/utils/common/logger';

type SqlLike = { values: unknown[] };

beforeEach(() => {
    __resetForTests();
    executeRaw.mockReset();
    afterMock.mockReset();
    vi.mocked(logger.warn).mockReset();
});

function flushedValues(): unknown[] {
    const call = executeRaw.mock.calls[0];

    return (call[1] as SqlLike).values;
}

describe('metrics buffer', () => {
    it('aggregates identical keys into one row', async () => {
        incr('battle.conflict');
        incr('battle.conflict', 2);
        await flushMetrics();

        expect(executeRaw).toHaveBeenCalledTimes(1);
        expect(flushedValues()).toContain(2);
        expect(flushedValues()).toContain(3);
    });

    it('is empty after a flush', async () => {
        incr('battle.conflict');
        await flushMetrics();
        await flushMetrics();

        expect(executeRaw).toHaveBeenCalledTimes(1);
    });

    it('observe writes count, sum and le rows', async () => {
        observe('battle.mutation', 120, { op: 'attack' });
        await flushMetrics();

        const flat = JSON.stringify(flushedValues());

        expect(flat).toContain('battle.mutation:count');
        expect(flat).toContain('battle.mutation:sum');
        expect(flat).toContain('battle.mutation:le');
        expect(flat).toContain('le=200,op=attack');
    });

    it('gauge keeps max', async () => {
        gauge('db.size_bytes', 10);
        gauge('db.size_bytes', 30);
        await flushMetrics();

        expect(flushedValues()).toContain(40);
        expect(flushedValues()).toContain(30);
    });

    it('does not throw when the DB fails', async () => {
        executeRaw.mockRejectedValueOnce(new Error('db down'));
        incr('battle.conflict');

        await expect(flushMetrics()).resolves.toBeUndefined();
        expect(logger.warn).toHaveBeenCalled();
    });

    it('throws on unknown metrics outside production', () => {
        expect(() => incr('nope' as never)).toThrow();
    });

    it('falls back to a plain flush when after() is out of scope', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(Date.now() + 31_000);
        afterMock.mockImplementation(() => {
            throw new Error('outside request scope');
        });

        incr('battle.conflict');
        await vi.runAllTimersAsync();
        vi.useRealTimers();

        expect(afterMock).toHaveBeenCalledTimes(1);
        expect(executeRaw).toHaveBeenCalledTimes(1);
    });
});
