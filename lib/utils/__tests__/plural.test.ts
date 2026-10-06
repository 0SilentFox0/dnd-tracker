import { describe, expect, it } from "vitest";

import { pluralUk } from "@/lib/utils/plural";

const f: [string, string, string] = ["варіант", "варіанти", "варіантів"];

describe("pluralUk", () => {
  it.each([[1, "варіант"], [2, "варіанти"], [4, "варіанти"], [5, "варіантів"], [11, "варіантів"], [12, "варіантів"], [21, "варіант"], [22, "варіанти"], [0, "варіантів"]])("%i → %s", (n, w) => {
    expect(pluralUk(n as number, f)).toBe(w);
  });
});
