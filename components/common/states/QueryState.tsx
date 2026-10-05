import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { ErrorState } from "./ErrorState";
import { LoadingState } from "./LoadingState";

type QueryLike<T> = Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">;

export function QueryState<T>({ query, loading, empty, children }: { query: QueryLike<T>; loading?: ReactNode; empty?: ReactNode; children: (data: T) => ReactNode }) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data as T;

  if (empty !== undefined && Array.isArray(data) && data.length === 0) return <>{empty}</>;

  return <>{children(data)}</>;
}
