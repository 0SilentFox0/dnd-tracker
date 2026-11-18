import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

/** Addons add their own fields through module augmentation and register an ext codec */
 
export interface D20ParticipantState {}

export interface D20ExtCodec {
    key: string;
    /** Flat pre-ext fields of the slot this codec reads as a fallback and drops on the next write */
    legacy?: readonly string[];
    read(
        ext: unknown,
        raw: Record<string, unknown>
    ): Partial<D20ParticipantState>;
    write(state: D20ParticipantState): unknown;
}

const codecs = new Map<string, D20ExtCodec>();

export const registerD20Ext = (codec: D20ExtCodec): void => {
    codecs.set(codec.key, codec);
};

/** Module state sits in `ext`; the flat fields are the pre-ext shape, read as a fallback and dropped on the next write */
const parseState = (raw: unknown): D20ParticipantState | undefined => {
    if (!isRecord(raw)) return undefined;

    const ext = isRecord(raw.ext) ? raw.ext : {};

    return Object.assign(
        {},
        ...[...codecs.values()].map((c) => c.read(ext[c.key], raw))
    ) as D20ParticipantState;
};

export const D20_STATE = defineSlot<D20ParticipantState>('d20', parseState);

export const d20State = (p: BattleParticipant): D20ParticipantState =>
    D20_STATE.read(p.battleData.system) ?? {};

const omit = (
    source: Record<string, unknown>,
    keys: readonly string[]
): Record<string, unknown> =>
    Object.fromEntries(
        Object.entries(source).filter(([k]) => !keys.includes(k))
    );

/** A `patch` key set to `undefined` drops the field; an empty state is never written into a missing slot */
export function d20StateData(
    p: BattleParticipant,
    patch: Partial<D20ParticipantState>
): Partial<BattleData> {
    const state = Object.fromEntries(
        Object.entries({ ...d20State(p), ...patch }).filter(
            ([, v]) => v !== undefined
        )
    ) as D20ParticipantState;

    const prev = p.battleData.system;

    const hasSlot = D20_STATE.read(prev) !== undefined;

    if (!hasSlot && Object.keys(state).length === 0) return {};

    const base =
        prev?.key === D20_STATE.key && isRecord(prev.data) ? prev.data : {};

    const all = [...codecs.values()];

    const ext = {
        ...omit(
            isRecord(base.ext) ? base.ext : {},
            all.map((c) => c.key)
        ),
        ...Object.fromEntries(
            all
                .map((c) => [c.key, c.write(state)] as const)
                .filter(([, v]) => v !== undefined)
        ),
    };

    const data = {
        ...omit(base, [...all.flatMap((c) => c.legacy ?? []), 'ext']),
        ...(Object.keys(ext).length > 0 && { ext }),
    };

    return { system: { key: D20_STATE.key, data } };
}

/** Moves the flat pre-ext fields of the slot into `ext` */
export const upgradeD20State = (battleData: BattleData): BattleData => ({
    ...battleData,
    ...d20StateData({ battleData } as BattleParticipant, {}),
});

export const withD20State = (
    p: BattleParticipant,
    patch: Partial<D20ParticipantState>
): BattleParticipant => ({
    ...p,
    battleData: { ...p.battleData, ...d20StateData(p, patch) },
});
