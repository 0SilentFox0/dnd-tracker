import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    requireCampaignDMOrDemo: vi.fn(),
    notFound: vi.fn(() => {
        throw new Error('NEXT_NOT_FOUND');
    }),
    redirect: vi.fn(() => {
        throw new Error('NEXT_REDIRECT');
    }),
    findEdit: vi.fn(),
}));

vi.mock('@/lib/server/campaigns/access', () => ({
    requireCampaignDMOrDemo: mocks.requireCampaignDMOrDemo,
}));
vi.mock('next/navigation', () => ({
    notFound: mocks.notFound,
    redirect: mocks.redirect,
}));
vi.mock('@/systems/artifactsets/server/content/queries', async (orig) => ({
    ...(await orig<object>()),
    findArtifactSetForEdit: mocks.findEdit,
}));
vi.mock('@/components/systems/SystemDmPage', () => ({
    SystemDmPage: () => null,
}));

import DMSystemSectionPage from '../page';

import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';

const rulesOf = (key: string) => ({ ...DEFAULT_RULES, system: { key } });

const call = (section: string, rest?: string[]) =>
    DMSystemSectionPage({
        params: Promise.resolve({ id: 'c1', section, rest }),
    });

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

    it('is not found for a sub-path of a section without sub-pages', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: { rules: rulesOf('wfrp') },
            isDemo: false,
        });

        await expect(call('careers', ['new'])).rejects.toThrow(
            'NEXT_NOT_FOUND'
        );
    });

    it('resolves the new and edit views of a module with sub-pages', async () => {
        mocks.requireCampaignDMOrDemo.mockResolvedValue({
            campaign: {
                rules: {
                    ...DEFAULT_RULES,
                    system: { key: 'dnd5e', modules: ['artifactsets'] },
                },
            },
            isDemo: false,
        });

        const el = (await call('artifact-sets', ['new'])) as ReactElement<
            Record<string, unknown>
        >;

        expect(el.props.view).toEqual({ type: 'new' });

        mocks.findEdit.mockResolvedValue(null);

        await expect(call('artifact-sets', ['x'])).rejects.toThrow(
            'NEXT_NOT_FOUND'
        );
    });

    it('propagates a guard error', async () => {
        mocks.requireCampaignDMOrDemo.mockRejectedValue(
            new Error('NEXT_REDIRECT')
        );

        await expect(call('careers')).rejects.toThrow('NEXT_REDIRECT');
    });
});
