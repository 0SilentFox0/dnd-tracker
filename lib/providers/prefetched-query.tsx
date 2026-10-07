"use client";

import { type ReactNode, useRef } from "react";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";

/**
 * Seeds the client query cache with data a server page already loaded, so the first HTML has it
 * and the hook does not GET again while the data is within its staleTime.
 * Stamped with the local clock: a dehydrated server timestamp would make skewed clients refetch at once.
 */
export function PrefetchedQuery({ queryKey, data, children }: { queryKey: QueryKey; data: unknown; children: ReactNode }) {
  const queryClient = useQueryClient();

  const seeded = useRef<unknown>(undefined);

  if (data != null && seeded.current !== data) {
    seeded.current = data;
    queryClient.setQueryData(queryKey, data, { updatedAt: Date.now() });
  }

  return children;
}
