import { describe, expect, it } from "vitest";

import { buildArtifactPayload } from "@/lib/utils/artifacts/artifact-form";

const base = { name: "Chain Mail", description: "", rarity: "common", slot: "armor", icon: "", setId: null, abilities: [], weapon: {} };

describe("artifact payload armor", () => {
  it("sends armor only for the armor slot with a model", () => {
    expect(buildArtifactPayload({ ...base, armor: { category: "heavy", base: 16 } }, "create").armor).toEqual({ category: "heavy", base: 16 });
    expect(buildArtifactPayload({ ...base, slot: "ring", armor: { category: "heavy", base: 16 } }, "create")).not.toHaveProperty("armor");
    expect(buildArtifactPayload({ ...base, armor: null }, "create")).not.toHaveProperty("armor");
    expect(buildArtifactPayload(base, "create")).not.toHaveProperty("armor");
  });
});

describe("artifact payload armor removal", () => {
  it("edit mode sends armor null when the model was removed; create sends nothing", () => {
    expect(buildArtifactPayload({ ...base, armor: null }, "edit").armor).toBeNull();
    expect(buildArtifactPayload({ ...base, slot: "ring", armor: null }, "edit")).not.toHaveProperty("armor");
  });
});
