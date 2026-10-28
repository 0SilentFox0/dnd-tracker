import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import type { Actor, ActorNeed } from "@/lib/utils/api/actor";

export type JsonValue = Prisma.JsonValue;
export type AssistantChannel = "chat" | "mcp";
export type ExecutionMode = "review" | "auto";
export type AssistantCaller = { actor: Actor; channel: AssistantChannel; threadId: string | null; tokenId: string | null; runId?: string };
export type ActionRequest = { actionId: string; input: unknown; requestId: string };
export type TargetRef = { domain: string; id: string; name: string };
export type FieldChange = { target: TargetRef; path: string; before: JsonValue; after: JsonValue };
export type EffectKind = "update" | "create" | "delete" | "erase-progress" | "change-access" | "publish" | "paid";
export type EffectDescription = { kind: EffectKind; targets: TargetRef[]; description: string };
export type ActionPreview = { summary: string; targets: TargetRef[]; changes: FieldChange[]; warnings: string[]; preconditions: JsonValue; effects: EffectDescription[] };
export type ActionResult = { data: JsonValue; affected: TargetRef[]; warnings: string[] };
export type DurableEffect = { key: string; kind: "invalidate" | "publish" | "media-cleanup"; payload: JsonValue };
export type ActionExecutionContext = { caller: AssistantCaller; intentId: string; expected: JsonValue; db: Prisma.TransactionClient; afterCommit(effect: DurableEffect): void; externalResult?: JsonValue };
export type IntentStatus = "pending" | "executing" | "applied" | "rejected" | "stale" | "expired" | "failed" | "unknown";
export type IntentSummary = { id: string; actionId: string; status: IntentStatus; summary: string; targets: TargetRef[]; expiresAt: string; channel: AssistantChannel; legacyProposalId?: string | null };
export type IntentDetail = IntentSummary & { preview: ActionPreview };
export type ReceiptDto = { id: string; status: IntentStatus; result: ActionResult | null; effectsStatus: "pending" | "complete" | "failed" | "unknown" };
export type HandoffResult = { href: string; reason: string };
export type DispatchResult = { kind: "result"; result: ActionResult } | { kind: "pending"; intent: IntentSummary; reviewUrl: string } | ({ kind: "handoff" } & HandoffResult);

type ActionBase = { id: string; title: string; description: string; input: z.ZodType; need: ActorNeed };
export type AssistantReadAction = ActionBase & { effect: "read"; handoff?(caller: AssistantCaller, input: unknown): Promise<HandoffResult | null>; execute(caller: AssistantCaller, input: unknown): Promise<ActionResult> };
export type AssistantHandoffAction = ActionBase & { effect: "handoff"; execute(caller: AssistantCaller, input: unknown): Promise<HandoffResult> };
export type AssistantWriteAction = ActionBase & {
  effect: "write" | "paid";
  confirmation: "standard" | "always";
  prepare(caller: AssistantCaller, input: unknown): Promise<ActionPreview>;
  /** Runs once, outside any DB transaction, after a durable claim. */
  external?(caller: AssistantCaller, input: unknown, signal?: AbortSignal): Promise<JsonValue>;
  execute(ctx: ActionExecutionContext, input: unknown): Promise<ActionResult>;
};
export type AssistantActionDef = AssistantReadAction | AssistantHandoffAction | AssistantWriteAction;
