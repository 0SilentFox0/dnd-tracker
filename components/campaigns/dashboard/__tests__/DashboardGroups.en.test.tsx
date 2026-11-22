// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DashboardGroups } from '@/components/campaigns/dashboard/DashboardGroups';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.unmock('next-intl');
vi.mock('@/lib/hooks/notifications', () => ({
    useNotifications: vi.fn(() => ({ data: undefined })),
}));

afterEach(cleanup);

describe('DashboardGroups en', () => {
    it('renders English groups and tiles without raw keys', async () => {
        await renderWithIntl(
            <DashboardGroups campaignId="c1" isDM pendingDrafts={2} />,
            { locale: 'en', namespaces: ['common', 'validation', 'dashboard'] }
        );

        expect(
            screen.getByRole('heading', { name: 'Libraries' })
        ).toBeInTheDocument();
        expect(screen.getByText(/2 awaiting approval/)).toBeInTheDocument();

        expect(screen.getByText('Units')).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/dashboard\./);
    });
});
