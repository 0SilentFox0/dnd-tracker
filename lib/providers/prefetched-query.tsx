"use client";

import { type ReactNode, useState } from "react";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";

/**
 * Seeds the client query cache with data a server page already loaded, so the first HTML has it
 * and the hook does not GET again while the data is within its staleTime.
 * setQueryData stamps the local clock: a dehydrated server timestamp would make skewed clients refetch at once.
 */
export function PrefetchedQuery({ queryKey, data, children }: { queryKey: QueryKey; data: unknown; children: ReactNode }) {
  const queryClient = useQueryClient();

  const [seeded, setSeeded] = useState<unknown>(undefined);

  if (data != null && seeded !== data) {
    setSeeded(data);
    queryClient.setQueryData(queryKey, data);
  }

  return children;
}
