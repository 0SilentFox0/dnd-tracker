import { isRecord } from '@/lib/utils/common/is-record';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

export interface StoredColumnPath {
    column: string;
    path: readonly string[];
}

export const STORED_COLUMN_ENTRIES: readonly StoredColumnPath[] = [
    ...new Map(
        (SYSTEM_META as readonly SystemMeta[])
            .flatMap((m) => m.characteristicsColumns ?? [])
            .map((c): [string, StoredColumnPath] => {
                const entry =
                    typeof c === 'string' ? { column: c, path: [c] } : c;

                return [entry.column, entry];
            })
    ).values(),
];

export const getAtPath = (obj: unknown, path: readonly string[]): unknown =>
    path.reduce<unknown>(
        (cur, key) => (isRecord(cur) ? cur[key] : undefined),
        obj
    );

/** Copy of `obj` without the value at `path` (same reference when absent); containers left empty by the removal are pruned */
export function omitAtPath(
    obj: Record<string, unknown>,
    path: readonly string[]
): Record<string, unknown> {
    const [head, ...tail] = path;

    if (!(head in obj)) return obj;

    const rest = { ...obj };

    if (tail.length === 0) {
        delete rest[head];

        return rest;
    }

    const child = obj[head];

    if (!isRecord(child)) return obj;

    const next = omitAtPath(child, tail);

    if (Object.keys(next).length === 0) delete rest[head];
    else rest[head] = next;

    return rest;
}
