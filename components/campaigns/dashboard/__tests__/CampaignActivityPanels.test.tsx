// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CampaignRecentSession } from '@/components/campaigns/dashboard/CampaignRecentSession';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

afterEach(cleanup);

describe('campaign activity panels', () => {
    it('shows the last played scene with its played date and a scene link', async () => {
        await renderWithIntl(
            <CampaignRecentSession
                campaignId="c1"
                session={{
                    id: 's1',
                    title: 'The old bridge',
                    subtitle: 'The party crossed at dusk.',
                    playedAt: '2026-11-21T18:00:00.000Z',
                    lastChapter: { id: 'a', title: 'Arrival' },
                    nextChapter: { id: 'b', title: 'Toll' },
                }}
            />,
            { locale: 'uk', namespaces: ['common', 'dashboard'] }
        );

        expect(screen.getByText('The old bridge')).toBeTruthy();
        expect(screen.getByText('The party crossed at dusk.')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'The old bridge' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/scenario/s1');
        expect(screen.getByText('Arrival')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: /Toll/ }).getAttribute('href')
        ).toBe('/campaigns/c1/dm/scenario/s1#sec-b');
    });

    it('offers the scenario when nothing has been played', async () => {
        await renderWithIntl(
            <CampaignRecentSession campaignId="c1" session={null} />,
            { locale: 'uk', namespaces: ['common', 'dashboard'] }
        );

        expect(screen.getByText('dashboard.recentSession.empty')).toBeTruthy();
        expect(
            screen
                .getByRole('link', {
                    name: 'dashboard.recentSession.openScenario',
                })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/scenario');
    });
});
