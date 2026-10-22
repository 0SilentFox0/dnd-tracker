import { z } from "zod";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import { GoalKind } from "@/lib/constants/characters";
import { HERO_ARCHETYPE_KEYS } from "@/lib/constants/hero-archetypes";
import type { DraftInput } from "@/types/characters";

const score = z.number().int();

export const draftSchema = z.object({
  name: z.string().trim().min(1).max(100),
  race: z.string().min(1),
  class: z.string().min(1).max(100),
  archetype: z.enum(HERO_ARCHETYPE_KEYS),
  alignment: z.string().optional(),
  background: z.string().max(4000).optional(),
  avatar: z.string().optional(),
  method: z.enum(["standard", "pointBuy"]),
  strength: score,
  dexterity: score,
  constitution: score,
  intelligence: score,
  wisdom: score,
  charisma: score,
  primaryAbility: z.enum(ABILITY_KEYS).optional(),
  goals: z
    .array(z.object({ text: z.string().min(1).max(500), kind: z.enum([GoalKind.MAIN, GoalKind.PERSONAL, GoalKind.INNER, GoalKind.SECRET]) }))
    .max(5)
    .optional(),
}) satisfies z.ZodType<DraftInput>;
