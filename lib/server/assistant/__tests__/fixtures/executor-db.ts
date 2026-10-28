import type { PrismaClient } from "@prisma/client";

// Transaction/ORM boundary double only. Real SQL locking/rollback is verified by
// execution.integration.test.ts on constructor, not by this deterministic fixture.
export function executorDatabase() {
  const state = { counter: 0, isDM: true, tokenActive: true, intents: new Map<string, Record<string, unknown>>(), receipts: new Map<string, Record<string, unknown>>() };

  let serial = Promise.resolve();

  const matches = (row: Record<string, unknown>, where: Record<string, unknown> = {}) => Object.entries(where).every(([k, v]) => row[k] === v);

  const db = {
    campaignMember: { findMany: async () => state.isDM ? [{ role: "dm" }] : [] },
    apiToken: { findUnique: async () => state.tokenActive ? { id: "token", userId: "dm", campaignId: "campaign", scopes: ["characters:write"], revokedAt: null, executionMode: "review" } : null },
    aiThread: { findFirst: async () => ({ executionMode: "review" }) },
    assistantIntent: {
      upsert: async ({ create, where }: { create: Record<string, unknown>; where: { userId_originKey_requestId: Record<string, unknown> } }) => {
        const prior = [...state.intents.values()].find((r) => matches(r, where.userId_originKey_requestId));

        if (prior) return prior;

        const row = { id: `intent${state.intents.size + 1}`, ...create, createdAt: new Date(), updatedAt: new Date(), redactedAt: null };

        state.intents.set(row.id, row);

        return row;
      },
      findFirst: async ({ where }: { where: Record<string, unknown> }) => [...state.intents.values()].find((r) => matches(r, where)) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.intents.get(where.id);

        if (!row) throw new Error("missing intent");

        Object.assign(row, data);

        return row;
      },
    },
    assistantReceipt: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => [...state.receipts.values()].find((r) => matches(r, where)) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `receipt${state.receipts.size + 1}`, ...data };

        state.receipts.set(String(data.intentId), row);

        return row;
      },
      update: async ({ where, data }: { where: { intentId: string }; data: Record<string, unknown> }) => {
        const row = state.receipts.get(where.intentId);

        if (!row) throw new Error("missing receipt");

        Object.assign(row, data);

        return row;
      },
    },
    $queryRaw: async () => [{ id: "locked" }],
    $transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
      let release = () => {};

      const previous = serial;

      serial = new Promise<void>((resolve) => { release = resolve; });
      await previous;

      const before = { counter: state.counter, intents: structuredClone(state.intents), receipts: structuredClone(state.receipts) };

      try { return await callback(db); }
      catch (error) { Object.assign(state, before); throw error; }
      finally { release(); }
    },
  };

  return { db: db as unknown as PrismaClient, state };
}
