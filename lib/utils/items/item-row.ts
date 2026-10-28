import { ARMOR_CATEGORIES, ITEM_KINDS, ITEM_LIMITS, ItemModifierType } from "@/lib/constants/artifacts";
import { WEAPON_TRAITS } from "@/lib/constants/weapon-traits";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ItemStats } from "@/lib/utils/items/item-stats";

const KINDS: ReadonlySet<string> = new Set(ITEM_KINDS);

const CATEGORIES: ReadonlySet<string> = new Set(ARMOR_CATEGORIES);

const TRAITS = new Set<string>(WEAPON_TRAITS);

const isInt = (n: unknown, [min, max]: readonly [number, number] | readonly number[]): n is number => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

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

    if (!isRecord(c) || !isInt(c.max, ITEM_LIMITS.charges) || !(c.rest === "short" || c.rest === "long" || c.rest === null)) return null;

    out.charges = { max: c.max, rest: c.rest };
  }

  if (typeof raw.consumable === "boolean") out.consumable = raw.consumable;

  if (raw.parameter !== undefined) {
    if (!isRecord(raw.parameter) || !(raw.parameter.kind === "damageType" || raw.parameter.kind === "creatureType") || !Array.isArray(raw.parameter.options) || raw.parameter.options.length < 1 || raw.parameter.options.length > ITEM_LIMITS.options) return null;

    const keys = new Set<string>();

    const options: NonNullable<ItemStats["parameter"]>["options"] = [];

    for (const option of raw.parameter.options) {
      if (!isRecord(option) || typeof option.key !== "string" || !ITEM_LIMITS.keyPattern.test(option.key) || typeof option.label !== "string" || !option.label.trim() || option.label.length > ITEM_LIMITS.label || keys.has(option.key)) return null;

      keys.add(option.key);
      options.push({ key: option.key, label: option.label });
    }
    out.parameter = { kind: raw.parameter.kind, options };
  }

  if (raw.spells !== undefined) {
    if (!Array.isArray(raw.spells) || raw.spells.length > ITEM_LIMITS.spells) return null;

    const ids = new Set<string>();

    const spells: NonNullable<ItemStats["spells"]> = [];

    for (const value of raw.spells) {
      if (!isRecord(value) || typeof value.spellId !== "string" || !value.spellId.trim() || !isInt(value.cost, ITEM_LIMITS.cost) || ids.has(value.spellId)) return null;

      ids.add(value.spellId);

      if (value.castLevel !== undefined && !isInt(value.castLevel, ITEM_LIMITS.castLevel)) return null;

      if (value.dc !== undefined && !isInt(value.dc, ITEM_LIMITS.dc)) return null;

      if (value.attackBonus !== undefined && !isInt(value.attackBonus, ITEM_LIMITS.attackBonus)) return null;

      let upcast: { maxLevel: number; extraCost: number } | undefined;

      if (value.upcast !== undefined) {
        if (!isRecord(value.upcast) || !isInt(value.upcast.maxLevel, ITEM_LIMITS.upcastMaxLevel) || !isInt(value.upcast.extraCost, ITEM_LIMITS.upcastExtraCost) || value.castLevel === undefined || value.upcast.maxLevel <= value.castLevel) return null;

        upcast = { maxLevel: value.upcast.maxLevel, extraCost: value.upcast.extraCost };
      }

      spells.push({ spellId: value.spellId, cost: value.cost, ...(value.castLevel !== undefined && { castLevel: value.castLevel }), ...(value.dc !== undefined && { dc: value.dc }), ...(value.attackBonus !== undefined && { attackBonus: value.attackBonus }), ...(upcast && { upcast }) });
    }
    out.spells = spells;
  }

  return out;
}

const STATS_CACHE = new WeakMap<object, ItemStats | null>();

/** Без zod: ходить у entry-чанки бою й профілю (`lib/__tests__/client-entry-imports.test.ts`). */
export function itemStatsFromRow(row: { modifiers?: unknown }): ItemStats | null {
  const cached = STATS_CACHE.get(row);

  if (cached !== undefined) return cached;

  const stats = parseRowStats(row);

  STATS_CACHE.set(row, stats);

  return stats;
}

function parseRowStats(row: { modifiers?: unknown }): ItemStats | null {
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
