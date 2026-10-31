import { z } from "zod";

import { BundleSchema } from "@/lib/server/templates/bundle";
import { SRD_CONTENT_LOCALES } from "@/lib/utils/campaigns/template-locales";

export const MAX_BUNDLE_BYTES = 4 * 1024 * 1024;

export const importCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  bundle: BundleSchema,
});

export const saveAsTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export const cloneCampaignSchema = saveAsTemplateSchema.extend({ contentLocale: z.enum(SRD_CONTENT_LOCALES).optional() });
