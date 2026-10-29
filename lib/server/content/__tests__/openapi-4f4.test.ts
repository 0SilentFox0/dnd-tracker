import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

describe("OpenAPI 4f-4", () => {
  it("feats collection and item paths; Choice is a shared component", () => {
    expect(Object.keys(doc.paths)).toEqual(expect.arrayContaining(["/api/campaigns/{id}/feats", "/api/campaigns/{id}/feats/{featId}"]));
    expect(doc.components.schemas).toHaveProperty("Choice");
    expect(JSON.stringify(doc.components.schemas.FeatsCreate)).toContain("#/components/schemas/Choice");
  });

  it("races and classes reference the shared Choice", () => {
    expect(JSON.stringify(doc.components.schemas.RacesCreate)).toContain("#/components/schemas/Choice");
    expect(JSON.stringify(doc.components.schemas.ClassesCreate)).toContain("#/components/schemas/Choice");
    expect(JSON.stringify(doc.components.schemas.SpellsCreate)).toContain("lists");
  });

  it("stays under the size budget", () => {
    expect(JSON.stringify(doc).length).toBeLessThan(165_000);
  });
});
