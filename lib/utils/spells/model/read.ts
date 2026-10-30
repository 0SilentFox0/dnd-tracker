import type { Prisma } from "@prisma/client";

import {
  type RaceModifier,
  RaceModifierSchema,
  SpellCastingTimeSchema,
  type SpellCost,
  SpellCostSchema,
  type SpellDefinition,
  SpellDiceSchema,
  SpellDieSidesSchema,
  type SpellEffect,
  SpellEffectSchema,
  type SpellResolution,
  SpellResolutionSchema,
  type SpellTargeting,
  SpellTargetingSchema,
} from "./schema";

type SpellRulesRow = {
  id: string;
  executionMode?: string | null;
  dice?: number | null;
  cost?: string | null;
  casting?: unknown;
  targeting?: unknown;
  resolution?: unknown;
  spellEffects?: unknown;
  raceModifiers?: unknown;
  stackable?: boolean | null;
  maxStacks?: number | null;
  concentration?: boolean | null;
  ritual?: boolean | null;
  dieSides?: number | null;
  upcastDice?: number | null;
  upcastTargets?: number | null;
  addAbilityMod?: boolean | null;
  fixedDice?: boolean | null;
  damageBonus?: number | null;
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

export const spellEffects = (row: SpellRulesRow): SpellEffect[] => readList<SpellEffect>(SpellEffectSchema, row.spellEffects, "effects", row.id);

export const spellRaceModifiers = (row: SpellRulesRow): RaceModifier[] => readList<RaceModifier>(RaceModifierSchema, row.raceModifiers, "raceModifiers", row.id);

const readMaxStacks = (v: number | null | undefined) => (Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10 ? (v as number) : undefined);

const readCount = (v: number | null | undefined) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 10 ? (v as number) : undefined);

function readSpell5e(row: SpellRulesRow) {
  const dieSides = SpellDieSidesSchema.safeParse(row.dieSides);

  const upcastDice = readCount(row.upcastDice);

  const upcastTargets = readCount(row.upcastTargets);

  return {
    ...(dieSides.success && { dieSides: dieSides.data }),
    ...(upcastDice !== undefined && { upcastDice }),
    ...(upcastTargets !== undefined && { upcastTargets }),
    ...(row.addAbilityMod === true && { addAbilityMod: true }),
    ...(row.fixedDice === true && { fixedDice: true }),
    ...(typeof row.damageBonus === "number" && Number.isInteger(row.damageBonus) && row.damageBonus >= -20 && row.damageBonus <= 40 && { damageBonus: row.damageBonus }),
  };
}

export function readSpellDefinition(row: SpellRulesRow): SpellDefinition {
  return {
    ...(row.executionMode === "manual" && { executionMode: "manual" as const }),
    dice: spellDiceCount(row),
    cost: spellCost(row),
    ...(SpellCastingTimeSchema.safeParse(row.casting).success && { casting: SpellCastingTimeSchema.parse(row.casting) }),
    targeting: spellTargeting(row),
    resolution: spellResolution(row),
    effects: spellEffects(row),
    raceModifiers: spellRaceModifiers(row),
    stackable: row.stackable === true,
    maxStacks: row.stackable === true ? readMaxStacks(row.maxStacks) : undefined,
    ...(row.concentration === true && { concentration: true }),
    ...(row.ritual === true && { ritual: true }),
    ...readSpell5e(row),
  };
}

export function spellDefinitionColumns(def: SpellDefinition) {
  return {
    ...(def.executionMode && { executionMode: def.executionMode }),
    dice: def.dice,
    cost: def.cost,
    casting: def.casting as Prisma.InputJsonValue | undefined,
    targeting: def.targeting as unknown as Prisma.InputJsonValue,
    resolution: def.resolution as unknown as Prisma.InputJsonValue,
    spellEffects: def.effects as unknown as Prisma.InputJsonValue,
    raceModifiers: def.raceModifiers as unknown as Prisma.InputJsonValue,
    stackable: def.stackable === true,
    maxStacks: def.stackable ? (def.maxStacks ?? null) : null,
    concentration: def.concentration === true,
    ritual: def.ritual === true,
    dieSides: def.dieSides ?? null,
    upcastDice: def.upcastDice ?? null,
    upcastTargets: def.upcastTargets ?? null,
    addAbilityMod: def.addAbilityMod ?? null,
    fixedDice: def.fixedDice ?? null,
    damageBonus: def.damageBonus ?? null,
  };
}
