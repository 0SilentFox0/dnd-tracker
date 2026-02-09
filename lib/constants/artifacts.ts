/**
 * Єдині константи, типи та enum для артефактів.
 * Використовувати цей файл у формах, API та сітці слотів.
 */

// ─── Рідкість ─────────────────────────────────────────────────────────────

export enum ArtifactRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
  EPIC = "epic",
  LEGENDARY = "legendary",
}

export const ARTIFACT_RARITY_VALUES: readonly [string, ...string[]] = [
  ArtifactRarity.COMMON,
  ArtifactRarity.UNCOMMON,
  ArtifactRarity.RARE,
  ArtifactRarity.EPIC,
  ArtifactRarity.LEGENDARY,
];

export const ARTIFACT_RARITY_OPTIONS: ReadonlyArray<{
  value: ArtifactRarity;
  label: string;
}> = [
  { value: ArtifactRarity.COMMON, label: "Звичайний" },
  { value: ArtifactRarity.UNCOMMON, label: "Незвичайний" },
  { value: ArtifactRarity.RARE, label: "Рідкісний" },
  { value: ArtifactRarity.EPIC, label: "Епічний" },
  { value: ArtifactRarity.LEGENDARY, label: "Легендарний" },
];

// ─── Слот артефакта (тип обладнання) ───────────────────────────────────────

export enum ArtifactSlot {
  WEAPON = "weapon",
  RANGE_WEAPON = "range_weapon",
  SHIELD = "shield",
  CLOAK = "cloak",
  RING = "ring",
  HELMET = "helmet",
  AMULET = "amulet",
  ARMOR = "armor",
  BOOTS = "boots",
  ITEM = "item",
}

export const ARTIFACT_SLOT_VALUES: readonly [string, ...string[]] = [
  ArtifactSlot.WEAPON,
  ArtifactSlot.RANGE_WEAPON,
  ArtifactSlot.SHIELD,
  ArtifactSlot.CLOAK,
  ArtifactSlot.RING,
  ArtifactSlot.HELMET,
  ArtifactSlot.AMULET,
  ArtifactSlot.ARMOR,
  ArtifactSlot.BOOTS,
  ArtifactSlot.ITEM,
];

export const ARTIFACT_SLOT_OPTIONS: ReadonlyArray<{
  value: ArtifactSlot;
  label: string;
}> = [
  { value: ArtifactSlot.WEAPON, label: "Зброя" },
  { value: ArtifactSlot.RANGE_WEAPON, label: "Дальнобійна зброя" },
  { value: ArtifactSlot.SHIELD, label: "Щит" },
  { value: ArtifactSlot.CLOAK, label: "Плащ" },
  { value: ArtifactSlot.RING, label: "Кільце" },
  { value: ArtifactSlot.HELMET, label: "Шолом" },
  { value: ArtifactSlot.AMULET, label: "Амулет" },
  { value: ArtifactSlot.ARMOR, label: "Броня" },
  { value: ArtifactSlot.BOOTS, label: "Черевики" },
  { value: ArtifactSlot.ITEM, label: "Предмет" },
];

// ─── Сітка 3×3 слотів на персонажі (ключ у equipped + тип артефакта) ───────

export const ARTIFACT_GRID_9 = [
  { key: "ring1" as const, label: "Перстень", slotType: ArtifactSlot.RING },
  { key: "helmet" as const, label: "Шолом", slotType: ArtifactSlot.HELMET },
  {
    key: "necklace" as const,
    label: "Намисто",
    slotType: ArtifactSlot.AMULET,
  },
  {
    key: "range_weapon" as const,
    label: "Дальнобійна",
    slotType: ArtifactSlot.RANGE_WEAPON,
  },
  { key: "armor" as const, label: "Броня", slotType: ArtifactSlot.ARMOR },
  { key: "shield" as const, label: "Щит", slotType: ArtifactSlot.SHIELD },
  { key: "weapon" as const, label: "Зброя", slotType: ArtifactSlot.WEAPON },
  { key: "boots" as const, label: "Черевики", slotType: ArtifactSlot.BOOTS },
  { key: "cape" as const, label: "Плащ", slotType: ArtifactSlot.CLOAK },
] as const;

export type ArtifactGridSlotKey = (typeof ARTIFACT_GRID_9)[number]["key"];
export type ArtifactSlotType = (typeof ARTIFACT_GRID_9)[number]["slotType"];

// ─── Модифікатори артефактів (зброя тощо) ──────────────────────────────────

export enum ArtifactModifierType {
  DAMAGE_DICE = "damageDice",
  DAMAGE_TYPE = "damageType",
  ATTACK_TYPE = "attackType",
  RANGE = "range",
  PROPERTIES = "properties",
  MIN_TARGETS = "minTargets",
  MAX_TARGETS = "maxTargets",
}

export const DEFAULT_ARTIFACT_MODIFIERS = {
  DAMAGE_DICE: "1d6",
  DAMAGE_TYPE: "slashing",
} as const;
