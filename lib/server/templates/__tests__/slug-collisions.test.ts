import { describe, expect, it } from "vitest";

import { dropTakenSlugs } from "../slug-collisions";

describe("dropTakenSlugs", () => {
  it("nulls a slug held by another row and keeps the rest", () => {
    const out = dropTakenSlugs([{ id: "a", slug: "x" }, { id: "b", slug: "y" }, { id: "c" }], new Map([["x", "other"]]));

    expect(out).toEqual([{ id: "a", slug: null }, { id: "b", slug: "y" }, { id: "c" }]);
  });

  it("keeps a slug held by the same row", () => {
    expect(dropTakenSlugs([{ id: "a", slug: "x" }], new Map([["x", "a"]]))).toEqual([{ id: "a", slug: "x" }]);
  });

  it("nulls the second incoming row with the same slug", () => {
    expect(dropTakenSlugs([{ id: "a", slug: "x" }, { id: "b", slug: "x" }], new Map())).toEqual([{ id: "a", slug: "x" }, { id: "b", slug: null }]);
  });
});
