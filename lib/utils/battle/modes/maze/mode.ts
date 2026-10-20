import type { MapModeDefinition } from "../types";

import type { MazeConfig } from "@/types/battle";

export const mazeMode: MapModeDefinition<MazeConfig> = {
  key: "maze",
  configOf: (map) => map?.maze ?? null,
  withConfig: (map, maze) => ({ ...map, maze }),
  server: {},
  engine: {},
  client: {},
};
