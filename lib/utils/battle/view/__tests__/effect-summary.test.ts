import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { ukT } from "@/lib/utils/abilities/__tests__/describe-fixtures";
import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { effectSummary, mergeEffectsForDisplay } from "@/lib/utils/battle/view";

describe("effectSummary", () => {
  const tPromise = ukT();

  it("без опису — описує модифікатори, залишок і джерело", async () => {
    const e = makeEffect("drill", { name: "Вишкіл війська", duration: 2, abilityEffects: [{ kind: "modifyStat", stat: "morale", flat: 1 }], source: { participantId: "p", name: "Люди", abilityName: "Вишкіл війська" } });

    expect(effectSummary(e, await tPromise).map((l) => textOf(l))).toEqual(["Мораль +1", "ще 2 раунди", "від: Вишкіл війська (Люди)"]);
  });

  it("опис ефекту має перевагу, DoT додає шкоду щораунду", async () => {
    const e = makeEffect("burn", { description: "Горить", duration: 1, dotDamage: { damagePerRound: 4, damageType: "fire" } });

    expect(effectSummary(e, await tPromise).map((l) => textOf(l))).toEqual(["Горить", "4 шкоди (fire) щораунду", "ще 1 раунд"]);
  });

  it("ефекти одного вміння з однаковою тривалістю зливаються в один запис", () => {
    const source = { participantId: "i", name: "Ізабель", abilityName: "Сурми світанку" };

    const init = makeEffect("horns#0", { name: "Сурми світанку", duration: 2, abilityEffects: [{ kind: "modifyStat", stat: "initiative", flat: 2 }], source });

    const dmg = makeEffect("horns#1", { name: "Сурми світанку", duration: 2, abilityEffects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 10 }], source });

    const drill = makeEffect("drill", { name: "Вишкіл війська", duration: 2, abilityEffects: [{ kind: "modifyStat", stat: "morale", flat: 1 }], source: { ...source, abilityName: "Люди: Вишкіл війська" } });

    const merged = mergeEffectsForDisplay([init, drill, dmg]);

    expect(merged.map((e) => e.name)).toEqual(["Сурми світанку", "Вишкіл війська"]);
    expect(merged[0].abilityEffects).toHaveLength(2);
    expect(mergeEffectsForDisplay([init, { ...dmg, duration: 1 }])).toHaveLength(2);
  });

  it("захист (guard) описаний: хто бере на себе шкоду", async () => {
    const e = makeEffect("guard", { name: "Клятва щита", duration: 99, effects: [{ type: "guard", value: 20 }], source: { participantId: "s", name: "Семгрун", abilityName: "Клятва щита" } });

    expect(textOf(effectSummary(e, await tPromise)[0])).toBe("Семгрун бере на себе 20% шкоди від атак");
  });
});

