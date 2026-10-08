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
