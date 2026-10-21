import { describe, expect, it } from "vitest";

import { resolveAttackTargets } from "../targets";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { CLAWS, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";

const none = { attackHitsAllEnemies: [], piercingShot: [], multiTargetFalloff: [], chainShot: [] };

const ranged = { ...CLAWS, type: AttackType.RANGED };

describe("resolveAttackTargets", () => {
  const a = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 } });

  const e1 = placed("e1", { at: { x: 3, y: 5 } });

  const e2 = placed("e2", { at: { x: 5, y: 5 } });

  const order = [a, e1, e2];

  const base = { order, attacker: a, attack: CLAWS, targetIds: ["e1"], map: testMap(), flags: none };

  it("keeps the chosen target for a normal attack", () => {
    expect(resolveAttackTargets({ ...base, chosen: [e1] })).toMatchObject({ targets: [e1], expanded: false, volley: false, falloff: 1 });
  });

  it("rejects more targets than the attacker may hit", () => {
    expect(() => resolveAttackTargets({ ...base, chosen: [e1, e2], targetIds: ["e1", "e2"] })).toThrow("Забагато цілей. Максимум: 1");
  });

  it("hits every enemy in reach with attackHitsAllEnemies", () => {
    const flags = { ...none, attackHitsAllEnemies: [{ kind: "flag" as const, flag: "attackHitsAllEnemies" as const }] };

    const r = resolveAttackTargets({ ...base, attack: ranged, chosen: [e1], flags });

    expect(r.targets.map((t) => t.basicInfo.id)).toEqual(["e1", "e2"]);
    expect(r.expanded).toBe(true);
  });

  it("uses the smallest multiTargetFalloff", () => {
    const flags = { ...none, multiTargetFalloff: [{ kind: "flag" as const, flag: "multiTargetFalloff" as const, percent: 50 }, { kind: "flag" as const, flag: "multiTargetFalloff" as const, percent: 30 }] };

    expect(resolveAttackTargets({ ...base, chosen: [e1], flags }).falloff).toBe(0.3);
  });

  it("chain shot keeps one chosen target, full damage first, exposes jumps and fraction", () => {
    const flags = { ...none, chainShot: [{ kind: "flag" as const, flag: "chainShot" as const, jumps: 2, percent: 50 }] };

    const r = resolveAttackTargets({ ...base, attack: ranged, chosen: [e1], flags });

    expect(r).toMatchObject({ targets: [e1], chain: { jumps: 2, percent: 0.5 }, volley: false });
    expect(() => resolveAttackTargets({ ...base, attack: ranged, chosen: [e1, e2], targetIds: ["e1", "e2"], flags })).toThrow("Максимум: 1");
  });
});
