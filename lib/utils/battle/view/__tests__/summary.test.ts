import { describe, expect, it } from "vitest";

import { CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { createMockParticipant } from "@/lib/utils/battle/__tests__/fixtures/mock-participant";
import { summarizeBattle } from "@/lib/utils/battle/view/summary";
import type { BattleAction, BattleParticipant } from "@/types/battle";

function member(id: string, side: ParticipantSide, over: { sourceType?: "character" | "unit"; status?: BattleParticipant["combatStats"]["status"]; hp?: number } = {}): BattleParticipant {
  const base = createMockParticipant();

  return {
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, side, sourceType: over.sourceType ?? ParticipantSourceType.UNIT },
    combatStats: { ...base.combatStats, currentHp: over.hp ?? 10, status: over.status ?? CombatStatus.ACTIVE },
  };
}

const hero = member("hero", ParticipantSide.ALLY, { sourceType: "character" });

const buddy = member("buddy", ParticipantSide.ALLY, { sourceType: "character" });

const orc = member("orc", ParticipantSide.ENEMY, { status: CombatStatus.DEAD, hp: 0 });

function ev(actorId: string, hpChanges: Array<[string, number, number]>, over: Partial<BattleAction> = {}) {
  return {
    round: 1,
    actorId,
    actionDetails: {},
    hpChanges: hpChanges.map(([participantId, oldHp, newHp]) => ({ participantId, participantName: participantId, oldHp, newHp, change: oldHp - newHp })),
    ...over,
  };
}

describe("summarizeBattle", () => {
  it("рахує урон, лікування, вбивства і отриманий урон героїв", () => {
    const events = [
      ev("hero", [["orc", 10, 4]]),
      ev("hero", [["orc", 4, 0]]),
      ev("hero", [["buddy", 5, 9], ["hero", 6, 8]]),
      ev("orc", [["hero", 8, 3]]),
    ];

    const { heroes } = summarizeBattle(events, [hero, buddy, orc]);

    expect(heroes.find((h) => h.participantId === "hero")).toMatchObject({ damageDealt: 10, healingDone: 6, kills: 1, damageTaken: 5 });
    expect(heroes.find((h) => h.participantId === "buddy")).toMatchObject({ damageDealt: 0, healingDone: 0, kills: 0, damageTaken: 0 });
  });

  it("скасовані записи не враховуються", () => {
    const { heroes, rounds } = summarizeBattle([ev("hero", [["orc", 10, 0]], { isCancelled: true, round: 9 })], [hero, orc]);

    expect(heroes[0]).toMatchObject({ damageDealt: 0, kills: 0 });
    expect(rounds).toBe(0);
  });

  it("урон по своїх і по собі не йде в damageDealt, але йде в damageTaken", () => {
    const { heroes } = summarizeBattle([ev("hero", [["buddy", 10, 4], ["hero", 10, 7]])], [hero, buddy, orc]);

    expect(heroes[0]).toMatchObject({ damageDealt: 0, kills: 0, damageTaken: 3 });
    expect(heroes[1]).toMatchObject({ damageTaken: 6 });
  });

  it("у список потрапляють лише союзні герої; призвані юніти не приписуються героям", () => {
    const summon = member("wolf", ParticipantSide.ALLY);

    const { heroes } = summarizeBattle([ev("wolf", [["orc", 10, 0]])], [hero, summon, orc]);

    expect(heroes.map((h) => h.participantId)).toEqual(["hero"]);
    expect(heroes[0].damageDealt).toBe(0);
  });

  it("результат береться з останнього запису з battleResult, інакше з умов перемоги, інакше null", () => {
    const done = [ev("hero", [], { round: 2, actionDetails: { battleResult: "defeat" } }), ev("hero", [], { round: 3 })];

    expect(summarizeBattle(done, [hero, orc])).toMatchObject({ outcome: "defeat", rounds: 3 });
    expect(summarizeBattle([], [hero, orc]).outcome).toBe("victory");
    expect(summarizeBattle([], [hero, member("orc", ParticipantSide.ENEMY)]).outcome).toBeNull();
  });
});
