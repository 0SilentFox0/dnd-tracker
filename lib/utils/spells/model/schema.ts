import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { EffectSchema } from "@/lib/utils/abilities/schema";

export const SPELL_COSTS = ["action", "bonusAction", "reaction", "long"] as const;

export const SpellCastingTimeSchema = z.object({
  rounds: z.number().int().min(2).max(144000).optional(),
  text: z.string().trim().min(1).max(500).optional(),
  trigger: z.string().trim().min(1).max(1000).optional(),
});

export type SpellCastingTime = z.infer<typeof SpellCastingTimeSchema>;

export const SpellCostSchema = z.enum(SPELL_COSTS);

export const TEMPLATE_SHAPES = ["circle", "cube", "cone", "line", "cross", "emanation"] as const;

const rangeField = z.number().int().min(5).max(600).optional();

export const SpellZoneSchema = z.object({ rounds: z.number().int().min(1).max(10), label: z.string().max(60).optional() });

export const SpellTargetingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({ kind: z.literal("ally"), range: rangeField }),
  z.object({ kind: z.literal("enemy"), range: rangeField }),
  z.object({ kind: z.literal("allyDead"), range: rangeField }),
  z.object({ kind: z.literal("allAlliesDead") }),
  z.object({ kind: z.literal("area"), side: z.enum(["ally", "enemy"]), maxTargets: z.number().int().min(1).max(20), range: rangeField, chain: z.boolean().optional() }),
  z.object({
    kind: z.literal("template"),
    shape: z.enum(TEMPLATE_SHAPES),
    size: z.number().int().min(5).max(120),
    side: z.enum(["ally", "enemy"]),
    maxTargets: z.number().int().min(1).max(20),
    range: rangeField,
    zone: SpellZoneSchema.optional(),
    hollow: z.boolean().optional(),
    exact: z.boolean().optional(),
  }).refine((t) => t.exact === undefined || t.shape === "circle", { message: "Точна площа доступна лише для кола", path: ["exact"] }),
  z.object({ kind: z.literal("allAllies") }),
  z.object({ kind: z.literal("allEnemies") }),
  z.object({ kind: z.literal("everyone") }),
]);

export const SpellResolutionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }),
  z.object({ kind: z.literal("save"), ability: z.enum(ABILITY_KEYS), onSuccess: z.enum(["half", "none"]) }),
  z.object({ kind: z.literal("attack") }),
]);

export const RaceModifierSchema = z.object({
  raceId: z.string().min(1),
  percent: z.number().min(-100).max(200),
});

export const SpellDiceSchema = z.number().int().min(0).max(40);

export const SpellDieSidesSchema = z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12)]);

export const SpellDefinitionSchema = z.object({
  executionMode: z.enum(["native", "manual"]).optional(),
  dice: SpellDiceSchema,
  cost: SpellCostSchema,
  casting: SpellCastingTimeSchema.optional(),
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  effects: z.array(EffectSchema),
  raceModifiers: z.array(RaceModifierSchema),
  stackable: z.boolean().optional(),
  maxStacks: z.number().int().min(1).max(10).optional(),
  concentration: z.boolean().optional(),
  dieSides: SpellDieSidesSchema.optional(),
  upcastDice: z.number().int().min(0).max(10).optional(),
  upcastTargets: z.number().int().min(0).max(10).optional(),
  addAbilityMod: z.boolean().optional(),
  fixedDice: z.boolean().optional(),
  damageBonus: z.number().int().min(-20).max(40).optional(),
}).refine((d) => d.resolution.kind !== "attack" || d.targeting.kind === "enemy" || d.targeting.kind === "area", {
  message: "Атака заклинанням — лише для цілі-ворога або області",
  path: ["resolution"],
});

export type SpellCost = z.infer<typeof SpellCostSchema>;

export type SpellTargeting = z.infer<typeof SpellTargetingSchema>;

export type SpellResolution = z.infer<typeof SpellResolutionSchema>;

export type RaceModifier = z.infer<typeof RaceModifierSchema>;

export type SpellDefinition = z.infer<typeof SpellDefinitionSchema>;
