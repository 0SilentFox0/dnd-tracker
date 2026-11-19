import { textRef } from '@/lib/i18n/text-ref';
import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { applyRawDamage } from '@/lib/utils/abilities/engine/effects/hp';
import {
    type ActionFlow,
    applyFlowDamage,
    getP,
    put,
    settleDowned,
} from '@/lib/utils/battle/common/action-flow';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { dealsNoDamage } from '@/lib/utils/battle/participant/state';
import { applyResistance } from '@/lib/utils/battle/resistance';
import type { BattleAttack } from '@/types/battle';

export function applyThorns(
    flow: ActionFlow,
    a: {
        attackerId: string;
        targetId: string;
        attack: BattleAttack;
        tempHpBefore: number;
    }
): void {
    const kind = attackKindOf(a.attack.type);

    const flags = findFlags(flow.ps, a.targetId, 'thorns').filter(
        (f) =>
            f.attackKinds.includes(kind) &&
            (!f.whileTempHp || a.tempHpBefore > 0)
    );

    for (const f of flags) {
        const attacker = getP(flow, a.attackerId);

        if (!isActive(attacker) || dealsNoDamage(attacker)) return;

        const resisted = applyResistance(attacker, f.damage, f.damageType, {
            participants: flow.ps,
            fromSpell: true,
            rules: flow.ctx.rules,
        });

        if (resisted.finalDamage <= 0) continue;

        put(flow, applyRawDamage(attacker, resisted.finalDamage));
        applyFlowDamage(
            flow,
            attacker,
            resisted.finalDamage,
            false,
            undefined,
            f.damageType
        );
        flow.messages.push(
            textRef('battleLog.attack.thorns', {
                target: getP(flow, a.targetId).basicInfo.name,
                attacker: attacker.basicInfo.name,
                damage: resisted.finalDamage,
                type: f.damageType,
            })
        );
        settleDowned(flow, a.attackerId, a.targetId);
    }
}
