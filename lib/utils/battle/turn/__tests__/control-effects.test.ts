import { describe, expect, it } from "vitest";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, resolved, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import type { Effect } from "@/lib/utils/abilities/schema";
import type { BattleSceneState } from "@/lib/utils/battle/store";
import { advanceTurn } from "@/lib/utils/battle/turn";
import { runAdvanceTurnLoop } from "@/lib/utils/battle/turn/run-advance-turn-loop";
import type { BattleParticipant } from "@/types/battle";

const claw = { id: "claw", name: "Кіготь", type: "melee", attackBonus: 20, damageDice: "1d6", damageType: "slashing", targetType: "single" } as unknown as BattleParticipant["battleData"]["attacks"][number];

const unitOf = (id: string, side: ParticipantSide, controlledBy = "dm"): BattleParticipant => {
  const p = makeParticipant({ id, side, hp: 40, maxHp: 40 });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT, controlledBy }, battleData: { ...p.battleData, attacks: [claw] } };
};

const caster = (): BattleParticipant => {
  const p = makeParticipant({ id: "mage", side: ParticipantSide.ALLY });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: "user-1" } };
};

function cast(effect: Effect, target: BattleParticipant, ps: BattleParticipant[] = [caster(), target]) {
  return applyEffect({
    participants: ps,
    ability: resolved({ trigger: { event: "action" }, effects: [effect] }),
    effectIndex: 0,
    ownerId: "mage",
    effect,
    targetIds: [target.basicInfo.id],
    event: { type: "action", actorId: "mage", abilityKey: "k" },
    ctx: { round: 1, rng: seq(0.5) },
  });
}

const scene: BattleSceneState = {
  id: "b1", campaignId: "c1", status: "active", round: 1, turnIndex: 0, version: 1,
  eventSeq: 0, pendingMoraleCheck: null, startedAt: null, completedAt: null,
};

describe("berserk", () => {
  const berserk: Effect = { kind: "berserk", damageBonusPercent: 50, duration: { rounds: 1 }, target: "eventTarget" };

  it("не діє на героїв", () => {
    const hero = makeParticipant({ id: "hero", side: ParticipantSide.ENEMY });

    const r = cast(berserk, hero);

    expect(r.participants.find((p) => p.basicInfo.id === "hero")?.battleData.activeEffects).toHaveLength(0);
    expect(r.messages[0]).toContain("не діє на героїв");
  });

  it("у свій хід шалений юніт б'є випадкову іншу істоту, зокрема союзника, і хід закінчується", () => {
    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const goblin = unitOf("gob", ParticipantSide.ENEMY);

    const raged = cast(berserk, ogre, [caster(), ogre, goblin]).participants;

    const order = [caster(), raged[1], goblin];

    const out = runAdvanceTurnLoop({
      initiativeOrder: order,
      currentTurnIndex: 0,
      currentRound: 1,
      battleId: "b1",
      currentBattleLogLength: 0,
      pendingSummons: [],
      // жертви: [mage, gob]; 0.99 -> gob, d20 = 20
      rng: seq(0.99, 0.99, 0.5),
    });

    const gob = out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "gob") as BattleParticipant;

    expect(gob.combatStats.currentHp).toBeLessThan(40);
    expect(out.newLogEntries.some((e) => e.resultText.includes("Шал"))).toBe(true);
    expect(out.nextTurnIndex).toBe(2);
  });

  it("шал з тривалістю 1 раунд спливає після цього ходу", () => {
    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const raged = cast(berserk, ogre).participants[1];

    const out = runAdvanceTurnLoop({
      initiativeOrder: [caster(), raged],
      currentTurnIndex: 0,
      currentRound: 1,
      battleId: "b1",
      currentBattleLogLength: 0,
      pendingSummons: [],
      rng: seq(0, 0.5),
    });

    expect(out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "ogre")?.battleData.activeEffects).toHaveLength(0);
  });
});

