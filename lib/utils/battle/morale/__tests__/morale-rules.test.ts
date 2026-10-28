import { describe, expect, it } from "vitest";

import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { awaitsMoraleCheck } from "@/lib/utils/battle/morale/awaits-check";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { needsMoraleCheck } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

function withCap(morale: number, moraleCap?: number, withMin = false): BattleParticipant {
  const p = makeParticipant({
    id: "p",
    abilities: withMin ? [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "minMorale", value: 1 }] })] : [],
  });

  return { ...p, abilities: { ...p.abilities, moraleCap }, combatStats: { ...p.combatStats, morale } };
}

describe("morale rules", () => {
  it("cap 0 (мораль вимкнена) → нейтральна, перевірка не очікується навіть з minMorale", () => {
    const p = withCap(2, 0, true);

    expect(effectiveMorale(p, [p])).toEqual({ value: 0, ignored: true });
    expect(awaitsMoraleCheck({ participants: [p], scene: { turnIndex: 0, pendingMoraleCheck: null } }, "p")).toBe(false);
    expect(needsMoraleCheck(p, [p], null)).toBe(false);
  });

  it("cap 5 дозволяє мораль 5; відсутня межа (старий знімок) — 3", () => {
    expect(effectiveMorale(withCap(5, 5), []).value).toBe(5);
    expect(effectiveMorale(withCap(5), []).value).toBe(3);
  });

  it("changeMorale поважає межу", () => {
    const p = withCap(1, 1);

    const effect = { kind: "changeMorale", delta: 2 } as const;

    const r = applyEffect({
      participants: [p],
      ability: resolved({ trigger: { event: "hit", role: "attacker" }, effects: [effect] }),
      effectIndex: 0,
      ownerId: "p",
      effect,
      targetIds: ["p"],
      event: { type: "hit", actorId: "p", targetId: "p", attackKind: "melee", damage: 10 },
      ctx: { round: 1, rng: seq(0.5) },
    });

    expect(r.participants[0].combatStats.morale).toBe(1);
  });
});
