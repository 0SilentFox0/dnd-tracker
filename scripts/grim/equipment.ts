import { descriptionIssues, type Row } from "./data";

import { ARTIFACT_RARITY_VALUES } from "@/lib/constants/artifacts";
import { ARMOUR_KINDS, QUALITY_REGISTRY, type QualityKey, type QualityRef, WEAPON_GROUPS } from "@/lib/utils/rules/systems/wfrp/equipment";
import { type WfrpItemStats, WfrpItemStatsSchema } from "@/lib/utils/rules/systems/wfrp/equipment/stats";

type Range = readonly [number, number];

type WeaponGroup = (typeof WEAPON_GROUPS)[number];

type ArmourKind = (typeof ARMOUR_KINDS)[number];

interface WeaponBand {
  flat: Range;
  addSb: boolean | null;
  range?: Range;
  weight: Range;
  price: Range;
  twoHanded?: true;
  reload?: true;
}

export const GRIM_MELEE_GROUPS = ["basic", "fencing", "brawling", "polearm", "twohanded", "flail", "parry", "cavalry"] as const satisfies readonly WeaponGroup[];

export const GRIM_RANGED_GROUPS = ["bow", "crossbow", "sling", "throwing", "blackpowder"] as const satisfies readonly WeaponGroup[];

export const GRIM_WEAPON_GROUPS: readonly WeaponGroup[] = [...GRIM_MELEE_GROUPS, ...GRIM_RANGED_GROUPS];

export const WEAPON_GROUP_BANDS: Record<(typeof GRIM_MELEE_GROUPS)[number] | (typeof GRIM_RANGED_GROUPS)[number], WeaponBand> = {
  basic: { flat: [1, 5], addSb: true, weight: [0, 2], price: [6, 480] },
  fencing: { flat: [3, 5], addSb: true, weight: [0, 1], price: [240, 960] },
  brawling: { flat: [0, 3], addSb: true, weight: [0, 1], price: [6, 240] },
  polearm: { flat: [3, 6], addSb: true, weight: [1, 3], price: [120, 720] },
  twohanded: { flat: [5, 7], addSb: true, weight: [2, 3], price: [480, 1440], twoHanded: true },
  flail: { flat: [3, 6], addSb: true, weight: [1, 3], price: [120, 720] },
  parry: { flat: [1, 3], addSb: true, weight: [0, 1], price: [60, 480] },
  cavalry: { flat: [4, 7], addSb: true, weight: [2, 3], price: [480, 1440] },
  bow: { flat: [2, 5], addSb: true, range: [90, 360], weight: [1, 3], price: [120, 960], twoHanded: true },
  crossbow: { flat: [6, 10], addSb: false, range: [120, 360], weight: [1, 3], price: [360, 1440], twoHanded: true, reload: true },
  sling: { flat: [3, 7], addSb: false, range: [60, 240], weight: [0, 1], price: [6, 60] },
  throwing: { flat: [0, 6], addSb: null, range: [12, 60], weight: [0, 1], price: [6, 240] },
  blackpowder: { flat: [7, 10], addSb: false, range: [30, 360], weight: [0, 3], price: [960, 2880], reload: true },
};

export const ARMOUR_KIND_BANDS: Record<ArmourKind, { ap: Range; weight: Range; price: Range }> = {
  soft: { ap: [0, 1], weight: [0, 2], price: [12, 360] },
  mail: { ap: [0, 2], weight: [1, 3], price: [240, 1440] },
  plate: { ap: [0, 3], weight: [1, 6], price: [480, 4800] },
};

export const SHIELD_BAND = { x: [1, 3], weight: [0, 3], price: [12, 480] } as const satisfies Record<string, Range>;

export const GEAR_BAND = { weight: [0, 2], price: [1, 480] } as const satisfies Record<string, Range>;

export const ARTIFACT_KEYS: readonly string[] = ["name", "description", "rarity", "slot", "systemStats"];

