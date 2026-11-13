import type { WeaponTrait } from '@/lib/constants/weapon-traits';
import type { BattleAttack } from '@/types/battle';

export const hasTrait = (
    a: Pick<BattleAttack, 'traits'>,
    t: WeaponTrait
): boolean => !!a.traits?.includes(t);
