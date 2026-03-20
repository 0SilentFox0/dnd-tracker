import { z } from "zod";

export const createArtifactSetSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  setBonus: z.unknown().optional(),
  artifactIds: z.array(z.string()).optional(),
});

export const patchArtifactSetSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().optional().nullable(),
  setBonus: z.unknown().optional().nullable(),
  artifactIds: z.array(z.string()).optional(),
});

export type CreateArtifactSetBody = z.infer<typeof createArtifactSetSchema>;
export type PatchArtifactSetBody = z.infer<typeof patchArtifactSetSchema>;