export const GRIM_ITEM_SLOTS = ["weapon", "range_weapon", "armor", "helmet", "boots", "shield", "item"] as const;

export const IMPLEMENTED_QUALITIES = (Object.keys(QUALITY_REGISTRY) as QualityKey[]).filter((k) => QUALITY_REGISTRY[k].implemented);

const RARITIES: readonly string[] = ARTIFACT_RARITY_VALUES.slice(0, 2);

const ARMOUR_SLOT_LOCATION: Record<string, { allowed: ("head" | "arm" | "body" | "leg")[]; message: string }> = {
  armor: { allowed: ["arm", "body", "leg"], message: 'slot "armor" must leave head at 0' },
  helmet: { allowed: ["head"], message: 'slot "helmet" may cover only head' },
  boots: { allowed: ["leg"], message: 'slot "boots" may cover only leg' },
};

export function itemStatsOf(row: Row): WfrpItemStats | null {
  const parsed = WfrpItemStatsSchema.safeParse(row.systemStats);

  return parsed.success ? parsed.data : null;
}

const isGrimSlot = (slot: unknown): slot is (typeof GRIM_ITEM_SLOTS)[number] => (GRIM_ITEM_SLOTS as readonly unknown[]).includes(slot);

const outside = (v: number, [min, max]: Range) => !Number.isFinite(v) || v < min || v > max;

const fmt = ([min, max]: Range) => `${min}–${max}`;

function qualityIssues(list: QualityRef[], kind: "quality" | "flaw", issues: string[]) {
  for (const { key } of list) {
    const entry = QUALITY_REGISTRY[key];

    if (entry.kind !== kind) issues.push(`"${key}" is a ${entry.kind}, not a ${kind}`);
    else if (!entry.implemented) issues.push(`${kind} "${key}" is not implemented`);
  }
}

function commonRange(label: string, value: number, range: Range, issues: string[], at: string, unit = "") {
  const pence = unit === " p";

  if (outside(value, range) || (pence && !Number.isInteger(value))) issues.push(`${label}${label.endsWith("+") ? "" : " "}${value}${unit} is outside ${fmt(range)}${unit} for ${at}`);
}

function weaponIssues(slot: string | undefined, w: Extract<WfrpItemStats, { type: "weapon" }>, issues: string[]) {
  if (slot === "weapon" && w.range !== undefined) issues.push('slot "weapon" needs a weapon with reach');
  else if (slot === "range_weapon" && w.range === undefined) issues.push('slot "range_weapon" needs a weapon with range');
  else if (slot !== "weapon" && slot !== "range_weapon" && isGrimSlot(slot)) issues.push(`slot "${slot}" does not fit a weapon`);

  qualityIssues(w.qualities, "quality", issues);
  qualityIssues(w.flaws, "flaw", issues);

  if (!(GRIM_WEAPON_GROUPS as readonly string[]).includes(w.group)) return void issues.push(`group "${w.group}" is not used by Grim items`);

  const band = (WEAPON_GROUP_BANDS as Record<string, WeaponBand>)[w.group];

  const melee = (GRIM_MELEE_GROUPS as readonly string[]).includes(w.group);

  if (melee && w.range !== undefined) issues.push(`group "${w.group}" needs reach, not range`);

  if (!melee && w.reach !== undefined) issues.push(`group "${w.group}" needs range, not reach`);

  if (band.range && w.range !== undefined && outside(w.range, band.range)) issues.push(`range ${w.range} ft is outside ${fmt(band.range)} ft for ${w.group}`);

  commonRange("damage +", w.damage.flat, band.flat, issues, w.group);

  if (band.addSb !== null && w.damage.addSb !== band.addSb) issues.push(`damage addSb must be ${band.addSb} for ${w.group}`);

  commonRange("weight", w.weight, band.weight, issues, w.group);
  commonRange("price", w.price, band.price, issues, w.group, " p");

  if (band.twoHanded && !w.twoHanded) issues.push(`group "${w.group}" needs twoHanded`);

  const reload = w.flaws.some((f) => f.key === "reload");

  if (reload !== (w.ammoCapacity !== undefined)) issues.push("reload needs ammoCapacity and ammoCapacity needs reload");

  if (band.reload && !reload) issues.push(`group "${w.group}" needs reload`);
}

