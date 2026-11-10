import { describe, expect, it } from "vitest";

import { isSlug, SLUG_RE, slugify } from "../slug";

describe("slugify", () => {
  it("lowercases and dashes", () => {
    expect(slugify("Fireball of Ash")).toBe("fireball-of-ash");
  });

  it("strips diacritics and symbols", () => {
    expect(slugify("Zweihänder +2")).toBe("zweihander-2");
  });

  it("throws when nothing latin is left", () => {
    expect(() => slugify("Вогняна куля")).toThrow();
    expect(() => slugify("  ")).toThrow();
  });

  it("is idempotent", () => {
    expect(slugify(slugify("Rat-Catcher"))).toBe("rat-catcher");
  });
});

describe("isSlug", () => {
  it("accepts SRD underscores and rejects bad shapes", () => {
    expect(isSlug("srd-2024_aboleth")).toBe(true);
    expect(SLUG_RE.test("a")).toBe(true);
    for (const bad of ["", "-a", "_a", "A", "a b", "a.b"]) expect(isSlug(bad)).toBe(false);
  });
});
