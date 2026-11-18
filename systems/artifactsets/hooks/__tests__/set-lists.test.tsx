// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/systems/artifactsets/api/artifact-sets', () => ({
    getArtifactSets: vi.fn(async () => [
        {
            id: 's1',
            name: 'Dragon scale',
            description: 'd',
            setBonus: { name: 'B' },
            icon: null,
        },
        {
            id: 's2',
            name: 'Moon silk',
            description: null,
            setBonus: null,
            icon: 'i.png',
            abilitySummary: [],
        },
    ]),
    createArtifactSet: vi.fn(async () => ({})),
    updateArtifactSet: vi.fn(async () => ({})),
    deleteArtifactSet: vi.fn(async () => ({ ok: true })),
}));

import { artifactKeys } from '@/lib/hooks/artifacts';
import * as api from '@/systems/artifactsets/api/artifact-sets';
import {
    useArtifactSetsPage,
    useDeleteArtifactSet,
    useItemGroups,
    useSaveArtifactSet,
} from '@/systems/artifactsets/hooks';
import { artifactSetKeys } from '@/systems/artifactsets/hooks/keys';

const client = () =>
    new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrap = (qc: QueryClient) =>
    function Wrapper({ children }: { children: ReactNode }) {
        return (
            <QueryClientProvider client={qc}>{children}</QueryClientProvider>
        );
    };

afterEach(cleanup);

describe('useItemGroups', () => {
    it('maps sets to card data, defaulting icon and abilitySummary', async () => {
        const { result } = renderHook(() => useItemGroups('c1'), {
            wrapper: wrap(client()),
        });

        expect(result.current.isLoading).toBe(true);
        expect(result.current.groups).toEqual([]);

        await waitFor(() => expect(result.current.groups).toHaveLength(2));

        expect(result.current.groups[0]).toEqual({
            id: 's1',
            name: 'Dragon scale',
            icon: null,
            description: 'd',
            setBonus: { name: 'B' },
            abilitySummary: [],
        });
        expect(result.current.groups[1].icon).toBe('i.png');
    });
});

describe('useArtifactSetsPage', () => {
    it('exposes the total and filters by name through the search state', async () => {
        const { result } = renderHook(() => useArtifactSetsPage('c1'), {
            wrapper: wrap(client()),
        });

        await waitFor(() => expect(result.current.total).toBe(2));

        act(() => result.current.search.query.set('moon'));

        await waitFor(() =>
            expect(result.current.sets.map((s) => s.name)).toEqual([
                'Moon silk',
            ])
        );
        expect(result.current.total).toBe(2);
    });
});

describe('set mutations', () => {
    it('save without id creates, with id updates; both refresh sets and artifacts', async () => {
        const qc = client();

        const invalidate = vi.spyOn(qc, 'invalidateQueries');

        const create = renderHook(() => useSaveArtifactSet('c1'), {
            wrapper: wrap(qc),
        });

        await act(() => create.result.current.mutateAsync({ name: 'N' }));

        expect(api.createArtifactSet).toHaveBeenCalledWith('c1', { name: 'N' });

        const update = renderHook(() => useSaveArtifactSet('c1', 's1'), {
            wrapper: wrap(qc),
        });

        await act(() => update.result.current.mutateAsync({ name: 'M' }));

        expect(api.updateArtifactSet).toHaveBeenCalledWith('c1', 's1', {
            name: 'M',
        });

        const keys = invalidate.mock.calls.map((c) => c[0]?.queryKey);

        expect(keys).toContainEqual(artifactSetKeys.list('c1'));
        expect(keys).toContainEqual(artifactKeys.list('c1'));
    });

    it('delete removes by id and refreshes the lists', async () => {
        const qc = client();

        const invalidate = vi.spyOn(qc, 'invalidateQueries');

        const { result } = renderHook(() => useDeleteArtifactSet('c1'), {
            wrapper: wrap(qc),
        });

        await act(() => result.current.mutateAsync('s2'));

        expect(api.deleteArtifactSet).toHaveBeenCalledWith('c1', 's2');
        expect(invalidate.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(
            artifactSetKeys.list('c1')
        );
    });
});
