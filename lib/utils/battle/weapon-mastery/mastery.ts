import {
    WEAPON_MASTERY_RE,
    type WeaponMastery,
} from '@/lib/constants/weapon-mastery';
import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleAttack, BattleParticipant } from '@/types/battle';

const slugOf = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

/** The mastery property written into the weapon's properties text, e.g. "Heavy. Mastery: Topple" */
export function weaponMasteryOf(
    attack: Pick<BattleAttack, 'properties'>
): WeaponMastery | null {
    const found = WEAPON_MASTERY_RE.exec(attack.properties ?? '');

    return found ? (found[1].toLowerCase() as WeaponMastery) : null;
}

/** Weapon kinds the creature trained (slugs like `longsword`), from `params.weaponMastery` of its abilities */
export const trainedKinds = (p: BattleParticipant): string[] =>
    resolvedAbilitiesOf(p).flatMap((a) => a.params?.weaponMastery ?? []);

/** A magic variant counts as its base kind: `+1 Longsword` and `Mace of Terror` match `longsword` and `mace`. */
export const attackIsKind = (attack: Pick<BattleAttack, 'name'>, kind: string) =>
    `-${slugOf(attack.name)}-`.includes(`-${kind}-`);

/** The mastery in effect for this attack: the weapon has one and the creature trained this kind of weapon */
export function activeMastery(
    p: BattleParticipant,
    attack: BattleAttack
): WeaponMastery | null {
    const mastery = weaponMasteryOf(attack);

    return mastery && trainedKinds(p).some((k) => attackIsKind(attack, k))
        ? mastery
        : null;
}
