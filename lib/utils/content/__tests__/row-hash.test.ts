import { describe, expect, it } from "vitest";

import { contentRowHash } from "../row-hash";

import { DEFAULT_CHARACTERISTICS } from "@/lib/utils/rules/systems";

describe("contentRowHash", () => {
  it("an empty column added after the baseline hashes like a missing one", () => {
    expect(contentRowHash("Artifact", { name: "Mail", systemStats: null })).toBe(contentRowHash("Artifact", { name: "Mail" }));
    expect(contentRowHash("Unit", { name: "Orc", characteristics: DEFAULT_CHARACTERISTICS })).toBe(contentRowHash("Unit", { name: "Orc" }));
    expect(contentRowHash("Feat", { name: "Grappler", xpCost: null, maxRank: null })).toBe(contentRowHash("Feat", { name: "Grappler" }));
  });

  it("real values still change the hash, and other models keep nulls", () => {
    expect(contentRowHash("Artifact", { name: "Mail", systemStats: { type: "gear" } })).not.toBe(contentRowHash("Artifact", { name: "Mail" }));
    expect(contentRowHash("Spell", { name: "Bolt", componentFlags: null })).not.toBe(contentRowHash("Spell", { name: "Bolt" }));
  });
});
