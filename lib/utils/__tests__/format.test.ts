import { describe, expect, it } from "vitest";

import { signed } from "@/lib/utils/format";

describe("signed", () => {
  it.each([[3, "+3"], [0, "+0"], [-2, "-2"]] as const)("%i → %s", (n, s) => {
    expect(signed(n)).toBe(s);
  });
});
