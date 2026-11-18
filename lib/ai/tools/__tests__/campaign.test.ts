import { beforeEach, describe, expect, it, vi } from 'vitest';

import { chatToolCtx } from './helpers/direct-dispatch';

import { prisma } from '@/lib/db';

vi.mock('@/lib/server/assistant/execute', async () =>
    (await import('./helpers/direct-dispatch')).directDispatchModule()
);
vi.mock('@/lib/db', () => ({ prisma: { campaign: { findUnique: vi.fn() } } }));

describe('get_campaign_brief', () => {
    beforeEach(() => vi.clearAllMocks());

    it('повертає назву, опис та інструкції кампанії з ctx', async () => {
        vi.mocked(prisma.campaign.findUnique).mockResolvedValue({
            name: 'Асхан',
            description: 'Темне фентезі',
            aiInstructions: 'Говори архаїчно',
        } as never);

        const { getCampaignBriefTool } = await import(
            '@/lib/ai/tools/campaign'
        );

        const { runTool } = await import('@/lib/ai/tools/define');

        const out = await runTool(getCampaignBriefTool, chatToolCtx(), {});

        expect(JSON.parse(out).data).toEqual({
            name: 'Асхан',
            description: 'Темне фентезі',
            instructions: 'Говори архаїчно',
        });
        expect(prisma.campaign.findUnique).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'camp1' } })
        );
    });
});
