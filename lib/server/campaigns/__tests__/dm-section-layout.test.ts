import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCampaignDMOrDemo: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/server/campaigns/access', () => ({
    requireCampaignDMOrDemo: mocks.requireCampaignDMOrDemo,
}));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }));

import { dmSectionLayout } from '@/lib/server/campaigns/dm-section-layout';
import { parseRules } from '@/lib/utils/rules/schema';

const rulesOf = (system: object) => parseRules({ system });

const call = (section: string) =>
    dmSectionLayout(section)({
        children: 'page',
        params: Promise.resolve({ id: 'c1' }),
    });

const campaignWith = (system: object) =>
    mocks.requireCampaignDMOrDemo.mockResolvedValue({
        campaign: { rules: rulesOf(system) },
    });

beforeEach(() => vi.clearAllMocks());

describe('dmSectionLayout', () => {
    it('lets a composition that owns the section through', async () => {
        campaignWith({ key: 'homm' });

        expect(await call('skills')).toBe('page');
        expect(await call('artifact-sets')).toBe('page');
    });

    it('404 when the composition lacks the owner module', async () => {
        campaignWith({ key: 'wfrp' });

        await expect(call('skills')).rejects.toThrow('NEXT_NOT_FOUND');
        await expect(call('classes')).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('a bare dnd5e has classes but no skill libraries', async () => {
        campaignWith({ key: 'dnd5e' });

        expect(await call('classes')).toBe('page');
        await expect(call('skill-trees')).rejects.toThrow('NEXT_NOT_FOUND');
    });
});
