// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type BannerHero, SheetBanner } from '../SheetBanner';

const hero: BannerHero = {
    name: 'Арвен',
    avatar: null,
    raceColor: '#102030',
    raceIcon: null,
    level: 3,
};

describe('SheetBanner', () => {
    afterEach(cleanup);

    it('without onPortrait the portrait is not an edit button', () => {
        render(<SheetBanner hero={hero} />);
        expect(
            screen.queryByRole('button', {
                name: 'characterProfile.portrait.change',
            })
        ).toBeNull();
    });

    it('with onPortrait the portrait opens the editor', () => {
        const onPortrait = vi.fn();

        render(<SheetBanner hero={hero} onPortrait={onPortrait} />);
        fireEvent.click(
            screen.getByRole('button', {
                name: 'characterProfile.portrait.change',
            })
        );
        expect(onPortrait).toHaveBeenCalledTimes(1);
    });

    it('empty hero shows the question-mark placeholder on a neutral banner', () => {
        render(
            <SheetBanner
                hero={{ ...hero, name: '', raceColor: null }}
                onPortrait={vi.fn()}
            />
        );
        expect(screen.getByText('?')).toBeTruthy();
        expect(
            screen
                .getByTestId('sheet-banner')
                .style.getPropertyValue('--banner')
        ).toBe('var(--color-hud-raised)');
    });

    it('uses the race colour when present', () => {
        render(<SheetBanner hero={hero} />);
        expect(
            screen
                .getByTestId('sheet-banner')
                .style.getPropertyValue('--banner')
        ).toBe('#102030');
    });
});
