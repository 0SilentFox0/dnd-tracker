import { canonGroupUse, type GroupUse } from '../edition/group-use';
import type { QualityRef } from '../equipment/qualities';
import { ATTACK_SLOT } from '../slots';
import { participantChars } from './participant';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

export type WeaponUse = GroupUse & {
    refs: { qualities: QualityRef[]; flaws: QualityRef[] };
};

/** Canon gear: qualities and flaws a wielder can actually use, given their Advances in the weapon group (p300) */
export function canonWeaponUse(
    wielder: BattleParticipant,
    attack: BattleAttack
): WeaponUse {
    const slot = ATTACK_SLOT.read(attack.system);

    const use = canonGroupUse(
        participantChars(wielder),
        attackKindOf(attack.type) === AttackType.RANGED ? 'ranged' : 'melee',
        slot?.group
    );

    const flaws = slot?.flaws ?? [];

    return {
        ...use,
        refs: {
            qualities: use.noQualities ? [] : (slot?.qualities ?? []),
            flaws: [
                ...flaws,
                ...use.extraFlaws.filter(
                    (e) => !flaws.some((f) => f.key === e.key)
                ),
            ],
        },
    };
}
