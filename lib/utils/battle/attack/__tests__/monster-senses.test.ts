import { describe, expect, it } from "vitest";

import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { EffectSchema } from "@/lib/utils/abilities/schema";
import { CLAWS, placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { applyCondition5e, type Condition5eKey } from "@/lib/utils/battle/conditions";
import type { BattleParticipant } from "@/types/battle";

const sensed = (sense: string, range = 30) => placed("monster", { at: { x: 0, y: 0 }, abilities: [resolved({ name: "Чуття", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "sense", sense, range } as never] })] });

const condition = (ps: BattleParticipant[], id: string, key: Condition5eKey) => applyCondition5e(ps, id, { key, rounds: 5, source: { participantId: "src", name: "X" }, sourceName: "X", timedKey: key, round: 1 }).participants;

const reasons = (ps: BattleParticipant[]) => rollModeReasons(ps[0], CLAWS, ps, { targetId: ps[1].basicInfo.id });

describe("monster senses", () => {
  it("validates the passive sense flag", () => {
    expect(EffectSchema.safeParse({ kind: "flag", flag: "sense", sense: "blindsight", range: 30 }).success).toBe(true);
  });

  it.each(["blindsight", "truesight"])("%s sees invisible targets through the exact range boundary", (sense) => {
    const ps = condition([sensed(sense), placed("target", { at: { x: 6, y: 0 } })], "target", "invisible");

    expect(reasons(ps).disadvantage).not.toContain("Невидимий");
  });

  it("does not remove invisibility beyond range or for display-only senses", () => {
    for (const [sense, x] of [["blindsight", 7], ["darkvision", 2], ["tremorsense", 2]] as const) {
      expect(reasons(condition([sensed(sense), placed("target", { at: { x, y: 0 } })], "target", "invisible")).disadvantage).toContain("Невидимий");
    }
  });

  it("a defender's sense removes the invisible attacker's advantage", () => {
    const ps = condition([placed("attacker", { at: { x: 1, y: 0 } }), sensed("truesight")], "attacker", "invisible");

    expect(reasons(ps).advantage).not.toContain("Невидимий");
  });

  it("blindsight suppresses blinded only in range and preserves poison", () => {
    const ps = condition(condition([sensed("blindsight"), placed("target", { at: { x: 2, y: 0 } })], "monster", "blinded"), "monster", "poisoned");

    expect(reasons(ps).disadvantage).not.toContain("Засліплений");
    expect(reasons(ps).disadvantage).toContain("Отруєний");

    const far = [ps[0], placed("target", { at: { x: 7, y: 0 } })];

    expect(reasons(far).disadvantage).toContain("Засліплений");
  });
});
