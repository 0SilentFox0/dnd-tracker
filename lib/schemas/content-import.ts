import { z } from "zod";

import { IMPORT_LIMITS, IMPORT_MODES } from "@/lib/utils/content/import/kinds";

export const contentImportSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.unknown()))
    .min(1)
    .max(IMPORT_LIMITS.rowsPerRequest)
    .describe("Rows: keys are the import fields of the kind (as in the create body; for skills the flat name, description, icon, image, mainSkillId, spellId, spellGroupId, grantedSpellId, abilities); references are given by name or by id of this campaign; values may be text, as in CSV"),
  mode: z.enum(IMPORT_MODES).default("create").describe("create: a duplicate name is a row error; update: update by name, otherwise create; skip: skip existing ones"),
  dryRun: z.boolean().default(false).describe("Validate only, write nothing"),
});

export type ContentImportInput = z.infer<typeof contentImportSchema>;

export const aiMapRequestSchema = z.object({
  headers: z.array(z.string().max(200)).min(1).max(IMPORT_LIMITS.aiHeaders),
  sample: z.array(z.record(z.string(), z.string().max(IMPORT_LIMITS.aiCellChars))).max(IMPORT_LIMITS.aiSampleRows),
});

export type AiMapRequest = z.infer<typeof aiMapRequestSchema>;
