import { describe, expect, it } from "vitest";

import { textOf } from "@/lib/i18n/test/text";
import { goblin, hero } from "@/lib/server/battles/__tests__/mutations/fixtures";
import { applyCondition5e } from "@/lib/utils/battle/conditions";
import { displayEffects, effectSummary } from "@/lib/utils/battle/view";

describe("показ станів 5e", () => {
  it("стан з назвою й тривалістю видно в списку ефектів, у т.ч. ворога", () => {
    const ps = applyCondition5e([hero, goblin], "gob", { key: "prone", rounds: 3, source: undefined, sourceName: "ДМ", timedKey: "t", round: 1 }).participants;

    const shown = displayEffects(ps[1], ps);

    expect(shown.map((e) => e.name)).toEqual(["Повалений"]);
    expect(effectSummary(shown[0]).map((l) => textOf(l))).toContain("ще 3 раунди");
  });
});
