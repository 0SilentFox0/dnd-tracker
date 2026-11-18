import { stableJson } from './identity';
import type { ExistingEntry } from './plan-types';
import { type AdaptedEntry, issue } from './types';

import { isRecord } from '@/lib/utils/common/is-record';
import type { JsonRecord } from '@/lib/utils/compendium-import/parse';
export function setPath(body: JsonRecord, path: (string | number)[], value: string) {
    let target: unknown = body;

    for (const part of path.slice(0, -1)) target = (target as JsonRecord)[part];

    if (target && path.length)
        (target as JsonRecord)[path[path.length - 1]] = value;
}

export function managedProjection(local: unknown, baseline: unknown): unknown {
    if (
        Array.isArray(local) &&
        Array.isArray(baseline) &&
        baseline.every((x) => isRecord(x) && typeof x.id === 'string')
    ) {
        const ids = new Set(baseline.map((x) => (x as JsonRecord).id));

        return local
            .filter((x) => isRecord(x) && ids.has(x.id))
            .map((x) =>
                managedProjection(
                    x,
                    baseline.find(
                        (b) => isRecord(b) && b.id === (x as JsonRecord).id
                    )
                )
            );
    }

    // Id-less arrays of equal length are compared element-wise so schema defaults added on save do not read as local edits.
    if (
        Array.isArray(local) &&
        Array.isArray(baseline) &&
        local.length === baseline.length
    )
        return local.map((x, i) => managedProjection(x, baseline[i]));

    if (isRecord(local) && isRecord(baseline))
        return Object.fromEntries(
            Object.keys(baseline).map((k) => [
                k,
                managedProjection(local[k], baseline[k]),
            ])
        );

    return local;
}

export const imageSrcs = (nodes: unknown[]) =>
    new Map(
        nodes.flatMap((n) =>
            isRecord(n) &&
            n.type === 'image' &&
            isRecord(n.attrs) &&
            typeof n.attrs.mediaId === 'string' &&
            typeof n.attrs.src === 'string'
                ? [[n.attrs.mediaId, n.attrs.src] as const]
                : []
        )
    );

export function keepImageSrc(local: unknown[], incoming: unknown[]): unknown[] {
    const srcs = imageSrcs(local);

    if (srcs.size === 0) return incoming;

    return incoming.map((n) => {
        if (
            !isRecord(n) ||
            n.type !== 'image' ||
            !isRecord(n.attrs) ||
            n.attrs.src !== undefined
        )
            return n;

        const src = srcs.get(String(n.attrs.mediaId));

        return src ? { ...n, attrs: { ...n.attrs, src } } : n;
    });
}

export function mergeValue(
    local: unknown,
    baseline: unknown,
    incoming: unknown
): unknown {
    if (
        Array.isArray(incoming) &&
        Array.isArray(local) &&
        incoming.every((x) => isRecord(x) && typeof x.id === 'string')
    ) {
        const byId = new Map(
            local.map((x) => [isRecord(x) ? x.id : stableJson(x), x])
        );

        for (const row of incoming)
            byId.set(
                (row as JsonRecord).id,
                mergeValue(
                    byId.get((row as JsonRecord).id),
                    Array.isArray(baseline)
                        ? baseline.find(
                              (x) =>
                                  isRecord(x) && x.id === (row as JsonRecord).id
                          )
                        : undefined,
                    row
                )
            );

        return [...byId.values()];
    }

    if (Array.isArray(incoming) && Array.isArray(local))
        return keepImageSrc(local, incoming);

    if (isRecord(local) && isRecord(incoming))
        return {
            ...local,
            ...Object.fromEntries(
                Object.entries(incoming).map(([k, v]) => [
                    k,
                    mergeValue(
                        local[k],
                        isRecord(baseline) ? baseline[k] : undefined,
                        v
                    ),
                ])
            ),
        };

    return incoming;
}

export function reconcile(
    body: JsonRecord,
    existing: ExistingEntry | undefined,
    entry: AdaptedEntry,
    overwrite: boolean
): JsonRecord {
    if (!existing || existing.missing) return body;

    const result: JsonRecord = {};

    for (const [field, incoming] of Object.entries(body)) {
        const local = existing.body[field];

        const baseline = existing.baseline[field];

        const changed =
            stableJson(managedProjection(local, baseline)) !==
            stableJson(baseline);

        if (
            changed &&
            !overwrite &&
            stableJson(local) !== stableJson(incoming)
        ) {
            entry.issues.push(
                issue('LOCAL_CONFLICT', `${entry.key}.${field}`, 'warning')
            );
            result[field] = local;
        } else result[field] = mergeValue(local, baseline, incoming);
    }

    return result;
}