describe("charm", () => {
  const charm: Effect = { kind: "charm", duration: { rounds: 1 }, target: "eventTarget" };

  it("не діє на героїв", () => {
    const hero = makeParticipant({ id: "hero", side: ParticipantSide.ENEMY });

    const r = cast(charm, hero);

    expect(r.participants.find((p) => p.basicInfo.id === "hero")?.basicInfo.side).toBe(ParticipantSide.ENEMY);
    expect(r.messages[0]).toContain("не діє на героїв");
  });

  it("переводить юніта на бік заклинателя під контроль його гравця", () => {
    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const t = cast(charm, ogre).participants[1];

    expect(t.basicInfo).toMatchObject({ side: ParticipantSide.ALLY, controlledBy: "user-1" });
  });

  it("повертає сторону наприкінці ходу після спливання, а не на його початку", () => {
    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const mage = caster();

    const charmed = cast(charm, ogre, [mage, ogre]).participants[1];

    const afterMage = advanceTurn({ participants: [mage, charmed], pending: [], scene });

    const ogreTurn = afterMage.participants[1];

    expect(ogreTurn.basicInfo.side).toBe(ParticipantSide.ALLY);
    expect(ogreTurn.battleData.charmReturn).toMatchObject({ side: ParticipantSide.ENEMY, controlledBy: "dm" });

    const after = advanceTurn({ participants: afterMage.participants, pending: [], scene: { ...scene, turnIndex: 1 } });

    const back = after.participants[1];

    expect(back.basicInfo).toMatchObject({ side: ParticipantSide.ENEMY, controlledBy: "dm" });
    expect(back.battleData.charmReturn).toBeUndefined();
  });

  it("зачарований юніт, що помер, повертається на свій бік", async () => {
    const { resolveDowned } = await import("@/lib/utils/abilities/engine/run-abilities");

    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const charmed = cast(charm, ogre).participants[1];

    const dead = { ...charmed, combatStats: { ...charmed.combatStats, currentHp: 0, status: "unconscious" as const } };

    const out = resolveDowned([caster(), dead], { victimId: "ogre", actorId: null }, { round: 1, rng: seq(0.5) });

    expect(out.participants[1].basicInfo.side).toBe(ParticipantSide.ENEMY);
  });
});

describe("імунітет до станів", () => {
  const immune = (conditions: "all" | Array<"berserk" | "charm">) => {
    const p = unitOf("ogre", ParticipantSide.ENEMY);

    p.battleData.resolvedAbilities = [resolved({ trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "conditionImmunity", conditions }] })];

    return p;
  };

  it.each([
    ["berserk", { kind: "berserk", damageBonusPercent: 50, duration: { rounds: 1 } }],
    ["charm", { kind: "charm", duration: { rounds: 1 } }],
  ] as const)("%s не діє на імунну ціль (усі або свій ключ)", (key, effect) => {
    for (const conditions of ["all", [key]] as const) {
      const target = immune(conditions as never);

      const t = cast(effect as Effect, target).participants[1];

      expect(t.battleData.activeEffects).toHaveLength(0);
      expect(t.basicInfo.side).toBe(ParticipantSide.ENEMY);
    }
  });

  it("імунітет до іншого ключа не заважає", () => {
    const t = cast({ kind: "charm", duration: { rounds: 1 } }, immune(["berserk"])).participants[1];

    expect(t.basicInfo.side).toBe(ParticipantSide.ALLY);
  });
});

describe("автоматичний хід шалу", () => {
  const berserk: Effect = { kind: "berserk", damageBonusPercent: 50, duration: { rounds: 2 }, target: "eventTarget" };

  const withEffects = (extra: BattleParticipant["battleData"]["activeEffects"], abilities: BattleParticipant["battleData"]["resolvedAbilities"] = []) => {
    const ogre = unitOf("ogre", ParticipantSide.ENEMY);

    const raged = cast(berserk, ogre).participants[1];

    return { ...raged, battleData: { ...raged.battleData, resolvedAbilities: abilities, activeEffects: [...raged.battleData.activeEffects, ...extra] } };
  };

  const condition = (type: string, value = 1) => ({ id: type, name: type, type: "condition" as const, duration: 2, appliedAt: { round: 1, timestamp: new Date() }, effects: [{ type, value }] });

  const run = (ogre: BattleParticipant, rng = seq(0, 0.9)) => {
    const victim = unitOf("victim", ParticipantSide.ENEMY);

    const out = runAdvanceTurnLoop({ initiativeOrder: [caster(), ogre, victim], currentTurnIndex: 0, currentRound: 1, battleId: "b1", currentBattleLogLength: 0, pendingSummons: [], rng });

    return { out, victimHp: out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "victim")?.combatStats.currentHp as number };
  };

  it("заборона ближніх атак: шал нікого не б'є", () => {
    const { out, victimHp } = run(withEffects([condition("disable_melee_attacks")]), seq(0.99, 0.9));

    expect(victimHp).toBe(40);
    expect(out.newLogEntries.some((e) => e.resultText.includes("нікого не може атакувати"))).toBe(true);
  });

  it("втрата дії від skip_action: шал не б'є", () => {
    const { out, victimHp } = run(withEffects([condition("skip_action", 100)]), seq(0, 0.9));

    expect(victimHp).toBe(40);
    expect(out.newLogEntries.some((e) => e.resultText.includes("втрачає дію"))).toBe(true);
  });

  it("наприкінці автоходу спрацьовує turnEnd, записи лога мають stateBefore", () => {
    const focus = resolved({ trigger: { event: "turnEnd" }, effects: [{ kind: "changeMorale", delta: 1 }] });

    const { out } = run(withEffects([], [focus]), seq(0.99, 0.9));

    expect(out.updatedInitiativeOrder.find((p) => p.basicInfo.id === "ogre")?.combatStats.morale).toBe(1);
    expect(out.newLogEntries.every((e) => "stateBefore" in e)).toBe(true);
    expect(out.newLogEntries.some((e) => e.resultText.includes("Кінець ходу"))).toBe(true);
  });
});
