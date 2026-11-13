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
vi.mock('@/components/systems/SystemDmPage', () => ({
    SystemDmPage: () => null,
}));

import DMSystemSectionPage from '../page';

import { DEFAULT_RULES } from '@/lib/utils/rules';

const rulesOf = (key: string) => ({ ...DEFAULT_RULES, system: { key } });

const call = (section: string) =>
    DMSystemSectionPage({ params: Promise.resolve({ id: 'c1', section }) });

beforeEach(() => vi.clearAllMocks());

describe('DM system section page (server)', () => {
    it('renders the section of a composition that owns it', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: { rules: rulesOf('wfrp') },
            isDemo: false,
        });

        const el = (await call('careers')) as ReactElement<
            Record<string, unknown>
        >;

        expect(el.props).toMatchObject({
            campaignId: 'c1',
            section: 'careers',
            canEdit: true,
        });
    });

    it('is not found when the composition lacks the section', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: { rules: rulesOf('dnd5e') },
            isDemo: false,
        });

        await expect(call('careers')).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('propagates a guard error', async () => {
        mocks.requireCampaignDMOrDemo.mockRejectedValue(
            new Error('NEXT_REDIRECT')
        );

        await expect(call('careers')).rejects.toThrow('NEXT_REDIRECT');
    });
});
