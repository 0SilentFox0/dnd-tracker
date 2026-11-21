import { FORTUNE_INPUT } from '../percentile/fortune';
import { wfrpState } from '../state';
import { fateLeftOf } from './fate';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { SystemInputCtx } from '@/lib/utils/rules/systems/types';

export function assertWfrpInput(system: SystemSlot, ctx: SystemInputCtx): void {
    const input = FORTUNE_INPUT.read(system);

    if (!input || input.kind === 'none') return;

    const { actor } = ctx;

    if (ctx.kind === 'cast' && ctx.free)
        throw ruleErrorOf('action_rejected', REJECT.fortuneNotFree);

    const allowed = ctx.kind === 'attack' ? ctx.targetCount === 1 : ctx.tested;

    const isFate = input.kind === 'notFail';

    const left = isFate ? fateLeftOf(actor) : (wfrpState(actor).fortune ?? 0);

    const need = input.kind === 'reroll' ? (input.rerolls ?? 1) : 1;

    if (!allowed || left < need)
        throw ruleErrorOf(
            'action_rejected',
            isFate ? API_ERRORS.NO_FATE : API_ERRORS.NO_FORTUNE
        );
}
