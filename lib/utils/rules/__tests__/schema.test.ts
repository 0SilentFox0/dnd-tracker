import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema, RulesetSchema } from "@/lib/utils/rules/schema";

describe("parseRules", () => {
  it("DEFAULT_RULES збігається з RulesetSchema.parse({})", () => {
    expect(DEFAULT_RULES).toEqual(RulesetSchema.parse({}));
  });

  it("empty / null / garbage → defaults equal to today's constants", () => {
    for (const raw of [{}, null, undefined, "x", 42]) expect(parseRules(raw)).toEqual(DEFAULT_RULES);

    expect(DEFAULT_RULES).toEqual({
      morale: { enabled: true, cap: 3 },
      criticals: { critOn: 20, fumbleOn: 1, effects: true, disabledSuccess: [], disabledFail: [] },
      formulas: { saveDcBase: 8, proficiencyBase: 2, proficiencyEvery: 4 },
      heroScaling: { meleeDiceByLevel: null, rangedDiceByLevel: null, hpBaseLevels: 3, hpConCoefficient: 1.5 },
      initiative: { heroMin: 10, heroMax: 16 },
      defaultAttacks: { meleeName: "Звичайний удар", rangedName: "Звичайний постріл" },      saves: { proficiency: false },
      deathSaves: { enabled: false, unitsDieAtZero: true },
      concentration: { enabled: false, dcCap: null },
      conditions: { enabled: false, exhaustion: "2014" },
      actions: { enabled: false, opportunityAttacks: true, variant: "2014" },
    });
  });

  it("keeps valid sections and falls back only for a broken one", () => {
    const r = parseRules({ morale: { enabled: false }, criticals: { critOn: 99 } });

    expect(r.morale).toEqual({ enabled: false, cap: 3 });
    expect(r.criticals).toEqual(DEFAULT_RULES.criticals);
  });

  it("drops unknown top-level keys", () => {
    expect(parseRules({ luck: { enabled: true } })).toEqual(DEFAULT_RULES);
  });

  it("falls back for inverted initiative range", () => {
    expect(parseRules({ initiative: { heroMin: 20, heroMax: 10 } }).initiative).toEqual(DEFAULT_RULES.initiative);
  });
});

describe("RulesetPatchSchema", () => {
  it("accepts a partial section, rejects out-of-range and unknown keys", () => {
    expect(RulesetPatchSchema.safeParse({ criticals: { critOn: 19 } }).success).toBe(true);
    expect(RulesetPatchSchema.safeParse({ criticals: { critOn: 21 } }).success).toBe(false);
    expect(RulesetPatchSchema.safeParse({ criticals: { critOnn: 19 } }).success).toBe(false);
    expect(RulesetPatchSchema.safeParse({ luck: {} }).success).toBe(false);
  });

  it("initiative min must not exceed max", () => {
    expect(RulesetPatchSchema.safeParse({ initiative: { heroMin: 20, heroMax: 10 } }).success).toBe(false);
  });
});

describe("mergeRules", () => {
  it("зливає секції й перевіряє refine на злитому значенні", () => {
    const merged = mergeRules(DEFAULT_RULES, { morale: { cap: 5 } });

    expect(merged).toEqual({ ok: true, rules: { ...DEFAULT_RULES, morale: { enabled: true, cap: 5 } } });
    expect(mergeRules(DEFAULT_RULES, { initiative: { heroMin: 20 } }).ok).toBe(false);
    expect(mergeRules(DEFAULT_RULES, { criticals: { critOn: 30 } }).ok).toBe(false);
  });

  it("частковий патч не скидає сусідні поля секції", () => {
    const patch = RulesetPatchSchema.parse({ morale: { cap: 5 } });

    expect(patch).toEqual({ morale: { cap: 5 } });

    const current = parseRules({ morale: { enabled: false, cap: 3 } });

    expect(mergeRules(current, patch)).toMatchObject({ ok: true, rules: { morale: { enabled: false, cap: 5 } } });
  });

  it("патч однієї секції не стирає кастомні таблиці та списки", () => {
    const current = parseRules({ heroScaling: { meleeDiceByLevel: { "1": "1d6" } }, criticals: { disabledSuccess: ["1"] } });

    const r = mergeRules(current, RulesetPatchSchema.parse({ heroScaling: { hpBaseLevels: 4 }, criticals: { critOn: 19 } }));

    expect(r).toMatchObject({ ok: true, rules: { heroScaling: { meleeDiceByLevel: { "1": "1d6" }, hpBaseLevels: 4 }, criticals: { disabledSuccess: ["1"], critOn: 19 } } });
  });

  it("фумбл не може бути не нижчим за крит", () => {
    expect(mergeRules(DEFAULT_RULES, { criticals: { critOn: 3, fumbleOn: 3 } }).ok).toBe(false);
    expect(parseRules({ criticals: { critOn: 3, fumbleOn: 3 } }).criticals).toEqual(DEFAULT_RULES.criticals);
  });
});
