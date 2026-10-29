import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { findCustomConditionUsage } from "../condition-usage";

import type { CustomConditionKey } from "@/lib/utils/abilities/schema/kinds";
import { isConditionUsed } from "@/lib/utils/rules";

const E: unknown[][] = [[], [], [], [], [], [], [], [], []];

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
      [],
      [],
      [],
      [],
      [],
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
    const { db, calls } = fakeDb(E);

    await findCustomConditionUsage("c1", KEY, db);

    for (const call of calls) expect(call).toContain('%"custom:paci"%');
    expect("\"custom:pacified\"".includes('"custom:paci"')).toBe(false);
  });

  it("queries only prepared and active battles", async () => {
    const { db, calls } = fakeDb(E);

    await findCustomConditionUsage("c1", KEY, db);

    expect((calls[0][0] as string[]).join("?")).toContain("IN ('prepared', 'active')");
  });

  it("is unused when all lists are empty", async () => {
    const { db } = fakeDb(E);

    expect(isConditionUsed(await findCustomConditionUsage("c1", KEY, db))).toBe(false);
  });

  it.each([
    ["skills", 3],
    ["artifacts", 4],
    ["artifactSets", 5],
    ["races", 6],
    ["feats", 7],
    ["statusEffects", 8],
  ] as const)("reports %s that reference the condition", async (field, index) => {
    const results = E.map(() => [] as unknown[]);

    results[index] = [{ id: "x1", name: "Знайдено" }];

    const usage = await findCustomConditionUsage("c1", KEY, fakeDb(results).db);

    expect(usage[field]).toEqual([{ id: "x1", name: "Знайдено" }]);
    expect(isConditionUsed(usage)).toBe(true);
  });

  it("queries each new table", async () => {
    const { db, calls } = fakeDb(E);

    await findCustomConditionUsage("c1", KEY, db);

    const tables = ["skills", "artifacts", "artifact_sets", "races", "feats", "status_effects"];

    tables.forEach((table, i) => expect((calls[3 + i][0] as string[]).join("?")).toContain(`FROM ${table}`));
  });
});
