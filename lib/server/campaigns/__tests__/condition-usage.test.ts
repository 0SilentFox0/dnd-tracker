import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { findCustomConditionUsage, isConditionUsed } from "../condition-usage";

import type { CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";

const KEY = "custom:paci" as CustomConditionKey;

function fakeDb(results: unknown[][]) {
  const calls: unknown[][] = [];

  const $queryRaw = vi.fn(async (...args: unknown[]) => {
    calls.push(args);

    return results[calls.length - 1];
  });

  return { db: { $queryRaw } as never, calls };
}

describe("findCustomConditionUsage", () => {
  it("groups participants by battle", async () => {
    const { db } = fakeDb([
      [
        { id: "b1", name: "Бій 1", status: "active", participant: "Орк" },
        { id: "b1", name: "Бій 1", status: "active", participant: "Ельф" },
        { id: "b2", name: "Бій 2", status: "prepared", participant: null },
      ],
      [{ id: "s1", name: "Заспокоєння" }],
      [],
    ]);

    const usage = await findCustomConditionUsage("c1", KEY, db);

    expect(usage.battles).toEqual([
      { id: "b1", name: "Бій 1", status: "active", participants: ["Орк", "Ельф"] },
      { id: "b2", name: "Бій 2", status: "prepared", participants: [] },
    ]);
    expect(usage.spells).toEqual([{ id: "s1", name: "Заспокоєння" }]);
    expect(isConditionUsed(usage)).toBe(true);
  });

  it("searches the quoted key so custom:paci does not match custom:pacified", async () => {
    const { db, calls } = fakeDb([[], [], []]);

    await findCustomConditionUsage("c1", KEY, db);

    for (const call of calls) expect(call).toContain('%"custom:paci"%');
    expect("\"custom:pacified\"".includes('"custom:paci"')).toBe(false);
  });

  it("queries only prepared and active battles", async () => {
    const { db, calls } = fakeDb([[], [], []]);

    await findCustomConditionUsage("c1", KEY, db);

    expect((calls[0][0] as string[]).join("?")).toContain("IN ('prepared', 'active')");
  });

  it("is unused when all lists are empty", async () => {
    const { db } = fakeDb([[], [], []]);

    expect(isConditionUsed(await findCustomConditionUsage("c1", KEY, db))).toBe(false);
  });
});
