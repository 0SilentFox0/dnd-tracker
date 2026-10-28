import { z } from "zod";

import { SYNC_SCOPES, SYNC_STATUSES } from "@/lib/constants/source-sync";

const ref = z.strictObject({
  scope: z.enum(SYNC_SCOPES),
  key: z.string().min(1).max(64),
  sourceHash: z.string().max(128).nullable(),
  status: z.enum(SYNC_STATUSES),
});

export const sourceSyncApplySchema = z.strictObject({
  apply: z.array(ref).max(5000).default([]),
  ignore: z.array(ref).max(5000).default([]),
});

export const sourceSyncQuerySchema = z.object({ scope: z.enum(SYNC_SCOPES).optional() });

export type SourceSyncApplyInput = z.infer<typeof sourceSyncApplySchema>;
