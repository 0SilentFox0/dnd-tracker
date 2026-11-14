import type { RuleSystemDefinition } from './types';

import { isRecord } from '@/lib/utils/common/is-record';
import type { SystemData } from '@/lib/utils/rules/systems/slot';

type ColumnRow = { characteristics?: unknown } & Record<string, unknown>;

export function withColumnView<T extends object>(
    row: T,
    system: RuleSystemDefinition
): T {
    const view = system.characteristics.columnView;

    return view ? { ...row, ...view.read(row as ColumnRow as never) } : row;
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
