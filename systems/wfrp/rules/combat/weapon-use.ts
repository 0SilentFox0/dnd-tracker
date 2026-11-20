import { canonGroupUse, type GroupUse } from '../edition/group-use';
import type { QualityRef } from '../equipment/qualities';
import { ATTACK_SLOT } from '../slots';
import { hasTalent } from '../traits/talents';
import { participantChars } from './participant';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const SHORT_BLADE = /dagger|knife/i;

/** Dual Wielder: with two weapons in hand a Dagger or Knife gains Parry (p119) */
function dualWieldParry(
    wielder: BattleParticipant,
    attack: BattleAttack
): boolean {
    if (
        attack.type !== AttackType.MELEE ||
        !SHORT_BLADE.test(attack.name) ||
        !hasTalent(wielder, 'dualWielder')
    )
        return false;

    const hands = new Set(
        wielder.battleData.attacks.flatMap((a) => {
            const hand = ATTACK_SLOT.read(a.system)?.hand;

            return a.type === AttackType.MELEE && hand ? [hand] : [];
        })
    );

    return hands.has('main') && hands.has('off');
}

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

    const qualities = use.noQualities ? [] : (slot?.qualities ?? []);

    return {
        ...use,
        refs: {
            qualities: dualWieldParry(wielder, attack)
                ? [...qualities, { key: 'parry' as const }]
                : qualities,
            flaws: [
                ...flaws,
                ...use.extraFlaws.filter(
                    (e) => !flaws.some((f) => f.key === e.key)
                ),
            ],
        },
    };
}
