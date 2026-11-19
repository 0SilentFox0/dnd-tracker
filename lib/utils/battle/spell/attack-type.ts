import { AttackType } from '@/lib/constants/battle';
import type { SpellTargeting } from '@/lib/utils/spells/model/schema';

const TOUCH_FEET = 5;

export function spellAttackType(targeting: SpellTargeting): AttackType {
    const range = 'range' in targeting ? targeting.range : undefined;

    return range === undefined || range <= TOUCH_FEET
        ? AttackType.MELEE
        : AttackType.RANGED;
}
