import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { findSetProgress } from "@/lib/utils/battle/artifact-sets/apply-completed-sets";

describe("findSetProgress with composed refs", () => {
  it("a property inside a composed ref counts as a set member", () => {
    const maps = { artifactSetsById: { s1: { id: "s1", name: "Набір", icon: null, setBonus: { name: "x" }, abilities: [] } }, artifactSetMemberIds: { s1: ["ft", "helm"] } } as never;

    const progress = findSetProgress([{ artifactId: "ls+ft", setId: "s1" }, { artifactId: "helm", setId: "s1" }], maps);

    expect(progress[0]).toMatchObject({ have: 2, total: 2, complete: true });
  });
});
