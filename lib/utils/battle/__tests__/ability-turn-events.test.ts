import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { processStartOfRound, processStartOfTurn } from "@/lib/utils/battle/battle-turn";
import { applyPendingMoraleCheck } from "@/lib/utils/battle/turn/apply-pending-morale";
import { runAdvanceTurnLoop } from "@/lib/utils/battle/turn/run-advance-turn-loop";

describe("turn events", () => {
  it("turnStart лікує, perTurn скидається", () => {
    const regen = resolved({ trigger: { event: "turnStart" }, limits: { perTurn: 1 }, effects: [{ kind: "heal", amount: 3 }] });

    const p = makeParticipant({ id: "a", hp: 10, abilities: [regen] });

    const r = processStartOfTurn(p, 1, [p], seq(0));

    expect(r.participants[0].combatStats.currentHp).toBe(13);
    expect(r.abilityMessages[0]).toContain("💚");
  });

  it("смерть від DOT дає kill-подію союзникам", () => {
    const base = makeParticipant({ id: "a", hp: 1 });

    const dying = { ...base, battleData: { ...base.battleData, activeEffects: [{ id: "d", name: "Отрута", type: "debuff" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [], dotDamage: { damagePerRound: 5, damageType: "poison" } }] } };

    const mourn = resolved({ trigger: { event: "kill", role: "victimSide" }, effects: [{ kind: "changeMorale", delta: -1 }] });

    const ally = makeParticipant({ id: "b", abilities: [mourn] });

    const r = processStartOfTurn(dying, 1, [dying, ally], seq(0));

    expect(r.participants.find((p) => p.basicInfo.id === "b")?.combatStats.morale).toBe(-1);
  });

  it("roundStart і roundEnd у циклі ходів", () => {
    const rally = resolved({ trigger: { event: "roundStart" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const tired = resolved({ trigger: { event: "roundEnd" }, effects: [{ kind: "changeMorale", delta: -1 }] }, { id: "t" });

    const a = makeParticipant({ id: "a", abilities: [rally] });

    const b = makeParticipant({ id: "b", abilities: [tired] });

    const r = runAdvanceTurnLoop({ initiativeOrder: [a, b], currentTurnIndex: 1, currentRound: 1, battleId: "b1", currentBattleLogLength: 0, pendingSummons: [] });

    expect(r.updatedInitiativeOrder.find((p) => p.basicInfo.id === "a")?.combatStats.morale).toBe(1);
    expect(r.updatedInitiativeOrder.find((p) => p.basicInfo.id === "b")?.combatStats.morale).toBe(-1);
  });

  it("moraleCheck: успіх власника і перевірка союзника", () => {
    const proud = resolved({ trigger: { event: "moraleCheck", result: "success", whose: "self" }, effects: [{ kind: "heal", amount: 2 }] });

    const a = makeParticipant({ id: "a", hp: 10, abilities: [proud] });

    const r = applyPendingMoraleCheck([a, makeParticipant({ id: "e", side: ParticipantSide.ENEMY })], { participantId: "a", d10Roll: 10, moraleResult: { shouldSkipTurn: false, hasExtraTurn: false, message: "Мораль тримається", moralePositive: true } }, 1, "b1", 0);

    expect(r.updatedInitiativeOrder[0].combatStats.currentHp).toBe(12);
  });

  it("roundStart лише для новачків у battleStart", () => {
    const rally = resolved({ trigger: { event: "battleStart" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const veteran = { ...makeParticipant({ id: "a", abilities: [rally] }) };

    const r = processStartOfRound([veteran], 2, []);

    expect(r.updatedInitiativeOrder[0].combatStats.morale).toBe(0);
  });
});
