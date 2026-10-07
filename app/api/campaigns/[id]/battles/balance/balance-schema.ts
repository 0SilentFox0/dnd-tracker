import { z } from "zod";

export const balanceSchema = z.object({
  /** Якщо тіло порожнє — вважаємо союзників порожніми. */
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
  /** Підібрати склад ворогів; без прапорця повертаються лише сила союзників. */
  suggest: z.boolean().optional(),
  raceId: z.string().optional(),
});
