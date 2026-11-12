import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCampaignDMOrDemo: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('@/lib/server/campaigns/access', () => ({
    requireCampaignDMOrDemo: mocks.requireCampaignDMOrDemo,
}));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));
vi.mock('../careers-client', () => ({ DMCareersPageClient: () => null }));

import DMCareersPage from '../page';

import { DEFAULT_RULES } from '@/lib/utils/rules';

const rulesOf = (key: string) => ({ ...DEFAULT_RULES, system: { key } });

beforeEach(() => vi.clearAllMocks());

describe('DM careers page (server)', () => {
    it('renders the client for a wfrp campaign', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: { rules: rulesOf('wfrp') },
            isDemo: false,
        });

        const el = (await DMCareersPage({
            params: Promise.resolve({ id: 'c1' }),
        })) as ReactElement<Record<string, unknown>>;

        expect(el.props).toMatchObject({ campaignId: 'c1', canEdit: true });
    });

    it('returns 404 outside wfrp', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: { rules: rulesOf('dnd5e') },
            isDemo: false,
        });

        await expect(
            DMCareersPage({ params: Promise.resolve({ id: 'c1' }) })
        ).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('a non-DM guard error is propagated', async () => {
        mocks.requireCampaignDMOrDemo.mockRejectedValue(
            new Error('NEXT_REDIRECT')
        );

        await expect(
            DMCareersPage({ params: Promise.resolve({ id: 'c1' }) })
        ).rejects.toThrow('NEXT_REDIRECT');
    });
});
