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
    'deathSaves',
    'inspiration',
    'inspirationSpent',
    'attackedWithLight',
];

export const LEGACY_STATE_FIELDS: readonly string[] = ['psychologyTested'];

/** slot `ext[module][from]` goes back to the flat `state[to]` */
export const EXT_TO_LEGACY: Record<string, { from: string; to: string }> = {
    retaliation: { from: 'used', to: 'retaliationsUsed' },
};

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
        slot: slot ? flatSlotData(slot) : {},
        legacy: legacyOf(row.snapshot, row.state),
    };
}

/** slot data with each known ext value listed under the name of its flat counterpart, so slot and legacy compare field by field */
function flatSlotData(slot: SlotShape): Json {
    const { ext, ...rest } = slot.data;

    const flat: Json = { ...rest };

    if (isRecord(ext))
        for (const [module, value] of Object.entries(ext)) {
            const map = EXT_TO_LEGACY[module];

            if (map && isRecord(value) && value[map.from] !== undefined)
                flat[map.to] = value[map.from];
            else flat[`ext.${module}`] = value;
        }
    else if (ext !== undefined) flat.ext = ext;

    return flat;
}

export const hashMismatch = (
    row: Pick<ParticipantRow, 'snapshot' | 'snapshotHash'>
): boolean => row.snapshotHash !== hashJson(row.snapshot);

function stripLegacySnapshot(snapshot: unknown): Json {
    const next: Json = isRecord(snapshot) ? { ...snapshot } : {};

    const battleData: Json = { ...battleDataOf(snapshot) };

    for (const name of LEGACY_SNAPSHOT_FIELDS) delete battleData[name];

    if (Object.keys(battleData).length > 0 || 'battleData' in next)
        next.battleData = battleData;

    return next;
}

const idOf = (p: unknown): string | undefined =>
    isRecord(p) && isRecord(p.columns) && typeof p.columns.id === 'string'
        ? p.columns.id
        : undefined;

export interface UpgradedParticipant {
    snapshot: unknown;
    state: unknown;
    snapshotHash: string;
    changed: boolean;
    unmapped: string[];
}

export interface UpgradedHistory {
    state: unknown;
    changed: boolean;
    unmapped: string[];
}

interface UpgradedFields {
    snapshot: unknown;
    state: unknown;
    changed: boolean;
    unmapped: string[];
}

function upgradeFields(
    snapshot: unknown,
    state: unknown,
    baseKey: string
): UpgradedFields {
    const legacy = legacyOf(snapshot, state);

    if (Object.keys(legacy).length === 0)
        return { snapshot, state, changed: false, unmapped: [] };

    const slot = readSlot(state);

    if (slot && slot.key !== baseKey)
        return {
            snapshot,
            state,
            changed: false,
            unmapped: [`slot.key ${slot.key}`],
        };

    const flatNames = Object.values(EXT_TO_LEGACY).map((m) => m.to);

    const ext: Json =
        slot && isRecord(slot.data.ext) ? { ...slot.data.ext } : {};

    for (const [module, map] of Object.entries(EXT_TO_LEGACY))
        if (legacy[map.to] !== undefined && !(module in ext))
            ext[module] = { [map.from]: legacy[map.to] };

    const baseFields = Object.fromEntries(
        Object.entries(legacy).filter(([name]) => !flatNames.includes(name))
    );

    const data: Json = slot ? { ...slot.data } : { ...baseFields };

    if (Object.keys(ext).length > 0) data.ext = ext;

    const nextState: Json = isRecord(state) ? { ...state } : {};

    for (const name of [...LEGACY_STATE_FIELDS, ...flatNames])
        delete nextState[name];

    nextState.system = {
        ...(isRecord(nextState.system) ? nextState.system : {}),
        key: baseKey,
        data,
    };

    if (!slot && baseFields.deathSaves !== undefined) nextState.dying = true;

    return {
        snapshot: stripLegacySnapshot(snapshot),
        state: nextState,
        changed: true,
        unmapped: [],
    };
}

/** a missing base slot is built from the flat fields, an existing one just drops them */
export function upgradeStored(
    row: {
        snapshot: unknown;
        state: unknown;
        snapshotHash: string;
    },
    baseKey: string
): UpgradedParticipant {
    const result = upgradeFields(row.snapshot, row.state, baseKey);

    if (!result.changed) return { ...row, ...result };

    return { ...result, snapshotHash: hashJson(result.snapshot) };
}

export function upgradeHistory(
    state: unknown,
    baseKey: string
): UpgradedHistory {
    if (!isRecord(state)) return { state, changed: false, unmapped: [] };

    const unmapped: string[] = [];

    const changedSnapshots = isRecord(state.changedSnapshots)
        ? { ...state.changedSnapshots }
        : undefined;

    const next: Json = { ...state };

    if (Array.isArray(state.participants))
        next.participants = state.participants.map((p: unknown) => {
            const id = idOf(p);

            if (!isRecord(p) || id === undefined) return p;

            const result = upgradeFields(
                changedSnapshots?.[id],
                p.state,
                baseKey
            );

            unmapped.push(...result.unmapped);

            if (!result.changed) return p;

            if (changedSnapshots && id in changedSnapshots)
                changedSnapshots[id] = result.snapshot;

            return { ...p, state: result.state };
        });

    if (changedSnapshots) next.changedSnapshots = changedSnapshots;

    if (Array.isArray(state.removed))
        next.removed = state.removed.map((r: unknown) => {
            if (!isRecord(r)) return r;

            const result = upgradeStored(
                {
                    snapshot: r.snapshot,
                    state: r.state,
                    snapshotHash:
                        typeof r.snapshotHash === 'string'
                            ? r.snapshotHash
                            : '',
                },
                baseKey
            );

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

/** counts the same places `upgradeHistory` rewrites */
export function historyHasLegacy(state: unknown): boolean {
    if (!isRecord(state)) return false;

    const changedSnapshots = isRecord(state.changedSnapshots)
        ? state.changedSnapshots
        : undefined;

    const inParticipants =
        Array.isArray(state.participants) &&
        state.participants.some((p: unknown) => {
            const id = idOf(p);

            return (
                isRecord(p) &&
                id !== undefined &&
                Object.keys(legacyOf(changedSnapshots?.[id], p.state)).length >
                    0
            );
        });

    const inRemoved =
        Array.isArray(state.removed) &&
        state.removed.some(
            (r: unknown) =>
                isRecord(r) &&
                Object.keys(legacyOf(r.snapshot, r.state)).length > 0
        );

    return inParticipants || inRemoved;
}
