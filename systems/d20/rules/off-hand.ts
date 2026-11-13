import { isFiveE } from './damage-model';
import { d20State, withD20State } from './state';

import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { hasTrait } from '@/lib/utils/battle/common/weapon-trait';
import type { OffHandRules } from '@/lib/utils/rules/systems/types';

export const D20_OFF_HAND: OffHandRules = {
    allowed: isFiveE,
    ready: (p) =>
        isFiveE(p) &&
        !!d20State(p).attackedWithLight &&
        !p.actionFlags.hasUsedBonusAction &&
        p.battleData.attacks.some((a) => a.hand === 'off'),
    arm: (p, attack) =>
        attack.hand !== 'off' &&
        attackKindOf(attack.type) === AttackType.MELEE &&
        hasTrait(attack, 'light') &&
        isFiveE(p)
            ? withD20State(p, { attackedWithLight: true })
            : p,
};
