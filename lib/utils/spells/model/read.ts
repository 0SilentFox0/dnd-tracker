import type { Prisma } from "@prisma/client";

import {
  type RaceModifier,
  RaceModifierSchema,
  type SpellCost,
  SpellCostSchema,
  type SpellDefinition,
  SpellDiceSchema,
  type SpellResolution,
  SpellResolutionSchema,
  type SpellTargeting,
  SpellTargetingSchema,
} from "./schema";

import { type Effect, EffectSchema } from "@/lib/utils/abilities/schema";

type SpellRulesRow = {
  id: string;
  dice?: number | null;
  cost?: string | null;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  raceModifiers?: unknown;
  stackable?: boolean | null;
  maxStacks?: number | null;
};

const DEFAULT_TARGETING: SpellTargeting = { kind: "enemy" };

const DEFAULT_RESOLUTION: SpellResolution = { kind: "auto" };

function readOne<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, raw: unknown, fallback: T, label: string, id: string): T {
  if (raw === null || raw === undefined) return fallback;

  const parsed = schema.safeParse(raw);

  if (parsed.success) return parsed.data;

  console.warn(`[spells] invalid ${label} for ${id}`);

  return fallback;
}

function readList<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, raw: unknown, label: string, id: string): T[] {
  if (raw === null || raw === undefined) return [];

  if (!Array.isArray(raw)) {
    console.warn(`[spells] invalid ${label} for ${id}`);

    return [];
  }

  const valid = raw.flatMap((item) => {
    const parsed = schema.safeParse(item);

    return parsed.success ? [parsed.data] : [];
  });

  if (valid.length !== raw.length) console.warn(`[spells] ${raw.length - valid.length} invalid ${label} dropped for ${id}`);

  return valid;
}

export const spellTargeting = (row: SpellRulesRow): SpellTargeting => readOne(SpellTargetingSchema, row.targeting, DEFAULT_TARGETING, "targeting", row.id);

export const spellResolution = (row: SpellRulesRow): SpellResolution => readOne(SpellResolutionSchema, row.resolution, DEFAULT_RESOLUTION, "resolution", row.id);

export const spellCost = (row: SpellRulesRow): SpellCost => readOne(SpellCostSchema, row.cost, "action", "cost", row.id);

export const spellDiceCount = (row: SpellRulesRow): number => readOne(SpellDiceSchema, row.dice, 0, "dice", row.id);

export const spellEffects = (row: SpellRulesRow): Effect[] => readList<Effect>(EffectSchema, row.spellEffects, "effects", row.id);

export const spellRaceModifiers = (row: SpellRulesRow): RaceModifier[] => readList<RaceModifier>(RaceModifierSchema, row.raceModifiers, "raceModifiers", row.id);

const readMaxStacks = (v: number | null | undefined) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10 ? (v as number) : undefined);

export function readSpellDefinition(row: SpellRulesRow): SpellDefinition {
  return {
    dice: spellDiceCount(row),
    cost: spellCost(row),
    targeting: spellTargeting(row),
    resolution: spellResolution(row),
    effects: spellEffects(row),
    raceModifiers: spellRaceModifiers(row),
    stackable: row.stackable === true,
    maxStacks: row.stackable === true ? readMaxStacks(row.maxStacks) : undefined,
  };
}

export function spellDefinitionColumns(def: SpellDefinition) {
  return {
    dice: def.dice,
    cost: def.cost,
    targeting: def.targeting as unknown as Prisma.InputJsonValue,
    resolution: def.resolution as unknown as Prisma.InputJsonValue,
    spellEffects: def.effects as unknown as Prisma.InputJsonValue,
    raceModifiers: def.raceModifiers as unknown as Prisma.InputJsonValue,
    stackable: def.stackable === true,
    maxStacks: def.stackable ? (def.maxStacks ?? null) : null,
  };
}
