import { describe, expect, it } from "vitest";

import { attackResultsOf, buildAttackResultFx } from "../attack-result-fx";

import type { PercentileAttackDetails } from "@/lib/utils/battle/types/attack";
import type { BattleAction } from "@/types/battle";

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

  describe("d100", () => {
    const attack: PercentileAttackDetails = { roll: 30, target: 45, sl: 1, netSl: 3, location: "arm", doubles: false, defender: { kind: "parry", roll: 60, sl: -2, target: 40 }, momentumUsed: true };

    const system = { key: "wfrp", data: { attack } };

    const entry = { actionIndex: 7, actionType: "attack", actorId: "me", targets: [{ participantId: "a" }], actionDetails: { system } } as unknown as BattleAction;

    const hit = [{ kind: "hit" as const, targetId: "a", damage: 4, downed: false }];

    it("exact: слот з журналу цього удару, із прапорцем exact", () => {
      const fx = buildAttackResultFx({ ...base, log: [entry], results: hit, exactOf: () => true });

      expect(fx).toMatchObject({ system, exact: true });
    });

    it("не exact: слот лишається, прапорця exact немає (приховує UI системи)", () => {
      const fx = buildAttackResultFx({ ...base, log: [entry], results: hit });

      expect(fx).toMatchObject({ system });
      expect(fx).not.toHaveProperty("exact");
    });

    it("запис уже побачений або без слота (d20) — поля немає", () => {
      expect(buildAttackResultFx({ ...base, log: [entry], seen: new Set([7]), results: hit })).not.toHaveProperty("system");
      expect(buildAttackResultFx({ ...base, log: [], results: hit })).not.toHaveProperty("system");
    });
  });
});
