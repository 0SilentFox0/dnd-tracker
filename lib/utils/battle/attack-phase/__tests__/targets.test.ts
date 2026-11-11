import { describe, expect, it } from "vitest";

import { resolveAttackTargets } from "../targets";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { CLAWS, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { REJECT } from "@/lib/utils/battle/store/reject";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { WFRP_RULES } from "@/systems/wfrp/rules/rules-preset";

const none = { attackHitsAllEnemies: [], piercingShot: [], multiTargetFalloff: [], chainShot: [] };

const ranged = { ...CLAWS, type: AttackType.RANGED };

describe("resolveAttackTargets", () => {
  const a = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 } });

  const e1 = placed("e1", { at: { x: 3, y: 5 } });

  const e2 = placed("e2", { at: { x: 5, y: 5 } });

  const order = [a, e1, e2];

  const base = { order, attacker: a, attack: CLAWS, targetIds: ["e1"], map: testMap(), flags: none };

  it("keeps the chosen target for a normal attack", () => {
    expect(resolveAttackTargets({ rules: DEFAULT_RULES, ...base, chosen: [e1] })).toMatchObject({ targets: [e1], expanded: false, volley: false, falloff: 1 });
  });

  it("rejects more targets than the attacker may hit", () => {
    expect(() => resolveAttackTargets({ rules: DEFAULT_RULES, ...base, chosen: [e1, e2], targetIds: ["e1", "e2"] })).toThrow(REJECT.tooManyTargets);
  });

  it("hits every enemy in reach with attackHitsAllEnemies", () => {
    const flags = { ...none, attackHitsAllEnemies: [{ kind: "flag" as const, flag: "attackHitsAllEnemies" as const }] };

    const r = resolveAttackTargets({ rules: DEFAULT_RULES, ...base, attack: ranged, chosen: [e1], flags });

    expect(r.targets.map((t) => t.basicInfo.id)).toEqual(["e1", "e2"]);
    expect(r.expanded).toBe(true);
  });

  it("uses the smallest multiTargetFalloff", () => {
    const flags = { ...none, multiTargetFalloff: [{ kind: "flag" as const, flag: "multiTargetFalloff" as const, percent: 50 }, { kind: "flag" as const, flag: "multiTargetFalloff" as const, percent: 30 }] };

    expect(resolveAttackTargets({ rules: DEFAULT_RULES, ...base, chosen: [e1], flags }).falloff).toBe(0.3);
  });

  it("chain shot keeps one chosen target, full damage first, exposes jumps and fraction", () => {
    const flags = { ...none, chainShot: [{ kind: "flag" as const, flag: "chainShot" as const, jumps: 2, percent: 50 }] };

    const r = resolveAttackTargets({ rules: DEFAULT_RULES, ...base, attack: ranged, chosen: [e1], flags });

    expect(r).toMatchObject({ targets: [e1], chain: { jumps: 2, percent: 0.5 }, volley: false });
    expect(() => resolveAttackTargets({ rules: DEFAULT_RULES, ...base, attack: ranged, chosen: [e1, e2], targetIds: ["e1", "e2"], flags })).toThrow(REJECT.tooManyTargets);
  });
});

describe("resolveAttackTargets: герой, що вмирає", () => {
  const attacker = placed("e", { side: ParticipantSide.ENEMY, at: { x: 1, y: 5 } });

  const downed = (deathSaves?: { successes: number; failures: number; stable: boolean }) => {
    const p = placed("h", { side: ParticipantSide.ALLY, at: { x: 2, y: 5 } });

    return { ...p, combatStats: { ...p.combatStats, currentHp: 0, status: "unconscious" as const }, battleData: { ...p.battleData, deathSaves } };
  };

  const flags = { ...none, attackHitsAllEnemies: [{ kind: "flag" as const, flag: "attackHitsAllEnemies" as const }] };

  it("потрапляє в досяжних ворогів", () => {
    const h = downed({ successes: 0, failures: 0, stable: false });

    const r = resolveAttackTargets({ rules: DEFAULT_RULES, order: [attacker, h], attacker, attack: { ...CLAWS, type: AttackType.RANGED }, chosen: [h], targetIds: ["h"], map: testMap(), flags });

    expect(r.targets).toEqual([h]);
  });

  it("без кидків смерті (HOMM) не вважається ціллю", () => {
    const h = downed();

    expect(() => resolveAttackTargets({ rules: DEFAULT_RULES, order: [attacker, h], attacker, attack: { ...CLAWS, type: AttackType.RANGED }, chosen: [], targetIds: [], map: testMap(), flags })).toThrow(REJECT.noEnemyInReach);
  });
});

describe("resolveAttackTargets: Blast", () => {
  const a = placed("a", { side: ParticipantSide.ALLY, at: { x: 0, y: 5 } });

  const centre = placed("c", { at: { x: 5, y: 5 } });

  const near = placed("n", { at: { x: 6, y: 6 } });

  const far = placed("f", { at: { x: 9, y: 5 } });

  const friend = placed("fr", { side: ParticipantSide.ALLY, at: { x: 5, y: 6 } });

  const bomb = { ...CLAWS, type: AttackType.RANGED, targetType: "aoe" as const, maxTargets: 8, blastRadius: 2 };

  const input = { rules: WFRP_RULES, order: [a, centre, near, far, friend], attacker: a, attack: bomb, chosen: [centre], targetIds: ["c"], map: testMap(), flags: none };

  it("hits everyone within the radius of the chosen target, allies included, never the attacker", () => {
    const r = resolveAttackTargets(input);

    expect(r.targets.map((t) => t.basicInfo.id)).toEqual(["c", "n", "fr"]);
    expect(r.serverRolledFrom).toBe(1);
  });

  it("a larger radius reaches farther enemies", () => {
    const r = resolveAttackTargets({ ...input, attack: { ...bomb, blastRadius: 4 } });

    expect(r.targets.map((t) => t.basicInfo.id)).toEqual(["c", "n", "fr", "f"]);
  });

  it("on the map only one target is chosen", () => {
    expect(() => resolveAttackTargets({ ...input, chosen: [centre, near], targetIds: ["c", "n"] })).toThrow(REJECT.tooManyTargets);
  });

  it("without a map keeps the 4·X stub: chosen targets as picked", () => {
    const r = resolveAttackTargets({ ...input, map: null, chosen: [centre, far], targetIds: ["c", "f"] });

    expect(r.targets.map((t) => t.basicInfo.id)).toEqual(["c", "f"]);
  });
});
