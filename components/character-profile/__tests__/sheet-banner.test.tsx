// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    type BannerHero,
    bannerPalette,
    SheetBanner,
} from '../sheet/SheetBanner';

const hero: BannerHero = {
    name: 'Ліра',
    avatar: null,
    raceColor: '#102030',
    raceIcon: null,
    race: 'Ельф',
    level: 3,
};

describe('bannerPalette', () => {
    it('falls back to crimson without a race colour', () => {
        expect(bannerPalette(null).base).toBe('var(--color-hud-crimson)');
        expect(bannerPalette('red').base).toBe('var(--color-hud-crimson)');
    });

    it('uses the race colour with a contrasting ink', () => {
        expect(bannerPalette('#fff')).toEqual({
            base: '#ffffff',
            ink: '#000000',
        });
        expect(bannerPalette('#102030').ink).toBe('#ffffff');
    });
});

describe('SheetBanner', () => {
    afterEach(cleanup);

    it('has no portrait button without onPortrait', () => {
        render(<SheetBanner hero={hero} />);

        expect(
            screen.queryByRole('button', {
                name: /characterProfile\.portrait\.(change|add)/,
            })
        ).toBeNull();
    });

    it('turns the portrait into a labelled button with onPortrait', () => {
        const onPortrait = vi.fn();

        render(<SheetBanner hero={hero} onPortrait={onPortrait} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: /characterProfile\.portrait\.add/,
            })
        );
        expect(onPortrait).toHaveBeenCalledOnce();
    });

    it('labels the button with change when a portrait exists', () => {
        render(
            <SheetBanner
                hero={{ ...hero, avatar: 'https://x.test/a.png' }}
                onPortrait={vi.fn()}
            />
        );

        expect(
            screen.getByRole('button', {
                name: /characterProfile\.portrait\.change/,
            })
        ).toBeTruthy();
    });

    it('shows a question mark and a neutral colour for an empty name', () => {
        render(
            <SheetBanner
                hero={{ ...hero, name: '', race: undefined }}
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

    it('hides the level plate without a level', () => {
        render(<SheetBanner hero={{ ...hero, level: undefined }} />);

        expect(
            screen.queryByText('characterProfile.hero.levelLabel')
        ).toBeNull();
    });
});
