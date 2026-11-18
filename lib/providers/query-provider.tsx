'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { setGlobalApiErrorHandler } from '@/lib/api/client';
import { handleApiError } from '@/lib/providers/api-error-handler';

export const REFERENCE_STALE_MS = 5 * 60 * 1000;

export const ENTITY_STALE_MS = 2 * 60 * 1000;

const GC_TIME_MS = 10 * 60 * 1000;

export function QueryProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        setGlobalApiErrorHandler(handleApiError);
    }, []);

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 60 * 1000,
                        gcTime: GC_TIME_MS,
                        refetchOnWindowFocus: false,
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
