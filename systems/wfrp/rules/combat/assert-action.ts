import { editionOf } from '../edition';
import { ATTACK_SLOT } from '../slots';
import { wfrpState } from '../state';
import { isFrenzied, nearestFoes } from '../traits/frenzy';
import { compelTargets, groupLabel, inGroup } from '../traits/passions';
import { canonWeaponUse } from './weapon-use';

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

        const nearest = nearestFoes(ctx.participants, actor, ctx.map);

        if (
            nearest.length > 0 &&
            !ctx.targets.every((t) =>
                nearest.some((n) => n.basicInfo.id === t.basicInfo.id)
            )
        )
            throw ruleErrorOf('invalid_target', API_ERRORS.FRENZY_NEAREST_FOE);

        return;
    }

    if (ctx.kind !== 'attack') return;

    if (
        ctx.rules &&
        editionOf(ctx.rules).gearModel === 'canon' &&
        attackKindOf(ctx.attack.type) === AttackType.RANGED &&
        canonWeaponUse(actor, ctx.attack).forbidden
    )
        throw ruleErrorOf('action_rejected', {
            message: API_ERRORS.RANGED_GROUP_FORBIDDEN,
            params: { group: ATTACK_SLOT.read(ctx.attack.system)?.group ?? '' },
        });

    for (const { group, kind } of Object.values(
        wfrpState(actor).compelled ?? {}
    )) {
        if (
            kind !== 'animosity' &&
            compelTargets(ctx.participants, actor, group).length > 0 &&
            !ctx.targets.every((t) => inGroup(t, group))
        )
            throw ruleErrorOf('invalid_target', {
                message: API_ERRORS.HATRED_COMPELLED,
                params: { group: groupLabel(group) },
            });
    }
}
