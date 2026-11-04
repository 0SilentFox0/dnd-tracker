import { describe, expect, it } from "vitest";

import { CHARACTERISTIC_KEYS, CharacteristicsSchema, DEFAULT_CHARACTERISTICS, readCharacteristics } from "../schema";

describe("CharacteristicsSchema", () => {
  it("parse({}) gives defaults", () => {
    const c = CharacteristicsSchema.parse({});

    for (const k of CHARACTERISTIC_KEYS) {
      expect(c.base[k]).toBe(30);
      expect(c.advances[k]).toBe(0);
    }

    expect(c).toMatchObject({ move: 4, fate: 0, extraWounds: 0, skillAdvances: {} });
    expect(DEFAULT_CHARACTERISTICS).toEqual(c);
  });

  it("rejects out-of-range base", () => {
    expect(CharacteristicsSchema.safeParse({ base: { ws: 0 } }).success).toBe(false);
    expect(CharacteristicsSchema.safeParse({ base: { ws: 101 } }).success).toBe(false);
  });

  it("validates skill advance keys", () => {
    expect(CharacteristicsSchema.safeParse({ skillAdvances: { "melee:basic": 10 } }).success).toBe(true);
    expect(CharacteristicsSchema.safeParse({ skillAdvances: { Melee: 1 } }).success).toBe(false);
    expect(CharacteristicsSchema.safeParse({ skillAdvances: { "lore:old-world": 5 } }).success).toBe(true);
  });
});

describe("readCharacteristics", () => {
  it("falls back per field", () => {
    const c = readCharacteristics({ characteristics: { base: { ws: 40 }, fate: "x" } });

    expect(c.base.ws).toBe(40);
    expect(c.fate).toBe(0);
  });

  it("returns defaults for missing or non-object", () => {
    expect(readCharacteristics({})).toEqual(DEFAULT_CHARACTERISTICS);
    expect(readCharacteristics({ characteristics: 5 })).toEqual(DEFAULT_CHARACTERISTICS);
  });
});

describe("readCharacteristics matches schema", () => {
  const valid = [{}, { base: { ws: 40 }, advances: { s: 5 }, move: 5, fate: 2, extraWounds: 1, skillAdvances: { "melee:basic": 10 } }];

  it.each(valid)("valid input %#", (characteristics) => {
    expect(readCharacteristics({ characteristics })).toEqual(CharacteristicsSchema.parse(characteristics));
  });

  it("invalid fields fall back individually", () => {
    const c = readCharacteristics({ characteristics: { base: { ws: 0 }, advances: { zz: 1 }, move: 99, skillAdvances: { Melee: 1 }, fate: 3 } });

    expect(c).toEqual({ ...DEFAULT_CHARACTERISTICS, fate: 3 });
  });
});
