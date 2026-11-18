// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => ({
    artifacts: [
        {
            id: 'a1',
            name: 'Кільце',
            slot: 'ring',
            setId: null,
            abilitySummary: ['AC +1'],
        },
        {
            id: 'a2',
            name: 'Шолом',
            slot: 'helmet',
            setId: 's1',
            artifactSet: { id: 's1', name: 'Луска' },
        },
    ] as Array<Record<string, unknown>>,
}));

vi.mock('@/lib/api/artifacts', () => ({
    getArtifacts: vi.fn(async () => store.artifacts.map((a) => ({ ...a }))),
    updateArtifact: vi.fn(
        async (_c: string, id: string, data: { slot: string }) => {
            store.artifacts = store.artifacts.map((a) =>
                a.id === id ? { ...a, ...data } : a
            );

            return {};
        }
    ),
    createArtifact: vi.fn(),
    deleteArtifact: vi.fn(),
    deleteAllArtifacts: vi.fn(),
}));
import { useArtifactsCatalog, useUpdateArtifact } from '@/lib/hooks/artifacts';
import type { ItemGroupsView } from '@/types/artifacts';

const groupsView: ItemGroupsView = {
    groups: [
        {
            id: 's1',
            name: 'Луска',
            icon: null,
            description: null,
            setBonus: null,
            abilitySummary: [],
        },
    ],
    isLoading: false,
};

const useGroups = () => groupsView;

afterEach(cleanup);

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider
        client={
            new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
    >
        {children}
    </QueryClientProvider>
);

describe('useArtifactsCatalog', () => {
    it('групує артефакти по сетах і слотах; зміна слоту переносить картку без reload', async () => {
        const { result } = renderHook(
            () => ({
                catalog: useArtifactsCatalog('c1', useGroups),
                update: useUpdateArtifact('c1'),
            }),
            { wrapper }
        );

        await waitFor(() => expect(result.current.catalog.count).toBe(2));

        expect(result.current.catalog.view.groups).toHaveLength(1);
        expect(
            result.current.catalog.view.groups[0].artifacts.map((a) => a.id)
        ).toEqual(['a2']);
        expect(result.current.catalog.view.groups[0].group).toMatchObject({
            icon: null,
            abilitySummary: [],
        });
        expect(result.current.catalog.view.bySlot).toEqual([
            expect.objectContaining({
                slot: 'ring',
                artifacts: [
                    expect.objectContaining({
                        id: 'a1',
                        abilitySummary: ['AC +1'],
                        rarity: null,
                    }),
                ],
            }),
        ]);

        await act(() =>
            result.current.update.mutateAsync({
                artifactId: 'a1',
                data: { slot: 'amulet' },
            })
        );

        await waitFor(() =>
            expect(
                result.current.catalog.view.bySlot.map((g) => g.slot)
            ).toEqual(['amulet'])
        );
    });

    it('пошук шукає за назвою артефакта й сету, ховає порожні групи', async () => {
        const { result } = renderHook(
            () => useArtifactsCatalog('c1', useGroups),
            {
                wrapper,
            }
        );

        await waitFor(() => expect(result.current.count).toBe(2));

        act(() => result.current.search.query.set('луска'));

        await waitFor(() => expect(result.current.view.bySlot).toEqual([]));

        expect(
            result.current.view.groups[0].artifacts.map((a) => a.id)
        ).toEqual(['a2']);

        act(() => result.current.search.query.set('кільце'));

        await waitFor(() => expect(result.current.view.groups).toEqual([]));

        expect(result.current.view.bySlot.map((g) => g.slot)).toEqual([
            'amulet',
        ]);
    });
});
