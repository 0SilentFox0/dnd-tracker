import { z } from "zod";

import { GRANT_MAX as CORRUPTION_GRANT_MAX, REASON_MAX as CORRUPTION_REASON_MAX } from "@/systems/wfrp/rules/corruption/constants";

export const corruptionGrantSchema = z.object({ points: z.number().int().min(1).max(CORRUPTION_GRANT_MAX), reason: z.string().trim().min(1).max(CORRUPTION_REASON_MAX) });

export const corruptionUndoSchema = z.object({ grantId: z.string().min(1).max(64) });

export type CorruptionGrantInput = z.infer<typeof corruptionGrantSchema>;

export type CorruptionUndoInput = z.infer<typeof corruptionUndoSchema>;
