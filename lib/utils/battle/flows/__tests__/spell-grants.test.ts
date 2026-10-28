import { describe, expect, it } from "vitest";

import { makeParticipant } from "@/lib/utils/abilities/__tests__/fixtures";
import { canCastFromSlot, castLevelOptions, costBlocked, defaultGrant, grantLabel, grantsFor, poolUsage, selectedGrantOf, sourceOptions } from "@/lib/utils/battle/flows/spell-grants";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

const casterWith = (grants: SpellGrant[], pools: Record<string, { max: number; recharge?: number }> = {}, extra: Partial<BattleParticipant["spellcasting"]> = {}): BattleParticipant => {
  const p = makeParticipant({ id: "c" });

  return {
    ...p,
    spellcasting: { ...p.spellcasting, grants, ...extra },
    battleData: { ...p.battleData, pools: pools as never },
  };
};

const innate: SpellGrant = { spellId: "fog", key: "fog-1", label: "Туман", pool: "p", cost: 1, castLevel: 1, upcast: { maxLevel: 3, extraCost: 1 } };

describe("grantsFor / canCastFromSlot", () => {
  it("фільтрує гранти закляття; без грантів слот дозволений, з грантом — лише slotOrGrant чи slotSpells", () => {
    const c = casterWith([innate, { spellId: "other" }]);

    expect(grantsFor(c, "fog")).toEqual([innate]);
    expect(grantsFor(null, "fog")).toEqual([]);
    expect(canCastFromSlot(c, "free")).toBe(true);
    expect(canCastFromSlot(c, "fog")).toBe(false);
    expect(canCastFromSlot(casterWith([{ ...innate, via: "slotOrGrant" }]), "fog")).toBe(true);
    expect(canCastFromSlot(casterWith([innate], {}, { slotSpells: ["fog"] }), "fog")).toBe(true);
  });
});

describe("selectedGrantOf / defaultGrant", () => {
  it("єдиний грант без ключа, за ключем, слот скасовує", () => {
    expect(selectedGrantOf([innate], {})).toBe(innate);
    expect(selectedGrantOf([innate], { slotKey: "1" })).toBeUndefined();
    expect(selectedGrantOf([innate], { grantKey: "nope" })).toBeUndefined();
    expect(selectedGrantOf([innate, { ...innate, key: "b" }], { grantKey: "b" })?.key).toBe("b");
    expect(selectedGrantOf([innate, { ...innate, key: "b" }], {})).toBeUndefined();
  });

  it("default: slotOrGrant зі слотами не підставляється, кантрип — так", () => {
    const both = { ...innate, via: "slotOrGrant" as const };

    expect(defaultGrant([innate], { hasSlotChoices: true, spellLevel: 1 })).toBe(innate);
    expect(defaultGrant([both], { hasSlotChoices: true, spellLevel: 1 })).toBeUndefined();
    expect(defaultGrant([both], { hasSlotChoices: false, spellLevel: 1 })).toBe(both);
    expect(defaultGrant([both], { hasSlotChoices: true, spellLevel: 0 })).toBe(both);
    expect(defaultGrant([innate, both], { hasSlotChoices: false, spellLevel: 1 })).toBeUndefined();
  });
});

describe("poolUsage / labels", () => {
  it("пул 0/1 заряд, recharge і відпочинок", () => {
    expect(poolUsage(casterWith([], { p: { max: 1 } }), "p")).toEqual({ left: 1, max: 1, label: "1/1 за відпочинок" });
    expect(poolUsage(casterWith([], { p: { max: 3, recharge: 5 } }), "p")).toEqual({ left: 3, max: 3, label: "3/3 · ⟳ 5–6" });
    expect(poolUsage(casterWith([], {}), "p")).toBeUndefined();
    expect(poolUsage(casterWith([], {}), undefined)).toBeUndefined();
  });

  it("grantLabel: легендарний і безпуловий грант", () => {
    const c = casterWith([{ ...innate, legendaryOnly: true }, { spellId: "fog", label: "Дар" }], { p: { max: 2 } });

    expect(grantLabel(c, "fog")).toBe("Туман: Лише легендарна / лігво · 2/2 за відпочинок · Дар: За бажанням");
    expect(grantLabel(c, "none")).toBeUndefined();
  });
});

