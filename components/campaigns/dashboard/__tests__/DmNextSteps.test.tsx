// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DmNextSteps } from '@/components/campaigns/dashboard/DmNextSteps';

afterEach(cleanup);

describe('DmNextSteps', () => {
    it('links show, world, music and compendium', () => {
        render(<DmNextSteps campaignId="c1" sectionKeys={['show', 'music']} />);

        expect(
            screen
                .getByRole('link', { name: 'dashboard.sections.show.title' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/show');
        expect(
            screen
                .getByRole('link', { name: 'dashboard.sections.music.title' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/music');
        expect(
            screen
                .getByRole('link', {
                    name: 'dashboard.page.compendium.link',
                })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/compendium');
    });
});
