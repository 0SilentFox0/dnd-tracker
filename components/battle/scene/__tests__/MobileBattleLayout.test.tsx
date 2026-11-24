// @vitest-environment happy-dom
import { useEffect } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));
vi.mock('@/lib/hooks/common/useMediaQuery', () => ({
    useMediaQuery: () => false,
}));

const mounts = vi.hoisted(() => ({ n: 0 }));

vi.mock('@/components/battle/turn/MyTurnControls', () => ({
    MyTurnControls: ({ dock }: { dock?: boolean }) => {
        useEffect(() => {
            mounts.n += 1;
        }, []);

        return <div data-testid="my-turn" data-dock={dock ? 'y' : 'n'} />;
    },
}));
vi.mock('@/components/audio/AudioDock', () => ({ AudioDock: () => null }));
vi.mock('@/components/battle/map/panels/BattleMapPanel', () => ({
    BattleMapPanel: () => <div data-testid="map" />,
}));
vi.mock('@/components/battle/map/bubble/TokenBubble', () => ({
    TokenBubble: () => null,
}));
vi.mock('@/components/battle/participants/hero/HeroCluster', () => ({
    HeroCluster: () => null,
}));
vi.mock('@/components/battle/participants/InitiativeTrack', () => ({
    InitiativeTrack: () => null,
}));
vi.mock('@/components/battle/participants/ParticipantList', () => ({
    ParticipantList: ({ side }: { side: string }) => (
        <div data-testid={`list-${side}`} />
    ),
}));
vi.mock('@/components/battle/dm/DmPanel', () => ({
    DmPanel: ({ panel }: { panel: { open: boolean } }) => (
        <div data-testid="dm-panel" data-open={panel.open ? 'y' : 'n'} />
    ),
}));

import '@/components/systems/registry';
import { MobileBattleLayout } from '@/components/battle/scene/layout/MobileBattleLayout';
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

const openMenu = () => fireEvent.click(screen.getByLabelText('Меню'));

const MAP = { cols: 8, rows: 4, background: null, opacity: 0.3 };

afterEach(() => {
    cleanup();
    mounts.n = 0;
});

describe('MobileBattleLayout', () => {
    it('hero turn: the dock is mounted in dock mode, the old strip is gone', () => {
        const { wrapper } = fakeScene({ isMyTurn: true, map: MAP });

        const { container } = render(<MobileBattleLayout />, { wrapper });

        expect(screen.getByTestId('my-turn').dataset.dock).toBe('y');
        expect(screen.getByTestId('map')).toBeTruthy();
        expect(container.querySelector('[data-map-strip-slot]')).toBeNull();
    });

    it('MyTurnControls is not remounted by drawers or a view change', () => {
        const { wrapper } = fakeScene({ isMyTurn: true, map: MAP });

        render(<MobileBattleLayout />, { wrapper });

        expect(mounts.n).toBe(1);

        openMenu();
        fireEvent.click(screen.getByLabelText('Інструменти'));
        fireEvent.click(screen.getByRole('button', { name: /Вороги/ }));
        expect(screen.getByTestId('list-enemy')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: /Карта/ }));
        expect(screen.getByTestId('map')).toBeTruthy();

        openMenu();
        fireEvent.click(screen.getByLabelText('Журнал'));
        openMenu();
        fireEvent.click(screen.getByLabelText('Інструменти'));

        expect(mounts.n).toBe(1);
    });

    it('the DM drawer button exists only for the DM', async () => {
        const dm = fakeScene({ isDM: true, map: MAP });

        render(<MobileBattleLayout />, { wrapper: dm.wrapper });

        openMenu();

        expect(
            screen.getByRole('button', { name: 'Дії ведучого' })
        ).toBeTruthy();
        expect((await screen.findByTestId('dm-panel')).dataset.open).toBe('n');

        cleanup();

        const player = fakeScene({ isDM: false, map: MAP });

        render(<MobileBattleLayout />, { wrapper: player.wrapper });

        openMenu();

        expect(
            screen.queryByRole('button', { name: 'Дії ведучого' })
        ).toBeNull();
        expect(screen.queryByTestId('dm-panel')).toBeNull();
    });

    it('a battle without a map shows participant lists, not an empty stage', () => {
        const { wrapper } = fakeScene({ isMyTurn: true });

        render(<MobileBattleLayout />, { wrapper });

        expect(screen.queryByTestId('map')).toBeNull();
        expect(screen.getByTestId('list-enemy')).toBeTruthy();

        openMenu();
        fireEvent.click(screen.getByLabelText('Інструменти'));
        fireEvent.click(screen.getByRole('button', { name: /Союзники/ }));

        expect(screen.getByTestId('list-ally')).toBeTruthy();
    });

    it('tools, log and DM live behind one menu button, not a permanent rail', () => {
        const { wrapper } = fakeScene({ isDM: true, map: MAP });

        render(<MobileBattleLayout />, { wrapper });

        expect(screen.queryByLabelText('Інструменти')).toBeNull();
        expect(screen.queryByLabelText('Журнал')).toBeNull();

        openMenu();

        expect(screen.getByLabelText('Інструменти')).toBeTruthy();
        expect(screen.getByLabelText('Журнал')).toBeTruthy();
    });

    it('readOnly shows no HUD dock and no DM items', () => {
        const { wrapper } = fakeScene({
            playerView: true,
            isMyTurn: true,
            map: MAP,
        });

        const { container } = render(<MobileBattleLayout />, { wrapper });

        openMenu();

        expect(
            screen.queryByRole('button', { name: 'Дії ведучого' })
        ).toBeNull();
        expect(screen.queryByTestId('dm-panel')).toBeNull();
        expect(container.querySelector('[data-slot="action-dock"]')).toBeNull();
    });
});
