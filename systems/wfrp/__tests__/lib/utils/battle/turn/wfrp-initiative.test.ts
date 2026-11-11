import { describe, expect, it } from "vitest";

import { createMockParticipant, grantPassive } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { coreActionAvailability } from "@/lib/utils/battle/actions/availability";
import { reactionBlocker } from "@/lib/utils/battle/actions/reaction";
import { actionReason } from "@/lib/utils/battle/actions/reasons";
import { baseMovement } from "@/lib/utils/battle/grid/path";
import { calculateInitiative, compareInitiative } from "@/lib/utils/battle/turn/initiative";
import { rollInitiative } from "@/lib/utils/battle/turn/roll-initiative";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { type Characteristics, DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { wfrpAbilitiesOf, wfrpBaseStats } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const rollRules = { ...WFRP_RULES, initiative: { ...WFRP_RULES.initiative, mode: "roll" as const } };

const chars = (over: { i?: number; ag?: number; move?: number }): Characteristics => ({
  ...DEFAULT_CHARACTERISTICS,
  base: { ...DEFAULT_CHARACTERISTICS.base, i: over.i ?? 30, ag: over.ag ?? 30 },
  move: over.move ?? 4,
});

const wfrp = (id: string, over: { i?: number; ag?: number } = {}): BattleParticipant => {
  const base = createMockParticipant();

  const c = chars(over);

  const { initiative } = wfrpBaseStats({ characteristics: c });

  return { ...base, basicInfo: { ...base.basicInfo, id }, abilities: { ...base.abilities, ...wfrpAbilitiesOf(c), baseInitiative: initiative, initiative } };
};

describe("wfrp initiative", () => {
  it("static mode is the Initiative characteristic", () => {
    expect(calculateInitiative(wfrp("a", { i: 42 }), undefined, { rules: WFRP_RULES })).toBe(42);
  });

  it("roll mode is I + d10", () => {
    const rng = () => 0.45;

    expect(calculateInitiative(wfrp("a", { i: 42 }), undefined, { rules: rollRules, rng })).toBe(42 + 5);
  });

  it("rollInitiative reports d10 sides and I + d10 totals", () => {
    const out = rollInitiative([wfrp("a", { i: 42 }), wfrp("b", { i: 30 })], () => 0.95, rollRules);

    expect(out.rolls).toEqual([
      { id: "a", roll: 10, sides: 10, total: 52 },
      { id: "b", roll: 10, sides: 10, total: 40 },
    ]);
    expect(out.participants.map((p) => p.basicInfo.id)).toEqual(["a", "b"]);
  });

  it("ties break by Agility", () => {
    const a = wfrp("a", { i: 30, ag: 45 });

    const b = wfrp("b", { i: 30, ag: 35 });

    expect([b, a].sort(compareInitiative).map((p) => p.basicInfo.id)).toEqual(["a", "b"]);
  });

  it("d20 path is unchanged", () => {
    const out = rollInitiative([createMockParticipant()], () => 0.5, DEFAULT_RULES);

    expect(out.rolls[0].sides).toBe(20);
  });
});

describe("wfrp action economy", () => {
  const cunning = (p: BattleParticipant) => grantPassive(p, [{ kind: "flag", flag: "cunningAction" }], "Cunning Action");

  it("a bonus-cost action is unavailable without bonus actions, available in d20", () => {
    const wf = cunning(wfrp("a"));

    expect(coreActionAvailability("dash", wf, [wf], null, WFRP_RULES)).toEqual({ ok: false, reason: actionReason("noBonusAction") });

    const d = cunning(createMockParticipant());

    expect(coreActionAvailability("dash", d, [d], null, DEFAULT_RULES).ok).toBe(true);
  });

  it("reactions are blocked in wfrp only", () => {
    expect(reactionBlocker(wfrp("a"), WFRP_RULES)).toEqual(actionReason("noReaction"));
    expect(reactionBlocker(createMockParticipant(), DEFAULT_RULES)).toBeNull();
  });
});

describe("wfrp speed", () => {
  it("speed is walk yards * 3 feet, giving walkYd / 2 cells", () => {
    const { speed } = wfrpBaseStats({ characteristics: chars({ move: 4 }) });

    expect(speed).toBe(24);

    const p = { ...wfrp("a"), combatStats: { ...wfrp("a").combatStats, speed } };

    expect(baseMovement(p, WFRP_RULES)).toBe(4);
  });
});
