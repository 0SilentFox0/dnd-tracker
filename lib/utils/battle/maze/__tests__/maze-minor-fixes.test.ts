import { describe, expect, it } from "vitest";

import { applyMazeMove } from "../movement";
import { scatterStarts } from "../scatter";
import { idleTurnIndex } from "../status";

import { CombatStatus, emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { placed } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { cellKey } from "@/lib/utils/battle/grid/geometry";
import { mulberry32 } from "@/lib/utils/battle/maze/rng";
import type { BattleParticipant, MazeConfig } from "@/types/battle";

const grid = (over: Partial<MazeConfig> = {}) => ({ cols: 6, rows: 6, maze: { ...emptyMaze(), exit: { x: 5, y: 0 }, ...over } });

const flag = (p: BattleParticipant, data: Partial<BattleParticipant["battleData"]>): BattleParticipant => ({ ...p, battleData: { ...p.battleData, ...data } });

describe("вихід лише для героїв", () => {
  it("ворог на виході не «вибирається», герой — так", () => {
    const enemy = placed("e", { at: { x: 4, y: 0 } });

    const out = applyMazeMove(grid(), { participants: [enemy], mover: enemy, to: { x: 5, y: 0 } });

    expect(out).toMatchObject({ escaped: false });
    expect("mover" in out && out.mover.battleData.escaped).toBeFalsy();

    const hero = placed("h", { side: ParticipantSide.ALLY, at: { x: 4, y: 0 } });

    expect(applyMazeMove(grid(), { participants: [hero], mover: hero, to: { x: 5, y: 0 } })).toMatchObject({ escaped: true });
  });
});

describe("idleTurnIndex — коли ніхто не ходить", () => {
  it("перший у грі, а не сплячий чи той, хто вибрався", () => {
    const sleeper = flag(placed("z"), { dormant: true });

    const out = flag(placed("o", { side: ParticipantSide.ALLY }), { escaped: true });

    const waking = flag(placed("w"), { mazeWakeRound: 9 });

    expect(idleTurnIndex([sleeper, out, waking])).toBe(2);
    expect(idleTurnIndex([sleeper, out])).toBe(0);
    expect(idleTurnIndex([{ ...sleeper, combatStats: { ...sleeper.combatStats, status: CombatStatus.DEAD } }, out])).toBe(1);
    expect(idleTurnIndex([])).toBe(0);
  });
});

describe("розкидання стартів", () => {
  it("герої не стають на телепорт (3×3: рівно 5 вільних крайніх клітинок)", () => {
    const g = { cols: 3, rows: 3, maze: { ...emptyMaze(), exit: { x: 2, y: 0 }, teleports: [[{ x: 0, y: 1 }, { x: 1, y: 2 }]] as MazeConfig["teleports"] } };

    for (let seed = 0; seed < 30; seed++) {
      const starts = scatterStarts(g, ["a", "b", "c", "d", "e"], mulberry32(seed));

      expect(starts).not.toBeNull();
      expect(Object.values(starts ?? {}).map(cellKey)).not.toContain("0:1");
      expect(Object.values(starts ?? {}).map(cellKey)).not.toContain("1:2");
    }
  });
});
