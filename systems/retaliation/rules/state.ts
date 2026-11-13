import type { TurnStateReset } from '@/lib/utils/rules/systems/types';
import { D20_STATE, d20StateData } from '@/systems/d20/rules/state';
import type { BattleParticipant } from '@/types/battle';

export interface RetaliationState {
    used: number;
}

export const RETALIATION_STATE = D20_STATE.extend<RetaliationState>(
    'retaliation',
    (raw) =>
        typeof raw === 'object' &&
        raw !== null &&
        typeof (raw as { used?: unknown }).used === 'number' &&
        Number.isFinite((raw as { used: number }).used)
            ? { used: (raw as { used: number }).used }
            : undefined
);

/** Retaliations given since the owner's turn began, as stored */
export const retaliationsUsedOf = (p: BattleParticipant): number | undefined =>
    RETALIATION_STATE.read(p.battleData.system)?.used;

/** Without a count the reaction flag stands for one retaliation */
export const retaliationUsed = (p: BattleParticipant): number =>
    retaliationsUsedOf(p) ?? (p.actionFlags.hasUsedReaction ? 1 : 0);

/** Battle data with the count in the d20 slot; the base state moves in with it */
export function retaliationStateData(
    p: BattleParticipant,
    used: number
): Partial<BattleParticipant['battleData']> {
    const base = d20StateData(p, {});

    return {
        ...base,
        system: RETALIATION_STATE.write(
            { used },
            base.system ?? p.battleData.system
        ),
    };
}

export const retaliationResetState: TurnStateReset = (p) =>
    (retaliationsUsedOf(p) ?? 0) > 0
        ? {
              ...p,
              battleData: {
                  ...p.battleData,
                  ...retaliationStateData(p, 0),
              },
          }
        : p;
