import { isRecord } from '@/lib/utils/common/is-record';
import { getAtPath } from '@/lib/utils/rules/systems/stored-columns';

const PATH = ['ext', 'morale', 'value'] as const;

interface MoraleRow {
    morale?: number | null;
    characteristics?: unknown;
}

/** Dual-storage reader: `characteristics.ext.morale.value`, else the legacy column */
export function readMorale(row: MoraleRow): number | undefined {
    const stored = getAtPath(row.characteristics, PATH);

    if (typeof stored === 'number') return stored;

    return typeof row.morale === 'number' ? row.morale : undefined;
}

/** Dual-write: sets the legacy column and `characteristics.ext.morale.value`, keeping every other key */
export function writeMorale(
    row: MoraleRow,
    value: number
): { morale: number; characteristics: Record<string, unknown> } {
    const characteristics = isRecord(row.characteristics)
        ? row.characteristics
        : {};

    const ext = isRecord(characteristics.ext) ? characteristics.ext : {};

    const slot = isRecord(ext.morale) ? ext.morale : {};

    return {
        morale: value,
        characteristics: {
            ...characteristics,
            ext: { ...ext, morale: { ...slot, value } },
        },
    };
}
