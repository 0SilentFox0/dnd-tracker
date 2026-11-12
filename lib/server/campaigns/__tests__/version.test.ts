import { describe, expect, it, vi } from 'vitest';

import { bumpContentVersion } from '../version';

describe('bumpContentVersion', () => {
    it('increments the campaign counter and returns the new value', async () => {
        const update = vi.fn().mockResolvedValue({ contentVersion: 5 });

        await expect(
            bumpContentVersion({ campaign: { update } } as never, 'c1')
        ).resolves.toBe(5);

        expect(update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { contentVersion: { increment: 1 } },
            select: { contentVersion: true },
        });
    });
});
