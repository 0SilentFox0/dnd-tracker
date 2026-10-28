import { z } from "zod";

import { ASSISTANT_EFFECT_STATUSES,ASSISTANT_INTENT_STATUSES } from "@/lib/constants/assistant";

export const executionModeSchema = z.enum(["review", "auto"]);
export const intentStatusSchema = z.enum(ASSISTANT_INTENT_STATUSES);
export const receiptEffectsStatusSchema = z.enum(ASSISTANT_EFFECT_STATUSES);
export const assistantRequestSchema = z.strictObject({
  actionId: z.string().regex(/^[a-z][a-z-]*(?:\.[a-z][a-z-]*)+$/).max(150),
  requestId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/),
  input: z.json(),
});
export const assistantTargetSchema = z.strictObject({ domain: z.string().min(1).max(80), id: z.string().min(1).max(100), name: z.string().max(500) });
export const actionPreviewSchema = z.strictObject({
  summary: z.string().min(1).max(2000),
  targets: z.array(assistantTargetSchema).max(2000),
  changes: z.array(z.strictObject({ target: assistantTargetSchema, path: z.string().max(1000), before: z.json(), after: z.json() })).max(5000),
  warnings: z.array(z.string().max(2000)).max(2000),
  preconditions: z.json(),
  effects: z.array(z.strictObject({ kind: z.enum(["update", "create", "delete", "erase-progress", "change-access", "publish", "paid"]), targets: z.array(assistantTargetSchema).max(2000), description: z.string().max(2000) })).max(2000),
});
export const actionResultSchema = z.strictObject({ data: z.json(), affected: z.array(assistantTargetSchema).max(2000), warnings: z.array(z.string().max(2000)).max(2000) });
export const intentPageSchema = z.strictObject({ cursor: z.string().min(1).max(1000).optional(), status: intentStatusSchema.optional(), limit: z.number().int().min(1).max(50).default(20) });
export const assistantPolicySchema = z.strictObject({ target: z.enum(["thread", "token"]), id: z.string().min(1).max(100), executionMode: executionModeSchema });
export const receiptEffectsSchema = z.strictObject({
  items: z.array(z.strictObject({ key: z.string().min(1).max(200), kind: z.enum(["invalidate", "publish", "media-cleanup"]), payload: z.json() })).max(2000),
  completed: z.array(z.string().min(1).max(200)).max(2000),
  external: z.object({ phase: z.enum(["started", "result"]), runId: z.string(), result: z.json().optional() }).optional(),
});
