"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** staleTime для довідкових даних (spells, units, races, main-skills) */
export const REFERENCE_STALE_MS = 5 * 60 * 1000; // 5 хвилин

/** staleTime для персонажів та кампаній */
export const ENTITY_STALE_MS = 2 * 60 * 1000; // 2 хвилини

/** gcTime — скільки тримати в кеші після "unmount" */
export const GC_TIME_MS = 10 * 60 * 1000; // 10 хвилин

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 хвилина (default)
            gcTime: GC_TIME_MS,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
