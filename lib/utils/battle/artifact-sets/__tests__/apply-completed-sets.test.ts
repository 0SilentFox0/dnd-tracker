import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { findCompletedSets } from "@/lib/utils/battle/artifact-sets/apply-completed-sets";

const equipped = [
  { artifactId: "a1", setId: "s1" },
  { artifactId: "a2", setId: "s1" },
] as never;

const context = (setBonus: unknown, abilities: unknown) =>
  ({ artifactSetsById: { s1: { id: "s1", name: "Дракон", icon: null, setBonus, abilities } }, artifactSetMemberIds: { s1: ["a1", "a2"] } }) as never;

describe("findCompletedSets", () => {
  it("повний сет з уміннями застосовується навіть без setBonus", async () => {
    const abilities = [{ id: "x", name: "Аура", trigger: { event: "passive" }, effects: [{ kind: "note", text: "x" }] }];

    const r = await findCompletedSets(equipped, "c1", context(null, abilities));

    expect(r.sets.map((s) => s.id)).toEqual(["s1"]);
  });

  it("сет без setBonus і без умінь не дає рядка", async () => {
    expect((await findCompletedSets(equipped, "c1", context(null, null))).sets).toEqual([]);
  });

  it("неповний сет не застосовується", async () => {
    expect((await findCompletedSets([{ artifactId: "a1", setId: "s1" }] as never, "c1", context({ name: "x" }, []))).sets).toEqual([]);
  });
});
