import { describe, expect, it } from "vitest";

import { enT, ukT } from "../../__tests__/describe-fixtures";
import { amountLabel, amountSegment, flatLabel, flatSegment, limitsSegments, statSegment, targetSegment } from "../labels";

import { renderSegment, renderSegments } from "@/lib/utils/abilities/segments";

describe("limitsSegments perBattle plural", () => {
  it("uk", async () => {
    const t = await ukT();

    const out = [1, 2, 5, 11, 21].map((n) => renderSegments(t, limitsSegments({ perBattle: n }))[0]);

    expect(out).toEqual(["1 раз за бій", "2 рази за бій", "5 разів за бій", "11 разів за бій", "21 раз за бій"]);
  });

  it("en", async () => {
    const t = await enT();

    expect([1, 2].map((n) => renderSegments(t, limitsSegments({ perBattle: n }))[0])).toEqual(["1 time per battle", "2 times per battle"]);
  });
});

describe("amountSegment / flatSegment", () => {
  const amounts = [5, "2d6", { scale: "x" }, { formula: "1+2" }, { spellRoll: 100 }, { spellRoll: 50 }, { spellRoll: { formula: "a" } }, { percentOf: "eventDamage", value: 30 }, { percentOf: "maxHp", value: 10 }, { percentOf: "ownerAttack", value: 50 }] as Parameters<typeof amountSegment>[0][];

  it("uk matches text labels", async () => {
    const t = await ukT();

    for (const a of amounts) expect(renderSegment(t, amountSegment(a)), JSON.stringify(a)).toBe(amountLabel(a));

    for (const f of [3, -2, { formula: "x" }, { scale: "y" }] as Parameters<typeof flatSegment>[0][]) expect(renderSegment(t, flatSegment(f))).toBe(flatLabel(f));
  });

  it("stat and target keys", async () => {
    const t = await ukT();

    expect(renderSegment(t, statSegment("armor"))).toBe("AC");
    expect(renderSegment(t, targetSegment("self"))).toBe("я");
  });
});
