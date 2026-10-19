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

describe("battleMapSchema.terrain", () => {
  it("приймає місцевість за ключами x:y, відхиляє невідомий вид, довгий підпис і надто багато записів", () => {
    const terrain = { "1:1": { kind: "wall" }, "2:2": { kind: "barrier", untilRound: 3 }, "3:3": { kind: "hazard", label: "Вогонь" } };

    expect(battleMapSchema.safeParse({ ...map, terrain }).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, terrain: { "a:b": { kind: "wall" } } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "lava" } } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "hazard", label: "x".repeat(61) } } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "barrier", untilRound: 0 } } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "barrier" } } }).success).toBe(false);

    const many = Object.fromEntries(Array.from({ length: 3601 }, (_, i) => [`${i}:0`, { kind: "wall" }]));

    expect(battleMapSchema.safeParse({ ...map, terrain: many }).success).toBe(false);
  });
});

describe("battleMapSchema.terrain.damage", () => {
  it("зберігає spellId небезпеки від заклинання і відхиляє надто великі кубики", () => {
    const terrain = { "1:1": { kind: "hazard", damage: { amount: 4, type: "fire", spellId: "s1" } } };

    const parsed = battleMapSchema.safeParse({ ...map, terrain });

    expect(parsed.success && parsed.data.terrain?.["1:1"].damage?.spellId).toBe("s1");
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "hazard", damage: { dice: "99999999d6", type: "fire" } } } }).success).toBe(false);
  });
});
