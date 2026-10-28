import { describe, expect, it } from "vitest";

import { createScopedDatabase, currentContentWrite, runContentWriteContext } from "@/lib/server/content/write-context";

describe("transaction-local resource queries", () => {
  it("routes existing resource-style closures to the active transaction without leaking across async requests", async () => {
    const base = { model: { read: () => "base" } };

    const scoped = createScopedDatabase(base);

    const first = { model: { read: () => "transaction" } };

    await Promise.all([
      runContentWriteContext("one", first, async () => { await Promise.resolve(); expect(scoped.model.read()).toBe("transaction"); expect(currentContentWrite()?.campaignId).toBe("one"); }),
      (async () => { await Promise.resolve(); expect(scoped.model.read()).toBe("base"); })(),
    ]);
    expect(scoped.model.read()).toBe("base");
  });

  it("does not open an independent transaction inside a content transaction", async () => {
    const base = { $transaction: async (callback: (db: object) => unknown) => callback({ wrong: true }) };

    const scoped = createScopedDatabase(base);

    await runContentWriteContext("c", { marker: true }, async () => {
      expect(await scoped.$transaction((db) => db)).toEqual({ marker: true });
    });
  });
});
