import { describe, expect, it } from "vitest";

import { addSlugs } from "../lib/add-slugs";

describe("addSlugs", () => {
  it("derives a slug from the name and puts it first", () => {
    const [row] = addSlugs([{ name: "Rat Catcher", tiers: [] }]);

    expect(Object.keys(row)).toEqual(["slug", "name", "tiers"]);
    expect(row.slug).toBe("rat-catcher");
  });

  it("keeps an existing slug and is stable on a second pass", () => {
    const once = addSlugs([{ name: "Fireball", slug: "srd-fireball" }, { name: "Zweihänder +2" }]);

    expect(once.map((r) => r.slug)).toEqual(["srd-fireball", "zweihander-2"]);
    expect(addSlugs(once)).toEqual(once);
  });

  it("throws on a collision naming both rows", () => {
    expect(() => addSlugs([{ name: "Rat Catcher" }, { name: "rat-catcher" }])).toThrow(/"Rat Catcher".*"rat-catcher"/);
  });

  it("throws on an invalid existing slug", () => {
    expect(() => addSlugs([{ name: "A", slug: "Bad Slug" }])).toThrow(/Invalid slug/);
  });
});
