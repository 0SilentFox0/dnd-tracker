import { isRecord } from '@/lib/utils/common/is-record';
import type { SystemData } from '@/lib/utils/rules/systems/slot';

export interface InspirationRow {
    inspiration?: boolean | null;
    characteristics?: unknown;
}

const extSlot = (characteristics: unknown): Record<string, unknown> | null => {
    if (!isRecord(characteristics) || !isRecord(characteristics.ext))
        return null;

    const own = characteristics.ext.inspiration;

    return isRecord(own) ? own : null;
};

export function readInspiration(row: InspirationRow): boolean {
    const available = extSlot(row.characteristics)?.available;

    return typeof available === 'boolean' ? available : !!row.inspiration;
}

/** Dual-write: the column and `characteristics.ext.inspiration.available` change together; other keys stay. */
export function writeInspiration(
    row: { characteristics?: unknown },
    value: boolean
): { inspiration: boolean; characteristics: SystemData } {
    const base = isRecord(row.characteristics) ? row.characteristics : {};

    const ext = isRecord(base.ext) ? base.ext : {};

    const own = extSlot(row.characteristics) ?? {};

    return {
        inspiration: value,
        characteristics: {
            ...base,
            ext: { ...ext, inspiration: { ...own, available: value } },
        },
    };
}
