// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { battleMapKeys } from '../keys';
import { announceMapLibraryChange, useMapLibrarySync } from '../mapLibrarySync';

describe('map library sync', () => {
    it('invalidates the list when another tab announces a change', async () => {
        const client = new QueryClient();
        const spy = vi.spyOn(client, 'invalidateQueries');
        const wrapper = ({ children }: { children: ReactNode }) => (
            <QueryClientProvider client={client}>
                {children}
            </QueryClientProvider>
        );

        renderHook(() => useMapLibrarySync('c1', true), { wrapper });
        announceMapLibraryChange('c1');
        announceMapLibraryChange('other');

        await waitFor(() =>
            expect(spy).toHaveBeenCalledWith({
                queryKey: battleMapKeys.list('c1'),
            })
        );
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
