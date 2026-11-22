// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignSummaryPanel } from '../CampaignSummaryPanel';

import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.mock('@/components/campaigns/settings/InviteCodeDisplay', () => ({
    InviteCodeDisplay: ({ inviteCode }: { inviteCode: string }) => (
        <span>{inviteCode}</span>
    ),
}));

const campaign = {
    name: 'C',
    description: null,
    coverImage: null,
    maxLevel: 10,
    allowPlayerEdit: false,
    critChoiceByDm: false,
    acquaintancesEnabled: false,
    mapLibraryEnabled: false,
    status: 'active',
} as const;

const render = (isDM: boolean, inviteCode: string | null) =>
    renderWithIntl(
        <CampaignSummaryPanel
            campaign={{ ...campaign, inviteCode }}
            isDM={isDM}
        />,
        { locale: 'uk', namespaces: ['common', 'dashboard'] }
    );

afterEach(cleanup);

describe('CampaignSummaryPanel invite code', () => {
    it('shows the code to the DM', async () => {
        await render(true, 'ABC123');

        expect(screen.getByText('ABC123')).toBeTruthy();
    });

    it('hides it from visitors and players', async () => {
        await render(false, null);

        expect(screen.queryByText('ABC123')).toBeNull();
        expect(document.getElementById('invite')).toBeNull();
    });
});
