import { describe, expect, it } from "vitest";

import { makeEffect } from "@/lib/utils/abilities/__tests__/fixtures";
import { effectSummary } from "@/lib/utils/battle/view";

describe("effectSummary", () => {
  it("без опису — описує модифікатори, залишок і джерело", () => {
    const e = makeEffect("drill", { name: "Вишкіл війська", duration: 2, abilityEffects: [{ kind: "modifyStat", stat: "morale", flat: 1 }], source: { participantId: "p", name: "Люди", abilityName: "Вишкіл війська" } });

    expect(effectSummary(e)).toEqual(["Мораль +1", "ще 2 раунди", "від: Вишкіл війська (Люди)"]);
  });

  it("опис ефекту має перевагу, DoT додає шкоду щораунду", () => {
    const e = makeEffect("burn", { description: "Горить", duration: 1, dotDamage: { damagePerRound: 4, damageType: "fire" } });

    expect(effectSummary(e)).toEqual(["Горить", "4 шкоди (fire) щораунду", "ще 1 раунд"]);
  });
});
