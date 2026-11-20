import { editionOf } from '../edition';
import { armourAp } from './armour';
import { wfrpBurden } from './burden';

import type { RuleSystemEquipment } from '@/lib/utils/rules/systems/types';

export { armourAp, parseWfrpStats } from './armour';
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

        const gear = armourAp(equipped, { singleShield: !!rules && canon });

        return rules && !canon ? { ...gear, shield: 0 } : gear;
    },
    burden: wfrpBurden,
};
