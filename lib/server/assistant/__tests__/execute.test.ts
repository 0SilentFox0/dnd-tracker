import { describe, expect, it } from "vitest";
import { z } from "zod";

import { executorDatabase } from "./fixtures/executor-db";

import { createActionCatalog } from "@/lib/server/assistant/catalog";
import { createAssistantExecutor } from "@/lib/server/assistant/execute";
import type { ActionExecutionContext, ActionPreview, AssistantCaller, AssistantWriteAction } from "@/lib/server/assistant/types";
import { afterContentCommit } from "@/lib/server/content/write-context";

const caller: AssistantCaller = { actor: { campaignId: "campaign", userId: "dm", isDM: true, via: "session", scopes: null }, channel: "chat", tokenId: null, threadId: "thread" };

const request = { actionId: "characters.update", requestId: "request", input: {} };

function fixture() {
  const { db, state } = executorDatabase();

  const action: AssistantWriteAction = {
    id: "characters.update", title: "Зміна", description: "Змінити героя", need: { access: "dm", scope: "characters:write" }, input: z.object({}), effect: "write", confirmation: "standard",
    prepare: async (): Promise<ActionPreview> => ({ summary: "Змінити", targets: [], changes: [], warnings: [], effects: [{ kind: "update", targets: [], description: "Зміна" }], preconditions: { counter: state.counter } }),
    execute: async () => { state.counter++;

 return { data: { counter: state.counter }, affected: [], warnings: [] }; },
  };

  const executor = createAssistantExecutor({ db, catalog: createActionCatalog([action]) });

  return { db, state, action, executor };
}

