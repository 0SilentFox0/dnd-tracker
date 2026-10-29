import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

const json = (v: unknown) => JSON.stringify(v);

describe("OpenAPI 4f-2", () => {
  it("Formula, Flat, Amount and ArmorStats are shared components", () => {
    for (const id of ["Formula", "Flat", "Amount", "ArmorStats"]) expect(doc.components.schemas).toHaveProperty(id);
    expect(json(doc.components.schemas["Effect.heal"])).toContain("#/components/schemas/Amount");
    expect(json(doc.components.schemas["Effect.modifyStat"])).toContain("#/components/schemas/Flat");
    expect(json(doc.components.schemas.ArtifactsCreate)).toContain("#/components/schemas/ArmorStats");
  });

  it("stays compact", () => {
    expect(json(doc).length).toBeLessThan(165_000);
  });
});
