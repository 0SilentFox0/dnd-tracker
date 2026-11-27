// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as scenarioApi from '@/lib/api/scenario';
import { scenarioKeys, useAutoMentionIndex } from '@/lib/hooks/scenario';

vi.mock('@/lib/api/scenario', () => ({ getMentionNames: vi.fn() }));

describe('useAutoMentionIndex', () => {
    it('builds the index once loaded and refresh refetches the names', async () => {
        vi.mocked(scenarioApi.getMentionNames).mockResolvedValue([
            { type: 'unit', id: 'u1', label: 'Imp' },
        ]);

        const client = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        const invalidate = vi.spyOn(client, 'invalidateQueries');

        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        );

        const { result } = renderHook(() => useAutoMentionIndex('c1'), {
            wrapper,
        });

        expect(result.current.index).toBeNull();
        await waitFor(() => expect(result.current.index).not.toBeNull());

        act(() => result.current.refresh());

        expect(invalidate).toHaveBeenCalledWith({
            queryKey: scenarioKeys.mentionNames('c1'),
        });
    });
});
