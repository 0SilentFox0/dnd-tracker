import { describe, expect, it } from "vitest";

import { fitLines } from "../fit-lines";

describe("fitLines", () => {
  it("keeps all lines that fit without a marker", () => {
    expect(fitLines(["- A", "- B"], 100)).toBe("- A\n- B");
  });

  it("stops at a line boundary and appends an omitted marker within the budget", () => {
    const out = fitLines(["- A", `- B ${"long".repeat(10)}`], 40);

    expect(out).toBe("- A\n- … 1 more pages omitted");
    expect(out.length).toBeLessThanOrEqual(40);
  });

  it("drops lines until the marker fits", () => {
    const out = fitLines(["- A", "- B"], 5);

    expect(out.length).toBeLessThanOrEqual(5);
    expect(out).not.toContain("- B");
  });

  it("returns an empty string for no lines", () => {
    expect(fitLines([], 100)).toBe("");
  });
});
