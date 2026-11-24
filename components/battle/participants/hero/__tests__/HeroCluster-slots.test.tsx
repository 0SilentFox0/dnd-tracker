// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import '@/components/systems/registry';
import { HeroCluster } from '@/components/battle/participants/hero/HeroCluster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

afterEach(cleanup);

const setup = (opts: Parameters<typeof fakeScene>[0] = {}) => {
    const scene = fakeScene({ knownSpells: ['shield'], ...opts });

    render(
        <TooltipProvider>
            <HeroCluster hero={scene.me} />
        </TooltipProvider>,
        { wrapper: scene.wrapper }
    );

    return scene;
};

const slotButtons = () =>
    screen.queryAllByRole('button', { name: /^Рівень \d, \d з \d$/ });

describe('HeroCluster spell slots', () => {
    it('renders round slot buttons with aria-pressed and toggles selection', () => {
        setup({ slots: { '1': { current: 2, max: 4 } } });

        const first = slotButtons()[0];

        expect(first.getAttribute('aria-label')).toBe('Рівень 1, 2 з 4');
        expect(first.getAttribute('aria-pressed')).toBe('false');

        fireEvent.click(first);

        expect(first.getAttribute('aria-pressed')).toBe('true');
    });

    it('renders no slot row for a hero without slots, avatar and hp stay', () => {
        setup({ slots: {} });

        expect(slotButtons()).toHaveLength(0);
        expect(
            screen.queryByRole('button', { name: /Показати стани/ })
        ).not.toBeNull();
    });

    it('shows only the avatar block for a read-only viewer', () => {
        setup({ slots: { '1': { current: 2, max: 4 } }, playerView: true });

        expect(slotButtons()).toHaveLength(0);
    });

    it('state toggle still fires with the new layout', () => {
        setup({ slots: {} });

        const toggle = screen.getByRole('button', { name: /Показати стани/ });

        fireEvent.click(toggle);

        expect(
            screen.getByRole('button', { name: /Сховати стани/ })
        ).not.toBeNull();
    });
});

describe('HeroCluster phone', () => {
    const setupPhone = () => {
        const scene = fakeScene({
            slots: { '1': { current: 2, max: 4 } },
            knownSpells: ['shield'],
        });

        const { container } = render(
            <TooltipProvider>
                <HeroCluster hero={scene.me} phone />
            </TooltipProvider>,
            { wrapper: scene.wrapper }
        );

        return container;
    };

    it('portrait is 52px and slots open from the avatar toggle', () => {
        const container = setupPhone();

        const portrait = container.querySelector<HTMLElement>('[style*="width"]');

        expect(portrait?.style.width).toBe('52px');
        expect(slotButtons()).toHaveLength(0);

        fireEvent.click(screen.getByRole('button', { name: /Показати стани/ }));

        expect(slotButtons().length).toBeGreaterThan(0);
    });
});
