import { type AssistantIntent, type AssistantReceipt, Prisma } from "@prisma/client";

import { authorizeAssistant } from "./authorize";
import { conflict,forbidden } from "./errors";
import { actionExpected, actionExternalResult, externalRun, readExternalState } from "./execution-state";
import { executionModeFor, type ExecutorDeps } from "./executor-deps";
import { intentOwner } from "./intent-store";
import { requestDigest } from "./json";
import { confirmationFor } from "./policy";
import type { ActionExecutionContext, AssistantCaller, AssistantWriteAction, DurableEffect } from "./types";

import "server-only";
import { isApiTokenScope } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ASSISTANT_LIMITS } from "@/lib/constants/assistant";
import { actionPreviewSchema, actionResultSchema } from "@/lib/schemas/assistant";
import { lockCampaignRow } from "@/lib/server/campaigns/lock";
import { ContentError, parseInput } from "@/lib/server/content/errors";
import { runContentWriteContext } from "@/lib/server/content/write-context";

export type IntentTransactionOutcome =
  | { kind: "receipt"; receipt: AssistantReceipt; effects?: DurableEffect[] }
  | { kind: "external"; receipt: AssistantReceipt; action: AssistantWriteAction; input: unknown }
  | { kind: "conflict"; error: ContentError };

type Tx = Prisma.TransactionClient;

type WriteAction = ReturnType<ExecutorDeps["catalog"]["getAction"]> & AssistantWriteAction;

interface ExecScope { deps: ExecutorDeps; caller: AssistantCaller; tx: Tx; row: AssistantIntent; done: AssistantReceipt | null; action: WriteAction; human: boolean; signal?: AbortSignal }

/** Locks the intent and decides whether it is already settled (receipt/conflict) or can run. */
async function claimIntent(deps: ExecutorDeps, caller: AssistantCaller, tx: Tx, intentId: string): Promise<{ outcome: IntentTransactionOutcome } | { row: AssistantIntent; done: AssistantReceipt | null }> {
  const { catalog, now } = deps;

  const where = { id: intentId, ...intentOwner(caller) };

  const owned = await tx.assistantIntent.findFirst({ where });

  const previous = await tx.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

  if (!owned && !previous) throw new ContentError(API_ERRORS.AI_PROPOSAL_NOT_FOUND, 404);

  if (!owned && previous) {
    await authorizeAssistant(caller, catalog.getAction(previous.actionId).need, "prepare", tx);

    return { outcome: { kind: "receipt", receipt: previous } };
  }

  await lockCampaignRow(tx, caller.actor.campaignId);
  await tx.$queryRaw`SELECT id FROM assistant_intents WHERE id = ${intentId} FOR UPDATE`;

  const row = await tx.assistantIntent.findFirst({ where });

  if (!row) throw conflict();

  const done = await tx.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

  if (done && !(done.status === "executing" && actionExternalResult(done.effects) !== undefined)) {
    await authorizeAssistant(caller, catalog.getAction(done.actionId).need, "prepare", tx);

    return { outcome: { kind: "receipt", receipt: done } };
  }

  if ((row.status !== "pending" && !(done?.status === "executing")) || row.redactedAt) throw conflict();

  if (!done && row.expiresAt <= now()) {
    await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "expired" } });

    return { outcome: { kind: "conflict", error: conflict() } };
  }

  return { row, done };
}

async function authorizeExecution(tx: Tx, caller: AssistantCaller, row: AssistantIntent, action: WriteAction) {
  await tx.$queryRaw`SELECT id FROM campaign_members WHERE "campaignId" = ${row.campaignId} AND "userId" = ${caller.actor.userId} FOR SHARE`;
  await authorizeAssistant(caller, action.need, "execute", tx);

  if (!row.originTokenId) return;

  await tx.$queryRaw`SELECT id FROM api_tokens WHERE id = ${row.originTokenId} FOR SHARE`;

  const original = await tx.apiToken.findUnique({ where: { id: row.originTokenId }, select: { id: true, scopes: true, campaignId: true, userId: true, revokedAt: true } });

  if (!original || original.revokedAt || original.userId !== row.userId || original.campaignId !== row.campaignId) throw forbidden();

  await authorizeAssistant({ actor: { ...caller.actor, via: "token", scopes: original.scopes.filter(isApiTokenScope) }, channel: "mcp", tokenId: row.originTokenId, threadId: null, locale: caller.locale }, action.need, "prepare", tx);
}

async function markStale({ tx, row, done }: ExecScope) {
  await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "stale" } });

  if (done) await tx.assistantReceipt.update({ where: { intentId: row.id }, data: { status: "stale" } });

  if (row.legacyProposalId) await tx.aiProposal.updateMany({ where: { id: row.legacyProposalId, campaignId: row.campaignId, status: "pending" }, data: { status: "stale" } });
}