describe("sourceOptions / castLevelOptions", () => {
  it("слоти плюс гранти; вичерпаний пул вимкнений", () => {
    const full = casterWith([innate], { p: { max: 2 } });

    expect(sourceOptions(full, [innate], [{ key: "1", label: "I" }])).toEqual([
      { value: "slot:1", label: "Слот I", disabled: false },
      { value: "grant:fog-1", label: "Туман · 2/2", disabled: false },
    ]);
    expect(sourceOptions(casterWith([innate], { p: { max: 0 } }), [innate], [])[0].disabled).toBe(true);
    expect(sourceOptions(full, [{ spellId: "fog" }], [])[0]).toEqual({ value: "grant:fog", label: "Безкоштовний каст · без ліміту", disabled: false });
    expect(sourceOptions(full, [], [{ key: "1", label: "I" }])).toEqual([]);
  });

  it("апкаст: вартість росте, нестача заряду вимикає рівень, без пулу — безліміт", () => {
    const opts = castLevelOptions(casterWith([innate], { p: { max: 2 } }), innate);

    expect(opts).toEqual([
      { value: 1, label: "Коло 1", disabled: false },
      { value: 2, label: "Коло 2 · 2 заряди", disabled: false },
      { value: 3, label: "Коло 3 · 3 заряди", disabled: true },
    ]);
    expect(castLevelOptions(casterWith([innate]), { ...innate, pool: undefined }).every((o) => !o.disabled)).toBe(true);
    expect(castLevelOptions(null, { ...innate, upcast: undefined })).toEqual([]);
    expect(castLevelOptions(null, undefined)).toEqual([]);
  });
});

describe("costBlocked", () => {
  const base = { spell: { cost: "action" }, definitionCost: "action", grants: [], grant: undefined, free: false, bypassCost: false, special: false, isDM: false, isMyTurn: true, reactionBlocked: false };

  it("free і без кастера — не блокує", () => {
    expect(costBlocked({ ...base, caster: null })).toBe(false);
    expect(costBlocked({ ...base, caster: casterWith([]), free: true, isMyTurn: false })).toBe(false);
  });

  it("не мій хід блокує гравця, але не DM і не реакцію", () => {
    const c = casterWith([]);

    expect(costBlocked({ ...base, caster: c, isMyTurn: false })).toBe(true);
    expect(costBlocked({ ...base, caster: c, isMyTurn: false, isDM: true })).toBe(false);
    expect(costBlocked({ ...base, caster: c, isMyTurn: false, spell: { cost: "reaction" }, definitionCost: "reaction" })).toBe(false);
    expect(costBlocked({ ...base, caster: c, spell: { cost: "reaction" }, definitionCost: "reaction", reactionBlocked: true })).toBe(true);
  });

  it("грант: обов'язковий вибір, legendaryOnly, порожній пул", () => {
    const c = casterWith([innate], { p: { max: 0 } });

    expect(costBlocked({ ...base, caster: c, grants: [innate] })).toBe(true);
    expect(costBlocked({ ...base, caster: c, grants: [innate], slotKey: "1" })).toBe(false);
    expect(costBlocked({ ...base, caster: c, grants: [innate], grant: innate })).toBe(true);
    expect(costBlocked({ ...base, caster: casterWith([]), grants: [{ ...innate, pool: undefined, legendaryOnly: true }], grant: { ...innate, pool: undefined, legendaryOnly: true } })).toBe(true);
  });

  it("використана дія блокує, bypassCost — ні", () => {
    const c = casterWith([]);

    const used = { ...c, actionFlags: { ...c.actionFlags, hasUsedAction: true } };

    expect(costBlocked({ ...base, caster: used })).toBe(true);
    expect(costBlocked({ ...base, caster: used, bypassCost: true })).toBe(false);
  });
});
