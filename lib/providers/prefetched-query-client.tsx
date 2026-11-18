'use client';

import { type ReactNode, useState } from 'react';
import {
    hashKey,
    type QueryClient,
    type QueryKey,
    useQueryClient,
} from '@tanstack/react-query';

const versionOf = (v: unknown) =>
    v &&
    typeof v === 'object' &&
    typeof (v as { version?: unknown }).version === 'number'
        ? (v as { version: number }).version
        : undefined;

// a remount replays the first-HTML data: do not overwrite a newer version from deltas
function notNewer(data: unknown, cached: unknown): boolean {
    const a = versionOf(data);

    const b = versionOf(cached);

    return a !== undefined && b !== undefined && a <= b;
}

// server stamps are compared only with server stamps: the client clock may be skewed
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
export function SeedQuery({
    queryKey,
    data,
    seededAt,
    children,
}: {
    queryKey: QueryKey;
    data: unknown;
    seededAt: number;
    children: ReactNode;
}) {
    const queryClient = useQueryClient();

    const [seeded, setSeeded] = useState<unknown>(undefined);

    if (data != null && seeded !== data) {
        setSeeded(data);

        const seeds = seedsOf(queryClient);

        const hash = hashKey(queryKey);

        const cached = queryClient.getQueryData(queryKey);

        // Back replays a router-cache payload: it is no newer than what is already stored, and the cache may have updated after it
        const replay =
            cached !== undefined &&
            (notNewer(data, cached) ||
                seededAt <= (seeds.get(hash) ?? -Infinity));

        if (!replay) {
            queryClient.setQueryData(queryKey, data);
            seeds.set(hash, seededAt);
        }
    }

    return children;
}
