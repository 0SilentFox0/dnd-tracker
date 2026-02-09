/**
 * Константи для обладнання D&D 5e (legacy).
 * Константи артефактів (слоти, рідкість, сітка 3×3) — у @/lib/constants/artifacts.
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
