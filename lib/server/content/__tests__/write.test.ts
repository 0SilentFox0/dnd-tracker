import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const h = vi.hoisted(() => {
    const tx = { campaign: { update: vi.fn() }, $queryRaw: vi.fn() };

    return {
        tx,
        transaction: vi.fn(async (cb: (t: unknown) => unknown) => cb(tx)),
    };
});

vi.mock('@/lib/db', () => ({ prisma: { $transaction: h.transaction } }));

import { withBatchedContentBump, withCampaignContentWrite } from '../write';

describe('withCampaignContentWrite version bump', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.tx.$queryRaw.mockResolvedValue([{ id: 'c1' }]);
        h.tx.campaign.update.mockResolvedValue({ contentVersion: 1 });
    });

    it('bumps once after a successful callback', async () => {
        const order: string[] = [];

        h.tx.campaign.update.mockImplementation(async () => {
            order.push('bump');

            return { contentVersion: 1 };
        });

        await withCampaignContentWrite('c1', async () => {
            order.push('cb');

            return 'ok';
        });

        expect(order).toEqual(['cb', 'bump']);
        expect(h.tx.campaign.update).toHaveBeenCalledWith({
            where: { id: 'c1' },
            data: { contentVersion: { increment: 1 } },
            select: { contentVersion: true },
        });
    });

    it('bumps only in the outermost call when nested', async () => {
        await withCampaignContentWrite('c1', async () => {
            await withCampaignContentWrite('c1', async () => 'inner');

            expect(h.tx.campaign.update).not.toHaveBeenCalled();
        });

        expect(h.tx.campaign.update).toHaveBeenCalledOnce();
    });

    it('does not bump when the callback throws', async () => {
        await expect(
            withCampaignContentWrite('c1', async () => {
                throw new Error('boom');
            })
        ).rejects.toThrow('boom');

        expect(h.tx.campaign.update).not.toHaveBeenCalled();
    });

    it('does not bump with bump: false', async () => {
        await withCampaignContentWrite('c1', async () => 'ok', { bump: false });

        expect(h.tx.campaign.update).not.toHaveBeenCalled();
    });

    it('a content write nested in a non-bumping outer call still bumps once', async () => {
        await withCampaignContentWrite(
            'c1',
            async () => {
                await withCampaignContentWrite('c1', async () => 'inner');
            },
            { bump: false }
        );

        expect(h.tx.campaign.update).toHaveBeenCalledOnce();
    });
});

describe('withBatchedContentBump', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        h.tx.$queryRaw.mockResolvedValue([{ id: 'c1' }]);
        h.tx.campaign.update.mockResolvedValue({ contentVersion: 1 });
    });

    it('bumps once for several writes', async () => {
        await withBatchedContentBump('c1', async () => {
            for (let i = 0; i < 3; i++)
                await withCampaignContentWrite('c1', async () => i);

            expect(h.tx.campaign.update).not.toHaveBeenCalled();
        });

        expect(h.tx.campaign.update).toHaveBeenCalledOnce();
    });

    it('does not bump when nothing changed', async () => {
        await withBatchedContentBump('c1', async () => {
            await withCampaignContentWrite('c1', async () => 1, {
                bump: false,
            });
        });

        expect(h.tx.campaign.update).not.toHaveBeenCalled();
    });

    it('a failing final bump does not mask the primary error', async () => {
        await expect(
            withBatchedContentBump('c1', async () => {
                await withCampaignContentWrite('c1', async () => 1);
                h.tx.campaign.update.mockRejectedValueOnce(new Error('bump'));

                throw new Error('primary');
            })
        ).rejects.toThrow('primary');
    });

    it('bumps in finally when a later step throws', async () => {
        await expect(
            withBatchedContentBump('c1', async () => {
                await withCampaignContentWrite('c1', async () => 1);

                throw new Error('boom');
            })
        ).rejects.toThrow('boom');

        expect(h.tx.campaign.update).toHaveBeenCalledOnce();
    });

    it('joins a nested batch of the same campaign', async () => {
        await withBatchedContentBump('c1', async () => {
            await withBatchedContentBump('c1', async () => {
                await withCampaignContentWrite('c1', async () => 1);
            });
            await withCampaignContentWrite('c1', async () => 2);
        });

        expect(h.tx.campaign.update).toHaveBeenCalledOnce();
    });
});
