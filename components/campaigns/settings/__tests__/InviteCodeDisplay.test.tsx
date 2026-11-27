// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteCodeDisplay } from '@/components/campaigns/settings/InviteCodeDisplay';

const writeText = vi.fn(async () => undefined);

Object.assign(navigator, { clipboard: { writeText } });

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('InviteCodeDisplay', () => {
    it('copies the code', async () => {
        render(<InviteCodeDisplay inviteCode="AB3K9Z" />);

        fireEvent.click(screen.getByLabelText('campaigns.settings.copyCode'));

        await waitFor(() => expect(writeText).toHaveBeenCalledWith('AB3K9Z'));
    });

    it('copies the join link', async () => {
        render(<InviteCodeDisplay inviteCode="AB3K9Z" />);

        fireEvent.click(screen.getByLabelText('campaigns.settings.copyLink'));

        await waitFor(() =>
            expect(writeText).toHaveBeenCalledWith(
                `${window.location.origin}/join/AB3K9Z`
            )
        );
    });
});
