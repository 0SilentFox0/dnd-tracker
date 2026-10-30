import { z } from "zod";

import { LOCALES } from "@/lib/i18n/config";
import { isTimeZone } from "@/lib/i18n/time-zone";

export const localeSchema = z
  .object({
    locale: z.enum(LOCALES).optional(),
    timeZone: z.string().refine(isTimeZone).nullable().optional(),
  })
  .refine((v) => v.locale !== undefined || v.timeZone !== undefined);
