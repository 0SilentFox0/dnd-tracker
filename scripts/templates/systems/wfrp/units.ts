import { isDeepStrictEqual } from "node:util";

import type { Row } from "./common";

import type { RecipeContext, RecipeValues } from "@/lib/utils/abilities/templates/types";
import { isRecord } from "@/lib/utils/common/is-record";
import { CHARACTERISTIC_KEYS, type CharacteristicKey } from "@/systems/wfrp/rules/characteristics/keys";
import { TRAIT_SIZES, type TraitSize } from "@/systems/wfrp/rules/trait-kinds";
import { BREATH_DEFAULT_RANGE_FT, RANGED_DEFAULT_RANGE_FT } from "@/systems/wfrp/rules/traits/constants";
import { TRAIT_RECIPES } from "@/systems/wfrp/rules/traits/recipes";

export const GRIM_UNIT_THEMES = ["Beasts", "Raiders", "Restless Dead", "Cultists", "Constructs", "Horrors"] as const;

export const GRIM_UNIT_LEVELS = [1, 2, 3, 4] as const;

export type GrimUnitLevel = (typeof GRIM_UNIT_LEVELS)[number];

type Range = readonly [number, number];

export interface UnitLevelBand {
  charMax: number;
  combat: Range;
  wounds: Range;
  ap: Range;
  ward: Range | null;
  psychologyMax: number;
  attack: Range;
  breath: Range | null;
  ranged: Range;
  regenerate: boolean;
  magical: boolean;
}

export const CHARACTERISTIC_MIN = 5;

export const UNIT_RANGED_FT: Range = [24, 300];

// Own threat-tier numbers of the template, not official stat blocks
export const UNIT_LEVEL_BANDS: Record<GrimUnitLevel, UnitLevelBand> = {
  1: { charMax: 45, combat: [20, 45], wounds: [3, 14], ap: [0, 1], ward: null, psychologyMax: 1, attack: [1, 5], breath: null, ranged: [1, 4], regenerate: false, magical: false },
  2: { charMax: 55, combat: [30, 55], wounds: [8, 24], ap: [0, 2], ward: null, psychologyMax: 2, attack: [2, 7], breath: null, ranged: [2, 6], regenerate: true, magical: false },
  3: { charMax: 65, combat: [40, 65], wounds: [15, 45], ap: [0, 4], ward: [9, 10], psychologyMax: 3, attack: [4, 9], breath: [6, 10], ranged: [3, 8], regenerate: true, magical: true },
  4: { charMax: 80, combat: [50, 80], wounds: [24, 120], ap: [1, 6], ward: [7, 9], psychologyMax: 4, attack: [6, 12], breath: [7, 12], ranged: [5, 10], regenerate: true, magical: true },
};

export const UNIT_KEYS: readonly string[] = ["slug", "name", "level", "maxHp", "speed", "initiative", "gridSize", "statblock", "characteristics", "abilities", "knownSpells", "raceId"];

export const GRID_BY_SIZE: Record<TraitSize, number> = { tiny: 1, little: 1, small: 1, average: 1, large: 2, enormous: 3, monstrous: 3 };

export const SPEED_PER_MOVE = 6;

export const SWARM_WOUNDS_MULTIPLIER = 5;

const SIZE_WOUNDS_MULTIPLIER: Partial<Record<TraitSize, number>> = { large: 2, enormous: 4, monstrous: 8 };

const NOTE_TRAITS: readonly string[] = ["undead", "hardy", "flier", "swarm", "nightVision"];

type RawEffect = Record<string, unknown>;

const rangeFtOf = (e: RawEffect, fallback = RANGED_DEFAULT_RANGE_FT) => (e.rangeFt == null ? fallback : Number(e.rangeFt));

export type RawAbility = { id?: unknown; name?: unknown; trigger?: { event?: unknown }; effects?: RawEffect[] };

export interface UnitTraits {
  ap: number;
  ward?: number;
  size: TraitSize;
  psychology: Array<{ kind: "fear" | "terror"; value: number }>;
  attacks: Array<{ name: string; attack: string; damage: number; magical: boolean; rangeFt?: number }>;
  regenerate: boolean;
  notes: Set<string>;
}

export const abilitiesOf = (row: Row): RawAbility[] => (Array.isArray(row.abilities) ? row.abilities.filter(isRecord) : []) as RawAbility[];

const first = (a: RawAbility): RawEffect => (Array.isArray(a.effects) && isRecord(a.effects[0]) ? a.effects[0] : {});

