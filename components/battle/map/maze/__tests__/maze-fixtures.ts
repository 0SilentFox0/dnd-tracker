import { emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { placed, testMap } from "@/lib/utils/battle/__tests__/fixtures/placed";
import { deriveMazeView } from "@/lib/utils/battle/view";
import type { BattleMapConfig, BattleParticipant, BattleParticipantBattleData, Direction8, GridPoint, MazeConfig } from "@/types/battle";

export class RO {
  constructor(private cb: (entries: { contentRect: { width: number; height: number } }[]) => void) {}
  observe() {
    this.cb([{ contentRect: RO.size }]);
  }
  disconnect() {}
  unobserve() {}
  static size = { width: 800, height: 600 };
}

export function hero(id: string, at: GridPoint, facing: Direction8 = "e", user = "u"): BattleParticipant {
  const p = placed(id, { side: ParticipantSide.ALLY, at });

  return { ...p, basicInfo: { ...p.basicInfo, controlledBy: user }, battleData: { ...p.battleData, facing } };
}

export const enemy = (id: string, at: GridPoint, data: Partial<BattleParticipantBattleData> = {}): BattleParticipant => {
  const p = placed(id, { at });

  return { ...p, battleData: { ...p.battleData, ...data } };
};

export const mazeMap = (maze: Partial<MazeConfig> = {}, cols = 8, rows = 6): BattleMapConfig => testMap(cols, rows, { maze: { ...emptyMaze(), ...maze } });

export const viewOf = (map: BattleMapConfig, participants: BattleParticipant[], role: "dm" | "player") =>
  deriveMazeView({ map, participants, userId: role === "dm" ? "dm" : "u", isDM: role === "dm" });
