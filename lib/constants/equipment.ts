/**
 * Константи для обладнання D&D 5e
 */

export const EQUIPMENT_SLOTS = [
  { key: "head", label: "Голова" },
  { key: "neck", label: "Шия" },
  { key: "shoulders", label: "Плечі" },
  { key: "chest", label: "Груди" },
  { key: "waist", label: "Пояс" },
  { key: "legs", label: "Ноги" },
  { key: "feet", label: "Ступні" },
  { key: "wrist", label: "Зап'ястя" },
  { key: "hands", label: "Руки" },
  { key: "finger1", label: "Перстень 1" },
  { key: "finger2", label: "Перстень 2" },
  { key: "trinket", label: "Безделушка" },
  { key: "mainHand", label: "Основна рука" },
  { key: "offHand", label: "Другорядна рука" },
] as const;

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]["key"];

/**
 * Типи модифікаторів артефактів
 */
export enum ArtifactModifierType {
  DAMAGE_DICE = "damageDice",
  DAMAGE_TYPE = "damageType",
  ATTACK_TYPE = "attackType",
  RANGE = "range",
  PROPERTIES = "properties",
  MIN_TARGETS = "minTargets",
  MAX_TARGETS = "maxTargets",
}

/**
 * Дефолтні значення для модифікаторів артефактів
 */
export const DEFAULT_ARTIFACT_MODIFIERS = {
  DAMAGE_DICE: "1d6",
  DAMAGE_TYPE: "slashing",
} as const;
