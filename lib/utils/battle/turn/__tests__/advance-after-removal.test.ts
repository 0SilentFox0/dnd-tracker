import { describe, expect, it, vi } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { hpOf } from "@/lib/utils/battle/__tests__/fixtures/placed";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceAfterRemoval, advanceTurn } from "@/lib/utils/battle/turn";
import { DEFAULT_RULES } from "@/lib/utils/rules/defaults";

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 1, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

const burn = resolved({ trigger: { event: "turnEnd" }, effects: [{ kind: "dealDamage", amount: 3, target: "self" }] });

describe("advanceAfterRemoval", () => {
  // учасник на ході (індекс 1) уже прибраний: у черзі лишились prev і next
  const prev = makeParticipant({ id: "prev", side: ParticipantSide.ALLY, hp: 20, maxHp: 20, abilities: [burn] });

  const next = makeParticipant({ id: "next", side: ParticipantSide.ENEMY });

  it("хід переходить до наступного після прибраного", () => {
    const out = advanceAfterRemoval({ participants: [prev, next], pending: [], scene, before: 1 });

    expect(out.scene.turnIndex).toBe(1);
  });

  it("кінець ходу попереднього не спрацьовує вдруге", () => {
    const out = advanceAfterRemoval({ participants: [prev, next], pending: [], scene, before: 1 });

    expect(hpOf(out.participants, "prev")).toBe(20);

    const plain = advanceTurn({ participants: [prev, next], pending: [], scene: { ...scene, turnIndex: 0 } });

    expect(hpOf(plain.participants, "prev")).toBe(17);
  });

  it("прибраний був першим у черзі — ходить новий перший", () => {
    const out = advanceAfterRemoval({ participants: [prev, next], pending: [], scene: { ...scene, turnIndex: 0 }, before: 0 });

    expect(out.scene.turnIndex).toBe(0);
    expect(hpOf(out.participants, "prev")).toBe(20);
  });
});

it("removal зберігає death-save event, participants, turn/round і єдиний RNG call", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));

  try {
    const prev = makeParticipant({ id: "prev" });

    const base = makeParticipant({ id: "dying", side: ParticipantSide.ENEMY });

    const dying = { ...base, combatStats: { ...base.combatStats, currentHp: 0, status: "unconscious" as const }, battleData: { ...base.battleData, deathSaves: { successes: 0, failures: 0, stable: false } } };

    const rng = vi.fn(() => 0.99);

    const result = advanceAfterRemoval({ participants: [prev, dying], pending: [], scene, before: 1, rules: { ...DEFAULT_RULES, deathSaves: { enabled: true, unitsDieAtZero: true } }, rng });

    expect(rng).toHaveBeenCalledTimes(1);
    expect({ result, rngCalls: rng.mock.results.map((r) => r.value) }).toMatchSnapshot();
    expect(result.scene).toMatchObject({ round: 1, turnIndex: 1 });
  } finally {
    vi.useRealTimers();
  }
});
