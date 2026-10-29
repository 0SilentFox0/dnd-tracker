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

export const ARTIFACT_RARITY_VALUES: readonly [ArtifactRarity, ...ArtifactRarity[]] = [
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


export const ARTIFACT_RARITY_COLOR: Partial<Record<string, string>> = {
  [ArtifactRarity.UNCOMMON]: "border-[#7cbf5a]",
  [ArtifactRarity.RARE]: "border-[#8fd0e8]",
  [ArtifactRarity.EPIC]: "border-[#c08ff0]",
  [ArtifactRarity.LEGENDARY]: "border-hud-gold-strong",
};

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

export const ARTIFACT_SLOT_VALUES: readonly [ArtifactSlot, ...ArtifactSlot[]] = [
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
  { value: ArtifactSlot.ITEM, label: "Артефакт" },
];


// ─── Сітка 3×3 слотів на персонажі (ключ у equipped + тип артефакта) ───────

export const ARTIFACT_GRID_9 = [
  { key: "ring1" as const, slotType: ArtifactSlot.RING },
  { key: "helmet" as const, slotType: ArtifactSlot.HELMET },
  { key: "necklace" as const, slotType: ArtifactSlot.AMULET },
  { key: "range_weapon" as const, slotType: ArtifactSlot.RANGE_WEAPON },
  { key: "armor" as const, slotType: ArtifactSlot.ARMOR },
  { key: "shield" as const, slotType: ArtifactSlot.SHIELD },
  { key: "weapon" as const, slotType: ArtifactSlot.WEAPON },
  { key: "boots" as const, slotType: ArtifactSlot.BOOTS },
  { key: "cape" as const, slotType: ArtifactSlot.CLOAK },
] as const;

export type ArtifactGridSlotKey = (typeof ARTIFACT_GRID_9)[number]["key"];

// ─── Модифікатори артефактів (зброя тощо) ──────────────────────────────────

export enum ArtifactModifierType {
  DAMAGE_DICE = "damageDice",
  DAMAGE_TYPE = "damageType",
  ATTACK_TYPE = "attackType",
  RANGE = "range",
  PROPERTIES = "properties",
  MIN_TARGETS = "minTargets",
  MAX_TARGETS = "maxTargets",
  TRAITS = "traits",
  VERSATILE_DICE = "versatileDice",
  DAMAGE_BONUS = "damageBonus",
  WEAPON_CATEGORY = "weaponCategory",
}

// окремо від ArtifactModifierType: weaponStatsFromRow бере лише свої типи
export enum ArmorModifierType {
  CATEGORY = "armorCategory",
  BASE = "armorBase",
  DEX_CAP = "armorDexCap",
  STRENGTH = "armorStrength",
  STEALTH = "armorStealth",
}

export const ARMOR_LIMITS = { base: [1, 30], dexCap: [0, 10], strength: [1, 30] } as const;

// окремо: weaponStatsFromRow/armorStatsFromRow беруть лише свої типи
export enum ItemModifierType {
  STATS = "itemStats",
}

export const ITEM_LIMITS = {
  charges: [1, 50],
  bases: 60,
  grantQuantity: [1, 99],
  quantity: 9999,
  specialName: 100,
  specialDescription: 1000,
  cost: [0, 50],
  castLevel: [0, 9],
  dc: [1, 40],
  attackBonus: [-10, 30],
  upcastMaxLevel: [1, 9],
  upcastExtraCost: [1, 50],
  options: 50,
  label: 60,
  spells: 500,
  keyPattern: /^[a-z][a-z0-9_-]{0,39}$/,
} as const;

export const ITEM_KINDS = ["weapon", "armor", "shield"] as const;

export const ITEM_REST_VALUES = ["long", "short", "none"] as const;

export const ARMOR_CATEGORIES = ["light", "medium", "heavy"] as const;

export const ARMOR_PROFICIENCY_KINDS = [...ARMOR_CATEGORIES, "shield"] as const;

export const WEAPON_PROFICIENCY_KINDS = ["simple", "martial"] as const;

export const PROFICIENCY_KINDS = [...ARMOR_PROFICIENCY_KINDS, ...WEAPON_PROFICIENCY_KINDS] as const;

export const CARRIED_SLOTS: ReadonlySet<string> = new Set([ArtifactSlot.ITEM, ArtifactSlot.RING]);

export const PROPERTY_SLOTS: ReadonlySet<string> = new Set([ArtifactSlot.WEAPON, ArtifactSlot.RANGE_WEAPON, ArtifactSlot.ARMOR, ArtifactSlot.SHIELD]);

export const DEFAULT_ARTIFACT_MODIFIERS = {
  DAMAGE_DICE: "1d6",
  DAMAGE_TYPE: "slashing",
} as const;

