import type { SystemOpBody } from '@/lib/api/battle-ops';

export interface ConditionTestBody {
    participantId: string;
    condition: string;
    roll?: number;
    serverRoll?: boolean;
}

export const conditionTestOp = (body: ConditionTestBody): SystemOpBody => ({
    action: 'condition-test',
    body,
});

export const fateReactionOp = (
    answers: Record<string, boolean>
): SystemOpBody => ({
    action: 'fate-reaction',
    body: { answers },
});

export const fortuneConditionOp = (
    participantId: string,
    condition: string
): SystemOpBody => ({
    action: 'fortune-condition',
    body: { participantId, condition },
});

export type MomentumBody =
    | { mode: 'secondAttack'; participantId: string }
    | {
          mode: 'leadership';
          participantId: string;
          allyId: string;
          roll?: number;
          serverRoll?: boolean;
      };

export const momentumOp = (body: MomentumBody): SystemOpBody => ({
    action: 'momentum',
    body,
});
