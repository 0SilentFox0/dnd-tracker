import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary, QueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Seeds the client query cache with data a server page already loaded, so the first HTML has it
 * and the hook does not GET again while the data is within its staleTime.
 */
export function PrefetchedQuery({ queryKey, data, children }: { queryKey: QueryKey; data: unknown; children: ReactNode }) {
  if (data == null) return children;

  const queryClient = new QueryClient();

  queryClient.setQueryData(queryKey, data);

  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
