import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const base = { name: "  Кільце ", description: "  ", rarity: "common", slot: "ring", icon: " ", setId: null, abilities: [], weapon: { damageDice: "1d8" } };

describe("buildArtifactPayload", () => {
  it("edit mode sends nulls for cleared fields", () => {
    expect(buildArtifactPayload(base, "edit")).toEqual({ name: "Кільце", description: null, rarity: "common", slot: "ring", icon: null, setId: null, abilities: [] });
  });

  it("create mode omits cleared description and set", () => {
    const p = buildArtifactPayload(base, "create");

    expect(p.description).toBeUndefined();
    expect(p.setId).toBeUndefined();
  });

  it("includes weapon only for weapon slots", () => {
    expect(buildArtifactPayload({ ...base, slot: "weapon" }, "edit").weapon).toEqual({ damageDice: "1d8" });
  });

  it("sends systemStats when set, null on edit when cleared, nothing when untouched", () => {
    const stats = { type: "gear", weight: 1, price: 2, qualities: [] };

    expect(buildArtifactPayload({ ...base, systemStats: stats }, "create").systemStats).toEqual(stats);
    expect(buildArtifactPayload({ ...base, systemStats: null }, "edit").systemStats).toBeNull();
    expect(buildArtifactPayload({ ...base, systemStats: null }, "create")).not.toHaveProperty("systemStats");
    expect(buildArtifactPayload(base, "edit")).not.toHaveProperty("systemStats");
  });
});
