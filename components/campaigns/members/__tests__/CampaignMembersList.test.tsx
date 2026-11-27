// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CampaignMembersList } from '@/components/campaigns/members/CampaignMembersList';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';

vi.mock('@/lib/hooks/campaigns', () => ({
    useRemoveCampaignMember: () => ({ isPending: false, mutateAsync: vi.fn() }),
    useSetCampaignMemberRole: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

const writeText = vi.fn(async () => undefined);

Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const members = [
    {
        id: 'm1',
        userId: 'dm',
        role: 'dm',
        user: { id: 'dm', displayName: 'Master', avatar: null },
    },
] as never;

const renderList = (props: { isDM: boolean; inviteCode?: string | null }) =>
    renderWithConfirm(
        <CampaignMembersList
            campaignId="c1"
            members={members}
            isOwner={false}
            ownerId="dm"
            {...props}
        />
    );

describe('CampaignMembersList invite link', () => {
    it('DM with a code copies the join link', async () => {
        renderList({ isDM: true, inviteCode: 'AB3K9Z' });

        fireEvent.click(screen.getByText('campaigns.settings.copyLink'));

        await waitFor(() =>
            expect(writeText).toHaveBeenCalledWith(
                `${window.location.origin}/join/AB3K9Z`
            )
        );
    });

    it('hides the button without a code or for players', () => {
        renderList({ isDM: true, inviteCode: null });
        expect(screen.queryByText('campaigns.settings.copyLink')).toBeNull();
        cleanup();

        renderList({ isDM: false, inviteCode: 'AB3K9Z' });
        expect(screen.queryByText('campaigns.settings.copyLink')).toBeNull();
    });
});
