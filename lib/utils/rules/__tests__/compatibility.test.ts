import { describe, expect, it } from "vitest";

import { DEFAULT_RULES } from "@/lib/utils/rules";
import { mergeRules, parseRules, RulesetPatchSchema, RulesetSchema } from "@/lib/utils/rules/schema";

describe("rules: сумісність збережених даних і patch", () => {
  it.each([null, undefined, [], "invalid"])("відновлює всю некоректну секцію %j, зберігаючи інші", (items) => {
    const rules = parseRules({ items, morale: { enabled: false, cap: 7 } });

    expect(rules.items).toEqual(DEFAULT_RULES.items);
    expect(rules.morale).toEqual({ enabled: false, cap: 7 });
  });

  it("невідоме вкладене поле скидає всю секцію, невідоме верхнє поле ігнорується", () => {
    const rules = parseRules({ items: { enabled: true, attunementLimit: 5, unknown: true }, future: { enabled: true } });

    expect(rules).toEqual(DEFAULT_RULES);
    expect(RulesetSchema.safeParse({ items: { enabled: true, unknown: true } }).success).toBe(false);
  });

  it.each(["2014", "2024"] as const)("disabled механіки зберігають параметри %s після parse і merge", (edition) => {
    const raw = {
      conditions: { enabled: false, exhaustion: edition },
      actions: { enabled: false, opportunityAttacks: false, retaliation: true, variant: edition },
      concentration: { enabled: false, dcCap: 30 },
      items: { enabled: false, attunementLimit: 5 },
      encounters: { balance: "fair", edition, autoXp: true },
    };

    const rules = parseRules(raw);

    expect(rules).toMatchObject(raw);
    expect(mergeRules(rules, RulesetPatchSchema.parse({ morale: { cap: 5 } }))).toEqual({
      ok: true,
      rules: { ...rules, morale: { enabled: true, cap: 5 } },
    });
  });

  it("disabled механіки перевіряють параметри й повертають точний шлях помилки", () => {
    const raw = { items: { enabled: false, attunementLimit: 0 } };

    expect(parseRules(raw).items).toEqual(DEFAULT_RULES.items);

    const patch = RulesetPatchSchema.safeParse(raw);

    expect(patch.success).toBe(false);

    if (!patch.success) expect(patch.error.issues.map(({ path }) => path)).toEqual([["items", "attunementLimit"]]);

    const merged = mergeRules(DEFAULT_RULES, raw);

    expect(merged.ok).toBe(false);

    if (!merged.ok) expect(merged.issues.map(({ path }) => path)).toEqual([["items", "attunementLimit"]]);
  });

  it("порожні секції patch не отримують defaults і не змінюють поточні параметри", () => {
    const current = parseRules({ morale: { enabled: false, cap: 7 }, items: { enabled: true, attunementLimit: 5 } });

    const patch = RulesetPatchSchema.parse({ morale: {}, items: {} });

    expect(patch).toEqual({ morale: {}, items: {} });
    expect(mergeRules(current, patch)).toEqual({ ok: true, rules: current });
  });

  it("явне undefined у полі patch використовує default, відсутнє поле зберігає поточне", () => {
    const current = parseRules({ morale: { enabled: false, cap: 7 } });

    const patch = RulesetPatchSchema.parse({ morale: { cap: undefined } });

    expect(mergeRules(current, patch)).toEqual({ ok: true, rules: { ...current, morale: { enabled: false, cap: 3 } } });
  });

  it("частковий patch перевіряє міжпольові обмеження після merge з точними шляхами", () => {
    const current = parseRules({ initiative: { heroMin: 10, heroMax: 16 }, criticals: { critOn: 3, fumbleOn: 1 } });

    const patch = RulesetPatchSchema.parse({ initiative: { heroMin: 17 }, criticals: { fumbleOn: 3 } });

    const merged = mergeRules(current, patch);

    expect(merged.ok).toBe(false);

    if (!merged.ok) expect(merged.issues).toEqual([
      { code: "custom", message: "rules.validation.initiativeOrder", path: ["initiative"] },
      { code: "custom", message: "rules.validation.criticalsOrder", path: ["criticals"] },
    ]);

    expect(current.initiative.heroMin).toBe(10);
    expect(current.criticals.fumbleOn).toBe(1);
  });

  it("patch відхиляє невідомі поля з точними шляхами", () => {
    const parsed = RulesetPatchSchema.safeParse({ items: { unknown: true }, future: {} });

    expect(parsed.success).toBe(false);

    if (!parsed.success) expect(parsed.error.issues.map(({ code, path }) => ({ code, path }))).toEqual([
      { code: "unrecognized_keys", path: ["items"] },
      { code: "unrecognized_keys", path: [] },
    ]);
  });
});
