import { LOCATIONS } from "../combat/constants";
import { AP_MAX_PER_LAYER, ARMOUR_KINDS, QUALITY_VALUE_MAX, WEAPON_GROUPS, WEAPON_REACHES } from "./constants";
import { QUALITY_REGISTRY, type QualityKey, type QualityRef } from "./qualities";
import type { WfrpItemStats } from "./stats";

// Zod-free read-path twin of WfrpItemStatsSchema (the registry graph must stay Zod-free); guard.test keeps them in agreement.
type Rec = Record<string, unknown>;

const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);

const onlyKeys = (r: Rec, keys: string[]) => Object.keys(r).every((k) => keys.includes(k));

const num = (v: unknown, min: number, max: number, int = false): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max && (!int || Number.isInteger(v));

const oneOf = <T extends string>(v: unknown, list: readonly T[]): v is T => typeof v === "string" && (list as readonly string[]).includes(v);

export function qualityList(v: unknown): QualityRef[] | null {
  if (!Array.isArray(v) || v.length > 20) return null;

  const out: QualityRef[] = [];

  for (const r of v) {
    if (!isRec(r) || !onlyKeys(r, ["key", "value"]) || typeof r.key !== "string" || !Object.hasOwn(QUALITY_REGISTRY, r.key)) return null;

    const key = r.key as QualityKey;

    if (QUALITY_REGISTRY[key].hasValue !== (r.value !== undefined)) return null;

    if (r.value !== undefined && !num(r.value, 1, QUALITY_VALUE_MAX, true)) return null;

    out.push(r.value === undefined ? { key } : { key, value: r.value as number });
  }

  return out;
}

const common = (r: Rec) => num(r.weight, 0, 1000) && num(r.price, 0, 1_000_000);

export function readStats(raw: unknown): WfrpItemStats | null {
  if (!isRec(raw)) return null;

  const qualities = qualityList(raw.qualities);

  if (!qualities || !common(raw)) return null;

  const weightPrice = { weight: raw.weight as number, price: raw.price as number };

  if (raw.type === "gear") return onlyKeys(raw, ["type", "weight", "price", "qualities"]) ? { type: "gear", ...weightPrice, qualities } : null;

  if (raw.type === "armour") {
    const loc = raw.locations;

    if (!onlyKeys(raw, ["type", "locations", "kind", "qualities", "weight", "price"]) || !oneOf(raw.kind, ARMOUR_KINDS) || !isRec(loc) || !onlyKeys(loc, [...LOCATIONS]) || !LOCATIONS.every((l) => num(loc[l], 0, AP_MAX_PER_LAYER, true))) return null;

    return { type: "armour", locations: { head: loc.head as number, arm: loc.arm as number, body: loc.body as number, leg: loc.leg as number }, kind: raw.kind, qualities, ...weightPrice };
  }

  if (raw.type === "weapon") {
    const dmg = raw.damage;

    const flaws = qualityList(raw.flaws);

    if (!onlyKeys(raw, ["type", "group", "reach", "range", "damage", "qualities", "flaws", "twoHanded", "ammoCapacity", "weight", "price"]) || !flaws || !oneOf(raw.group, WEAPON_GROUPS)) return null;

    if (!isRec(dmg) || !onlyKeys(dmg, ["addSb", "flat"]) || typeof dmg.addSb !== "boolean" || !num(dmg.flat, -100, 100, true) || typeof raw.twoHanded !== "boolean") return null;

    if ((raw.reach === undefined) === (raw.range === undefined)) return null;

    if (raw.reach !== undefined && !oneOf(raw.reach, WEAPON_REACHES)) return null;

    if (raw.range !== undefined && !num(raw.range, 1, 100_000, true)) return null;

    if (raw.ammoCapacity !== undefined && !num(raw.ammoCapacity, 1, 1000, true)) return null;

    return {
      type: "weapon",
      group: raw.group,
      ...(raw.reach !== undefined && { reach: raw.reach as (typeof WEAPON_REACHES)[number] }),
      ...(raw.range !== undefined && { range: raw.range as number }),
      damage: { addSb: dmg.addSb, flat: dmg.flat },
      qualities,
      flaws,
      twoHanded: raw.twoHanded,
      ...(raw.ammoCapacity !== undefined && { ammoCapacity: raw.ammoCapacity as number }),
      ...weightPrice,
    };
  }

  return null;
}