async function startExternalRun({ tx, row, action }: ExecScope, input: unknown): Promise<IntentTransactionOutcome> {
  // The campaign lock serializes image budget claims as well as domain writes.
  const runId = externalRun(row.expected) ?? row.id;

  if (action.effect === "paid") {
    const priorImages = await tx.assistantReceipt.findMany({ where: { campaignId: row.campaignId, userId: row.userId, actionId: row.actionId } });

    if (priorImages.some(r => readExternalState(r.effects)?.runId === runId)) throw new ContentError(API_ERRORS.ASSISTANT_ONE_IMAGE_PER_RUN, 409);
  }

  const receipt = await tx.assistantReceipt.create({ data: {
    intentId: row.id, campaignId: row.campaignId, userId: row.userId, originTokenId: row.originTokenId,
    originKey: row.originKey, requestId: row.requestId, requestHash: row.requestHash, actionId: row.actionId,
    status: "unknown", result: Prisma.JsonNull, effectsStatus: "unknown", effects: { items: [], completed: [], external: { phase: "started", runId } },
  } });

  await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "executing" } });

  return { kind: "external", receipt, action, input };
}

async function applyAction({ caller, tx, row, done, action }: ExecScope, input: unknown): Promise<IntentTransactionOutcome> {
  const effects: DurableEffect[] = [];

  const ctx: ActionExecutionContext = { caller, intentId: row.id, expected: actionExpected(row.expected), db: tx, externalResult: done ? actionExternalResult(done.effects) : undefined, afterCommit: (effect) => { effects.push(effect); } };

  const result = parseInput(actionResultSchema, await action.execute(ctx, input));

  const data = {
    intentId: row.id, campaignId: row.campaignId, userId: row.userId, originTokenId: row.originTokenId,
    originKey: row.originKey, requestId: row.requestId, requestHash: row.requestHash, actionId: row.actionId,
    status: "applied", result: result as Prisma.InputJsonValue,
    effects: { items: effects, completed: [], ...(done && { external: readExternalState(done.effects) }) } as unknown as Prisma.InputJsonValue,
    effectsStatus: effects.length ? "pending" : "complete",
  };

  const receipt = done ? await tx.assistantReceipt.update({ where: { intentId: row.id }, data }) : await tx.assistantReceipt.create({ data });

  // Campaign deletion may already have cascaded the intent away.
  if (await tx.assistantIntent.findFirst({ where: { id: row.id } })) await tx.assistantIntent.update({ where: { id: row.id }, data: { status: "applied" } });

  return { kind: "receipt", receipt, effects };
}

async function executeInScope(scope: ExecScope): Promise<IntentTransactionOutcome> {
  const { deps, caller, tx, row, done, action, human, signal } = scope;

  signal?.throwIfAborted();

  const input = parseInput(action.input, row.payload);

  const prepared = await action.prepare(caller, input).catch((error: unknown) => {
    if (error instanceof ContentError && (error.status === 404 || error.status === 409)) return null;

    throw error;
  });

  const fresh = prepared === null ? null : parseInput(actionPreviewSchema, prepared);

  if (!fresh || requestDigest(fresh.preconditions) !== requestDigest(actionExpected(row.expected))) {
    await markStale(scope);

    return { kind: "conflict", error: conflict() };
  }

  const policyCaller = row.channel === "chat" ? { ...caller, threadId: row.originThreadId } : caller;

  if (!human && confirmationFor(action, await executionModeFor(policyCaller, tx), fresh) === "human") throw conflict();

  if (action.effect === "paid" && !action.external) throw conflict();

  if (action.external && !done) return startExternalRun(scope, input);

  return applyAction(scope, input);
}

/** Only atomic database work belongs here; external calls and effects run after commit. */
export async function executeIntentTransaction(deps: ExecutorDeps, caller: AssistantCaller, intentId: string, human: boolean, callbacks: Array<() => void>, signal?: AbortSignal): Promise<IntentTransactionOutcome> {
  const { db, catalog } = deps;

  return db.$transaction<IntentTransactionOutcome>(async (tx) => {
    const claimed = await claimIntent(deps, caller, tx, intentId);

    if ("outcome" in claimed) return claimed.outcome;

    const { row, done } = claimed;

    const action = catalog.getAction(row.actionId);

    if (action.effect !== "write" && action.effect !== "paid") throw new ContentError(API_ERRORS.ASSISTANT_EXEC_MODE_MISMATCH, 409);

    await authorizeExecution(tx, caller, row, action);

    // All content writes in this scope reuse the same transaction/connection.
    return runContentWriteContext<IntentTransactionOutcome>(row.campaignId, tx, () => executeInScope({ deps, caller, tx, row, done, action, human, signal }), callbacks);
  }, { timeout: ASSISTANT_LIMITS.transactionTimeoutMs, maxWait: ASSISTANT_LIMITS.transactionMaxWaitMs });
}
