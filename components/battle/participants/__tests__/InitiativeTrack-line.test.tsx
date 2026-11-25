// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { InitiativeTrack } from '@/components/battle/participants/InitiativeTrack';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

describe('InitiativeTrack line', () => {
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

    it('shows the name of the active participant only', () => {
        render(<InitiativeTrack />, { wrapper: fakeScene().wrapper });

        expect(screen.getByText('Фрейда')).toBeTruthy();
        expect(screen.queryByText('Гоблін')).toBeNull();
    });

    it('lays portraits in one flat row without transforms', () => {
        const { container } = render(<InitiativeTrack />, {
            wrapper: fakeScene().wrapper,
        });

        expect(container.querySelector('[style*="transform"]')).toBeNull();
    });

    it('shows only the current round without onReorder', () => {
        const { container } = render(<InitiativeTrack />, {
            wrapper: fakeScene({ isMyTurn: false }).wrapper,
        });

        expect(container.querySelectorAll('button').length).toBe(2);
        expect(container.querySelector('[data-round-divider]')).toBeNull();
    });

    it('shows the full queue with a round divider when onReorder is given', () => {
        const { container } = render(
            <InitiativeTrack onReorder={vi.fn()} />,
            { wrapper: fakeScene({ isMyTurn: false }).wrapper }
        );

        expect(container.querySelectorAll('button').length).toBe(5);
        expect(container.querySelector('[data-round-divider]')).not.toBeNull();
    });
});
