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

/** Плоскі числові бонуси артефакта (застосовуються в бою з екіпіровки). */
export const ARTIFACT_COMBAT_BONUS_OPTIONS: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: "strength", label: "Сила" },
  { key: "dexterity", label: "Спритність" },
  { key: "constitution", label: "Статура" },
  { key: "intelligence", label: "Інтелект" },
  { key: "wisdom", label: "Мудрість" },
  { key: "charisma", label: "Харизма" },
  { key: "armorClass", label: "Клас броні" },
  { key: "speed", label: "Швидкість" },
  { key: "initiative", label: "Ініціатива" },
  { key: "morale", label: "Мораль" },
  { key: "minTargets", label: "Мін. цілей (плоско)" },
  { key: "maxTargets", label: "Макс. цілей (плоско)" },
  { key: "attackBonus", label: "Бонус атаки (attackBonus)" },
  { key: "attack", label: "Бонус атаки (attack)" },
];

export const ARTIFACT_SLOT_BONUS_LEVELS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const;

export function artifactSlotBonusKey(level: number): string {
  return `slotBonus_${level}`;
}

export type ArtifactModifierEditorValueKind = "number" | "string";

/** Модифікатори для зброї та бойових бонусів (% / flat). */
export const ARTIFACT_MODIFIER_EDITOR_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
  valueKind: ArtifactModifierEditorValueKind;
}> = [
  { value: "damageDice", label: "Кубики шкоди (напр. 2d6)", valueKind: "string" },
  { value: "damageType", label: "Тип шкоди (slashing, fire…)", valueKind: "string" },
  { value: "attackType", label: "Тип атаки (melee / ranged)", valueKind: "string" },
  { value: "range", label: "Дальність", valueKind: "string" },
  { value: "properties", label: "Властивості зброї", valueKind: "string" },
  { value: "minTargets", label: "Мін. цілей (на зброї)", valueKind: "string" },
  { value: "maxTargets", label: "Макс. цілей (на зброї)", valueKind: "string" },
  { value: "min_targets", label: "Мін. цілей (бойовий модифікатор)", valueKind: "number" },
  { value: "max_targets", label: "Макс. цілей (бойовий модифікатор)", valueKind: "number" },
  { value: "melee_damage", label: "Шкода ближня", valueKind: "number" },
  { value: "ranged_damage", label: "Шкода дальня", valueKind: "number" },
  { value: "physical_damage", label: "Шкода фізична", valueKind: "number" },
  { value: "all_damage", label: "Шкода (усі фіз. атаки)", valueKind: "number" },
  { value: "damageMelee", label: "Шкода ближня (legacy)", valueKind: "number" },
  { value: "damageRanged", label: "Шкода дальня (legacy)", valueKind: "number" },
  { value: "attack", label: "Бонус до кидка атаки", valueKind: "number" },
];
