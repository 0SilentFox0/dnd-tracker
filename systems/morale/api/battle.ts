import type { SystemOpBody } from '@/lib/api/battle-ops';
import type { MoraleCheckResult } from '@/systems/morale/rules/threshold';
import type { MoraleCheckData } from '@/types/api';

export interface MoraleCheckResponse {
    moraleResult: MoraleCheckResult;
}

export const moraleCheckOp = (body: MoraleCheckData): SystemOpBody => ({
    action: 'morale-check',
    body,
});
