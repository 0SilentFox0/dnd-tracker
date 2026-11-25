// @vitest-environment happy-dom
import { useContext } from 'react';
import { createPortal } from 'react-dom';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const onClose = vi.hoisted(() => vi.fn());

vi.mock('@/components/battle/map/bubble/TokenBubble', async () => {
    const { MapStripSlotContext } = await import('../layout/MapStrip');

    return {
        TokenBubble: () => {
            const slot = useContext(MapStripSlotContext);

            return slot
                ? createPortal(
                      <button type="button" onClick={onClose}>
                          result-close
                      </button>,
                      slot
                  )
                : null;
        },
    };
});
vi.mock('@/components/battle/map/panels/BattleMapPanel', () => ({
    BattleMapPanel: () => null,
}));
vi.mock('@/components/battle/participants/hero/HeroCluster', () => ({
    HeroCluster: () => null,
}));
vi.mock('@/components/battle/participants/InitiativeTrack', () => ({
    InitiativeTrack: () => null,
}));
vi.mock('@/components/battle/participants/ParticipantList', () => ({
    ParticipantList: () => null,
}));
vi.mock('@/components/battle/turn/dock/TurnDock', () => ({
    TurnDock: () => null,
}));
vi.mock('../drawers/ToolsDrawer', () => ({ ToolsDrawer: () => null }));

import { DesktopBattleLayout } from '../layout/DesktopBattleLayout';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
);

describe('DesktopBattleLayout click-through', () => {
    afterEach(cleanup);

    it('the action result slot is interactive inside a pointer-events-none column', () => {
        const { wrapper } = fakeScene({ isMyTurn: true });

        render(<DesktopBattleLayout onComplete={vi.fn()} />, { wrapper });

        const button = screen.getByText('result-close');

        fireEvent.click(button);

        expect(onClose).toHaveBeenCalled();
        expect(button.parentElement?.className).toContain(
            'pointer-events-auto'
        );
        expect(button.parentElement?.parentElement?.className).toContain(
            'pointer-events-none'
        );
    });
});
