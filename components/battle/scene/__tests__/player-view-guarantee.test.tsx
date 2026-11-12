// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

const media = vi.hoisted(() => ({ wide: true }));

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

import { BattleScreen } from '@/components/battle/scene/BattleScreen';
import {
    fakeScene,
    type FakeSceneOptions,
} from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import battleDm from '@/messages/uk/battleDm.json';

vi.unmock('next-intl');

vi.stubGlobal(
    'ResizeObserver',
    class {
        observe() {}
        disconnect() {}
        unobserve() {}
    }
);

const MIN_LEN = 8;

// phrases shared with player UI, not DM-only
const SHARED = new Set<string>(['Лог битви відкрито нижче']);

const leaves = (node: unknown): string[] =>
    typeof node === 'string'
        ? [node]
        : node && typeof node === 'object'
          ? Object.values(node).flatMap(leaves)
          : [];

const dmTexts = leaves(battleDm).filter(
    (v) => v.length >= MIN_LEN && !v.includes('{') && !SHARED.has(v)
);

const DM_SELECTOR =
    '[data-tour^="battle.dm"], [data-tour="battle.reset"], [data-tour="battle.next-turn"], [data-tour="battle.start"], [data-tour="battle.turn-controls"], [data-tour="music.transport"], [data-tour="music.playlist"]';

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

function mount(opts: FakeSceneOptions) {
    const s = fakeScene({
        playerView: true,
        map: { cols: 4, rows: 3, background: null, opacity: 0.3 },
        ...opts,
    });

    return render(<BattleScreen />, { wrapper: s.wrapper });
}

describe('battle player view: no DM text, no controls', () => {
    afterEach(cleanup);

    it.each([
        ['desktop', true, {}],
        ['mobile', false, {}],
        ['prepared', false, { status: 'prepared' as const }],
    ])('%s', async (_n, wide, opts) => {
        media.wide = wide;

        const { container } = mount(opts);

        await screen.findAllByRole('button');

        expect(container.querySelectorAll(DM_SELECTOR)).toHaveLength(0);

        const html = container.innerHTML + document.body.innerHTML;

        expect(dmTexts.filter((t) => html.includes(t))).toEqual([]);

        const labels = [...document.querySelectorAll('[aria-label]')].map(
            (e) => e.getAttribute('aria-label') ?? ''
        );

        expect(labels.filter((l) => dmTexts.includes(l))).toEqual([]);

        const names = screen
            .queryAllByRole('button')
            .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '');

        expect(names.filter((n) => !ALLOWED.some((re) => re.test(n)))).toEqual(
            []
        );
    });

    it('negative control: the same scene as a DM does show DM text', async () => {
        media.wide = true;

        const s = fakeScene({
            playerView: false,
            map: { cols: 4, rows: 3, background: null, opacity: 0.3 },
        });

        const { container } = render(<BattleScreen />, { wrapper: s.wrapper });

        await screen.findAllByRole('button');

        expect(container.querySelectorAll(DM_SELECTOR).length).toBeGreaterThan(
            0
        );
    });
});
