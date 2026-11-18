import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

export interface DeathSaves {
    successes: number;
    failures: number;
    stable: boolean;
}

export interface D20ParticipantState {
    deathSaves?: DeathSaves;
    inspiration?: true;
    inspirationSpent?: true;
    attackedWithLight?: true;
}

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

const parseDeathSaves = (raw: unknown): DeathSaves | undefined =>
    isRecord(raw) && finite(raw.successes) && finite(raw.failures)
        ? {
              successes: raw.successes,
              failures: raw.failures,
              stable: raw.stable === true,
          }
        : undefined;

const flag = (raw: unknown): true | undefined =>
    raw === true ? true : undefined;

const EXT_KEYS = ['deathsaves', 'inspiration', 'offhand'] as const;

const LEGACY_KEYS = [
    'deathSaves',
    'inspiration',
    'inspirationSpent',
    'attackedWithLight',
] as const;

/** Module state sits in `ext`; the flat fields are the pre-ext shape, read as a fallback and dropped on the next write */
const parseState = (raw: unknown): D20ParticipantState | undefined => {
    if (!isRecord(raw)) return undefined;

    const ext = isRecord(raw.ext) ? raw.ext : {};

    const inspiration = isRecord(ext.inspiration) ? ext.inspiration : undefined;

    const offhand = isRecord(ext.offhand) ? ext.offhand : undefined;

    const deathSaves = parseDeathSaves(
        ext.deathsaves !== undefined ? ext.deathsaves : raw.deathSaves
    );

    const available = inspiration
        ? flag(inspiration.available)
        : flag(raw.inspiration);

    const spent = inspiration
        ? flag(inspiration.spent)
        : flag(raw.inspirationSpent);

    const attackedWithLight = offhand
        ? flag(offhand.attackedWithLight)
        : flag(raw.attackedWithLight);

    return {
        ...(deathSaves && { deathSaves }),
        ...(available && { inspiration: true as const }),
        ...(spent && { inspirationSpent: true as const }),
        ...(attackedWithLight && { attackedWithLight: true as const }),
    };
};

export const D20_STATE = defineSlot<D20ParticipantState>('d20', parseState);

export const d20State = (p: BattleParticipant): D20ParticipantState =>
    D20_STATE.read(p.battleData.system) ?? {};

const omit = (
    source: Record<string, unknown>,
    keys: readonly string[]
): Record<string, unknown> =>
    Object.fromEntries(Object.entries(source).filter(([k]) => !keys.includes(k)));

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

    const ext = {
        ...omit(isRecord(base.ext) ? base.ext : {}, EXT_KEYS),
        ...(state.deathSaves && { deathsaves: state.deathSaves }),
        ...((state.inspiration || state.inspirationSpent) && {
            inspiration: {
                ...(state.inspiration && { available: true }),
                ...(state.inspirationSpent && { spent: true }),
            },
        }),
        ...(state.attackedWithLight && {
            offhand: { attackedWithLight: true },
        }),
    };

    const data = {
        ...omit(base, [...LEGACY_KEYS, 'ext']),
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
