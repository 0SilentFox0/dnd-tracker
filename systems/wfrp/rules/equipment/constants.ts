// All values: verify against 5e book.
export const AP_MAX_PER_LAYER = 8;

export const AP_CAP = 12;

export const ARMOUR_KINDS = ["soft", "mail", "plate"] as const;

export const WEAPON_GROUPS = ["basic", "cavalry", "fencing", "brawling", "flail", "parry", "polearm", "twohanded", "bow", "crossbow", "blackpowder", "engineering", "entangling", "sling", "throwing", "explosives"] as const;

export const WEAPON_REACHES = ["personal", "very-short", "short", "average", "long", "very-long", "massive"] as const;

export const QUALITY_VALUE_MAX = 20;

export const ARMOUR_SLOTS: ReadonlySet<string> = new Set(["armor", "helmet", "boots"]);

export const SHIELD_SLOTS: ReadonlySet<string> = new Set(["shield", "weapon", "range_weapon"]);

export const WEAPON_SLOTS: ReadonlySet<string> = new Set(["weapon", "range_weapon"]);

/** Only a two-handed weapon wielded in the melee slot frees no hand for a shield; a stowed bow does not */
export const MELEE_SLOT = "weapon";
