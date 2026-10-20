import { describe, expect, it } from "vitest";

import { inMazePlay, isMazeHero, takesTurn } from "../status";

import { CombatStatus, ParticipantSide } from "@/lib/constants/battle";
import { resolved } from "@/lib/utils/abilities/__tests__/fixtures";
import { isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { syncMapAuras } from "@/lib/utils/abilities/engine/effects/map-auras";
import { byId, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { occupiesCells } from "@/lib/utils/battle/grid/occupancy";
import { placeParticipants } from "@/lib/utils/battle/grid/placement";
import { turnQueue } from "@/lib/utils/battle/view";
import type { BattleParticipant } from "@/types/battle";

const flag = (p: BattleParticipant, data: Partial<BattleParticipant["battleData"]>): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...data } });

describe("takesTurn", () => {
  it("dormant, escaped, мертвий та рано прокинутий не ходять", () => {
    const p = placed("p");

    expect(takesTurn(p, 1)).toBe(true);
    expect(takesTurn(flag(p, { dormant: true }), 1)).toBe(false);
    expect(takesTurn(flag(p, { escaped: true }), 1)).toBe(false);
    expect(takesTurn({ ...p, combatStats: { ...p.combatStats, status: CombatStatus.DEAD } }, 1)).toBe(false);
    expect(takesTurn(flag(p, { mazeWakeRound: 3 }), 2)).toBe(false);
    expect(takesTurn(flag(p, { mazeWakeRound: 3 }), 3)).toBe(true);
  });

  it("inMazePlay і isMazeHero", () => {
    const h = placed("h", { side: ParticipantSide.ALLY, at: { x: 0, y: 0 } });

    expect(isMazeHero(h)).toBe(true);
    expect(isMazeHero(placed("h2", { side: ParticipantSide.ALLY }))).toBe(false);
    expect(isMazeHero(flag(h, { escaped: true }))).toBe(false);
    expect(inMazePlay(flag(h, { dormant: true }))).toBe(false);
  });
});

describe("escaped: поза полем", () => {
  it("не займає клітинки й не є ціллю", () => {
    const e = flag(placed("e", { at: { x: 1, y: 1 } }), { escaped: true });

    expect(occupiesCells(e)).toBe(false);
    expect(isTargetable(e)).toBe(false);
  });
});

describe("placeParticipants у лабіринті", () => {
  it("2x2 ворог стає 1x1; без лабіринту без змін", () => {
    const maze = { walls: [], exit: null, difficulty: "medium" as const, teleports: [], fog: [], marks: {}, dark: false };

    const inMaze = placeParticipants(testMap(10, 10, { maze }), [placed("big", { size: 2 })]);

    expect(byId(inMaze, "big").combatStats.gridSize).toBe(1);

    const plain = placeParticipants(testMap(10, 10), [placed("big", { size: 2 })]);

    expect(byId(plain, "big").combatStats.gridSize).toBe(2);
  });
});

describe("аури й черга", () => {
  const fear = resolved({ trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: -2, target: "nearbyEnemies" }] }, { id: "fear" });

  it("аура сплячого не накладається на героя поруч", () => {
    const owner = placed("n", { at: { x: 5, y: 5 }, abilities: [fear] });

    const h = placed("h", { side: ParticipantSide.ALLY, at: { x: 6, y: 5 } });

    const awake = syncMapAuras([owner, h], testMap(12));

    expect(awake[1].battleData.activeEffects.length).toBeGreaterThan(0);

    const asleep = syncMapAuras([flag(owner, { dormant: true }), h], testMap(12));

    expect(asleep[1].battleData.activeEffects).toHaveLength(0);
  });

  it("turnQueue без сплячих і тих, що вийшли", () => {
    const order = [placed("a"), flag(placed("b"), { dormant: true }), flag(placed("c"), { escaped: true }), placed("d")];

    const ids = turnQueue(order, 0, 1).flatMap((e) => (e.kind === "round" ? [] : [e.participant.basicInfo.id]));

    expect(ids).toEqual(["a", "d", "a", "d"]);
  });
});
