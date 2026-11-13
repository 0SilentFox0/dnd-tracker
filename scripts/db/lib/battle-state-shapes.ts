import { hashJson } from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';

export type ParticipantShape = 'none' | 'slot';

export type Json = Record<string, unknown>;

export interface SlotShape {
    key: string;
    data: Json;
}

export interface ParticipantRow {
    id: string;
    battleId: string;
    snapshot: unknown;
    state: unknown;
    snapshotHash: string;
}

export function readSlot(state: unknown): SlotShape | undefined {
    if (!isRecord(state)) return undefined;

    const slot = state.system;

    if (!isRecord(slot) || typeof slot.key !== 'string') return undefined;

    return { key: slot.key, data: isRecord(slot.data) ? slot.data : {} };
}

export function shapeOf(
    row: Pick<ParticipantRow, 'snapshot' | 'state'>
): ParticipantShape {
    return readSlot(row.state) !== undefined ? 'slot' : 'none';
}

export function fieldsOf(row: Pick<ParticipantRow, 'snapshot' | 'state'>): {
    slotKey?: string;
    slot: Json;
} {
    const slot = readSlot(row.state);

    return {
        ...(slot && { slotKey: slot.key }),
        slot: slot ? flatSlotData(slot) : {},
    };
}

/** slot data with each `ext.<module>` value listed under its own name */
function flatSlotData(slot: SlotShape): Json {
    const { ext, ...rest } = slot.data;

    const flat: Json = { ...rest };

    if (isRecord(ext))
        for (const [module, value] of Object.entries(ext))
            flat[`ext.${module}`] = value;
    else if (ext !== undefined) flat.ext = ext;

    return flat;
}

export const hashMismatch = (
    row: Pick<ParticipantRow, 'snapshot' | 'snapshotHash'>
): boolean => row.snapshotHash !== hashJson(row.snapshot);
