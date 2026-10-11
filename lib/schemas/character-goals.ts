import { z } from "zod";

import { GoalStatus } from "@/lib/constants/characters";
import { GOAL_TEXT_MAX, GOAL_TITLE_MAX, GoalAuthor, GoalKind, MAX_GOALS } from "@/lib/constants/characters";
import type { CharacterGoal } from "@/types/characters";

export const goalInputSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(GOAL_TEXT_MAX),
  title: z.string().trim().max(GOAL_TITLE_MAX).optional(),
  kind: z.enum([GoalKind.MAIN, GoalKind.PERSONAL, GoalKind.INNER, GoalKind.SECRET]).optional(),
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
