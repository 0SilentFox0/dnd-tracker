import type { ReactNode } from "react";
import type { QueryKey } from "@tanstack/react-query";

import { SeedQuery } from "@/lib/providers/prefetched-query-client";

const renderedAt = () => Date.now();

/**
 * Seeds the client query cache with data a server page already loaded, so the first HTML has it
 * and the hook does not GET again while the data is within its staleTime.
 * setQueryData stamps the local clock: a dehydrated server timestamp would make skewed clients refetch at once.
 */
export function PrefetchedQuery({ queryKey, data, children }: { queryKey: QueryKey; data: unknown; children: ReactNode }) {
  return (
    <SeedQuery queryKey={queryKey} data={data} seededAt={renderedAt()}>
      {children}
    </SeedQuery>
  );
}
