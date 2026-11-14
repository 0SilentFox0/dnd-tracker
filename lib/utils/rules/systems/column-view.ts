import type { RuleSystemDefinition } from './types';

import { isRecord } from '@/lib/utils/common/is-record';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';
import type { SystemData } from '@/lib/utils/rules/systems/slot';

const STORED_COLUMNS = [
    ...new Set(
        (SYSTEM_META as readonly SystemMeta[]).flatMap(
            (m) => m.characteristicsColumns ?? []
        )
    ),
];

/** For loaders without a ruleset; same rule as the d20 codec: stored number, else the column. */
export function withStoredColumns<T extends object>(row: T): T {
    const stored = (row as { characteristics?: unknown }).characteristics;

    if (!isRecord(stored)) return row;

    const picked = Object.fromEntries(
        STORED_COLUMNS.flatMap((column) =>
            typeof stored[column] === 'number' ? [[column, stored[column]]] : []
        )
    );

    return Object.keys(picked).length > 0 ? { ...row, ...picked } : row;
}

/** Flat statblock for exports and packs: the stored values move out of `characteristics`, which stays only when something else is in it. */
export function flattenStoredColumns<T extends object>(row: T): T {
    const flat = withStoredColumns(row) as T & { characteristics?: unknown };

    if (!isRecord(flat.characteristics)) return flat;

    const rest = Object.fromEntries(
        Object.entries(flat.characteristics).filter(
            ([key]) => !STORED_COLUMNS.includes(key)
        )
    );

    if (Object.keys(rest).length === Object.keys(flat.characteristics).length)
        return flat;

    return {
        ...flat,
        characteristics: Object.keys(rest).length > 0 ? rest : null,
    };
}

export function withColumnView<T extends object>(
    row: T,
    system: RuleSystemDefinition
): T {
    const view = system.characteristics.columnView;

    if (!view || !('characteristics' in row)) return row;

    return { ...row, ...view.read(row as { characteristics?: unknown }) };
}

export function splitColumnView(
    data: Record<string, unknown>,
    system: RuleSystemDefinition,
    prev?: unknown
): {
    characteristics: SystemData | undefined;
    columns: Record<string, number>;
} {
    const view = system.characteristics.columnView;

    const columns = Object.fromEntries(
        (view?.columns ?? []).flatMap((column) =>
            typeof data[column] === 'number'
                ? [[column, data[column] as number]]
                : []
        )
    );

    if (!view || Object.keys(columns).length === 0)
        return { characteristics: undefined, columns };

    return {
        characteristics: view.write(columns, isRecord(prev) ? prev : {}),
        columns,
    };
}
