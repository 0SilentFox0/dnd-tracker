import { describe, expect, it } from "vitest";

import { battleMapSchema } from "../battles";

const map = { cols: 10, rows: 10, background: null, opacity: 0.3 };

describe("battleMapSchema.background", () => {
  it("приймає null і https, відхиляє інші схеми", () => {
    expect(battleMapSchema.safeParse(map).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, background: "https://x.test/a.png" }).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, background: "http://x.test/a.png" }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, background: "javascript:alert(1)" }).success).toBe(false);
  });
});
