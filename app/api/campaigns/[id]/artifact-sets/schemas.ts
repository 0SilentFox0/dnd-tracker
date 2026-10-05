import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const setBonusTextSchema = z.object({ name: z.string().optional(), description: z.string().optional() });

/** Вхідний рядок може бути data URL (base64) після завантаження файлу — обробляється на сервері в Storage. */
const ARTIFACT_SET_ICON_INCOMING_MAX = 7 * 1024 * 1024;

export const createArtifactSetSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  setBonus: setBonusTextSchema.optional(),
  abilities: AbilitiesSchema.optional(),
  artifactIds: z.array(z.string()).optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(ARTIFACT_SET_ICON_INCOMING_MAX).nullable().optional(),
  ),
});

export const patchArtifactSetSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional().nullable(),
  setBonus: setBonusTextSchema.optional().nullable(),
  abilities: AbilitiesSchema.optional(),
  artifactIds: z.array(z.string()).optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(ARTIFACT_SET_ICON_INCOMING_MAX).nullable().optional(),
  ),
});

export type CreateArtifactSetBody = z.infer<typeof createArtifactSetSchema>;
export type PatchArtifactSetBody = z.infer<typeof patchArtifactSetSchema>;
