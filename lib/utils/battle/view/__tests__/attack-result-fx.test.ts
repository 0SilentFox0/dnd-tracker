import { describe, expect, it } from "vitest";

import { attackResultsOf, buildAttackResultFx } from "../attack-result-fx";

const nameOf = (id: string) => ({ a: "Гоблін", b: "Орк" })[id as "a" | "b"] ?? "";

const base = { log: [], seen: new Set<number>(), attackerId: "me", d20: 14, nameOf };

describe("attackResultsOf", () => {
  it("без записів у журналі — підсумки за кидками", () => {
    const out = attackResultsOf([], new Set(), "me", [], [{ outcome: "crit", targetId: "a" }, { outcome: "hit", targetId: "b" }, { outcome: "miss", targetId: "b" }]);

    expect(out.map((r) => r.kind)).toEqual(["crit", "hit", "miss"]);
  });
});

describe("buildAttackResultFx", () => {
  it("влучання: сума шкоди й зброя", () => {
    const fx = buildAttackResultFx({ ...base, weapon: "Меч", results: [{ kind: "hit", targetId: "a", damage: 5, downed: false }] });

    expect(fx).toMatchObject({ kind: "hit", targetName: "Гоблін", damage: 5, d20: 14, weapon: "Меч" });
    expect(fx).not.toHaveProperty("strikes");
  });

  it("залп: strikes по всіх цілях, шкода сумується", () => {
    const fx = buildAttackResultFx({
      ...base,
      results: [
        { kind: "crit", targetId: "a", damage: 7, downed: true },
        { kind: "hit", targetId: "b", damage: 3, downed: false, splash: true },
      ],
    });

    expect(fx).toMatchObject({ kind: "crit", damage: 10, downed: true });
    expect((fx as { strikes: unknown[] }).strikes).toHaveLength(2);
  });

  it("промах: поле known і без шкоди", () => {
    const fx = buildAttackResultFx({ ...base, results: [{ kind: "miss", targetId: "b", damage: 0, downed: false }] });

    expect(fx).toMatchObject({ kind: "miss", targetName: "Орк", d20: 14 });
    expect(fx).toHaveProperty("known");
  });
});
