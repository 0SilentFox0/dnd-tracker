import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const state = (over: object) => ({ name: "Flame Tongue", description: "", rarity: "rare", slot: "weapon", icon: "", setId: null, abilities: [], weapon: { damageDice: "1d8", attackBonus: 1, damageBonus: 1 }, ...over });

describe("buildArtifactPayload: item", () => {
  it("untouched item → no key; set → item; edit clear → null", () => {
    expect(buildArtifactPayload(state({}), "create")).not.toHaveProperty("item");
    expect(buildArtifactPayload(state({ item: { unique: false } }), "create").item).toEqual({ unique: false });
    expect(buildArtifactPayload(state({ item: null }), "edit").item).toBeNull();
    expect(buildArtifactPayload(state({ item: null }), "create")).not.toHaveProperty("item");
  });

  it("a property sends only +N weapon bonuses and drops the armor model", () => {
    const property = { property: { appliesTo: { kinds: ["weapon" as const] } } };

    expect(buildArtifactPayload(state({ item: property }), "create").weapon).toEqual({ attackBonus: 1, damageBonus: 1 });
    expect(buildArtifactPayload(state({ slot: "armor", armor: { category: "light", base: 11 }, item: { property: { appliesTo: { kinds: ["armor" as const] } } } }), "edit").armor).toBeNull();
  });
});
