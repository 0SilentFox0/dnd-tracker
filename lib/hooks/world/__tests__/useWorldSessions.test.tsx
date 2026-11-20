// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { worldKeys } from '../keys';
import { useWorldSessions } from '../useWorldSessions';

import { getSessions, startSession } from '@/lib/api/world';
import type { WorldSession } from '@/types/world';

vi.mock('@/lib/api/world', () => ({
    getSessions: vi.fn(),
    startSession: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
}));
vi.mock('@/lib/hooks/common/useNotify', () => ({
    useOptionalNotify: () => vi.fn(),
}));

const session = (id: string, active: boolean): WorldSession => ({
    id,
    name: id,
    description: null,
    color: '#fff',
    startedAt: '',
    endedAt: active ? null : '',
    active,
});

let client: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
});

describe('useWorldSessions', () => {
    it('exposes the active session', async () => {
        vi.mocked(getSessions).mockResolvedValue([
            session('s1', false),
            session('s2', true),
        ]);

        const { result } = renderHook(() => useWorldSessions('c1'), {
            wrapper,
        });

        await waitFor(() => expect(result.current.active?.id).toBe('s2'));
    });

    it('starting a session invalidates sessions and the trail', async () => {
        vi.mocked(getSessions).mockResolvedValue([]);
        vi.mocked(startSession).mockResolvedValue(session('s3', true));

        const spy = vi.spyOn(client, 'invalidateQueries');

        const { result } = renderHook(() => useWorldSessions('c1'), {
            wrapper,
        });

        await act(async () => {
            await result.current.start.mutateAsync({ name: 'Night' });
        });

        const keys = spy.mock.calls.map((c) => c[0]?.queryKey);

        expect(keys).toContainEqual(worldKeys.sessions('c1'));
        expect(keys).toContainEqual(worldKeys.trailAll('c1'));
    });
});
