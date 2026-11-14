import { AttackType } from '@/lib/constants/battle';
import { attackKindOf } from '@/lib/utils/battle/common/attack-kind';
import { hasTrait } from '@/lib/utils/battle/common/weapon-trait';
import type {
    OffHandRules,
    TurnStateReset,
} from '@/lib/utils/rules/systems/types';
import { isFiveE } from '@/systems/d20/rules/damage-model';
import { d20State, withD20State } from '@/systems/d20/rules/state';

export const OFF_HAND_RULES: OffHandRules = {
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

export const offHandResetState: TurnStateReset = (p, scope) =>
    scope === 'turn' && d20State(p).attackedWithLight
        ? withD20State(p, { attackedWithLight: undefined })
        : p;
