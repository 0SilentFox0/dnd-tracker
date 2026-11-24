import { NextResponse } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/ops/metrics', () => ({ incr: vi.fn() }));

import { heavySlotsInUse, withHeavySlot } from '../heavy-limiter';

afterEach(() => vi.unstubAllEnvs());

const gate = () => {
    let open!: () => void;

    const promise = new Promise<void>((resolve) => {
        open = resolve;
    });

    return { promise, open };
};

describe('withHeavySlot', () => {
    it('rejects the call over the limit and frees the slot afterwards', async () => {
        vi.stubEnv('CAP_MAX_HEAVY_JOBS_PER_INSTANCE', '2');

        const g = gate();

        const a = withHeavySlot(() => g.promise.then(() => 'a'));

        const b = withHeavySlot(() => g.promise.then(() => 'b'));

        const over = await withHeavySlot(async () => 'c');

        expect(over).toBeInstanceOf(NextResponse);
        expect((over as NextResponse).status).toBe(503);
        expect((over as NextResponse).headers.get('Retry-After')).toBe('5');

        g.open();
        expect(await Promise.all([a, b])).toEqual(['a', 'b']);
        expect(heavySlotsInUse()).toBe(0);
        expect(await withHeavySlot(async () => 'd')).toBe('d');
    });

    it('releases the slot when the job throws', async () => {
        await expect(
            withHeavySlot(async () => {
                throw new Error('x');
            })
        ).rejects.toThrow('x');
        expect(heavySlotsInUse()).toBe(0);
    });
});
