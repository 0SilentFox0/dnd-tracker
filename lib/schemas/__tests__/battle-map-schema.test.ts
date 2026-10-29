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

describe("battleMapSchema.gridOffset і backgroundCols", () => {
  it("зсув — частки клітинки 0 ≤ v < 1, обидві осі; масштаб фону — додатне число; обидва необовʼязкові й не відкидаються", () => {
    const parsed = battleMapSchema.safeParse({ ...map, gridOffset: { x: 0, y: 0.99 }, backgroundCols: 15.625 });

    expect(parsed.success && parsed.data).toMatchObject({ gridOffset: { x: 0, y: 0.99 }, backgroundCols: 15.625 });
    expect(battleMapSchema.safeParse({ ...map, gridOffset: { x: 1, y: 0 } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, gridOffset: { x: -0.1, y: 0 } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, gridOffset: { x: 0.5 } }).success).toBe(false);
    expect(battleMapSchema.safeParse({ ...map, backgroundCols: 0 }).success).toBe(false);
  });
});

describe("battleMapSchema.weather", () => {
  it("приймає 7 видів погоди, null і відсутність; відхиляє невідоме", () => {
    expect(battleMapSchema.safeParse(map).success).toBe(true);
    expect(battleMapSchema.safeParse({ ...map, weather: null }).success).toBe(true);

    for (const weather of ["rain", "storm", "snow", "blizzard", "fog", "embers", "crypt"]) {
      expect(battleMapSchema.safeParse({ ...map, weather }).success).toBe(true);
    }

    expect(battleMapSchema.safeParse({ ...map, weather: "hail" }).success).toBe(false);
  });
});

describe("battleMapSchema.terrain: складна місцевість і заслонення", () => {
  it("зберігає difficult/obscured/zoneId і concentrationOf/casterId", () => {
    const terrain = {
      "1:1": { kind: "difficult" },
      "2:2": { kind: "hazard", difficult: true, obscured: true, zoneId: "z1", damage: { dice: "1d6", type: "fire", casterId: "c", concentrationOf: { casterId: "c", castId: "x" } } },
    };

    const parsed = battleMapSchema.parse({ ...map, terrain });

    expect(parsed.terrain).toEqual(terrain);
  });
});

describe("battleMapSchema: id зон і концентрації реальної довжини", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";

  const castId = `${uuid}:${uuid}@12#3`;

  const zoneId = `${castId}@12`;

  const tag = { casterId: uuid, castId };

  it("приймає zoneId, ключ spellZones і concentrationOf довші за 64", () => {
    expect(zoneId.length).toBeGreaterThan(64);

    const terrain = { "1:1": { kind: "hazard", zoneId, damage: { type: "fire", amount: 1, spellId: uuid, casterId: uuid, concentrationOf: tag } } };

    const spellZones = { [zoneId]: { casterId: uuid, spellId: uuid, spellName: "Fog", dc: 13, side: "enemies", triggers: {}, untilRound: 15, concentrationOf: tag } };

    expect(battleMapSchema.safeParse({ ...map, terrain, spellZones }).success).toBe(true);
  });

  it("відхиляє безмежно довгі id", () => {
    expect(battleMapSchema.safeParse({ ...map, terrain: { "1:1": { kind: "hazard", zoneId: "x".repeat(201) } } }).success).toBe(false);
  });
});
