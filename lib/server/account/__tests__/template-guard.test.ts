import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMany = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({ prisma: { campaign: { findMany } } }));

import {
    AccountDeleteBlockedError,
    findBlockingTemplates,
} from '@/lib/server/account/template-guard';

describe('findBlockingTemplates', () => {
    beforeEach(() => findMany.mockReset());

    it('skips the dependants query when the user owns no template', async () => {
        findMany.mockResolvedValueOnce([]);

        expect(await findBlockingTemplates('u1')).toEqual([]);
        expect(findMany).toHaveBeenCalledTimes(1);
    });

    it('collects templates referenced by foreign campaigns through any link', async () => {
        findMany
            .mockResolvedValueOnce([{ id: 'tB' }, { id: 'tA' }, { id: 'tC' }])
            .mockResolvedValueOnce([
                { createdFromId: 'tA', baseSourceId: null, sourceSync: null },
                {
                    createdFromId: null,
                    baseSourceId: 'tB',
                    sourceSync: { sourceCampaignId: 'tB' },
                },
                {
                    createdFromId: 'other',
                    baseSourceId: null,
                    sourceSync: null,
                },
            ]);

        expect(await findBlockingTemplates('u1')).toEqual(['tA', 'tB']);

        expect(findMany.mock.calls[1][0].where.dmUserId).toEqual({
            not: 'u1',
        });
    });

    it('error carries the template ids', () => {
        const e = new AccountDeleteBlockedError(['t1']);

        expect(e.templateIds).toEqual(['t1']);
        expect(e).toBeInstanceOf(Error);
    });
});
