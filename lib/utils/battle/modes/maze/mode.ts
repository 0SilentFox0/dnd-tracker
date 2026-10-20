import type { MapModeDefinition } from "../types";
import { withMazeAwareness } from "./awareness";
import { placeMazeParticipants } from "./movement";
import { mazePlacementError, placeInMaze } from "./placement";
import { startMaze } from "./start";

import { ParticipantSide } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { MazeConfig } from "@/types/battle";

export const mazeMode: MapModeDefinition<MazeConfig> = {
  key: "maze",
  configOf: (map) => map?.maze ?? null,
  withConfig: (map, maze) => ({ ...map, maze }),
  server: {
    onStart: ({ map, order }) => startMaze(map, order),
    afterMutation: ({ map, scene, result }) => withMazeAwareness(map, scene, result),
    blockedText: (maze) => (maze.dark ? MAZE_TEXTS.dark : null),
    autoSkipText: (maze) => (maze.dark ? MAZE_TEXTS.darkSkip : null),
    placeAll: ({ map, config, participants }) => placeMazeParticipants({ ...map, maze: config }, participants),
    placeOne: ({ map, config, participants, mover, to }) => {
      const grid = { ...map, maze: config };

      const error = mazePlacementError(grid, { participants, mover, to });

      if (error) throw new BattleRuleError("action_rejected", error);

      return placeInMaze(grid, mover, to);
    },
    onEnter: ({ participant }) =>
      participant.basicInfo.side === ParticipantSide.ENEMY ? { ...participant, battleData: { ...participant.battleData, dormant: true } } : participant,
    onReset: (maze) => ({ ...maze, marks: {}, dark: false, moved: false }),
    patchableFields: ["facing"],
  },
  engine: {},
  client: {},
};
