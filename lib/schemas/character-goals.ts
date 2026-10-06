import { z } from "zod";

import type { CharacterGoal } from "@/types/characters";

export const MAX_GOALS = 30;

export const goalInputSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(300),
  status: z.enum(["active", "done", "failed"]),
  author: z.enum(["dm", "player"]).optional(),
});

export type GoalInput = z.infer<typeof goalInputSchema>;

export const characterGoalsSchema = z.array(goalInputSchema.required({ author: true })).max(MAX_GOALS);

export const putGoalsSchema = z.object({ goals: z.array(goalInputSchema).max(MAX_GOALS), seen: z.array(z.string().max(40)).max(200).optional() });

export function parseGoals(raw: unknown): CharacterGoal[] {
  const parsed = characterGoalsSchema.safeParse(raw);

  return parsed.success ? parsed.data : [];
}
