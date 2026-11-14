import { D20_CHARACTERISTICS_COLUMNS } from './columns';

import { isRecord } from '@/lib/utils/common/is-record';
import type { SystemData } from '@/lib/utils/rules/systems/slot';

export function readD20Columns(
    row: { characteristics: unknown } & Record<string, unknown>
): Record<string, number> {
    const stored = isRecord(row.characteristics) ? row.characteristics : {};

    const out: Record<string, number> = {};

    for (const column of D20_CHARACTERISTICS_COLUMNS) {
        const value = stored[column] ?? row[column];

        if (typeof value === 'number') out[column] = value;
    }

    return out;
}

export function writeD20Columns(
    cols: Partial<Record<string, number>>,
    prev: unknown
): SystemData {
    const picked = Object.fromEntries(
        D20_CHARACTERISTICS_COLUMNS.flatMap((column) =>
            cols[column] === undefined ? [] : [[column, cols[column]]]
        )
    );

    return { ...(isRecord(prev) ? prev : {}), ...picked };
}
