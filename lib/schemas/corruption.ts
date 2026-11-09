import { z } from "zod";

import { CORRUPTION_GRANT_MAX } from "@/lib/utils/rules/systems";

export const corruptionGrantSchema = z.object({ points: z.number().int().min(1).max(CORRUPTION_GRANT_MAX), reason: z.string().trim().min(1).max(80) });

export const corruptionUndoSchema = z.object({ grantId: z.string().min(1).max(64) });

export type CorruptionGrantInput = z.infer<typeof corruptionGrantSchema>;

export type CorruptionUndoInput = z.infer<typeof corruptionUndoSchema>;
