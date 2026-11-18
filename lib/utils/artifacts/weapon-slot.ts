import { moduleVocab } from '@/lib/utils/rules/systems/vocab';

const WEAPON_SLOTS = new Set([
    'weapon',
    'mainHand',
    ...moduleVocab('equipSlots')
        .filter((s) => s.weapon)
        .map((s) => s.id),
    'range_weapon',
]);

export const isWeaponSlot = (slot: string | null | undefined) =>
    !!slot && WEAPON_SLOTS.has(slot);

/** Legacy rows carry the category only as the description prefix ("Martial Melee Weapon."). */
export const weaponCategoryFromText = (
    text: string | null | undefined
): 'simple' | 'martial' | undefined => {
    const m = /^\s*(simple|martial)\b/i.exec(text ?? '');

    return m ? (m[1].toLowerCase() as 'simple' | 'martial') : undefined;
};
