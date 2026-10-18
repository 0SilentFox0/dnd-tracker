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

describe("battleMapSchema.blocked", () => {
  it("приймає ключі x:y, відхиляє сміття й надто довгий список", () => {
    expect(battleMapSchema.safeParse({ ...map, blocked: ["0:0", "12:3"] }).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, blocked: ["a:b"] }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, blocked: ["1,2"] }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, blocked: Array(3601).fill("1:1") }).success).toBe(false);
  });
});
