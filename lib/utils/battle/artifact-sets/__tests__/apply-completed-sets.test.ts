import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { findCompletedSets, findSetProgress } from "@/lib/utils/battle/artifact-sets/apply-completed-sets";

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

  it("порожній список умінь без setBonus — сет не застосовується", async () => {
    expect((await findCompletedSets(equipped, "c1", context(null, []))).sets).toEqual([]);
  });

  it("неповний сет не застосовується", async () => {
    expect((await findCompletedSets([{ artifactId: "a1", setId: "s1" }] as never, "c1", context({ name: "x" }, []))).sets).toEqual([]);
  });
});

const rage = { id: "r", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

describe("findSetProgress", () => {
  const maps = {
    artifactSetsById: {
      s1: { id: "s1", name: "Мисливець", icon: null, setBonus: null, abilities: [rage] },
      s2: { id: "s2", name: "Порожній", icon: null, setBonus: null, abilities: [] },
      s3: { id: "s3", name: "Старий", icon: null, setBonus: { name: "Кров" }, abilities: null },
    },
    artifactSetMemberIds: { s1: ["a1", "a2", "a3"], s2: ["b1"], s3: ["c1"] },
  };

  const worn = [
    { artifactId: "a1", setId: "s1" },
    { artifactId: "a2", setId: "s1" },
    { artifactId: "b1", setId: "s2" },
    { artifactId: "c1", setId: "s3" },
  ];

  it("have/total/complete по кожному сету з ефектами; сет без умінь і без setBonus пропускається", () => {
    expect(findSetProgress(worn, maps as never)).toEqual([
      { setId: "s1", name: "Мисливець", have: 2, total: 3, complete: false, effects: [expect.stringMatching(/шкода \(ближня\) \+10%/)] },
      { setId: "s3", name: "Старий", have: 1, total: 1, complete: true, effects: expect.any(Array) },
    ]);
  });

  it("findCompletedSets — повна підмножина прогресу", async () => {
    const r = await findCompletedSets(worn as never, "c1", maps as never);

    expect(r.progress.map((p) => p.setId)).toEqual(["s1", "s3"]);
    expect(r.sets.map((s) => s.id)).toEqual(["s3"]);
  });
});
