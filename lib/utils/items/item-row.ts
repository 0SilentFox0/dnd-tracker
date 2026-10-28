import { ITEM_LIMITS, ItemModifierType } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ItemStats } from "@/lib/utils/items/item-stats";

const KINDS = new Set(["weapon", "armor", "shield"]);

const CATEGORIES = new Set(["light", "medium", "heavy"]);

const TRAITS = new Set<string>(WEAPON_TRAITS);

const isInt = (n: unknown, min: number, max: number): n is number => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

const strings = (v: unknown, allowed?: ReadonlySet<string>): string[] | null =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.trim() !== "" && (!allowed || allowed.has(s))) ? (v as string[]) : null;

function readProperty(raw: unknown): ItemStats["property"] | null {
  if (!isRecord(raw) || !isRecord(raw.appliesTo)) return null;

  const a = raw.appliesTo;

  const kinds = strings(a.kinds, KINDS);

  if (!kinds) return null;

  const appliesTo: NonNullable<ItemStats["property"]>["appliesTo"] = { kinds: kinds as ("weapon" | "armor" | "shield")[] };

  if (a.attackType !== undefined) {
    if (a.attackType !== "melee" && a.attackType !== "ranged") return null;

    appliesTo.attackType = a.attackType;
  }

  if (a.armorCategories !== undefined) {
    const c = strings(a.armorCategories, CATEGORIES);

    if (!c) return null;

    appliesTo.armorCategories = c as ("light" | "medium" | "heavy")[];
  }

  if (a.bases !== undefined) {
    const b = strings(a.bases);

    if (!b || b.length > ITEM_LIMITS.bases) return null;

    appliesTo.bases = b;
  }

  const out: NonNullable<ItemStats["property"]> = { appliesTo };

  if (typeof raw.nameTemplate === "string" && raw.nameTemplate.includes("{base}")) out.nameTemplate = raw.nameTemplate;

  if (isRecord(raw.overrides)) {
    const o = raw.overrides;

    const overrides: NonNullable<NonNullable<ItemStats["property"]>["overrides"]> = {};

    if (o.stealthDisadvantage === false) overrides.stealthDisadvantage = false;

    if (o.strength === null) overrides.strength = null;

    if (typeof o.damageType === "string" && o.damageType.trim()) overrides.damageType = o.damageType;

    const traits = strings(o.addTraits, TRAITS);

    if (traits) overrides.addTraits = traits as NonNullable<typeof overrides.addTraits>;

    if (Object.keys(overrides).length > 0) out.overrides = overrides;
  }

  return out;
}

function readStats(raw: unknown): ItemStats | null {
  if (!isRecord(raw)) return null;

  const out: ItemStats = {};

  if (typeof raw.unique === "boolean") out.unique = raw.unique;

  if (raw.property !== undefined) {
    const p = readProperty(raw.property);

    if (!p) return null;

    out.property = p;
  }

  if (typeof raw.attunement === "boolean") out.attunement = raw.attunement;

  if (raw.charges !== undefined) {
    const c = raw.charges;

    if (!isRecord(c) || !isInt(c.max, ...ITEM_LIMITS.charges) || !(c.rest === "short" || c.rest === "long" || c.rest === null)) return null;

    out.charges = { max: c.max, rest: c.rest };
  }

  if (typeof raw.consumable === "boolean") out.consumable = raw.consumable;

  return out;
}

/** Без zod: ходить у entry-чанки бою й профілю (`lib/__tests__/client-entry-imports.test.ts`). */
export function itemStatsFromRow(row: { modifiers?: unknown }): ItemStats | null {
  const record = (Array.isArray(row.modifiers) ? row.modifiers : []).find((m) => isRecord(m) && m.type === ItemModifierType.STATS) as { value?: unknown } | undefined;

  if (!record || typeof record.value !== "string") return null;

  try {
    return readStats(JSON.parse(record.value));
  } catch {
    return null;
  }
}

export const itemStatsRecords = (stats: ItemStats): Array<{ type: string; value: string }> => (Object.keys(stats).length > 0 ? [{ type: ItemModifierType.STATS, value: JSON.stringify(stats) }] : []);

export const isPropertyRow = (row: { modifiers?: unknown }) => !!itemStatsFromRow(row)?.property;

export const isUniqueRow = (row: { modifiers?: unknown }) => {
  const stats = itemStatsFromRow(row);

  return !stats?.property && stats?.unique !== false;
};
