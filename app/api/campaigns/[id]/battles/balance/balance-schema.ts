import { z } from "zod";

import { MAX_BALANCE_ALLIES } from "@/lib/constants/battle-balance";

export const balanceSchema = z.object({
  /** Якщо тіло порожнє — вважаємо союзників порожніми. */
  allyParticipants: z
    .object({
      characterIds: z.array(z.string()).max(MAX_BALANCE_ALLIES).default([]),
      units: z
        .array(
          z.object({ id: z.string(), quantity: z.number().min(1).max(20) }),
        )
        .max(MAX_BALANCE_ALLIES)
        .default([]),
    })
    .default({ characterIds: [], units: [] }),
  /** Підібрати склад ворогів; без прапорця повертаються лише сила союзників. */
  suggest: z.boolean().optional(),
  raceId: z.string().optional(),
});
