// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { worldKeys } from '../keys';
import { useWorldEditor } from '../useWorldEditor';

import { ApiError } from '@/lib/api/client';
import { updateWorldMap } from '@/lib/api/world';
import { API_ERRORS } from '@/lib/constants/api-errors';

const notifyMock = vi.fn();

vi.mock('@/lib/api/world', () => ({
    updateWorldMap: vi.fn(),
    createWorldMap: vi.fn(),
    deleteWorldMap: vi.fn(),
    createWorldMarker: vi.fn(),
    updateWorldMarker: vi.fn(),
    deleteWorldMarker: vi.fn(),
}));
vi.mock('@/lib/hooks/common/useNotify', () => ({
    useOptionalNotify: () => notifyMock,
}));

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
});

describe('useWorldEditor map.move', () => {
    it('invalidates the maps list and every cached map detail', async () => {
        vi.mocked(updateWorldMap).mockResolvedValue({} as never);

        const spy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useWorldEditor('c1', 'm1'), {
            wrapper,
        });

        await act(
            async () =>
                void (await result.current.map.move.mutateOk({
                    id: 'm2',
                    parentMarkerId: 'k',
                }))
        );

        const keys = spy.mock.calls.map(([f]) => f?.queryKey);

        expect(keys).toContainEqual(worldKeys.maps('c1'));
        expect(keys).toContainEqual(worldKeys.mapAll('c1'));
    });

    it('shows the specific conflict text, not the generic one', async () => {
        vi.mocked(updateWorldMap).mockRejectedValue(
            new ApiError('x', 409, '/u', {}, API_ERRORS.WORLD_MOVE_CYCLE)
        );

        const { result } = renderHook(() => useWorldEditor('c1', 'm1'), {
            wrapper,
        });

        await act(
            async () =>
                void (await result.current.map.move.mutateOk({
                    id: 'm2',
                    parentMarkerId: 'k',
                }))
        );

        expect(notifyMock).toHaveBeenCalledWith(
            expect.stringContaining('worldMoveCycle')
        );
    });

    it('falls back to the generic text for other errors', async () => {
        vi.mocked(updateWorldMap).mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useWorldEditor('c1', 'm1'), {
            wrapper,
        });

        await act(
            async () =>
                void (await result.current.map.move.mutateOk({
                    id: 'm2',
                    parentMarkerId: 'k',
                }))
        );

        expect(notifyMock).toHaveBeenCalledWith(
            expect.stringContaining('saveMap')
        );
    });
});
