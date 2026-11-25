// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { arcStyle } from '@/lib/utils/battle/view';

vi.unmock('next-intl');

describe('InitiativeTrack arc', () => {
    afterEach(cleanup);

    it('marks only the active participant with data-current', () => {
        const scene = fakeScene();

        const { container } = render(<InitiativeTrack />, {
            wrapper: scene.wrapper,
        });

        const current = container.querySelectorAll('[data-current]');

        expect(current.length).toBe(1);
        expect(current[0].querySelector('[data-fx-participant]')).not.toBeNull();
    });

    it('scales neighbours by distance from the active one', () => {
        const scene = fakeScene();

        const { container } = render(<InitiativeTrack />, {
            wrapper: scene.wrapper,
        });

        const first = container.querySelector(
            '[data-current] > span'
        ) as HTMLElement;

        expect(first.style.transform).toContain(`scale(${arcStyle(0).scale})`);

        const next = first.parentElement?.nextElementSibling
            ?.firstElementChild as HTMLElement;

        expect(next.style.transform).toContain(`scale(${arcStyle(1).scale})`);
    });

    it('centres the active participant instantly on first render', () => {
        const scroll = vi.fn();

        Element.prototype.scrollIntoView = scroll;

        const scene = fakeScene();

        render(<InitiativeTrack />, { wrapper: scene.wrapper });

        expect(scroll).toHaveBeenCalledWith(
            expect.objectContaining({ inline: 'center', behavior: 'auto' })
        );
    });

    it('click selects the participant', () => {
        const scene = fakeScene();

        const { container } = render(<InitiativeTrack />, {
            wrapper: scene.wrapper,
        });

        fireEvent.click(container.querySelector('[data-current]') as Element);

        expect(scene.value.select).toHaveBeenCalledWith('me');
    });

    it('shows names for the active slot and neighbours', () => {
        render(<InitiativeTrack />, { wrapper: fakeScene().wrapper });

        expect(screen.getByText('Фрейда')).toBeTruthy();
        expect(screen.getByText('Гоблін')).toBeTruthy();
    });
});
