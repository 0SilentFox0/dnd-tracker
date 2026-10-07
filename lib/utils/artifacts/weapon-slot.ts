const WEAPON_SLOTS = new Set(["weapon", "mainHand", "offHand", "range_weapon"]);

export const isWeaponSlot = (slot: string | null | undefined) => !!slot && WEAPON_SLOTS.has(slot);
