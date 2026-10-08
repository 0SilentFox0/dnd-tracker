import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { EffectSchema } from "@/lib/utils/abilities/schema";

export const SPELL_COSTS = ["action", "bonusAction"] as const;

export const SpellCostSchema = z.enum(SPELL_COSTS);

export const SpellTargetingSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("self") }),
  z.object({ kind: z.literal("ally") }),
  z.object({ kind: z.literal("enemy") }),
  z.object({ kind: z.literal("allyDead") }),
  z.object({ kind: z.literal("area"), side: z.enum(["ally", "enemy"]), maxTargets: z.number().int().min(1).max(20) }),
  z.object({ kind: z.literal("allAllies") }),
  z.object({ kind: z.literal("allEnemies") }),
  z.object({ kind: z.literal("everyone") }),
]);

export const SpellResolutionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("auto") }),
  z.object({ kind: z.literal("save"), ability: z.enum(ABILITY_KEYS), onSuccess: z.enum(["half", "none"]) }),
]);

export const RaceModifierSchema = z.object({
  raceId: z.string().min(1),
  percent: z.number().min(-100).max(200),
});

export const SpellDiceSchema = z.number().int().min(0).max(20);

export const SpellDefinitionSchema = z.object({
  dice: SpellDiceSchema,
  cost: SpellCostSchema,
  targeting: SpellTargetingSchema,
  resolution: SpellResolutionSchema,
  effects: z.array(EffectSchema),
  raceModifiers: z.array(RaceModifierSchema),
});

export type SpellCost = z.infer<typeof SpellCostSchema>;

export type SpellTargeting = z.infer<typeof SpellTargetingSchema>;

export type SpellResolution = z.infer<typeof SpellResolutionSchema>;

export type RaceModifier = z.infer<typeof RaceModifierSchema>;

export type SpellDefinition = z.infer<typeof SpellDefinitionSchema>;
