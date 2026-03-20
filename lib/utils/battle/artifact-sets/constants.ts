/** Префікс синтетичного «артефакта» для модифікаторів бонусу сету в equippedArtifacts. */
export const SYNTHETIC_SET_BONUS_ID_PREFIX = "artifact-set:" as const;

export const SET_BONUS_EQUIP_SLOT = "set_bonus" as const;

export const SET_BONUS_DEFAULT_LABEL = "Бонус сету артефактів" as const;

export const ABILITY_KEYS_FOR_SET_BONUS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;
