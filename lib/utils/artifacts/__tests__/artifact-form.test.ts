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
});
