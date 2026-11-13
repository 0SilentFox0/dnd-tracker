import type { SystemOpBody } from '@/lib/api/battle-ops';
import type { CritChoiceData } from '@/types/api';

export const critChoiceOp = (body: CritChoiceData): SystemOpBody => ({
    action: 'crit-choice',
    body,
});
