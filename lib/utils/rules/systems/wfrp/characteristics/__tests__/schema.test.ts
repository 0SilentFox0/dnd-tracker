import { describe, expect, it } from "vitest";

import { CHARACTERISTIC_KEYS, CharacteristicsSchema, DEFAULT_CHARACTERISTICS, readCharacteristics } from "../schema";

describe("CharacteristicsSchema", () => {
  it("parse({}) gives defaults", () => {
    const c = CharacteristicsSchema.parse({});

    for (const k of CHARACTERISTIC_KEYS) {
      expect(c.base[k]).toBe(30);
      expect(c.advances[k]).toBe(0);
    }

    expect(c).toMatchObject({ move: 4, fate: 0, extraWounds: 0, skillAdvances: {}, talents: {}, ledger: [] });
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

describe("talents and ledger", () => {
  const entry = { id: "e1", at: "2026-11-05T00:00:00.000Z", kind: "talent", key: "f1", from: 0, to: 1, cost: 100 };

  it("round-trips valid values", () => {
    const characteristics = { talents: { f1: 2 }, ledger: [entry] };

    expect(readCharacteristics({ characteristics })).toEqual(CharacteristicsSchema.parse(characteristics));
    expect(readCharacteristics({ characteristics }).ledger).toEqual([entry]);
  });

  it("reader drops an invalid ledger entry set or >200", () => {
    expect(readCharacteristics({ characteristics: { ledger: [entry, { ...entry, kind: "x" }] } }).ledger).toEqual([]);
    expect(readCharacteristics({ characteristics: { ledger: Array.from({ length: 201 }, () => entry) } }).ledger).toEqual([]);
    expect(readCharacteristics({ characteristics: { talents: { f1: 0 } } }).talents).toEqual({});
  });

  it("schema rejects invalid rank and >200 ledger", () => {
    expect(CharacteristicsSchema.safeParse({ talents: { f1: 0 } }).success).toBe(false);
    expect(CharacteristicsSchema.safeParse({ ledger: Array.from({ length: 201 }, () => entry) }).success).toBe(false);
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
