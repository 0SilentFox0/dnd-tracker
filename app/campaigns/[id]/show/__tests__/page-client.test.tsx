// @vitest-environment happy-dom
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowPageClient } from '../page-client';

const send = vi.fn();

const keys = vi.fn();

const host = vi.fn();

const stage = vi.fn();

vi.mock('@/lib/hooks/show', () => ({
    usePusherShowSync: () => undefined,
    useShowState: () => ({
        show: { slide: null, battle: { id: 'b1', name: 'Бій' } },
    }),
    useShowControl: () => ({ send, pending: false }),
    useShowKeys: (c: unknown) => keys(c),
    useShowAudioHost: (a: unknown) => {
        host(a);

        return {};
    },
}));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useNotify: () => vi.fn(),
}));

vi.mock('@/components/audio/AudioPlayerProvider', () => ({
    AudioPlayerProvider: ({ children }: { children: React.ReactNode }) => (
        <>{children}</>
    ),
}));

vi.mock('@/components/audio/AudioDock', () => ({
    AudioDock: () => <div data-testid="audio-dock" />,
}));

vi.mock('@/components/common/DiceRoller', () => ({
    DiceRoller: () => <div data-testid="dice-roller" />,
}));

vi.mock('@/components/show/stage/FullscreenButton', () => ({
    FullscreenButton: () => <button type="button">fullscreen</button>,
}));

vi.mock('@/components/show/stage/ShowControlPanel', () => ({
    ShowControlPanel: () => <div data-testid="control-panel" />,
}));

vi.mock('@/components/show/stage/ShowBattleCall', () => ({
    ShowBattleCall: () => <a href="/b">battle</a>,
}));

vi.mock('@/components/show/stage/ShowStage', () => ({
    ShowStage: (p: object) => {
        stage(p);

        return <div data-testid="stage" />;
    },
}));

const mount = (isDM = true) =>
    render(<ShowPageClient campaignId="c1" isDM={isDM} userId="u1" />);

const press = (code: string, key = code) =>
    act(() => void fireEvent.keyDown(window, { code, key }));

beforeEach(() => {
    window.sessionStorage.clear();
    [send, keys, host, stage].forEach((m) => m.mockClear());
});

afterEach(cleanup);

describe('ShowPageClient player view', () => {
    it('режим вимкнено: панель керування є, кубиків немає, ключі й аудіо як у DM', () => {
        mount();

        expect(screen.getByTestId('control-panel')).toBeTruthy();
        expect(screen.queryByTestId('dice-roller')).toBeNull();
        expect(keys).toHaveBeenLastCalledWith(
            expect.objectContaining({ send })
        );
        expect(host).toHaveBeenLastCalledWith(
            expect.objectContaining({ isDM: true })
        );
        expect(stage).toHaveBeenLastCalledWith(
            expect.objectContaining({ isDM: true, readOnly: false })
        );
    });

    it('перемикач є в обох станах і вмикає режим', () => {
        mount();

        fireEvent.click(
            screen.getByRole('button', { name: 'show.playerView.off' })
        );

        expect(
            screen
                .getByRole('button', { name: 'show.playerView.on' })
                .getAttribute('aria-pressed')
        ).toBe('true');
    });

    it('режим увімкнено: без панелі, DM-аудіо, ключів, кубиків; сцена readOnly', () => {
        mount();
        fireEvent.click(
            screen.getByRole('button', { name: 'show.playerView.off' })
        );

        expect(screen.queryByTestId('control-panel')).toBeNull();
        expect(screen.queryByTestId('dice-roller')).toBeNull();
        expect(keys).toHaveBeenLastCalledWith(null);
        expect(host).toHaveBeenLastCalledWith(
            expect.objectContaining({ isDM: false })
        );
        expect(stage).toHaveBeenLastCalledWith(
            expect.objectContaining({ isDM: false, readOnly: true })
        );
        expect(screen.getByTestId('audio-dock')).toBeTruthy();
    });

    it('режим увімкнено: кнопки лише з allow-list', () => {
        mount();
        fireEvent.click(
            screen.getByRole('button', { name: 'show.playerView.off' })
        );

        const names = screen
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label') ?? b.textContent);

        expect(names.sort()).toEqual(['fullscreen', 'show.playerView.on']);
        expect(send).not.toHaveBeenCalled();
    });

    it('P перемикає режим', () => {
        mount();

        press('KeyP', 'p');

        expect(screen.queryByTestId('control-panel')).toBeNull();

        press('KeyP', 'p');

        expect(screen.getByTestId('control-panel')).toBeTruthy();
    });

    it('не DM: перемикача немає, P нічого не робить, кубики є', () => {
        mount(false);

        expect(
            screen.queryByRole('button', { name: /show\.playerView/ })
        ).toBeNull();
        expect(screen.getByTestId('dice-roller')).toBeTruthy();

        press('KeyP', 'p');

        expect(screen.queryByTestId('control-panel')).toBeNull();
        expect(stage).toHaveBeenLastCalledWith(
            expect.objectContaining({ isDM: false, readOnly: false })
        );
        expect(keys).toHaveBeenLastCalledWith(null);
    });
});
