import { D20_CHARACTERISTICS_COLUMNS, D20_COLUMN_DEFAULTS } from './columns';

import { isRecord } from '@/lib/utils/common/is-record';
import type { SystemData } from '@/lib/utils/rules/systems/slot';

export function readD20Columns(
    row: { characteristics?: unknown } & Record<string, unknown>
): Record<string, number> {
    const stored = isRecord(row.characteristics) ? row.characteristics : {};

    return Object.fromEntries(
        D20_CHARACTERISTICS_COLUMNS.map((column) => {
            const value = [stored[column], row[column]].find(
                (v) => typeof v === 'number'
            );

            return [column, value ?? D20_COLUMN_DEFAULTS[column]];
        })
    );
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
