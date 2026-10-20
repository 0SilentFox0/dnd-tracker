import { describe, expect, it } from "vitest";

import { ParticipantSide } from "@/lib/constants/battle";
import { makeParticipant, resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { statWithModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { zoneCandidates } from "@/lib/utils/abilities/engine/effects/area-aura";
import type { BattleParticipant } from "@/types/battle";

const hero = { type: "skill" as const, id: "banner" };

const allyAura = resolved({ id: "allies-attack", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: 2, target: "allAllies" }] }, hero);

const enemyAura = resolved({ id: "enemies-attack", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "attackBonus", flat: -1, target: "allEnemies" }] }, hero);

const flagged = (p: BattleParticipant, data: Partial<BattleParticipant["battleData"]>): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...data } });

describe("лабіринт: аури сторони", () => {
  const leader = makeParticipant({ id: "lead", side: ParticipantSide.ALLY, abilities: [allyAura, enemyAura] });

  const friend = makeParticipant({ id: "friend", side: ParticipantSide.ALLY });

  const gone = flagged(makeParticipant({ id: "gone", side: ParticipantSide.ALLY }), { escaped: true });

  const foe = makeParticipant({ id: "foe", side: ParticipantSide.ENEMY });

  const sleeper = flagged(makeParticipant({ id: "zzz", side: ParticipantSide.ENEMY }), { dormant: true });

  const ps = [leader, friend, gone, foe, sleeper];

  it("аура «усі союзники» діє на героя в лабіринті, але не на того, хто вийшов", () => {
    expect(statWithModifiers(ps, "friend", "attackBonus", 5)).toBe(7);
    expect(statWithModifiers(ps, "gone", "attackBonus", 5)).toBe(5);
  });

  it("вибулий герой не дає аури союзникам", () => {
    const escapedLeader = flagged(leader, { escaped: true });

    expect(statWithModifiers([escapedLeader, friend, foe], "friend", "attackBonus", 5)).toBe(5);
    expect(statWithModifiers([escapedLeader, friend, foe], "foe", "attackBonus", 5)).toBe(5);
  });

  it("аура «усі вороги» не зачіпає сплячого ворога", () => {
    expect(statWithModifiers(ps, "foe", "attackBonus", 5)).toBe(4);
    expect(statWithModifiers(ps, "zzz", "attackBonus", 5)).toBe(5);
  });

  it("зона аури не охоплює вибулих і сплячих", () => {
    expect(zoneCandidates(ps, leader, "nearbyAllies").map((p) => p.basicInfo.id)).toEqual(["lead", "friend"]);
    expect(zoneCandidates(ps, leader, "nearbyEnemies").map((p) => p.basicInfo.id)).toEqual(["foe"]);
  });
});
