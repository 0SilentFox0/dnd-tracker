import { describe, expect, it } from "vitest";

import { summariesDigest } from "../digest";

const item = (title: string, sortOrder: number, stale = false) => ({ id: `id-${title}`, title, sortOrder, digest: `d-${title}`, stale });

describe("summariesDigest", () => {
  it("sorts by sortOrder and marks stale", () => {
    expect(summariesDigest([item("B", 2, true), item("A", 1)], { maxChars: 1000 })).toBe("- A [id-A]: d-A\n- B [id-B]: d-B (stale)");
  });

  it("stops at a line boundary and appends an omitted marker within the budget", () => {
    const out = summariesDigest([item("A", 1), { ...item("B", 2), digest: "long".repeat(10) }], { maxChars: 40 });

    expect(out).toBe("- A [id-A]: d-A\n- … 1 more pages omitted");
    expect(out.length).toBeLessThanOrEqual(40);
  });

  it("drops lines until the marker fits", () => {
    const out = summariesDigest([item("A", 1), item("B", 2)], { maxChars: 16 + 5 });

    expect(out.length).toBeLessThanOrEqual(21);
    expect(out).not.toContain("[id-B]");
  });

  it("adds no marker when nothing is omitted", () => {
    expect(summariesDigest([item("A", 1)], { maxChars: 100 })).not.toContain("omitted");
  });

  it("returns an empty string for no items", () => {
    expect(summariesDigest([], { maxChars: 100 })).toBe("");
  });
});
