// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapCameraControls } from '../../map/camera/MapCameraControls';
import { ActionDock } from '../../turn/dock/ActionDock';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render as renderUk } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

const render = (ui: React.ReactElement) =>
    renderUk(ui, { wrapper: fakeScene().wrapper });

const props = {
    status: {
        actionUsed: false,
        bonusAvailable: true,
        reactionAvailable: true,
    },
    economy: { bonusAction: true, reaction: true },
    phase: 'acting' as const,
    on: { actions: vi.fn(), end: vi.fn() },
};

describe('dock click-through', () => {
    afterEach(cleanup);

    it('action button fires its handler', () => {
        render(<ActionDock {...props} />);

        fireEvent.click(screen.getByRole('button', { name: 'Дія' }));

        expect(props.on.actions).toHaveBeenCalled();
    });

    it('zoom buttons stay clickable and sit above the dock', () => {
        const onZoomIn = vi.fn();

        const { container } = render(
            <MapCameraControls
                onZoomIn={onZoomIn}
                onZoomOut={vi.fn()}
                onRecenter={vi.fn()}
                zoom={1}
                canRecenter={false}
                userMoved={false}
                phone={false}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: 'Збільшити мапу' }));

        expect(onZoomIn).toHaveBeenCalled();
        expect(
            (container.firstElementChild as HTMLElement).className
        ).toContain('--hud-dock-h');
    });
});
