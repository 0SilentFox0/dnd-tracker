// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapCameraControls } from '../../map/camera/MapCameraControls';
import { ActionDock } from '../../turn/dock/ActionDock';

import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const props = {
    status: { actionUsed: false, bonusAvailable: true, reactionAvailable: true },
    economy: { bonusAction: true, reaction: true },
    phase: 'acting' as const,
    on: { actions: vi.fn(), end: vi.fn() },
};

describe('dock click-through', () => {
    afterEach(cleanup);

    it('dock slot wrapper is pointer-events-none, only the dock is interactive', () => {
        const { container } = render(
            <div className="pointer-events-none absolute right-3 bottom-3 w-[min(370px,calc(100%-24px))]">
                <ActionDock {...props} />
            </div>
        );

        const wrapper = container.firstElementChild as HTMLElement;

        expect(wrapper.className).toContain('pointer-events-none');
        expect(wrapper.className).not.toContain('inset-x-0');
        expect(
            container
                .querySelector('[data-slot="action-dock"]')
                ?.className.includes('pointer-events-auto')
        ).toBe(true);
    });

    it('action button fires its handler', () => {
        render(<ActionDock {...props} />);

        fireEvent.click(screen.getByText('Дія'));

        expect(props.on.actions).toHaveBeenCalled();
    });

    it('zoom buttons stay clickable and sit above the dock', () => {
        const onZoomIn = vi.fn();

        const { container } = render(
            <MapCameraControls
                onZoomIn={onZoomIn}
                onZoomOut={vi.fn()}
                onRecenter={vi.fn()}
                canRecenter={false}
                userMoved={false}
                phone={false}
            />
        );

        fireEvent.click(container.querySelectorAll('button')[0]);

        expect(onZoomIn).toHaveBeenCalled();
        expect(
            (container.firstElementChild as HTMLElement).className
        ).toContain('--hud-dock-h');
    });
});
