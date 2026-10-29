import { z } from "zod";

import { AbilitiesSchema } from "@/lib/utils/abilities/schema";

const setBonusTextSchema = z.object({ name: z.string().optional(), description: z.string().optional() });

/** Incoming string may be a data URL (base64) after a file upload — processed server-side into Storage. */
const ARTIFACT_SET_ICON_INCOMING_MAX = 7 * 1024 * 1024;

export const createArtifactSetSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  setBonus: setBonusTextSchema.optional(),
  abilities: AbilitiesSchema.describe("Set abilities").optional(),
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
  abilities: AbilitiesSchema.describe("Set abilities").optional(),
  artifactIds: z.array(z.string()).optional(),
  icon: z.preprocess(
    (val) => (val === "" ? null : val),
    z.string().max(ARTIFACT_SET_ICON_INCOMING_MAX).nullable().optional(),
  ),
});
