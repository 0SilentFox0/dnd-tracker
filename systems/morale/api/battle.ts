import type { SystemOpBody } from '@/lib/api/battle-ops';
import type { MoraleCheckResult } from '@/systems/morale/rules/threshold';
import type { MoraleCheckInput as MoraleCheckData } from '@/systems/morale/server/battle/schema';

export interface MoraleCheckResponse {
    moraleResult: MoraleCheckResult;
}

export const moraleCheckOp = (body: MoraleCheckData): SystemOpBody => ({
    action: 'morale-check',
    body,
});
