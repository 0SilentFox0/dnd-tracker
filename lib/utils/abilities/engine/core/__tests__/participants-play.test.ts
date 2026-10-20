import { describe, expect, it } from "vitest";

import { CombatStatus } from "@/lib/constants/battle";
import { inPlay, isTargetable, sitsOutTurn, takesTurn } from "@/lib/utils/abilities/engine/core/participants";
import type { BattleParticipant } from "@/types/battle";

const p = (battleData: Partial<BattleParticipant["battleData"]>, status: string = CombatStatus.ACTIVE) =>
  ({ basicInfo: { id: "a" }, combatStats: { status }, battleData }) as unknown as BattleParticipant;

describe("спільні предикати режиму", () => {
  it("inPlay: живий, не спить, не вибув", () => {
    expect(inPlay(p({}))).toBe(true);
    expect(inPlay(p({ dormant: true }))).toBe(false);
    expect(inPlay(p({ escaped: true }))).toBe(false);
    expect(inPlay(p({}, CombatStatus.DEAD))).toBe(false);
  });

  it("isTargetable не виключає сплячого (його можна вдарити)", () => {
    expect(isTargetable(p({ dormant: true }))).toBe(true);
  });

  it("sitsOutTurn: спить, вибув або ще не прокинувся", () => {
    expect(sitsOutTurn(p({}), 1)).toBe(false);
    expect(sitsOutTurn(p({ dormant: true }), 1)).toBe(true);
    expect(sitsOutTurn(p({ escaped: true }), 1)).toBe(true);
    expect(sitsOutTurn(p({ mazeWakeRound: 3 }), 2)).toBe(true);
    expect(sitsOutTurn(p({ mazeWakeRound: 3 }), 3)).toBe(false);
  });

  it("takesTurn = активний і не пропускає", () => {
    expect(takesTurn(p({}), 1)).toBe(true);
    expect(takesTurn(p({}, CombatStatus.DEAD), 1)).toBe(false);
  });
});
