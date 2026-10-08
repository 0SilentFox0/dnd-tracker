import type { Prisma } from "@prisma/client";

import {
  type RaceModifier,
  RaceModifierSchema,
  type SpellCost,
  SpellCostSchema,
  type SpellDefinition,
  type SpellResolution,
  SpellResolutionSchema,
  type SpellTargeting,
  SpellTargetingSchema,
} from "./schema";

import { type Effect, EffectSchema } from "@/lib/utils/abilities/schema";

type SpellRow = {
  id: string;
  dice?: number | null;
  cost?: string | null;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  raceModifiers?: unknown;
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

export const spellTargeting = (row: SpellRow): SpellTargeting => readOne(SpellTargetingSchema, row.targeting, DEFAULT_TARGETING, "targeting", row.id);

export const spellResolution = (row: SpellRow): SpellResolution => readOne(SpellResolutionSchema, row.resolution, DEFAULT_RESOLUTION, "resolution", row.id);

export const spellCost = (row: SpellRow): SpellCost => {
  const parsed = SpellCostSchema.safeParse(row.cost);

  return parsed.success ? parsed.data : "action";
};

export const spellEffects = (row: SpellRow): Effect[] => readList<Effect>(EffectSchema, row.spellEffects, "effects", row.id);

export const spellRaceModifiers = (row: SpellRow): RaceModifier[] => readList<RaceModifier>(RaceModifierSchema, row.raceModifiers, "raceModifiers", row.id);

export function readSpellDefinition(row: SpellRow): SpellDefinition {
  return {
    dice: typeof row.dice === "number" && row.dice >= 0 ? row.dice : 0,
    cost: spellCost(row),
    targeting: spellTargeting(row),
    resolution: spellResolution(row),
    effects: spellEffects(row),
    raceModifiers: spellRaceModifiers(row),
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
  };
}
