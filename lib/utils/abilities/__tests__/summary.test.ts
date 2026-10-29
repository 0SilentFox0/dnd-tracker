import { describe, expect, it } from "vitest";

import { describeAbilitySegments } from "@/lib/utils/abilities/registry/effects";
import { abilitySummary, summarizeAbility, withAbilitySummary } from "@/lib/utils/abilities/summary";

const ability = { id: "a1", name: "Лють", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] };

describe("abilitySummary", () => {
  it("описує збережені вміння", () => {
    expect(abilitySummary("skill", { id: "s1", abilities: [ability] })).toEqual([expect.objectContaining({ then: [[expect.objectContaining({ key: "summary.effects.damageBonus" })]] })]);
  });

  it("тип шкоди українською, мітка без сирого id", () => {
    const a = { id: "a2", name: "Отрута", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dealDamage", amount: 3, damageType: "poison" }, { kind: "mark", markId: "godric-offender", target: "eventTarget", duration: { rounds: 2 } }] };

    const [line] = abilitySummary("skill", { id: "s2", abilities: [a] });

    const json = JSON.stringify(line);

    expect(line.then).toHaveLength(2);

    expect(json).toContain("damageTypes.poison");
    expect(json).not.toContain("godric-offender");
  });

  it("withAbilitySummary прибирає abilities та вказані колонки", () => {
    const row = withAbilitySummary("unit", { id: "u1", name: "Гоблін", abilities: [ability], specialAbilities: [{ x: 1 }] }, ["specialAbilities"]);

    expect(row).toEqual({ id: "u1", name: "Гоблін", abilitySummary: [expect.objectContaining({ then: expect.any(Array) })] });
  });

  it("пасивне вміння без умови й обмежень", () => {
    const s = summarizeAbility(ability as never);

    expect(s.if).toEqual([]);
    expect(s.limits).toEqual([]);
    expect(s.when.length).toBeGreaterThan(0);
  });

  it("умова hpBelow дає один сегмент у if", () => {
    const s = summarizeAbility({ ...ability, condition: { kind: "hpBelow", percent: 50 } } as never);

    expect(s.if).toHaveLength(1);
  });

  it("два ефекти дають два рядки then", () => {
    const s = summarizeAbility({ ...ability, effects: [...ability.effects, ...ability.effects] } as never);

    expect(s.then).toHaveLength(2);
  });

  it("невалідне за схемою вміння відфільтроване", () => {
    expect(abilitySummary("skill", { id: "s3", abilities: [{ id: "bad", trigger: { event: "nope" }, effects: [] }] })).toEqual([]);
  });

  it("плоский вигляд збігається з рядком describeAbilitySegments і серіалізується", () => {
    const a = { ...ability, limits: { perBattle: 1 } } as never;

    const s = summarizeAbility(a);

    expect([...s.when, ...s.limits, ...s.then.flat()]).toEqual(describeAbilitySegments(a));
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
