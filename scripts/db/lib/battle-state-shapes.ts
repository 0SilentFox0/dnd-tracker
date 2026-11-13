import {
    hashJson,
    stableStringify,
} from '@/lib/utils/battle/store/stable-json';
import { isRecord } from '@/lib/utils/common/is-record';

/** The only place that names participant fields; keep in sync with the system state codecs. */
export const LEGACY_SNAPSHOT_FIELDS: readonly string[] = [
    'fortune',
    'channelledSl',
    'sin',
    'conditionTests',
];

export const LEGACY_STATE_FIELDS: readonly string[] = ['psychologyTested'];

/** slot `ext[module][from]` goes back to the flat `state[to]` */
export const EXT_TO_LEGACY: Record<string, { from: string; to: string }> = {};

/** neutral flags that only exist next to a slot and are dropped on downgrade */
export const NEUTRAL_STATE_FIELDS: readonly string[] = [];

export type ParticipantShape = 'none' | 'legacy' | 'slot' | 'mixed';

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

export interface DowngradedParticipant {
    snapshot: unknown;
    state: unknown;
    snapshotHash: string;
    changed: boolean;
    unmapped: string[];
}

export interface DowngradedHistory {
    state: unknown;
    changed: boolean;
    unmapped: string[];
}

const stateLegacyNames = (): string[] => [
    ...LEGACY_STATE_FIELDS,
    ...Object.values(EXT_TO_LEGACY).map((m) => m.to),
];

export function readSlot(state: unknown): SlotShape | undefined {
    if (!isRecord(state)) return undefined;

    const slot = state.system;

    if (!isRecord(slot) || typeof slot.key !== 'string') return undefined;

    return { key: slot.key, data: isRecord(slot.data) ? slot.data : {} };
}

const battleDataOf = (snapshot: unknown): Json =>
    isRecord(snapshot) && isRecord(snapshot.battleData)
        ? snapshot.battleData
        : {};

function legacyOf(snapshot: unknown, state: unknown): Json {
    const battleData = battleDataOf(snapshot);

    const stateRecord = isRecord(state) ? state : {};

    const legacy: Json = {};

    for (const name of LEGACY_SNAPSHOT_FIELDS)
        if (battleData[name] !== undefined) legacy[name] = battleData[name];

    for (const name of stateLegacyNames())
        if (stateRecord[name] !== undefined) legacy[name] = stateRecord[name];

    return legacy;
}

export function shapeOf(
    row: Pick<ParticipantRow, 'snapshot' | 'state'>
): ParticipantShape {
    const slot = readSlot(row.state) !== undefined;

    const legacy = Object.keys(legacyOf(row.snapshot, row.state)).length > 0;

    if (slot && legacy) return 'mixed';

    if (slot) return 'slot';

    return legacy ? 'legacy' : 'none';
}

export function fieldsOf(row: Pick<ParticipantRow, 'snapshot' | 'state'>): {
    slotKey?: string;
    slot: Json;
    legacy: Json;
} {
    const slot = readSlot(row.state);

    return {
        ...(slot && { slotKey: slot.key }),
        slot: slot?.data ?? {},
        legacy: legacyOf(row.snapshot, row.state),
    };
}

export const hashMismatch = (
    row: Pick<ParticipantRow, 'snapshot' | 'snapshotHash'>
): boolean => row.snapshotHash !== hashJson(row.snapshot);

function splitSlot(slot: SlotShape): {
    snapshotValues: Json;
    stateValues: Json;
    unmapped: string[];
} {
    const snapshotValues: Json = {};

    const stateValues: Json = {};

    const unmapped: string[] = [];

    for (const [name, value] of Object.entries(slot.data)) {
        if (name === 'ext') continue;

        if (LEGACY_SNAPSHOT_FIELDS.includes(name)) snapshotValues[name] = value;
        else if (LEGACY_STATE_FIELDS.includes(name)) stateValues[name] = value;
        else unmapped.push(`data.${name}`);
    }

    if (slot.data.ext !== undefined) {
        const ext = isRecord(slot.data.ext) ? slot.data.ext : {};

        if (!isRecord(slot.data.ext)) unmapped.push('ext');

        for (const [module, value] of Object.entries(ext)) {
            const map = EXT_TO_LEGACY[module];

            if (!map || !isRecord(value)) {
                unmapped.push(`ext.${module}`);

                continue;
            }

            if (value[map.from] !== undefined)
                stateValues[map.to] = value[map.from];
        }
    }

    return { snapshotValues, stateValues, unmapped };
}

