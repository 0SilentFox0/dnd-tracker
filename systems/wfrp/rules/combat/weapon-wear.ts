import type { QualityRef } from '../equipment/qualities';
import { wfrpState, withWfrpState } from '../state';

import type { BattleAttack, BattleParticipant } from '@/types/battle';

export const attackWearKey = (attack: Pick<BattleAttack, 'id' | 'name'>) =>
    attack.id ?? attack.name;

const isUnbreakable = (qualities: readonly QualityRef[] | undefined) =>
    !!qualities?.some((q) => q.key === 'unbreakable');

/** Damaged Weapons (p164): each point of damage lowers the weapon's Damage by 1; Unbreakable ignores it */
export function wearWeapon(
    p: BattleParticipant,
    key: string,
    qualities?: readonly QualityRef[]
): BattleParticipant {
    if (isUnbreakable(qualities)) return p;

    const worn = wfrpState(p).weaponWear ?? {};

    return withWfrpState(p, {
        weaponWear: { ...worn, [key]: (worn[key] ?? 0) + 1 },
    });
}

export const wornWeaponDamage = (
    weapon: number,
    p: BattleParticipant,
    attack: Pick<BattleAttack, 'id' | 'name'>
): number =>
    Math.max(
        0,
        weapon - (wfrpState(p).weaponWear?.[attackWearKey(attack)] ?? 0)
    );

const BROKEN_WEAR = 1000;

/** A snapped weapon (Trap Blade, p305) deals no damage; Unbreakable survives */
export function breakWeapon(
    p: BattleParticipant,
    key: string,
    qualities?: readonly QualityRef[]
): BattleParticipant {
    if (isUnbreakable(qualities)) return p;

    return withWfrpState(p, {
        weaponWear: { ...(wfrpState(p).weaponWear ?? {}), [key]: BROKEN_WEAR },
    });
}