export function unitTraits(row: Row): UnitTraits {
  const t: UnitTraits = { ap: 0, size: "average", psychology: [], attacks: [], regenerate: false, notes: new Set() };

  for (const a of abilitiesOf(row)) {
    const e = first(a);

    switch (a.id) {
      case "armour":
        t.ap = Math.max(t.ap, Number(e.head ?? 0));
        break;
      case "ward":
        t.ward = Number(e.value);
        break;
      case "size":
        t.size = (TRAIT_SIZES as readonly string[]).includes(String(e.size)) ? (e.size as TraitSize) : "average";
        break;
      case "fear":
        t.psychology.push({ kind: e.psychology === "terror" ? "terror" : "fear", value: Number(e.value) });
        break;
      case "regenerate":
        t.regenerate = true;
        break;
      case "bite":
      case "claw":
      case "weapon":
      case "breath":
      case "ranged":
        t.attacks.push({ name: String(a.name), attack: String(a.id), damage: Number(e.damage), magical: e.magical === true, ...(a.id === "ranged" && { rangeFt: rangeFtOf(e) }) });
        break;
      default:
        if (NOTE_TRAITS.includes(String(a.id))) t.notes.add(String(a.id));
    }
  }

  return t;
}

/** Trait keys a unit covers: recipe ids, fear split into fear/terror, a magical attack adds "magical". */
export function unitTraitKeys(row: Row): string[] {
  return abilitiesOf(row).flatMap((a) => {
    const e = first(a);

    const key = a.id === "fear" ? String(e.psychology) : String(a.id);

    return e.magical === true ? [key, "magical"] : [key];
  });
}

function recipeValues(id: string, e: RawEffect): RecipeValues {
  const magical = e.magical === true ? "yes" : "no";

  switch (id) {
    case "armour":
      return { ap: Number(e.head) };
    case "ward":
      return { value: Number(e.value) };
    case "size":
      return { size: String(e.size) };
    case "fear":
      return { psychology: String(e.psychology), value: Number(e.value) };
    case "bite":
    case "claw":
    case "weapon":
      return { damage: Number(e.damage), magical };
    case "breath":
    case "ranged":
      return { damage: Number(e.damage), rangeFt: rangeFtOf(e, id === "breath" ? BREATH_DEFAULT_RANGE_FT : RANGED_DEFAULT_RANGE_FT), magical };
    default:
      return {};
  }
}

/** What the trait recipe builds for this ability's id, name and values; null for an unknown id. */
export function rebuildTrait(a: RawAbility): unknown {
  const recipe = TRAIT_RECIPES.find((r) => r.id === a.id);

  if (!recipe || typeof a.name !== "string") return null;

  const defaults = Object.fromEntries(recipe.params.map((p) => [p.key, p.default])) as RecipeValues;

  const ctx: RecipeContext = { scope: "ability", name: a.name, note: "" };

  const { ability } = recipe.build({ ...defaults, ...recipeValues(recipe.id, first(a)) }, ctx) as { ability: object };

  return { id: recipe.id, ...ability };
}

const bonus = (v: number) => Math.floor(v / 10);

export function unitWounds(base: Record<CharacteristicKey, number>, t: Pick<UnitTraits, "size" | "notes">): number {
  const [sb, tb, wpb] = [bonus(base.s), bonus(base.t), bonus(base.wp)];

  const average = sb + 2 * tb + wpb;

  const bySize = t.size === "tiny" ? 1 : t.size === "little" ? tb : t.size === "small" ? 2 * tb + wpb : average * (SIZE_WOUNDS_MULTIPLIER[t.size] ?? 1);

  return Math.max(1, bySize * (t.notes.has("swarm") ? SWARM_WOUNDS_MULTIPLIER : 1) + (t.notes.has("hardy") ? tb : 0));
}

const isLevel = (v: unknown): v is GrimUnitLevel => (GRIM_UNIT_LEVELS as readonly unknown[]).includes(v);

const inRange = (v: number, [min, max]: Range) => Number.isInteger(v) && v >= min && v <= max;

const fmt = ([min, max]: Range) => `${min}–${max}`;

function readBase(row: Row, issues: string[]): { base: Record<CharacteristicKey, number>; move: number } | null {
  const fail = (message: string) => {
    issues.push(message);

    return null;
  };

  const c = row.characteristics;

  if (!isRecord(c) || !isRecord(c.base)) return fail("characteristics.base is required");

  const extra = Object.keys(c).filter((k) => k !== "base" && k !== "move");

  if (extra.length > 0) issues.push(`characteristics may hold only base and move (got ${extra.join(", ")})`);

  const base = c.base;

  const unknownBase = Object.keys(base).filter((k) => !(CHARACTERISTIC_KEYS as readonly string[]).includes(k));

  if (unknownBase.length > 0) issues.push(`characteristics.base has unknown keys (${unknownBase.join(", ")})`);

  const missing = CHARACTERISTIC_KEYS.filter((k) => !Number.isInteger(base[k]));

  if (missing.length > 0) return fail(`characteristics.base must list all ${CHARACTERISTIC_KEYS.length} characteristics (missing ${missing.join(", ")})`);

  const move = c.move;

  if (typeof move !== "number" || !Number.isInteger(move) || move < 1 || move > 12) return fail("characteristics.move must be an integer 1–12");

  return { base: base as Record<CharacteristicKey, number>, move };
}