function alignState(state: unknown, stateValues: Json): Json {
    const next: Json = isRecord(state) ? { ...state } : {};

    delete next.system;

    for (const name of [...NEUTRAL_STATE_FIELDS, ...stateLegacyNames()])
        delete next[name];

    return Object.assign(next, stateValues);
}

function alignSnapshot(snapshot: unknown, snapshotValues: Json): Json {
    const next: Json = isRecord(snapshot) ? { ...snapshot } : {};

    const battleData: Json = { ...battleDataOf(snapshot) };

    for (const name of LEGACY_SNAPSHOT_FIELDS) delete battleData[name];

    Object.assign(battleData, snapshotValues);

    if (Object.keys(battleData).length > 0 || 'battleData' in next)
        next.battleData = battleData;

    return next;
}

function downgradeStored(stored: {
    snapshot: unknown;
    state: unknown;
    snapshotHash: string;
}): DowngradedParticipant {
    const slot = readSlot(stored.state);

    if (!slot) return { ...stored, changed: false, unmapped: [] };

    const { snapshotValues, stateValues, unmapped } = splitSlot(slot);

    const snapshot = alignSnapshot(stored.snapshot, snapshotValues);

    const state = alignState(stored.state, stateValues);

    const snapshotHash = hashJson(snapshot);

    const changed =
        snapshotHash !== stored.snapshotHash ||
        stableStringify(snapshot) !== stableStringify(stored.snapshot) ||
        stableStringify(state) !== stableStringify(stored.state);

    return { snapshot, state, snapshotHash, changed, unmapped };
}

/** a row without a slot is left alone: the slot is the source of truth */
export function downgradeParticipant(
    row: ParticipantRow
): DowngradedParticipant {
    return downgradeStored(row);
}

const idOf = (p: unknown): string | undefined =>
    isRecord(p) && isRecord(p.columns) && typeof p.columns.id === 'string'
        ? p.columns.id
        : undefined;

/** heavy fields of participants without `changedSnapshots` in this row come from a later snapshot; that is the undo approximation */
export function downgradeHistory(state: unknown): DowngradedHistory {
    if (!isRecord(state)) return { state, changed: false, unmapped: [] };

    const unmapped: string[] = [];

    const changedSnapshots = isRecord(state.changedSnapshots)
        ? { ...state.changedSnapshots }
        : undefined;

    const next: Json = { ...state };

    if (Array.isArray(state.participants))
        next.participants = state.participants.map((p: unknown) => {
            const slot = isRecord(p) ? readSlot(p.state) : undefined;

            if (!isRecord(p) || !slot) return p;

            const split = splitSlot(slot);

            unmapped.push(...split.unmapped);

            const id = idOf(p);

            if (changedSnapshots && id && id in changedSnapshots)
                changedSnapshots[id] = alignSnapshot(
                    changedSnapshots[id],
                    split.snapshotValues
                );

            return { ...p, state: alignState(p.state, split.stateValues) };
        });

    if (changedSnapshots) next.changedSnapshots = changedSnapshots;

    if (Array.isArray(state.removed))
        next.removed = state.removed.map((r: unknown) => {
            if (!isRecord(r)) return r;

            const result = downgradeStored({
                snapshot: r.snapshot,
                state: r.state,
                snapshotHash:
                    typeof r.snapshotHash === 'string' ? r.snapshotHash : '',
            });

            unmapped.push(...result.unmapped);

            if (!result.changed) return r;

            return {
                ...r,
                snapshot: result.snapshot,
                state: result.state,
                snapshotHash: result.snapshotHash,
            };
        });

    return {
        state: next,
        changed: stableStringify(next) !== stableStringify(state),
        unmapped,
    };
}
