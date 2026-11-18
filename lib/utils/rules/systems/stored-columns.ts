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

/** Copy of `obj` with `value` set at `path`, creating containers and keeping sibling keys */
export function setAtPath(
    obj: unknown,
    path: readonly string[],
    value: unknown
): Record<string, unknown> {
    const base = isRecord(obj) ? obj : {};

    const [head, ...tail] = path;

    return {
        ...base,
        [head]: tail.length === 0 ? value : setAtPath(base[head], tail, value),
    };
}

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

/** Restores the stored ext paths (module-owned values) that `prev` holds and `next` dropped; column-view keys are left to their columns */
export function keepStoredColumns(next: unknown, prev: unknown): unknown {
    if (!isRecord(next)) return next;

    return STORED_COLUMN_ENTRIES.reduce<Record<string, unknown>>(
        (acc, { path }) => {
            if (path[0] !== 'ext' || getAtPath(acc, path) !== undefined)
                return acc;

            const value = getAtPath(prev, path);

            return value === undefined ? acc : setAtPath(acc, path, value);
        },
        next
    );
}

export function writeStoredColumn(
    row: { characteristics?: unknown },
    column: string,
    value: number | boolean
): Record<string, unknown> | undefined {
    const entry = STORED_COLUMN_ENTRIES.find((e) => e.column === column);

    return entry && setAtPath(row.characteristics, entry.path, value);
}
