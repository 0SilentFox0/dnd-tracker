import { z } from "zod";

export const balanceSchema = z.object({
  /** Якщо тіло порожнє / лише фільтри — вважаємо союзників порожніми (статистика по всіх сутностях кампанії). */
  allyParticipants: z
    .object({
      characterIds: z.array(z.string()).default([]),
      units: z
        .array(
          z.object({ id: z.string(), quantity: z.number().min(1).max(20) }),
        )
        .default([]),
    })
    .default({ characterIds: [], units: [] }),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  minTier: z.number().min(1).max(30).optional(),
  maxTier: z.number().min(1).max(30).optional(),
  groupId: z.string().optional(),
  race: z.string().optional(),
});
