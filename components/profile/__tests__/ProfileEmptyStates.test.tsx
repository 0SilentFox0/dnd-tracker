// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ProfileCampaigns } from '@/components/profile/ProfileCampaigns';
import { ProfileHeroes } from '@/components/profile/ProfileHeroes';

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string) => key,
    useLocale: () => 'en',
}));

afterEach(cleanup);

describe('profile empty states', () => {
    it('shows a text and a CTA link when there are no campaigns', () => {
        render(<ProfileCampaigns campaigns={[]} now={0} />);

        expect(screen.getByText('campaignsEmpty')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'campaignsEmptyLink' }).getAttribute('href')
        ).toBe('/campaigns');
    });

    it('shows a text and a CTA link when there are no heroes', () => {
        render(<ProfileHeroes heroes={[]} />);

        expect(screen.getByText('heroesEmpty')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: 'campaignsEmptyLink' }).getAttribute('href')
        ).toBe('/campaigns');
    });
});
