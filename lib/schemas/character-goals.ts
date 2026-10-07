import { z } from "zod";

import { GoalStatus } from "@/lib/constants/characters";
import { GoalAuthor, MAX_GOALS } from "@/lib/constants/characters";
import type { CharacterGoal } from "@/types/characters";

export const goalInputSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(300),
  status: z.enum([GoalStatus.ACTIVE, GoalStatus.DONE, GoalStatus.FAILED]),
  author: z.nativeEnum(GoalAuthor).optional(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export const characterGoalsSchema = z.array(goalInputSchema.required({ author: true })).max(MAX_GOALS);

export const putGoalsSchema = z.object({ goals: z.array(goalInputSchema).max(MAX_GOALS), seen: z.array(z.string().max(40)).max(200).optional() });

export function parseGoals(raw: unknown): CharacterGoal[] {
  const parsed = characterGoalsSchema.safeParse(raw);

  return parsed.success ? parsed.data : [];
}
