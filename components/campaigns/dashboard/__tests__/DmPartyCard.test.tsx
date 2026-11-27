// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DmPartyCard } from '@/components/campaigns/dashboard/DmPartyCard';

afterEach(cleanup);

const hero = {
    id: 'h1',
    name: 'Mira',
    level: 3,
    race: 'Elf',
    class: 'Rogue',
    avatar: null,
    armorClass: 14,
    speed: 30,
};

describe('DmPartyCard', () => {
    it('shows the new-character tile when the party is empty', () => {
        render(<DmPartyCard campaignId="c1" party={[]} />);

        expect(screen.getByText('dashboard.party.empty')).toBeTruthy();
        expect(
            screen
                .getByRole('link', { name: 'dashboard.party.new' })
                .getAttribute('href')
        ).toBe('/campaigns/c1/dm/characters/new');
    });

    it('keeps the new-character tile last after the heroes', () => {
        render(<DmPartyCard campaignId="c1" party={[hero]} />);

        const links = screen.getAllByRole('link');

        expect(links.at(-1)?.getAttribute('href')).toBe(
            '/campaigns/c1/dm/characters/new'
        );
        expect(
            links.some(
                (link) =>
                    link.getAttribute('href') ===
                    '/campaigns/c1/dm/characters/h1'
            )
        ).toBe(true);
    });
});
