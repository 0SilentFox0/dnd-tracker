import type { MoraleCheckResult } from '@/lib/utils/battle/morale/threshold';

export type TurnGateOutcome = 'extra' | 'skip' | 'none';

export function moraleOutcome(
    r:
        | Pick<MoraleCheckResult, 'hasExtraTurn' | 'shouldSkipTurn'>
        | null
        | undefined
): TurnGateOutcome {
    return r?.hasExtraTurn ? 'extra' : r?.shouldSkipTurn ? 'skip' : 'none';
}

export interface TurnFlowState {
    phase: 'waiting' | 'gate' | 'acting' | 'countdown' | 'ended';
    stayed: boolean;
    gateResult?: TurnGateOutcome;
}

export type TurnFlowAction =
    | { type: 'BEGIN'; gated: boolean }
    | { type: 'GATE_RESULT'; result: TurnGateOutcome }
    | { type: 'EXHAUSTED' }
    | { type: 'STAY' }
    | { type: 'END' }
    | { type: 'RECOVER' };

export const initialTurnFlow: TurnFlowState = {
    phase: 'waiting',
    stayed: false,
};

export const COUNTDOWN_SECONDS = 5;

export const TURN_SKIP_MS = 4_000;

export function turnFlow(s: TurnFlowState, a: TurnFlowAction): TurnFlowState {
    switch (a.type) {
        case 'BEGIN':
            return {
                phase: a.gated ? 'gate' : 'acting',
                stayed: false,
            };
        case 'GATE_RESULT':
            return s.phase === 'gate'
                ? {
                      ...s,
                      phase: a.result === 'skip' ? 'ended' : 'acting',
                      gateResult: a.result,
                  }
                : s;
        case 'EXHAUSTED':
            return s.phase === 'acting' && !s.stayed
                ? { ...s, phase: 'countdown' }
                : s;
        case 'STAY':
            return s.phase === 'countdown'
                ? { ...s, phase: 'acting', stayed: true }
                : s;
        case 'END':
            return { ...s, phase: 'ended' };
        case 'RECOVER':
            return s.phase === 'ended'
                ? { ...s, phase: 'acting', stayed: true }
                : s;
    }
}
