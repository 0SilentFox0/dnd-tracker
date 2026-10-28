import type { Prisma } from "@prisma/client";

import { authorizeAssistant } from "./authorize";
import { runDurableEffects } from "./effects";
import { conflict } from "./errors";
import { readExternalState } from "./execution-state";
import type { IntentTransactionOutcome } from "./execution-transaction";
import type { ExecutorDeps } from "./executor-deps";
import { intentOwner } from "./intent-store";
import { readReceipt } from "./receipts";
import type { AssistantCaller, ReceiptDto } from "./types";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { receiptEffectsSchema } from "@/lib/schemas/assistant";
import { ContentError, parseInput } from "@/lib/server/content/errors";

/** Continue only after the claim/domain transaction committed. Resume uses the same executor. */
export async function completeIntentOutcome(deps: ExecutorDeps, caller: AssistantCaller, intentId: string, outcome: IntentTransactionOutcome, callbacks: Array<() => void>, resume: () => Promise<ReceiptDto>, signal?: AbortSignal): Promise<ReceiptDto> {
  const { db } = deps;

  if (outcome.kind === "conflict") throw outcome.error;

  if (outcome.kind === "external") {
    const { action, input } = outcome;

    let result;

    try {
      signal?.throwIfAborted();

      if (!action.external) throw conflict();

      result = await action.external(caller, input, AbortSignal.any([AbortSignal.timeout(AI_LIMITS.requestDeadlineMs), ...(signal ? [signal] : [])]));
    } catch {
      // A timeout/cancellation is not proof the provider did not charge or upload.
      return readReceipt(caller, intentId, db);
    }

    const stored = outcome.receipt.effects as Prisma.JsonObject;

    await db.assistantReceipt.update({ where: { intentId }, data: {
      status: "executing", effectsStatus: "pending",
      effects: { ...stored, external: { ...readExternalState(stored), phase: "result", result } } as Prisma.InputJsonValue,
    } });

    return resume();
  }

  let callbacksFailed = false;

  for (const callback of callbacks) { try { await callback(); } catch { callbacksFailed = true; } }

  if ("effects" in outcome && outcome.effects?.length && outcome.receipt) {
    const effects = await runDurableEffects(outcome.effects, deps.effects, []);

    await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: effects.status, effects: { items: outcome.effects, completed: effects.completed, ...(readExternalState(outcome.receipt.effects) && { external: readExternalState(outcome.receipt.effects) }) } as unknown as Prisma.InputJsonValue } });
  }

  if (callbacksFailed) await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: "unknown" } });

  return readReceipt(caller, intentId, db);
}

export async function reconcileReceiptEffects(deps: ExecutorDeps, caller: AssistantCaller, intentId: string): Promise<ReceiptDto> {
  const { db, catalog } = deps;

  const row = await db.assistantReceipt.findFirst({ where: { intentId, ...intentOwner(caller) } });

  if (!row) throw new ContentError(API_ERRORS.ASSISTANT_RECEIPT_NOT_FOUND, 404);

  await authorizeAssistant(caller, catalog.getAction(row.actionId).need, "prepare", db);

  if (row.status !== "applied" || row.effectsStatus === "complete" || row.effectsStatus === "unknown") return readReceipt(caller, intentId, db);

  const stored = parseInput(receiptEffectsSchema, row.effects);

  const effects = await runDurableEffects(stored.items, deps.effects, stored.completed);

  await db.assistantReceipt.update({ where: { intentId }, data: { effectsStatus: effects.status, effects: { ...stored, items: stored.items, completed: effects.completed } } });

  return readReceipt(caller, intentId, db);
}
