import { describe, expect, it } from "vitest";

import { hexColorSchema } from "@/lib/schemas/common";

describe("hexColorSchema", () => {
  it.each(["#aabbcc", "#AABBCC", "#aAbB09"])("приймає %s", (v) => {
    expect(hexColorSchema().safeParse(v).success).toBe(true);
  });

  it.each(["aabbcc", "#abc", "#aabbccdd", "#gggggg", ""])("відхиляє %s", (v) => {
    expect(hexColorSchema().safeParse(v).success).toBe(false);
  });

  it("використовує передане повідомлення", () => {
    const r = hexColorSchema("custom").safeParse("x");

    expect(!r.success && r.error.issues[0].message).toBe("custom");
  });
});
