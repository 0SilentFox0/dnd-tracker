import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn() }));

import { buildOpenApi } from "@/lib/server/content/openapi";

const doc = buildOpenApi();

describe("OpenAPI 4f-3", () => {
  it("ItemStats is a shared component referenced by artifacts", () => {
    expect(doc.components.schemas).toHaveProperty("ItemStats");
    expect(JSON.stringify(doc.components.schemas.ArtifactsCreate)).toContain("#/components/schemas/ItemStats");
  });
});
