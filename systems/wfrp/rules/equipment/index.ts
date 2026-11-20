import { editionOf } from '../edition';
import { armourAp } from './armour';
import { wfrpBurden } from './burden';

import type { RuleSystemEquipment } from '@/lib/utils/rules/systems/types';

export { armourAp, armourTestPenalties, parseWfrpStats } from './armour';
export { applyBurden, wfrpBurden } from './burden';
export {
    type CarriedArtifact,
    carriedLoad,
    type CarriedSpecial,
} from './carried';
export * from './constants';
export {
    burdenedAgility,
    burdenedMove,
    type BurdenTier,
    burdenTierOf,
    COINS_PER_ENC,
    type Encumbrance,
    encumbrance,
    type EncumbranceReport,
    OVERSIZED_ENC,
} from './encumbrance';
export * from './qualities';
export {
    type QualityEffect,
    qualityEffects,
    qualityFumbleFrom,
    qualityToHit,
} from './quality-effects';
export type * from './stats';
export { type WeaponProfile, weaponProfile } from './weapon-profile';

export const WFRP_EQUIPMENT: RuleSystemEquipment = {
    armourAp: (equipped, rules) => {
        const canon = !rules || editionOf(rules).gearModel === 'canon';

        const { metalAp, ...gear } = armourAp(equipped, {
            singleShield: !!rules && canon,
        });

        const traits = !rules || editionOf(rules).traitModel === 'canon';

        const kept = traits && metalAp ? { ...gear, metalAp } : gear;

        return rules && !canon ? { ...kept, shield: 0 } : kept;
    },
    burden: wfrpBurden,
};
