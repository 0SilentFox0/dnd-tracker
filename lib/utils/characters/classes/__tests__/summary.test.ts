import { describe, expect, it } from "vitest";

import { summarize } from "@/lib/utils/characters/classes/summary";

describe("summarize", () => {
  it("keeps a short first line as is", () => {
    expect(summarize("short text")).toBe("short text");
  });

  it("takes the first non-empty line", () => {
    expect(summarize("\n  \n  first line \nsecond")).toBe("first line");
  });

  it("cuts a long line at a space and adds an ellipsis", () => {
    const out = summarize(`${"word ".repeat(40)}end`);

    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(121);
    expect(out).not.toMatch(/\s…$/);
  });

  it("handles empty input", () => {
    expect(summarize()).toBe("");
  });
});
