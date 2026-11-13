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
