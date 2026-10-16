"use client";

import { type ReactNode, useState } from "react";
import { type QueryKey, useQueryClient } from "@tanstack/react-query";

const versionOf = (v: unknown) => (v && typeof v === "object" && typeof (v as { version?: unknown }).version === "number" ? (v as { version: number }).version : undefined);

// перемонтування повторно віддає дані першого HTML — не затираємо ними новішу версію з дельт
function notNewer(data: unknown, cached: unknown): boolean {
  const a = versionOf(data);

  const b = versionOf(cached);

  return a !== undefined && b !== undefined && a <= b;
}

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

    if (!notNewer(data, queryClient.getQueryData(queryKey))) queryClient.setQueryData(queryKey, data);
  }

  return children;
}
