import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createYoutubeTrackSchema, listSkillsQuerySchema, listSpellsQuerySchema } from "@/lib/schemas";
import { CONTENT_RESOURCES } from "@/lib/server/content/resources";

const ROOT = "app/api/campaigns/[id]";

describe("CONTENT_RESOURCES", () => {
  it("ключ = kind, шляхи унікальні", () => {
    for (const [key, r] of Object.entries(CONTENT_RESOURCES)) expect(r.kind).toBe(key);

    const paths = Object.values(CONTENT_RESOURCES).map((r) => r.path);

    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(Object.values(CONTENT_RESOURCES))("$kind: route.ts колекції і запису — з фабрики", (r) => {
    const collection = `${ROOT}${r.path}/route.ts`;

    const item = `${ROOT}${r.path}/[${r.idParam}]/route.ts`;

    expect(readFileSync(collection, "utf8")).toContain("collectionRoutes(");
    expect(existsSync(item) && readFileSync(item, "utf8")).toContain("itemRoutes(");
  });

  it("query-схеми і apiCreate оголошені там, де є параметри або обмеження API", () => {
    expect(CONTENT_RESOURCES.spells.schemas.query).toBe(listSpellsQuerySchema);
    expect(CONTENT_RESOURCES.skills.schemas.query).toBe(listSkillsQuerySchema);
    expect(CONTENT_RESOURCES.tracks.schemas.apiCreate).toBe(createYoutubeTrackSchema);
    expect(CONTENT_RESOURCES.races.errors).toContain(409);
    expect(CONTENT_RESOURCES.artifacts.errors).toContain(422);
  });
});
