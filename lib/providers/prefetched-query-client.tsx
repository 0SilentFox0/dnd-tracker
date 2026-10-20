"use client";

import { type ReactNode, useState } from "react";
import { hashKey, type QueryClient, type QueryKey, useQueryClient } from "@tanstack/react-query";

const versionOf = (v: unknown) => (v && typeof v === "object" && typeof (v as { version?: unknown }).version === "number" ? (v as { version: number }).version : undefined);

// перемонтування повторно віддає дані першого HTML — не затираємо ними новішу версію з дельт
function notNewer(data: unknown, cached: unknown): boolean {
  const a = versionOf(data);

  const b = versionOf(cached);

  return a !== undefined && b !== undefined && a <= b;
}

// серверні мітки порівнюємо лише з серверними: годинник клієнта може бути зсунутий
const lastSeeds = new WeakMap<QueryClient, Map<string, number>>();

function seedsOf(queryClient: QueryClient) {
  let seeds = lastSeeds.get(queryClient);

  if (!seeds) {
    seeds = new Map();
    lastSeeds.set(queryClient, seeds);
  }

  return seeds;
}

/** Client half of `PrefetchedQuery`: `seededAt` is the server render time of `data`. */
export function SeedQuery({ queryKey, data, seededAt, children }: { queryKey: QueryKey; data: unknown; seededAt: number; children: ReactNode }) {
  const queryClient = useQueryClient();

  const [seeded, setSeeded] = useState<unknown>(undefined);

  if (data != null && seeded !== data) {
    setSeeded(data);

    const seeds = seedsOf(queryClient);

    const hash = hashKey(queryKey);

    const cached = queryClient.getQueryData(queryKey);

    // Back відтворює payload з router cache — він не новіший за вже покладений, а кеш міг оновитись після нього
    const replay = cached !== undefined && (notNewer(data, cached) || seededAt <= (seeds.get(hash) ?? -Infinity));

    if (!replay) {
      queryClient.setQueryData(queryKey, data);
      seeds.set(hash, seededAt);
    }
  }

  return children;
}
