import { describe, expect, it } from "vitest";

import { summariesDigest } from "../digest";

const item = (title: string, sortOrder: number, stale = false) => ({ title, sortOrder, digest: `d-${title}`, stale });

describe("summariesDigest", () => {
  it("sorts by sortOrder and marks stale", () => {
    expect(summariesDigest([item("B", 2, true), item("A", 1)], { maxChars: 1000 })).toBe("- A: d-A\n- B: d-B (stale)");
  });

  it("stops at a line boundary within the budget", () => {
    expect(summariesDigest([item("A", 1), item("B", 2)], { maxChars: 10 + 5 })).toBe("- A: d-A");
  });

  it("returns an empty string for no items", () => {
    expect(summariesDigest([], { maxChars: 100 })).toBe("");
  });
});
