import { FORTUNE_INPUT } from '../percentile/fortune';
import { wfrpState } from '../state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SystemInputCtx } from '@/lib/utils/rules/systems/types';

export function assertWfrpInput(system: SystemSlot, ctx: SystemInputCtx): void {
    const input = FORTUNE_INPUT.read(system);

    if (!input) return;

    const { actor } = ctx;

    if (ctx.kind === 'cast' && ctx.free)
        throw ruleErrorOf('action_rejected', REJECT.fortuneNotFree);

    const allowed = ctx.kind === 'attack' ? ctx.targetCount === 1 : ctx.tested;

    const pool = input.kind === 'notFail' ? 'fate' : 'fortune';

    if (!allowed || (wfrpState(actor)[pool] ?? 0) < 1)
        throw ruleErrorOf(
            'action_rejected',
            pool === 'fate' ? API_ERRORS.NO_FATE : API_ERRORS.NO_FORTUNE
        );
}
