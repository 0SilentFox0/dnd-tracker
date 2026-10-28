import { z } from "zod";

import { NOTIFICATION_TYPES } from "@/lib/constants/notifications";

export const markNotificationsReadSchema = z
  .object({
    types: z.array(z.enum(NOTIFICATION_TYPES)).max(NOTIFICATION_TYPES.length).optional(),
    refIds: z.array(z.string().min(1).max(200)).max(200).optional(),
  })
  .refine((d) => !!d.types?.length || !!d.refIds?.length);
