// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const media = vi.hoisted(() => ({ wide: false }));

vi.mock('@/lib/hooks/common/useMediaQuery', () => ({
    useMediaQuery: () => media.wide,
}));
vi.mock('@/lib/hooks/battle/useFxEnabled', () => ({
    useFxEnabled: () => ({
        enabled: true,
        userEnabled: true,
        motionAllowed: true,
        setEnabled: vi.fn(),
    }),
}));
vi.mock('@/lib/hooks/battles', async (orig) => ({
    ...(await orig<object>()),
    useBattleSummary: () => ({
        data: undefined,
        isPending: true,
        isLoading: true,
        isError: false,
    }),
}));
vi.mock('@/components/battle/fx/preload', () => ({
    preloadFx: () => Promise.resolve(),
}));

import { MazeViewProvider } from '@/components/battle/modes/maze/MazeViewProvider';
import { BattleScreen } from '@/components/battle/scene/BattleScreen';
import {
    fakeScene,
    type FakeSceneOptions,
} from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import { mazeMap } from '@/lib/utils/battle/modes/maze/__tests__/fixtures';

vi.unmock('next-intl');

vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
);

const MAP = { cols: 4, rows: 3, background: null, opacity: 0.3 };

const ALLOWED = [
    /^Анімації дій/,
    /^Вигляд гравця/,
    /^Карта$/,
    /^Колонки$/,
    /^(Фрейда|Гоблін|Годрік)$/,
    /^(Фр|Го)/,
    /^ходить /,
    /^Огляд/,
];

const buttonNames = () =>
    screen
        .queryAllByRole('button')
        .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '');

function mount(
    opts: FakeSceneOptions,
    wrap?: (children: ReactNode) => ReactNode
) {
    const s = fakeScene({ playerView: true, map: MAP, ...opts });

    [s.me, s.gob, s.ally].forEach((p, i) => {
        p.battleData.position = { x: i, y: 1 };
    });

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <s.wrapper>{wrap ? wrap(children) : children}</s.wrapper>
    );

    const view = render(<BattleScreen />, { wrapper: Wrapper });

    return { ...s, ...view };
}

type Spy = {
    mutate: ReturnType<typeof vi.fn>;
    mutateAsync: ReturnType<typeof vi.fn>;
};

const mutations = (s: ReturnType<typeof mount>) =>
    (Object.values(s.value.actions) as unknown as Spy[]).reduce(
        (n, m) =>
            n + m.mutate.mock.calls.length + m.mutateAsync.mock.calls.length,
        0
    );

describe('BattleScreen: player view is view-only', () => {
    afterEach(cleanup);

    it('desktop: only allow-listed buttons, no DM/hero controls', async () => {
        media.wide = true;
        mount({});
        await screen.findByText('Журнал');

        const names = buttonNames();

        expect(names.filter((n) => !ALLOWED.some((re) => re.test(n)))).toEqual(
            []
        );
        expect(names).toContain('Вигляд гравця: увімк.');
        expect(
            screen.queryByText(
                /Завершити|Скинути|Наступний хід|Розставити|Місцевість|Погода/
            )
        ).toBeNull();
        expect(screen.queryByText('Рапіра')).toBeNull();
    });

    it('desktop: clicking tokens and cells selects for viewing and mutates nothing', async () => {
        media.wide = true;

        const s = mount({});

        await screen.findByText('Журнал');

        const tokens = document.querySelectorAll<HTMLElement>(
            '[data-fx-clip] button'
        );

        expect(tokens.length).toBeGreaterThan(0);
        tokens.forEach((el) => fireEvent.click(el));
        document
            .querySelectorAll<HTMLElement>('[data-fx-clip] [data-cell]')
            .forEach((el) => fireEvent.click(el));
        expect(s.value.select).toHaveBeenCalled();
        expect(mutations(s)).toBe(0);
        expect(s.value.intents.requestAttack).not.toHaveBeenCalled();
        expect(s.value.intents.setMapAim).not.toHaveBeenCalled();
    });

    it('mobile map tab: the indicator is reachable, nothing else acts', async () => {
        media.wide = false;
        mount({});

        expect(
            await screen.findByRole('button', { name: 'Вигляд гравця: увімк.' })
        ).toBeTruthy();
        expect(
            buttonNames().filter((n) => !ALLOWED.some((re) => re.test(n)))
        ).toEqual([]);
    });

    it('prepared: no start button, indicator stays', () => {
        media.wide = false;
        mount({ status: 'prepared' });

        expect(screen.queryByText(/Почати бій/)).toBeNull();
        expect(buttonNames()).toEqual(['Вигляд гравця: увімк.']);
    });

    it('completed: result screen has no exit link, indicator present', async () => {
        media.wide = false;
        mount({ status: 'completed', resultOpen: true });

        await screen.findByRole('dialog');

        expect(screen.queryByRole('link')).toBeNull();
        expect(
            screen.getAllByRole('button', { name: 'Вигляд гравця: увімк.' })
                .length
        ).toBeGreaterThan(0);
    });

    it('pending crit choice leaves no dialog and no DM text', () => {
        media.wide = false;
        mount({ critPending: true });

        expect(screen.queryByRole('dialog')).toBeNull();
        expect(screen.queryByText(/Критичн/)).toBeNull();
    });

    it('maze map: no maze tools, no placement/terrain/weather', async () => {
        media.wide = true;
        mount({ map: mazeMap({}, 4, 3) }, (children) => (
            <MazeViewProvider>{children}</MazeViewProvider>
        ));
        await screen.findByText('Журнал');

        expect(
            buttonNames().filter((n) => !ALLOWED.some((re) => re.test(n)))
        ).toEqual([]);
    });
});
