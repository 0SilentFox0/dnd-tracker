import { D20_REACH } from '../attack/ability';

import { AttackType, EffectMarker } from '@/lib/constants/battle';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { actionReason } from '@/lib/utils/battle/actions/reasons';
import { getDisabledAttackKinds } from '@/lib/utils/battle/attack/disabled-attacks';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { hasCondition } from '@/lib/utils/battle/conditions/query';
import { hasEffectMarker } from '@/lib/utils/battle/participant/state';
import type { BattleAttack, BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export function reactionBlocker(p: BattleParticipant): LogLine | null {
    if (p.actionFlags.hasUsedReaction) return actionReason('reactionUsed');

    return !isActive(p) ||
        hasCondition(p, 'incapacitated') ||
        hasEffectMarker(p, EffectMarker.NO_REACTION)
        ? actionReason('cannotReact')
        : null;
}

export const canReact = (p: BattleParticipant) => reactionBlocker(p) === null;

export function pickMeleeAttack(p: BattleParticipant): BattleAttack | null {
    if (getDisabledAttackKinds(p).melee) return null;

    let best: BattleAttack | null = null;

    let bestReach = 0;

    for (const a of p.battleData.attacks) {
        if (a.hand === 'off' || attackKindOf(a.type) !== AttackType.MELEE)
            continue;

        const reach = a.reachCells || D20_REACH.meleeCells(p, a);

        if (reach > bestReach) {
            best = a;
            bestReach = reach;
        }
    }

    return best;
}
