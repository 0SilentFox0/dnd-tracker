import { ArmorModifierType, ArtifactModifierType, ArtifactSlot, ItemModifierType } from "@/lib/constants/artifacts";
import { parseWeaponTraits } from "@/lib/constants/weapon-traits";
import { armorStatsFromRow } from "@/lib/utils/artifacts/armor-row";
import { isRecord } from "@/lib/utils/common/is-record";
import { itemStatsFromRow, itemStatsRecords } from "@/lib/utils/items/item-row";
import type { ItemKind, ItemStats } from "@/lib/utils/items/item-stats";
import { itemRef } from "@/lib/utils/items/ref";

export interface ItemRowLike {
  id: string;
  name: string;
  slot: string;
  icon?: string | null;
  rarity?: string | null;
  description?: string | null;
  setId?: string | null;
  bonuses?: unknown;
  modifiers?: unknown;
  abilities?: unknown;
}

type Mod = { type: string; value: string };

const DEFAULT_NAME_TEMPLATE = "{name} ({base})";

const PROPERTY_ABILITY_PREFIX = "p-";

const mods = (row: { modifiers?: unknown }): Mod[] => (Array.isArray(row.modifiers) ? row.modifiers : []).filter((m): m is Mod => isRecord(m) && typeof m.type === "string");

const modValue = (row: { modifiers?: unknown }, type: string) => mods(row).find((m) => m.type === type)?.value;

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export function itemKindOf(row: ItemRowLike): ItemKind | null {
  if (itemStatsFromRow(row)?.property) return null;

  if (row.slot === ArtifactSlot.WEAPON || row.slot === ArtifactSlot.RANGE_WEAPON) return "weapon";

  if (row.slot === ArtifactSlot.ARMOR) return armorStatsFromRow(row) ? "armor" : null;

  return row.slot === ArtifactSlot.SHIELD ? "shield" : null;
}

const attackTypeOf = (row: ItemRowLike) => (row.slot === ArtifactSlot.RANGE_WEAPON || modValue(row, ArtifactModifierType.ATTACK_TYPE) === "ranged" ? "ranged" : "melee");

export function matchesAppliesTo(base: ItemRowLike, property: ItemRowLike): boolean {
  const applies = itemStatsFromRow(property)?.property?.appliesTo;

  const kind = itemKindOf(base);

  if (!applies || !kind || !applies.kinds.includes(kind)) return false;

  if (kind === "weapon" && applies.attackType && attackTypeOf(base) !== applies.attackType) return false;

  if (kind === "armor" && applies.armorCategories && !applies.armorCategories.includes(armorStatsFromRow(base)?.category ?? "light")) return false;

  const name = base.name.trim().toLowerCase();

  return !applies.bases || applies.bases.some((b) => b.trim().toLowerCase() === name);
}

export function composedName(base: { name: string }, property: { name: string }, template?: string): string {
  return (template?.trim() || DEFAULT_NAME_TEMPLATE).replaceAll("{base}", base.name).replaceAll("{name}", property.name);
}

function sumNumbers(a: unknown, b: unknown): Record<string, number> {
  const out: Record<string, number> = {};

  for (const src of [a, b]) {
    if (!isRecord(src)) continue;

    for (const [k, v] of Object.entries(src)) if (typeof v === "number") out[k] = (out[k] ?? 0) + v;
  }

  return out;
}

type Overrides = NonNullable<NonNullable<ItemStats["property"]>["overrides"]>;

function applyOverrides(base: Mod[], o: Overrides | undefined): Mod[] {
  if (!o) return base;

  let out = base;

  if (o.stealthDisadvantage === false) out = out.filter((m) => m.type !== ArmorModifierType.STEALTH);

  if (o.strength === null) out = out.filter((m) => m.type !== ArmorModifierType.STRENGTH);

  if (o.damageType) out = [...out.filter((m) => m.type !== ArtifactModifierType.DAMAGE_TYPE), { type: ArtifactModifierType.DAMAGE_TYPE, value: o.damageType }];

  if (o.addTraits?.length) {
    const traits = [...new Set([...parseWeaponTraits(out.find((m) => m.type === ArtifactModifierType.TRAITS)?.value), ...o.addTraits])];

    out = [...out.filter((m) => m.type !== ArtifactModifierType.TRAITS), { type: ArtifactModifierType.TRAITS, value: traits.join(",") }];
  }

  return out;
}

export function composeItemRow<R extends ItemRowLike>(base: R, property: R): R {
  const p = itemStatsFromRow(property);

  const b = itemStatsFromRow(base);

  const damage = Number(modValue(base, ArtifactModifierType.DAMAGE_BONUS) ?? 0) + Number(modValue(property, ArtifactModifierType.DAMAGE_BONUS) ?? 0);

  const baseMods = applyOverrides(
    mods(base).filter((m) => m.type !== ItemModifierType.STATS && m.type !== ArtifactModifierType.DAMAGE_BONUS),
    p?.property?.overrides,
  );

  const stats: ItemStats = { ...(b?.unique === false && { unique: false }), ...(p?.attunement && { attunement: true }), ...(p?.charges && { charges: p.charges }) };

  const prefixed = list(property.abilities).map((a) => (isRecord(a) && typeof a.id === "string" ? { ...a, id: `${PROPERTY_ABILITY_PREFIX}${a.id}` } : a));

  return {
    ...base,
    id: itemRef(base.id, property.id),
    name: composedName(base, property, p?.property?.nameTemplate),
    icon: property.icon ?? base.icon ?? null,
    rarity: property.rarity ?? base.rarity ?? null,
    description: property.description ?? base.description ?? null,
    setId: property.setId ?? base.setId ?? null,
    bonuses: sumNumbers(base.bonuses, property.bonuses),
    modifiers: [...baseMods, ...(damage ? [{ type: ArtifactModifierType.DAMAGE_BONUS, value: String(damage) }] : []), ...itemStatsRecords(stats)],
    abilities: [...list(base.abilities), ...prefixed],
  };
}
