// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignRecentSession } from '@/components/campaigns/dashboard/CampaignRecentSession';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

afterEach(cleanup);

describe('campaign activity panels', () => {
    it('renders only stored session details and links to the world log', async () => {
        await renderWithIntl(
            <CampaignRecentSession
                campaignId="c1"
                session={{
                    id: 's1',
                    name: 'Session 4',
                    description: 'The party reached the old bridge.',
                    startedAt: '2026-11-21T18:00:00.000Z',
                    endedAt: null,
                    locations: ['Old bridge'],
                }}
            />,
            { locale: 'uk', namespaces: ['common', 'dashboard'] }
        );

        expect(screen.getByText('Session 4')).toBeTruthy();
        expect(screen.getByText('The party reached the old bridge.')).toBeTruthy();
        expect(screen.getByText('Old bridge')).toBeTruthy();
        expect(screen.getByText('dashboard.recentSession.active')).toBeTruthy();
        expect(
            screen
                .getByRole('link', {
                    name: 'dashboard.recentSession.openWorld',
                })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/world');
    });
});