function abilityIssues(row: Row, issues: string[]) {
  const ids = new Set<string>();

  abilitiesOf(row).forEach((a, i) => {
    const where = `abilities[${i}]${typeof a.name === "string" ? ` "${a.name}"` : ""}`;

    const expected = rebuildTrait(a);

    if (expected === null) return void issues.push(`${where}: unknown trait id "${String(a.id)}"`);

    if (ids.has(String(a.id))) issues.push(`${where}: duplicate trait id "${String(a.id)}"`);

    ids.add(String(a.id));

    if (!isDeepStrictEqual(a, expected)) issues.push(`${where}: is not the output of the "${String(a.id)}" trait recipe`);
  });
}

function bandIssues(row: Row, level: GrimUnitLevel, base: Record<CharacteristicKey, number>, t: UnitTraits, issues: string[]) {
  const band = UNIT_LEVEL_BANDS[level];

  const at = `for level ${level}`;

  for (const k of CHARACTERISTIC_KEYS) if (!inRange(base[k], [CHARACTERISTIC_MIN, band.charMax])) issues.push(`characteristic "${k}" ${base[k]} is outside ${CHARACTERISTIC_MIN}–${band.charMax} ${at}`);

  const combat = Math.max(base.ws, base.bs);

  if (!inRange(combat, band.combat)) issues.push(`max(ws, bs) ${combat} is outside ${fmt(band.combat)} ${at}`);

  if (typeof row.maxHp === "number" && !inRange(row.maxHp, band.wounds)) issues.push(`Wounds ${row.maxHp} are outside ${fmt(band.wounds)} ${at}`);

  if (!inRange(t.ap, band.ap)) issues.push(`Armour ${t.ap} is outside ${fmt(band.ap)} ${at}`);

  if (t.ward !== undefined && !band.ward) issues.push(`Ward is not allowed ${at}`);
  else if (t.ward !== undefined && band.ward && !inRange(t.ward, band.ward)) issues.push(`Ward ${t.ward} is outside ${fmt(band.ward)} ${at}`);

  for (const p of t.psychology) if (p.value > band.psychologyMax) issues.push(`${p.kind === "terror" ? "Terror" : "Fear"} ${p.value} is above ${band.psychologyMax} ${at}`);

  for (const a of t.attacks) {
    const range = a.attack === "breath" ? band.breath : a.attack === "ranged" ? band.ranged : band.attack;

    if (!range) issues.push(`Breath is not allowed ${at}`);
    else if (!inRange(a.damage, range)) issues.push(`attack "${a.name}" damage ${a.damage} is outside ${fmt(range)} ${at}`);

    if (a.attack === "ranged" && !inRange(a.rangeFt ?? 0, UNIT_RANGED_FT)) issues.push(`attack "${a.name}" range ${a.rangeFt} ft is outside ${fmt(UNIT_RANGED_FT)}`);
  }

  if (t.regenerate && !band.regenerate) issues.push(`Regenerate is not allowed ${at}`);

  if (t.attacks.some((a) => a.magical) && !band.magical) issues.push(`Magical is not allowed ${at}`);
}

/** Grim-specific checks of one units.json row; the resource schema is checked by validateRows. */
export function unitIssues(row: Row): string[] {
  const issues: string[] = [];

  for (const key of Object.keys(row)) if (!UNIT_KEYS.includes(key)) issues.push(`column "${key}" is not used by Grim units`);

  if (!isLevel(row.level)) issues.push(`level must be one of ${GRIM_UNIT_LEVELS.join(", ")}`);

  const statblock = row.statblock;

  if (!isRecord(statblock) || Object.keys(statblock).some((k) => k !== "creatureType") || !(GRIM_UNIT_THEMES as readonly unknown[]).includes(statblock.creatureType)) issues.push(`statblock must be { creatureType } with one of: ${GRIM_UNIT_THEMES.join(", ")}`);

  abilityIssues(row, issues);

  const read = readBase(row, issues);

  if (!read) return issues;

  const t = unitTraits(row);

  const wounds = unitWounds(read.base, t);

  if (row.initiative !== read.base.i) issues.push(`initiative ${String(row.initiative)} must equal I ${read.base.i}`);

  if (row.speed !== read.move * SPEED_PER_MOVE) issues.push(`speed ${String(row.speed)} must equal move × ${SPEED_PER_MOVE} = ${read.move * SPEED_PER_MOVE}`);

  if (row.gridSize !== GRID_BY_SIZE[t.size]) issues.push(`gridSize ${String(row.gridSize)} must be ${GRID_BY_SIZE[t.size]} for size ${t.size}`);

  if (row.maxHp !== wounds) issues.push(`maxHp ${String(row.maxHp)} must equal Wounds ${wounds}`);

  if (isLevel(row.level)) bandIssues(row, row.level, read.base, t, issues);

  return issues;
}
