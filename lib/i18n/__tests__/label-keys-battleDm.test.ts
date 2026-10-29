import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import { MAZE_DIFFICULTIES, MAZE_MARK_SYMBOLS } from "@/lib/constants/battle";

const RESHUFFLE_MODES = ["walls", "scatter", "tunnel"];

describe("battleDm has translations", () => {
  expectLabelKeys("battleDm", "maze.tools", ["walls", "exit", "teleport", "fog"]);
  expectLabelKeys("battleDm", "maze.hints", ["walls", "exit", "teleport", "fog", "placeUnit", "awaitingExit"]);
  expectLabelKeys("battleDm", "maze.marks", MAZE_MARK_SYMBOLS);
  expectLabelKeys("battleDm", "maze.difficulty", MAZE_DIFFICULTIES);
  expectLabelKeys("battleDm", "maze.reshuffle.modes", RESHUFFLE_MODES);
  expectLabelKeys("battleDm", "maze.reshuffle.descriptions", RESHUFFLE_MODES);
});
