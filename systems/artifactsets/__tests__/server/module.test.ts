import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { systemServerOf } from "@/lib/server/systems/registry";
import { DEFAULT_RULES, type Ruleset } from "@/lib/utils/rules";

const rules = (system: Ruleset["system"]): Ruleset => ({ ...DEFAULT_RULES, system });

const equipped = [{ artifactId: "a1", setId: "s1" }, { artifactId: "a2", setId: "s1" }] as never;

const context = { artifactSetsById: { s1: { id: "s1", name: "Set", icon: null, setBonus: { x: 1 }, abilities: [] } }, artifactSetMemberIds: { s1: ["a1", "a2"] } } as never;

const loadAll = async (r: Ruleset) => Promise.all((systemServerOf(r).participant?.characterRefs ?? []).map((load) => load({ equipped, campaignId: "c1", context })));

describe("artifactsets module on d20", () => {
  it("bare dnd5e has no loaders or context preparers", () => {
    const { participant } = systemServerOf(rules({ key: "dnd5e" }));

    expect(participant?.characterRefs).toBeUndefined();
    expect(participant?.prepareContext).toBeUndefined();
  });

  it("with the module and on homm the completed set progress is loaded", async () => {
    for (const system of [{ key: "dnd5e", modules: ["artifactsets"] }, { key: "homm" }]) {
      const [loaded] = await loadAll(rules(system));

      expect(loaded.completed?.progress).toMatchObject([{ setId: "s1", have: 2, total: 2, complete: true }]);
    }

    expect(systemServerOf(rules({ key: "homm" })).participant?.prepareContext).toHaveLength(1);
  });
});
