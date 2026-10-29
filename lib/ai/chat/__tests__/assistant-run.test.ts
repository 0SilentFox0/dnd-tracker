import type { AssistantRun, Prisma, PrismaClient } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRunSignal } from "@/lib/ai/chat/run-signal";
import { toolRequestKey } from "@/lib/ai/tools/request-key";
import { createAssistantRunStore } from "@/lib/server/assistant/runs";
import type { AssistantCaller } from "@/lib/server/assistant/types";

const caller: AssistantCaller = { actor: { campaignId: "c", userId: "u", via: "session", scopes: null, isDM: true }, channel: "chat", tokenId: null, threadId: "t", locale: "uk" as const };

vi.mock("@/lib/server/assistant/authorize", () => ({ revalidateAssistantCaller: vi.fn(async () => caller.actor) }));
vi.mock("@/lib/server/assistant/execute", () => ({ createAssistantExecutor: () => ({ reconcileEffects: vi.fn() }) }));

function fixture() {
  const runs: AssistantRun[] = [];

  const messages: Prisma.AiMessageUncheckedCreateInput[] = [];

  const receipts: { id: string; intentId: string; status: string; result: Prisma.JsonValue; effectsStatus: string }[] = [];

  let time = 0;

  let queue: Promise<unknown> = Promise.resolve();

  type Update = { where: { id: string }; data: Partial<AssistantRun> };

  const db = {
    $queryRaw: async () => [{ id: "t" }],
    $transaction: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> => {
      const next = queue.then(() => fn(db as unknown as Prisma.TransactionClient));

      queue = next.catch(() => {});

      return next;
    },
    aiThread: { findFirst: async () => ({ id: "t" }), update: async () => ({}) },
    aiMessage: {
      findFirst: async ({ where }: { where: { id?: string } }) => where.id ? messages.find(m => m.id === where.id) : messages.at(-1),
      create: async ({ data }: { data: Prisma.AiMessageUncheckedCreateInput }) => { messages.push(data);

 return data; },
    },
    assistantRun: {
      findUnique: async ({ where }: { where: Prisma.AssistantRunWhereUniqueInput }) => runs.find(r => where.id ? r.id === where.id : r.threadId === where.threadId_requestId?.threadId && r.requestId === where.threadId_requestId?.requestId) ?? null,
      findFirst: async ({ where }: { where: { activeThreadId: string } }) => runs.find(r => r.activeThreadId === where.activeThreadId) ?? null,
      findMany: async () => [...runs],
      create: async ({ data }: { data: Prisma.AssistantRunUncheckedCreateInput }) => {
        const r = { ...data, id: `run${runs.length}`, status: "running", abortRequested: false, resultRefs: [], createdAt: new Date(time), updatedAt: new Date(time), errorCode: null } as AssistantRun;

        runs.push(r);

        return r;
      },
      update: async ({ where, data }: Update) => {
        const r = runs.find(r => r.id === where.id);

        if (!r) throw new Error("Missing run");

        return Object.assign(r, data);
      },
      updateMany: async ({ where, data }: Update) => {
        const r = runs.find(r => r.id === where.id);

        if (r) Object.assign(r, data);

        return { count: r ? 1 : 0 };
      },
    },
    assistantIntent: { findMany: async () => [] },
    assistantReceipt: { findMany: async () => receipts },
  };

  return { store: createAssistantRunStore({ db: db as unknown as PrismaClient, now: () => new Date(time) }), runs, messages, receipts, advance: () => { time = 300001; } };
}

afterEach(() => vi.useRealTimers());

describe("T15 run acceptance", () => {
  it("emptyRunHistoryHasNoIntentsOrReceipts", async () => {
    const f = fixture();

    // Other requests owned by the same user must never enter an empty thread's recovery.
    f.receipts.push({ id: "unrelated", intentId: "unrelated", status: "applied", effectsStatus: "complete", result: { data: null, affected: [], warnings: [] } });
    expect(await f.store.readAssistantRuns(caller)).toEqual({ runs: [], receipts: [], intents: [] });
  });
  it("doubleSubmitOneUserMessage", async () => {
    const f = fixture();

    const claims = await Promise.all([f.store.beginAssistantRun(caller, "req", { text: "Привіт" }), f.store.beginAssistantRun(caller, "req", { text: "Привіт" })]);

    expect(claims.map(c => c.replayed).sort()).toEqual([false, true]);
    expect(f.runs).toHaveLength(1);
    expect(f.messages).toHaveLength(1);
  });
  it("secondActiveRun409", async () => {
    const f = fixture();

    await f.store.beginAssistantRun(caller, "req", { text: "Привіт" });
    await expect(f.store.beginAssistantRun(caller, "other", { text: "Інше" })).rejects.toMatchObject({ status: 409 });
    expect(f.messages).toHaveLength(1);
  });
  it("retryAfterInterruptedStreamNoSecondIntent", async () => {
    const f = fixture();

    const first = await f.store.beginAssistantRun(caller, "req", { text: "Зміна" });

    await f.store.finishAssistantRun(first.run.id, { status: "cancelled" });
    f.advance();

    const retry = await f.store.beginAssistantRun(caller, "req", { text: "Зміна" });

    expect(retry.replayed).toBe(true);
    expect(retry.run.id).toBe(first.run.id);
    expect(toolRequestKey(first.run.id, "call1")).toBe(toolRequestKey(retry.run.id, "call1"));
    expect(toolRequestKey(first.run.id, "call2")).not.toBe(toolRequestKey(first.run.id, "call1"));
    expect(f.messages).toHaveLength(1);
    expect(f.runs).toHaveLength(1);
  });
  it("deadlineStopsModelAndToolsAt270000", () => {
    vi.useFakeTimers();

    const run = createRunSignal();

    const model = run.signal, tools = run.signal;

    vi.advanceTimersByTime(269999);
    expect(model.aborted).toBe(false);
    vi.advanceTimersByTime(1);
    expect(model.aborted).toBe(true);
    expect(tools.aborted).toBe(true);
    run.dispose();
  });
  it("stopAfterCommitShowsReceipt", async () => {
    const f = fixture();

    const claim = await f.store.beginAssistantRun(caller, "req", { text: "Зміна" });

    f.receipts.push({ id: "receipt", intentId: "intent", status: "applied", result: { data: { id: "saved" }, affected: [], warnings: [] }, effectsStatus: "complete" });
    await f.store.finishAssistantRun(claim.run.id, { status: "cancelled" });

    const status = await f.store.readAssistantRuns(caller);

    expect(status.receipts).toContainEqual(expect.objectContaining({ id: "receipt", status: "applied" }));
    expect(f.runs[0].activeThreadId).toBe("t");
  });
  it("partialUsageIsNotReportedAsZeroCost", async () => {
    const f = fixture();

    const claim = await f.store.beginAssistantRun(caller, "req", { text: "Привіт" });

    await f.store.finishAssistantRun(claim.run.id, { status: "cancelled", usage: { inputTokens: 17, outputTokens: null, partial: true } });
    expect((f.runs[0].resultRefs as Prisma.JsonObject).usage).toEqual({ inputTokens: 17, outputTokens: null, partial: true });
  });
});