function armourIssues(slot: string | undefined, a: Extract<WfrpItemStats, { type: "armour" }>, issues: string[]) {
  const where = slot ? ARMOUR_SLOT_LOCATION[slot] : undefined;

  if (!where && isGrimSlot(slot)) issues.push(slot === "shield" ? 'slot "shield" needs gear with one "shield X" quality' : `slot "${slot}" does not fit armour`);

  if (where) {
    const covered = (Object.keys(a.locations) as Array<keyof typeof a.locations>).filter((k) => a.locations[k] > 0);

    if (covered.some((k) => !where.allowed.includes(k))) issues.push(where.message);
    else if (slot !== "armor" && covered.length === 0) issues.push(`slot "${slot}" needs AP above 0`);
  }

  qualityIssues(a.qualities, "quality", issues);

  const band = ARMOUR_KIND_BANDS[a.kind];

  for (const ap of Object.values(a.locations)) if (outside(ap, band.ap)) issues.push(`AP ${ap} is outside ${fmt(band.ap)} for ${a.kind}`);

  commonRange("weight", a.weight, band.weight, issues, a.kind);
  commonRange("price", a.price, band.price, issues, a.kind, " p");
}

function gearIssues(slot: string | undefined, g: Extract<WfrpItemStats, { type: "gear" }>, issues: string[]) {
  qualityIssues(g.qualities, "quality", issues);

  if (slot === "shield") {
    const shields = g.qualities.filter((q) => q.key === "shield");

    if (shields.length !== 1 || g.qualities.length !== 1) return void issues.push('slot "shield" needs gear with one "shield X" quality');

    const x = shields[0].value ?? 0;

    if (outside(x, SHIELD_BAND.x)) issues.push(`shield ${x} is outside ${fmt(SHIELD_BAND.x)}`);

    commonRange("weight", g.weight, SHIELD_BAND.weight, issues, "shield");
    commonRange("price", g.price, SHIELD_BAND.price, issues, "shield", " p");
  } else if (slot === "item") {
    if (g.qualities.length > 0) issues.push('slot "item" takes gear without qualities');

    commonRange("weight", g.weight, GEAR_BAND.weight, issues, "gear");
    commonRange("price", g.price, GEAR_BAND.price, issues, "gear", " p");
  } else if (isGrimSlot(slot)) issues.push(`slot "${slot}" does not fit gear`);
}

/** Grim-specific checks of one artifacts.json row; the resource schema is checked by validateRows. */
export function equipmentIssues(row: Row): string[] {
  const issues: string[] = [];

  for (const key of Object.keys(row)) if (!ARTIFACT_KEYS.includes(key)) issues.push(`column "${key}" is not used by Grim items`);

  if (!RARITIES.includes(String(row.rarity))) issues.push("rarity must be common or uncommon");

  issues.push(...descriptionIssues(row));

  const slot = typeof row.slot === "string" ? row.slot : undefined;

  if (slot !== undefined && !isGrimSlot(slot)) issues.push(`slot "${slot}" is not used by Grim items`);

  if (row.systemStats === undefined || row.systemStats === null) return [...issues, "systemStats is required"];

  const parsed = WfrpItemStatsSchema.safeParse(row.systemStats);

  if (!parsed.success) return [...issues, ...parsed.error.issues.map((i) => `systemStats ${i.path.join(".")} ${i.message}`.replace(/\s+/g, " "))];

  const stats = parsed.data;

  const known = isGrimSlot(slot) ? slot : undefined;

  if (stats.type === "weapon") weaponIssues(known, stats, issues);
  else if (stats.type === "armour") armourIssues(known, stats, issues);
  else gearIssues(known, stats, issues);

  return issues;
}
