import { describe, expect, it } from "vitest";

import { mazeAwareness, withMazeAwareness } from "../awareness";
import { mazeGrid, mazeMap } from "./fixtures";

import { BattleStatus, ParticipantSide } from "@/lib/constants/battle";
import { byId, placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { eventTextOf } from "@/lib/utils/battle/log/__tests__/event-text";
import type { BattleParticipant, Direction8, GridPoint, MazeConfig } from "@/types/battle";

const grid = (over: Partial<MazeConfig> = {}) => mazeGrid({ exit: { x: 9, y: 9 }, ...over }, 10);

const hero = (at: GridPoint, facing: Direction8 = "e", id = "h"): BattleParticipant => {
  const p = placed(id, { side: ParticipantSide.ALLY, at });

  return { ...p, basicInfo: { ...p.basicInfo, name: "Герой" }, battleData: { ...p.battleData, facing } };
};

const sleeper = (at: GridPoint, id = "e", dormant = true): BattleParticipant => {
  const p = placed(id, { at });

  return { ...p, basicInfo: { ...p.basicInfo, name: "Орк" }, battleData: { ...p.battleData, dormant } };
};

describe("mazeAwareness", () => {
  it("сплячий у конусі героя прокидається з наступного кола й записом", () => {
    const out = mazeAwareness(grid(), { participants: [hero({ x: 1, y: 1 }), sleeper({ x: 4, y: 1 })], round: 2, sleep: false });

    expect(byId(out.participants, "e").battleData).toMatchObject({ dormant: false, mazeWakeRound: 3 });
    expect(out.events.map((e) => eventTextOf(e))).toEqual(["Герой помітив Орк"]);
  });

  it("за стіною й у тумані на відстані 2 — спить", () => {
    const walled = mazeAwareness(grid({ walls: ["2:1:e"] }), { participants: [hero({ x: 1, y: 1 }), sleeper({ x: 4, y: 1 })], round: 1, sleep: false });

    expect(byId(walled.participants, "e").battleData.dormant).toBe(true);
    expect(walled.events).toEqual([]);

    const fogged = mazeAwareness(grid({ fog: ["3:1"] }), { participants: [hero({ x: 1, y: 1 }), sleeper({ x: 3, y: 1 })], round: 1, sleep: false });

    expect(byId(fogged.participants, "e").battleData.dormant).toBe(true);
  });

  it("sleep: невидимий активний засинає, видимий лишається; зникли всі — запис", () => {
    const seen = sleeper({ x: 3, y: 1 }, "a", false);

    const hidden = sleeper({ x: 8, y: 8 }, "b", false);

    const out = mazeAwareness(grid(), { participants: [hero({ x: 1, y: 1 }), seen, hidden], round: 1, sleep: true });

    expect(byId(out.participants, "a").battleData.dormant).toBe(false);
    expect(byId(out.participants, "b").battleData.dormant).toBe(true);
    expect(out.events).toEqual([]);

    const gone = mazeAwareness(grid(), { participants: [hero({ x: 1, y: 1 }), hidden], round: 1, sleep: true });

    expect(byId(gone.participants, "b").battleData.dormant).toBe(true);
    expect(gone.events.map((e) => eventTextOf(e))).toEqual(["Вороги зникли в лабіринті"]);
  });

  it("withMazeAwareness: без виходу чи не в активному бою — без змін", () => {
    const participants = [hero({ x: 1, y: 1 }), sleeper({ x: 4, y: 1 })];

    const result = { participants, pending: [], events: [] };

    const noExit = mazeMap({}, 10);

    expect(withMazeAwareness(noExit, { status: BattleStatus.ACTIVE, round: 1 }, result)).toBe(result);

    const ready = mazeMap({ exit: { x: 9, y: 9 } }, 10);

    expect(withMazeAwareness(ready, { status: BattleStatus.PREPARED, round: 1 }, result)).toBe(result);
    expect(withMazeAwareness(testMap(), { status: BattleStatus.ACTIVE, round: 1 }, result)).toBe(result);

    const woke = withMazeAwareness(ready, { status: BattleStatus.ACTIVE, round: 1 }, result);

    expect(byId(woke.participants, "e").battleData.dormant).toBe(false);
    expect(woke.events).toHaveLength(1);
  });
});
