// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/battle/usePusherBattleSync', () => ({
    usePusherBattleSync: () => ({ connectionState: 'connected' }),
}));
vi.mock('@/lib/api/battles', async (orig) => ({
    ...(await orig<typeof import('@/lib/api/battles')>()),
    getBattle: vi.fn(),
}));
vi.mock('@/lib/api/battle-maps', () => ({ getBattleMap: vi.fn() }));

import { getBattleMap } from '@/lib/api/battle-maps';
import { useBattleSceneValue } from '@/lib/hooks/battle';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { battleQueryKey } from '@/lib/hooks/battles';
import { IntlWrapper } from '@/lib/i18n/test/intl-wrapper';
import type { BattleScene } from '@/types/api';
import type { BattleMapConfig } from '@/types/battle';

vi.unmock('next-intl');

afterEach(() => {
    cleanup();
    vi.mocked(getBattleMap).mockReset();
});

const header = { cols: 8, rows: 8 } as unknown as BattleMapConfig;

function setup(patch: Partial<BattleScene>) {
    const s = fakeScene({ isDM: true });

    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const scene = { ...s.battle, ...patch } as BattleScene;

    client.setQueryData(battleQueryKey('c1', 'b1'), scene);

    const Wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
            <IntlWrapper>{children}</IntlWrapper>
        </QueryClientProvider>
    );

    const hook = renderHook(() => useBattleSceneValue('c1', 'b1', 'u'), {
        wrapper: Wrapper,
    });

    return { client, scene, ...hook };
}

describe('ефективна карта в сцені', () => {
    it('inline: віднімає removedEdges зі стін без мережі', () => {
        const { result } = setup({
            map: { ...header, walls: ['1:1:e', '2:2:s'] },
            mapState: { removedEdges: ['1:1:e'], doors: {} },
        });

        expect(result.current.value?.battle.map?.walls).toEqual(['2:2:s']);
        expect(getBattleMap).not.toHaveBeenCalled();
    });

    it('linked: поки ребра вантажаться, сцена не віддається', async () => {
        vi.mocked(getBattleMap).mockReturnValue(new Promise(() => {}));

        const { result } = setup({
            map: header,
            mapRef: { mapId: 'm1', version: 1 },
        });

        expect(result.current.value).toBeNull();
        expect(result.current.loading).toBe(true);
    });

    it('linked: помилка завантаження ребер не лишає вічний лоадер', async () => {
        vi.mocked(getBattleMap).mockRejectedValue(new Error('boom'));

        const { result } = setup({
            map: header,
            mapRef: { mapId: 'm1', version: 1 },
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.value).toBeNull();
    });

    it('linked: після завантаження компонує ребра бібліотеки мінус стан', async () => {
        vi.mocked(getBattleMap).mockResolvedValue({
            walls: ['1:1:e', '3:3:e'],
            bars: ['0:0:s'],
        } as never);

        const { result } = setup({
            map: header,
            mapRef: { mapId: 'm1', version: 1 },
            mapState: { removedEdges: ['3:3:e'], doors: {} },
        });

        await waitFor(() => expect(result.current.value).not.toBeNull());

        expect(result.current.value?.battle.map?.walls).toEqual(['1:1:e']);
        expect(result.current.value?.battle.map?.bars).toEqual(['0:0:s']);
        expect(getBattleMap).toHaveBeenCalledWith('c1', 'm1', 1);
    });

    it('map-update-дельта з новою версією підтягує нові ребра', async () => {
        vi.mocked(getBattleMap).mockImplementation(((
            _c: string,
            _m: string,
            v: number
        ) =>
            Promise.resolve({
                walls: v === 1 ? ['1:1:e'] : ['5:5:e'],
                bars: [],
            })) as never);

        const { result, client, scene } = setup({
            map: header,
            mapRef: { mapId: 'm1', version: 1 },
        });

        await waitFor(() =>
            expect(result.current.value?.battle.map?.walls).toEqual(['1:1:e'])
        );

        act(() =>
            client.setQueryData(battleQueryKey('c1', 'b1'), {
                ...scene,
                mapRef: { mapId: 'm1', version: 2 },
            })
        );

        await waitFor(() =>
            expect(result.current.value?.battle.map?.walls).toEqual(['5:5:e'])
        );
    });
});
