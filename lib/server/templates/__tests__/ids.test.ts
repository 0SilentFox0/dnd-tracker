import { describe, expect, it } from "vitest";

import { CONTENT_ID_RE, newContentId } from "@/lib/server/templates/ids";

describe("newContentId", () => {
  it("matches the cuid shape and is unique", () => {
    const ids = new Set(Array.from({ length: 5000 }, newContentId));

    expect(ids.size).toBe(5000);
    for (const id of ids) expect(id).toMatch(CONTENT_ID_RE);
  });

  it("CONTENT_ID_RE accepts prisma cuids from the DB", () => {
    expect("cmuylhk0c0001ia06lg5eommv").toMatch(CONTENT_ID_RE);
  });
});
