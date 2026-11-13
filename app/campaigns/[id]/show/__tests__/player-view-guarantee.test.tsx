// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShowPageClient } from '../page-client';

import { renderWithConfirm as render } from '@/lib/i18n/test/render-uk';
import show from '@/messages/uk/show.json';

vi.unmock('next-intl');

vi.stubGlobal('fetch', () => new Promise(() => undefined));

const state = vi.hoisted(() => ({ show: null as unknown }));

vi.mock('@/lib/hooks/show', async (orig) => ({
    ...(await orig<object>()),
    usePusherShowSync: () => undefined,
    useShowState: () => ({ show: state.show }),
    useShowControl: () => ({ send: vi.fn(), pending: false }),
    useShowKeys: () => undefined,
    useShowAudioHost: () => ({}),
}));

vi.mock('@/components/audio/AudioDock', () => ({ AudioDock: () => <div /> }));
vi.mock('@/components/dice/DiceRoller', () => ({
    DiceRoller: () => <div />,
}));
vi.mock('@/components/show/stage/ShowBattleCall', () => ({
    ShowBattleCall: () => <a href="/b">battle</a>,
}));
vi.mock('@/lib/api/world', () => ({
    getWorldView: vi.fn(),
    getWorldMap: vi.fn(),
    listWorldMaps: vi.fn().mockResolvedValue([]),
}));
 
vi.mock('next/image', () => ({
    default: (p: { src: string; alt: string }) => (
        <img src={p.src} alt={p.alt} />
    ),
}));

const DM_KEYS = ['transport', 'deckStrip', 'sceneSelect'] as const;

const leaves = (node: unknown): string[] =>
    typeof node === 'string'
        ? [node]
        : node && typeof node === 'object'
          ? Object.values(node).flatMap(leaves)
          : [];

const dmTexts = [
    ...DM_KEYS.flatMap((k) => leaves(show[k])),
    show.puzzle.releaseAll,
    show.puzzle.reset,
    ...leaves(show.puzzle.resetConfirm),
].filter((v) => v.length >= 4 && !v.includes('{'));

const ALLOWED = [/^Вигляд гравця/, /^(На весь екран|Вийти з повноекранного)/];

const mount = () =>
    render(
        <QueryClientProvider
            client={
                new QueryClient({
                    defaultOptions: { queries: { retry: false } },
                })
            }
        >
            <ShowPageClient campaignId="c1" isDM userId="u1" />
        </QueryClientProvider>
    );

beforeEach(() => {
    window.sessionStorage.clear();
    state.show = {
        deckId: 'd1',
        deckTitle: 'Таверна',
        slide: {
            id: 'slide-0001',
            imageUrl: 'https://x.supabase.co/a.webp',
            title: 'Корчма',
        },
        nextImageUrl: null,
        audio: null,
        seq: 1,
    };
});

afterEach(cleanup);

describe('show page player view: no DM text, no controls', () => {
    it('DM view has DM text (control), player view has none and only allow-listed buttons', () => {
        const { container } = mount();

        const before = container.innerHTML;

        expect(
            dmTexts.filter((t) => before.includes(t)).length
        ).toBeGreaterThan(0);

        fireEvent.click(
            screen.getByRole('button', { name: 'Вигляд гравця: вимк.' })
        );

        const html = container.innerHTML;

        expect(dmTexts.filter((t) => html.includes(t))).toEqual([]);

        const names = screen
            .getAllByRole('button')
            .map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '');

        expect(names.filter((n) => !ALLOWED.some((re) => re.test(n)))).toEqual(
            []
        );
    });
});
