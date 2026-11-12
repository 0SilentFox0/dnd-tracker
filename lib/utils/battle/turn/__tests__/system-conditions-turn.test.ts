import { describe, expect, it } from "vitest";

import { processStartOfTurn } from "../turn-start";
import { resetTurnState } from "../turn-state";

import { CombatStatus } from "@/lib/constants/battle";
import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { clearFallenEffects } from "@/lib/utils/battle/participant/fallen";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn, enterChangedTurn } from "@/lib/utils/battle/turn";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { ruleSystemOf } from "@/lib/utils/rules/systems";
import { DEFAULT_CHARACTERISTICS } from "@/systems/wfrp/rules/characteristics/keys";
import { wfrpAbilitiesOf } from "@/systems/wfrp/rules/combat/participant";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";
import type { BattleParticipant } from "@/types/battle";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, pendingChoice: null, startedAt: null, completedAt: null,
};

const bleed = (id: string, hp: number, levels = 0): BattleParticipant => {
  const base = createMockParticipant();

  const p: BattleParticipant = {
    ...base,
    basicInfo: { ...base.basicInfo, id },
    combatStats: { ...base.combatStats, currentHp: hp, maxHp: 20 },
    abilities: { ...base.abilities, ...wfrpAbilitiesOf(DEFAULT_CHARACTERISTICS, { ap: { head: 0, arm: 0, body: 1, leg: 0 } }) },
  };

  if (!levels) return p;

  return ruleSystemOf(WFRP_RULES).conditions!.apply([p], id, { key: "bleeding", levels, round: 1, sourceName: "x" }).participants[0];
};

describe("system condition ticks at turn start", () => {
  it("bleeding wounds the bearer", () => {
    const a = bleed("a", 10, 2);

    const out = processStartOfTurn(a, 2, [a], () => 0.5, null, WFRP_RULES);

    expect(out.participant.combatStats.currentHp).toBe(8);
    expect(JSON.stringify(out.damageMessages)).toContain("battleWfrp.log.tick.bleeding");
    expect(out.statusChanged).toBe(false);
  });

  it("fainting from the tick downs the bearer without running turn-start abilities", () => {
    const a = bleed("a", 10, 2);

    const out = processStartOfTurn(a, 2, [a], () => 0.1, null, WFRP_RULES);

    expect(out.statusChanged).toBe(true);
    expect(out.participant.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(isActive(out.participant)).toBe(false);
  });

  it("advanceTurn skips a bearer downed by the tick", () => {
    const a = bleed("a", 10);

    const b = bleed("b", 1, 1);

    const c = bleed("c", 10);

    const out = advanceTurn({ participants: [a, b, c], pending: [], scene, rng: () => 0.5, map: null, rules: WFRP_RULES });

    expect(out.participants.find((p) => p.basicInfo.id === "b")?.combatStats.status).toBe(CombatStatus.UNCONSCIOUS);
    expect(out.participants[out.scene.turnIndex ?? 0].basicInfo.id).toBe("c");
  });

  it("enterChangedTurn skips a bearer downed by the tick", () => {
    const a = bleed("a", 10);

    const b = bleed("b", 1, 1);

    const c = bleed("c", 10);

    const res = enterChangedTurn({ rules: WFRP_RULES, before: [a, c], after: [b, c], fromIndex: 0, toIndex: 0, round: 2, rng: () => 0.5 });

    expect(res.participants[res.turnIndex].basicInfo.id).toBe("c");
    expect(isActive(res.participants[0])).toBe(false);
  });

  it("unconscious bleeder keeps bleeding through the fallen sweep and can bleed out on the skipped turn", () => {
    const a = bleed("a", 10);

    const b0 = bleed("b", 0, 3);

    const b = { ...b0, combatStats: { ...b0.combatStats, status: CombatStatus.UNCONSCIOUS } };

    const c = bleed("c", 10);

    const swept = clearFallenEffects([a, b, c], WFRP_RULES);

    expect(swept[1].battleData.activeEffects).toHaveLength(1);

    const out = advanceTurn({ participants: swept, pending: [], scene: { ...scene, turnIndex: 0 }, rng: () => 0.1, map: null, rules: WFRP_RULES });

    expect(out.participants.find((p) => p.basicInfo.id === "b")?.combatStats.status).toBe(CombatStatus.DEAD);
    expect(JSON.stringify(out.actions)).toContain("battleWfrp.log.tick.bleedOut");
  });

  it("d20 rules do not tick wfrp conditions", () => {
    const a = bleed("a", 10, 2);

    const out = processStartOfTurn(a, 2, [a], () => 0.5, null, DEFAULT_RULES);

    expect(out.participant.combatStats.currentHp).toBe(10);
  });
});

describe("resetTurnState condition tests", () => {
  it("clears conditionTests only when present", () => {
    const p = bleed("a", 10);

    expect(resetTurnState({ ...p, battleData: { ...p.battleData, conditionTests: ["bleeding"] } }).conditionTests).toBeUndefined();
    expect("conditionTests" in resetTurnState(p)).toBe(false);
  });
});
