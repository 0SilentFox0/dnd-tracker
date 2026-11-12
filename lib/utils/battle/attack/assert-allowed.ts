import { AttackType } from '@/lib/constants/battle';
import { getDisabledAttackKinds } from '@/lib/utils/battle/attack/disabled-attacks';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { conditionSourceIds } from '@/lib/utils/battle/conditions/query';
import { BattleRuleError } from '@/lib/utils/battle/store/errors';
import { REJECT } from '@/lib/utils/battle/store/reject';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export function assertAttackAllowed(
    attacker: BattleParticipant,
    attack: BattleAttack,
    targets: BattleParticipant[]
): void {
    const attackKind = attackKindOf(attack.type);

    if (getDisabledAttackKinds(attacker)[attackKind]) {
        throw new BattleRuleError(
            'action_rejected',
            attackKind === AttackType.RANGED
                ? REJECT.cannotAttackRanged
                : REJECT.cannotAttackMelee
        );
    }

    const charmers = conditionSourceIds(attacker, 'charmed');

    if (targets.some((t) => charmers.includes(t.basicInfo.id))) {
        throw new BattleRuleError('invalid_target', REJECT.charmedTarget, {
            name: attacker.basicInfo.name,
        });
    }
}
