import { beforeEach, describe, expect, it, vi } from 'vitest';

const getClaims = vi.hoisted(() => vi.fn());

const findCampaign = vi.hoisted(() => vi.fn());

const touchedModels = vi.hoisted(() => [] as string[]);

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: (fn: () => unknown) => fn,
}));
vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getClaims } }),
}));
vi.mock('@/lib/db', () => ({
    prisma: new Proxy(
        {},
        {
            get: (_target, model: string) =>
                model === 'campaign'
                    ? { findUnique: findCampaign }
                    : new Proxy(
                          {},
                          {
                              get: () => () => {
                                  touchedModels.push(model);

                                  throw new Error(`DB touched: ${model}`);
                              },
                          }
                      ),
        }
    ),
}));

import * as proposalReject from '@/app/api/campaigns/[id]/ai/proposals/[proposalId]/reject/route';
import * as apiTokenRotate from '@/app/api/campaigns/[id]/api-tokens/[tokenId]/rotate/route';
import * as apiTokenOne from '@/app/api/campaigns/[id]/api-tokens/[tokenId]/route';
import * as apiTokens from '@/app/api/campaigns/[id]/api-tokens/route';
import * as balance from '@/app/api/campaigns/[id]/battles/balance/route';
import * as compendiumConfirm from '@/app/api/campaigns/[id]/compendium/confirm/route';
import * as compendiumEntries from '@/app/api/campaigns/[id]/compendium/entries/route';
import * as compendiumMedia from '@/app/api/campaigns/[id]/compendium/media/route';
import * as compendiumOptions from '@/app/api/campaigns/[id]/compendium/options/route';
import * as compendiumPreview from '@/app/api/campaigns/[id]/compendium/preview/route';
import * as compendiumReports from '@/app/api/campaigns/[id]/compendium/reports/route';
import * as mapClone from '@/app/api/campaigns/[id]/maps/[mapId]/clone/route';
import * as conditionUsage from '@/app/api/campaigns/[id]/rules/custom-conditions/[slug]/usage/route';
import * as templatePublish from '@/app/api/campaigns/[id]/template/publish/route';
import * as worldRest from '@/app/api/campaigns/[id]/world/rest/route';
import * as worldUpload from '@/app/api/campaigns/[id]/world/upload-url/route';
import { API_ERRORS } from '@/lib/constants/api-errors';
import { CampaignRole } from '@/lib/constants/campaigns';

type Handler = (req: Request, ctx: never) => Promise<Response>;

const ids = {
    id: 'c1',
    tokenId: 't1',
    proposalId: 'p1',
    mapId: 'm1',
    slug: 'burning',
    action: 'level-up',
};

const cases: Array<[string, Handler]> = [
    ['GET api-tokens', apiTokens.GET],
    ['POST api-tokens', apiTokens.POST],
    ['DELETE api-tokens/:tokenId', apiTokenOne.DELETE],
    ['POST api-tokens/:tokenId/rotate', apiTokenRotate.POST],
    ['POST ai/proposals/:proposalId/reject', proposalReject.POST],
    ['GET battles/balance', balance.GET],
    ['POST battles/balance', balance.POST],
    ['POST maps/:mapId/clone', mapClone.POST],
    ['GET rules/custom-conditions/:slug/usage', conditionUsage.GET],
    ['POST template/publish', templatePublish.POST],
    ['POST world/rest', worldRest.POST],
    ['POST world/upload-url', worldUpload.POST],
    ['POST compendium/preview', compendiumPreview.POST],
    ['POST compendium/confirm', compendiumConfirm.POST],
    ['POST compendium/media', compendiumMedia.POST],
    ['GET compendium/entries', compendiumEntries.GET],
    ['GET compendium/options', compendiumOptions.GET],
    ['GET compendium/reports', compendiumReports.GET],
];

const call = (handler: Handler) =>
    handler(
        new Request('http://x/api', {
            method: 'POST',
            body: '{}',
            headers: { origin: 'http://x' },
        }),
        { params: Promise.resolve(ids) } as never
    );

const asRole = (role: string | null) => {
    findCampaign.mockResolvedValue({
        id: 'c1',
        maxLevel: 20,
        rules: { system: { key: 'homm' } },
        members: role ? [{ userId: 'u1', role }] : [],
    });
};

describe('DM-only routes without a direct test: 401 / 403 before any DB access', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        touchedModels.length = 0;
        getClaims.mockResolvedValue({ data: { claims: { sub: 'u1' } } });
    });

    it.each(cases)('%s: a player gets 403', async (_name, handler) => {
        asRole(CampaignRole.PLAYER);

        const res = await call(handler);

        expect(res.status).toBe(403);
        expect(touchedModels).toEqual([]);
    });

    it.each(cases)('%s: a non-member gets 403', async (_name, handler) => {
        asRole(null);

        expect((await call(handler)).status).toBe(403);
        expect(touchedModels).toEqual([]);
    });

    it.each(cases)('%s: no session gets 401', async (_name, handler) => {
        getClaims.mockResolvedValue({ data: null, error: null });

        const res = await call(handler);

        expect(res.status).toBe(401);
        expect(touchedModels).toEqual([]);
    });

    it('non-compendium routes answer 403 with the FORBIDDEN error body', async () => {
        asRole(CampaignRole.PLAYER);

        const res = await call(apiTokenOne.DELETE);

        expect(await res.json()).toMatchObject({ error: API_ERRORS.FORBIDDEN });
    });

    it('compendium mutations reject a cross-origin request with a code body', async () => {
        asRole(CampaignRole.DM);

        const res = await compendiumPreview.POST(
            new Request('http://x/api', {
                method: 'POST',
                body: '{}',
                headers: { origin: 'http://evil.example' },
            }),
            { params: Promise.resolve(ids) }
        );

        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ code: 'FORBIDDEN' });
    });
});
