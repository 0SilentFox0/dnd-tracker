import { describe, expect, it } from "vitest";

import { AttackType, ParticipantSide } from "@/lib/constants/battle";
import { seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { CLAWS, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { forcedRollMode, rollModeReasons } from "@/lib/utils/battle/attack/bonus";
import { processAttack } from "@/lib/utils/battle/attack/process";
import { requestedTargetIds, validateAttackRequest } from "@/lib/utils/battle/attack-phase/request";
import { applyCondition5e, type Condition5eKey } from "@/lib/utils/battle/conditions";
import { resolveSpellTargets } from "@/lib/utils/battle/spell/spell-targeting";
import { REJECT } from "@/lib/utils/battle/store/reject";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

const bow: BattleAttack = { ...CLAWS, id: "bow", type: AttackType.RANGED };

const withCondition = (ps: BattleParticipant[], id: string, key: Condition5eKey, sourceId = "src"): BattleParticipant[] =>
  applyCondition5e(ps, id, {
    key,
    rounds: 5,
    source: { participantId: sourceId, abilityId: "x", abilityName: "X" } as never,
    sourceName: "X",
    timedKey: `t-${key}`,
    round: 1,
  }).participants;

const ally = (at?: { x: number; y: number }) => placed("a", { side: ParticipantSide.ALLY, at });

const foe = (at?: { x: number; y: number }) => placed("e", { at });

const reasons = (ps: BattleParticipant[], attack: BattleAttack, withTarget = true) =>
  rollModeReasons(ps.find((p) => p.basicInfo.id === "a") as BattleParticipant, attack, ps, withTarget ? { targetId: "e" } : {});

describe("5e стани в кидку атаки", () => {
  it("повалена ціль: суміжна ближня — перевага, дальня здалеку — недолік", () => {
    const ps = withCondition([ally({ x: 1, y: 1 }), foe({ x: 2, y: 1 })], "e", "prone");

    expect(reasons(ps, CLAWS).advantage).toContain("Повалений");
    expect(reasons(ps, CLAWS).disadvantage).not.toContain("Повалений");

    const far = withCondition([ally({ x: 0, y: 0 }), foe({ x: 6, y: 6 })], "e", "prone");

    expect(reasons(far, bow).disadvantage).toContain("Повалений");
    expect(reasons(far, bow).advantage).not.toContain("Повалений");
  });

  it("без мапи: ближня — перевага, дальня — недолік", () => {
    const ps = withCondition([ally(), foe()], "e", "prone");

    expect(reasons(ps, CLAWS).advantage).toContain("Повалений");
    expect(reasons(ps, bow).disadvantage).toContain("Повалений");
  });

  it("отруєний атакувальник — недолік; невидимий — перевага; невидима ціль — недолік", () => {
    expect(reasons(withCondition([ally(), foe()], "a", "poisoned"), CLAWS).disadvantage).toContain("Отруєний");
    expect(reasons(withCondition([ally(), foe()], "a", "invisible"), CLAWS).advantage).toContain("Невидимий");
    expect(reasons(withCondition([ally(), foe()], "e", "invisible"), CLAWS).disadvantage).toContain("Невидимий");
  });

  it("перевага + недолік скасовуються: normal", () => {
    const ps = withCondition(withCondition([ally(), foe()], "a", "invisible"), "e", "invisible");

    expect(forcedRollMode(reasons(ps, CLAWS))).toEqual({ mode: "normal", forced: true });
  });

  it("наляканий: недолік, поки джерело живе", () => {
    const src = placed("src", { at: { x: 5, y: 5 } });

    const ps = withCondition([ally(), foe(), src], "a", "frightened");

    expect(reasons(ps, CLAWS).disadvantage).toContain("Наляканий");

    const dead = ps.map((p) => (p.basicInfo.id === "src" ? { ...p, combatStats: { ...p.combatStats, status: "dead" } } : p)) as BattleParticipant[];

    expect(reasons(dead, CLAWS).disadvantage).not.toContain("Наляканий");
  });

  it("регрес: без станів порожні масиви", () => {
    expect(reasons([ally(), foe()], CLAWS)).toEqual({ advantage: [], disadvantage: [] });
  });
});

describe("крит з 5 фт", () => {
  const strike = (ps: BattleParticipant[], attack: BattleAttack) =>
    processAttack({
      attacker: ps[0],
      target: ps[1],
      attack,
      d20Roll: 15,
      damageRolls: [4],
      allParticipants: ps,
      currentRound: 1,
      battleId: "b",
      rng: seq(0.5),
      map: testMap(),
    });

  it("паралізована ціль: суміжне влучання — крит", () => {
    const ps = withCondition([ally({ x: 1, y: 1 }), foe({ x: 2, y: 1 })], "e", "paralyzed");

    expect(strike(ps, CLAWS).attackRoll.isCritical).toBe(true);
  });

  it("несуміжна дальня атака — не крит", () => {
    const ps = withCondition([ally({ x: 0, y: 0 }), foe({ x: 6, y: 6 })], "e", "paralyzed");

    expect(strike(ps, bow).attackRoll.isCritical).toBe(false);
  });
});

describe("зачарований", () => {
  const scope = (ps: BattleParticipant[]) =>
    ({ participants: ps, scene: { turnIndex: 0 }, isDM: true, userId: "u" }) as unknown as Parameters<typeof validateAttackRequest>[0];

  it("validateAttackRequest не дозволяє атакувати зачаровувача", () => {
    const ps = withCondition([ally(), foe(), placed("other")], "a", "charmed", "e");

    expect(requestedTargetIds({ targetId: "e" })).toEqual(["e"]);
    expect(() => validateAttackRequest(scope(ps), { attackerId: "a", targetId: "e", d20Roll: 10, damageRolls: [1] })).toThrow(REJECT.charmedTarget);
  });

  it("ворожі заклинання: джерело викидається, інша ціль ок", () => {
    const ps = withCondition([ally(), foe(), placed("other")], "a", "charmed", "e");

    const caster = ps[0];

    const spell = { id: "s", groupId: null, level: 1 };

    expect(resolveSpellTargets(ps, caster, spell, { kind: "enemy" } as never, ["e"])).toMatchObject({ ok: false });
    expect(resolveSpellTargets(ps, caster, spell, { kind: "enemy" } as never, ["other"])).toMatchObject({ ok: true, targetIds: ["other"] });
    expect(resolveSpellTargets(ps, caster, spell, { kind: "allEnemies" }, [])).toMatchObject({ ok: true, targetIds: ["other"] });
  });
});
