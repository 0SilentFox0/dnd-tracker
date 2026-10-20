import type { MapModeDefinition } from "../types";
import { withMazeAwareness } from "./awareness";
import { mazeChange } from "./delta";
import { mazeGridOf } from "./grid";
import { mazeMoveZone } from "./move-zone";
import { placeMazeParticipants } from "./movement";
import { mazePlacementError, placeInMaze } from "./placement";
import { mazeAimHidden, mazeTargetHidden, meleeWallBetween, seesTarget } from "./sight";
import { startMaze } from "./start";
import { mazeFxVisible, mazeLogVisible } from "./view";

import { emptyMaze, ParticipantSide } from "@/lib/constants/battle";
import { MAZE_TEXTS } from "@/lib/constants/maze-texts";
import { inPlay } from "@/lib/utils/abilities/engine/core/participants";
import { BattleRuleError } from "@/lib/utils/battle/store/errors";
import type { BattleMapConfig, MazeConfig } from "@/types/battle";

// хуки рушія викликаються лише для карти з лабіринтом
const gridOf = (map: BattleMapConfig) => mazeGridOf(map)!;

export const mazeMode: MapModeDefinition<MazeConfig> = {
  key: "maze",
  configOf: (map) => map?.maze ?? null,
  withConfig: (map, maze) => ({ ...map, maze }),
  emptyConfig: () => emptyMaze(),
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
  engine: {
    sees: ({ map, viewer, target }) => seesTarget(gridOf(map), viewer, target),
    aimHiddenText: ({ map, caster, cell }) => (mazeAimHidden(map, caster, cell) ? MAZE_TEXTS.aimOutOfSight : null),
    targetHiddenText: ({ map, caster, targets }) => (mazeTargetHidden(map, caster, targets) ? MAZE_TEXTS.targetOutOfSight : null),
    meleeBlockedText: ({ map, attacker, target }) => (meleeWallBetween(gridOf(map), attacker, target) ? MAZE_TEXTS.wallBetween : null),
    engages: ({ map, attacker, neighbour }) => inPlay(neighbour) && !meleeWallBetween(gridOf(map), attacker, neighbour),
    moveZone: mazeMoveZone,
  },
  client: {
    deltaOf: mazeChange,
    mergeDelta: (cached, patch) => ({ ...cached, ...patch }),
    logVisible: mazeLogVisible,
    fxVisible: mazeFxVisible,
  },
};