describe("confirmed assistant execution", () => {
  it("review prepares immutable intent without changing domain state", async () => {
    const { executor, state } = fixture();

    const result = await executor.dispatchAction(caller, request);

    expect(result.kind).toBe("pending");
    expect(state.counter).toBe(0);
    expect(state.receipts.size).toBe(0);
  });

  it("concurrent confirmations and retry after commit return one result", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    const results = await Promise.all([executor.confirmIntent(caller.actor, prepared.intent.id), executor.confirmIntent(caller.actor, prepared.intent.id)]);

    expect(results[0]).toEqual(results[1]);
    expect(state.counter).toBe(1);
    expect(state.receipts.size).toBe(1);

    const retry = await executor.dispatchAction(caller, request);

    expect(retry).toMatchObject({ kind: "result", result: { data: { counter: 1 } } });
    expect(state.counter).toBe(1);
  });

  it("changed preconditions mark intent stale without domain writes", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    state.counter = 5;
    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(state.counter).toBe(5);
    expect(state.intents.get(prepared.intent.id)?.status).toBe("stale");
    expect(state.receipts.size).toBe(0);
  });

  it("lost DM and revoked originating token reject confirmation", async () => {
    const { executor, state } = fixture();

    const tokenCaller: AssistantCaller = { ...caller, actor: { ...caller.actor, via: "token", scopes: ["characters:write"] }, channel: "mcp", tokenId: "token", threadId: null };

    const prepared = await executor.dispatchAction(tokenCaller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    state.tokenActive = false;
    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toMatchObject({ status: 403 });
    state.tokenActive = true;
    state.isDM = false;
    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toMatchObject({ status: 403 });
    expect(state.counter).toBe(0);
  });

  it("a token can never call the human confirmation entrypoint", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    await expect(executor.confirmIntent({ ...caller.actor, via: "token", scopes: ["characters:write"] }, prepared.intent.id)).rejects.toMatchObject({ status: 403 });
    expect(state.counter).toBe(0);
  });

  it("an expired intent cannot execute even if the model retries it", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    const row = state.intents.get(prepared.intent.id);

    if (row) row.expiresAt = new Date(0);

    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(state.counter).toBe(0);
  });

  it("failed domain execution rolls back both domain and receipt", async () => {
    const { db, state, action } = fixture();

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, execute: async () => { state.counter++; throw new Error("domain failure"); } }]) });

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toThrow("domain failure");
    expect(state.counter).toBe(0);
    expect(state.receipts.size).toBe(0);
  });

  it("auto is read from server settings and still cannot perform destructive effects", async () => {
    const { db, state, action } = fixture();

    db.aiThread.findFirst = (async () => ({ executionMode: "auto" })) as never;

    const auto = createAssistantExecutor({ db, catalog: createActionCatalog([action]) });

    expect(await auto.dispatchAction(caller, request)).toMatchObject({ kind: "result", result: { data: { counter: 1 } } });

    const destructive = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, prepare: async (...args) => ({ ...await action.prepare(...args), effects: [{ kind: "delete", targets: [], description: "Видалення" }] }) }]) });

    expect(await destructive.dispatchAction(caller, { ...request, requestId: "another" })).toMatchObject({ kind: "pending" });
    expect(state.counter).toBe(1);
  });

  it("stop after commit does not roll back an applied action", async () => {
    const { db, state, action } = fixture();

    const controller = new AbortController();

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, execute: async (ctx: ActionExecutionContext, input: unknown) => { ctx.afterCommit({ key: "publish", kind: "publish", payload: {} });

 return action.execute(ctx, input); } }]), effects: { publish: async () => { controller.abort(); } } });

    const prepared = await executor.dispatchAction(caller, request, controller.signal);

    if (prepared.kind !== "pending") throw new Error("expected review");

    expect(await executor.confirmIntent(caller.actor, prepared.intent.id)).toMatchObject({ status: "applied", effectsStatus: "complete" });
    expect(controller.signal.aborted).toBe(true);
    expect(state.counter).toBe(1);
  });

  it("unknown receipt outcome never repeats a mutation", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    await executor.confirmIntent(caller.actor, prepared.intent.id);

    const receipt = state.receipts.get(prepared.intent.id);

    if (receipt) { receipt.status = "unknown"; receipt.result = null; }

    await expect(executor.dispatchAction(caller, request)).rejects.toMatchObject({ status: 409 });
    expect(state.counter).toBe(1);
  });

  it("reconciles failed publication without repeating the committed domain write", async () => {
    const { db, state, action } = fixture();

    let attempts = 0;

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, execute: async (ctx: ActionExecutionContext, input: unknown) => { ctx.afterCommit({ key: "event", kind: "publish", payload: { seq: 1 } });

 return action.execute(ctx, input); } }]), effects: { publish: async () => { attempts++;

 if (attempts === 1) throw new Error("offline"); } } });

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    expect(await executor.confirmIntent(caller.actor, prepared.intent.id)).toMatchObject({ status: "applied", effectsStatus: "failed" });
    expect(await executor.reconcileEffects(caller, prepared.intent.id)).toMatchObject({ status: "applied", effectsStatus: "complete" });
    await executor.reconcileEffects(caller, prepared.intent.id);
    expect(state.counter).toBe(1);
    expect(attempts).toBe(2);
  });

  it("rejected proposals cannot execute", async () => {
    const { executor, state } = fixture();

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    expect(await executor.rejectIntent(caller, prepared.intent.id)).toMatchObject({ status: "rejected" });
    await expect(executor.confirmIntent(caller.actor, prepared.intent.id)).rejects.toMatchObject({ status: 409 });
    expect(state.counter).toBe(0);
  });

  it("a failed undeclared legacy effect is unknown, not a successful publication", async () => {
    const { db, action, state } = fixture();

    const order: string[] = [];

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, execute: async (ctx: ActionExecutionContext, input: unknown) => {
      afterContentCommit(() => {
        expect(state.receipts.get(ctx.intentId)?.status).toBe("applied");
        order.push("first callback");
        throw new Error("private publication error");
      });
      afterContentCommit(() => { order.push("second callback"); });
      ctx.afterCommit({ key: "stable-effect", kind: "publish", payload: null });

      return action.execute(ctx, input);
    } }]), effects: { publish: async (_payload, key) => { order.push(key); } } });

    const prepared = await executor.dispatchAction(caller, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    expect(await executor.confirmIntent(caller.actor, prepared.intent.id)).toMatchObject({ status: "applied", effectsStatus: "unknown" });
    expect(await executor.reconcileEffects(caller, prepared.intent.id)).toMatchObject({ effectsStatus: "unknown" });
    expect(state.counter).toBe(1);
    expect(order).toEqual(["first callback", "second callback", "stable-effect"]);
  });
  it("malformed persisted external state cannot finalize a write or repeat a charge", async () => {
    const { db, action, state } = fixture();

    let externalCalls = 0;

    const executor = createAssistantExecutor({ db, catalog: createActionCatalog([{ ...action, effect: "paid", confirmation: "always", external: async () => { externalCalls++;

      return null;
    } }]) });

    const prepared = await executor.dispatchAction({ ...caller, runId: "run-1" }, request);

    if (prepared.kind !== "pending") throw new Error("expected review");

    const row = state.intents.get(prepared.intent.id);

    if (!row) throw new Error("missing fixture intent");

    row.status = "executing";
    state.receipts.set(prepared.intent.id, { ...row, id: "receipt", intentId: prepared.intent.id, status: "executing", result: null, effectsStatus: "pending", effects: { external: { phase: "result", runId: "run-1", result: null } } });
    expect(await executor.confirmIntent(caller.actor, prepared.intent.id)).toMatchObject({ status: "executing", result: null });
    expect(await executor.reconcileEffects(caller, prepared.intent.id)).toMatchObject({ status: "executing", result: null });
    expect(state.counter).toBe(0);
    expect(externalCalls).toBe(0);
  });

});
