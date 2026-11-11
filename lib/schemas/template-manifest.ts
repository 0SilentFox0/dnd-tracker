import { z } from "zod";

import { ICON_BUCKETS } from "@/lib/constants/storage";
import { PACK_KINDS, TEMPLATE_CONTENT_LOCALES, TEMPLATE_KEY_PATTERN, type TemplateManifest } from "@/lib/utils/templates/manifest";

const kind = z.enum(PACK_KINDS);

const locale = z.enum(TEMPLATE_CONTENT_LOCALES);

const manifestShape = z.strictObject({
  key: z.string().regex(TEMPLATE_KEY_PATTERN),
  system: z.string().min(1),
  names: z.record(locale, z.string().min(1)),
  locales: z.array(locale).min(1),
  rules: z.strictObject({ file: z.literal("rules.json") }),
  kinds: z.array(kind),
  extras: z.array(z.string().min(1)).optional(),
  icons: z.strictObject({ bucketByKind: z.partialRecord(kind, z.enum(ICON_BUCKETS)).optional() }),
  compendium: z.boolean().optional(),
  source: z.strictObject({ repo: z.string(), path: z.string(), sha: z.string(), license: z.string() }).optional(),
  credits: z.string().optional(),
  include: z.array(z.strictObject({ from: z.string().regex(TEMPLATE_KEY_PATTERN), kinds: z.partialRecord(kind, z.union([z.array(z.string()), z.literal("all")])) })).optional(),
  counts: z.partialRecord(kind, z.number().int().nonnegative()),
});

export const TemplateManifestSchema = manifestShape.superRefine((manifest, ctx) => {
  if (manifest.locales[0] !== "en") ctx.addIssue({ code: "custom", path: ["locales"], message: "locales[0] must be en" });

  if (new Set(manifest.locales).size !== manifest.locales.length) ctx.addIssue({ code: "custom", path: ["locales"], message: "locales must be unique" });
}) as unknown as z.ZodType<TemplateManifest>;
