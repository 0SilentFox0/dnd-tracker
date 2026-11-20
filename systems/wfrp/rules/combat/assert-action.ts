import { wfrpState } from '../state';
import { isFrenzied } from '../traits/frenzy';
import { compelTargets, inGroup } from '../traits/passions';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { ruleErrorOf } from '@/lib/utils/battle/store/errors';
import type { ActionAssertCtx } from '@/lib/utils/rules/systems/types-combat';

/** Frenzy allows only melee attacks (p184); a failed Hatred test forces attacks onto the hated group (p184) */
export function assertWfrpAction(ctx: ActionAssertCtx): void {
    const { actor } = ctx;

    if (isFrenzied(actor)) {
        if (ctx.kind === 'cast')
            throw ruleErrorOf('action_rejected', API_ERRORS.FRENZY_NO_CAST);

        if (attackKindOf(ctx.attack.type) !== AttackType.MELEE)
            throw ruleErrorOf('action_rejected', API_ERRORS.FRENZY_MELEE_ONLY);

        return;
    }

    if (ctx.kind !== 'attack') return;

    for (const { group } of Object.values(wfrpState(actor).compelled ?? {})) {
        if (
            compelTargets(ctx.participants, actor, group).length > 0 &&
            !ctx.targets.every((t) => inGroup(t, group))
        )
            throw ruleErrorOf('invalid_target', {
                message: API_ERRORS.HATRED_COMPELLED,
                params: { group },
            });
    }
}
