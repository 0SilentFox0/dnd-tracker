import { isRecord } from '@/lib/utils/common/is-record';
import { D20_STATE, d20StateData } from '@/systems/d20/rules/state';
import type { BattleParticipant } from '@/types/battle';

type BattleData = BattleParticipant['battleData'];

export interface LairState {
    active: boolean;
    usedRound?: number;
    lastKey?: string;
    baseResistances: number;
}

const parseLair = (raw: unknown): LairState | undefined =>
    isRecord(raw) &&
    typeof raw.active === 'boolean' &&
    typeof raw.baseResistances === 'number' &&
    Number.isFinite(raw.baseResistances)
        ? {
              active: raw.active,
              baseResistances: raw.baseResistances,
              ...(typeof raw.usedRound === 'number' && {
                  usedRound: raw.usedRound,
              }),
              ...(typeof raw.lastKey === 'string' && { lastKey: raw.lastKey }),
          }
        : undefined;

export const LAIR_STATE = D20_STATE.extend<LairState>('lair', parseLair);

const legacyLair = (battleData: BattleData): Record<string, unknown> | null => {
    const raw = (battleData as unknown as Record<string, unknown>).lair;

    return isRecord(raw) ? raw : null;
};

export const lairStateOf = (p: BattleParticipant): LairState | undefined =>
    LAIR_STATE.read(p.battleData.system) ?? parseLair(legacyLair(p.battleData));

export const resistSpentOf = (p: BattleParticipant): number =>
    (p.battleData.legendary?.resistSpent ?? 0) +
    (typeof legacyLair(p.battleData)?.resistSpent === 'number'
        ? (legacyLair(p.battleData)?.resistSpent as number)
        : 0);

/** Battle data with the state in the d20 slot; the pre-ext `battleData.lair` is folded in and dropped */
export function lairStateData(
    p: BattleParticipant,
    lair: LairState
): Partial<BattleData> {
    const base = d20StateData(p, {});

    return {
        ...base,
        system: LAIR_STATE.write(lair, base.system ?? p.battleData.system),
    };
}

const withoutLegacyLair = (battleData: BattleData): BattleData =>
    Object.fromEntries(
        Object.entries(battleData).filter(([k]) => k !== 'lair')
    ) as BattleData;

/** Moves the pre-ext `battleData.lair` into `ext.lair`; its spent resistances go to `legendary.resistSpent` */
export function upgradeLairState(battleData: BattleData): BattleData {
    const legacy = legacyLair(battleData);

    if (!legacy) return battleData;

    const owner = { battleData } as BattleParticipant;

    const state = LAIR_STATE.read(battleData.system) ?? parseLair(legacy);

    const spent = resistSpentOf(owner);

    const stripped = withoutLegacyLair(battleData);

    const next = {
        ...stripped,
        ...(battleData.legendary && {
            legendary: { ...battleData.legendary, resistSpent: spent },
        }),
    };

    return state
        ? { ...next, ...lairStateData({ battleData: next } as BattleParticipant, state) }
        : next;
}
