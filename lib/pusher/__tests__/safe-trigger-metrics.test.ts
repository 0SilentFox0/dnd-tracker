import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn() }));
vi.mock('@/lib/utils/common/logger', () => ({
    logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { safePusherTrigger } from '../safe-trigger';

import { incr } from '@/lib/ops/metrics';

beforeEach(() => vi.mocked(incr).mockClear());

describe('safePusherTrigger metrics', () => {
    it('counts ok', async () => {
        const pusher = { trigger: vi.fn().mockResolvedValue({}) };

        await safePusherTrigger(pusher as never, 'c', 'e', {});

        expect(incr).toHaveBeenCalledWith('pusher.trigger', 1, {
            result: 'ok',
        });
    });

    it('counts fail and does not reject', async () => {
        const pusher = { trigger: vi.fn().mockRejectedValue(new Error('x')) };

        await expect(
            safePusherTrigger(pusher as never, 'c', 'e', {})
        ).resolves.toBeUndefined();
        expect(incr).toHaveBeenCalledWith('pusher.trigger', 1, {
            result: 'fail',
        });
    });
});
