import type { MapModeDefinition } from "./types";

export const NORMAL_MODE: MapModeDefinition<null> = {
  key: "normal",
  configOf: () => null,
  withConfig: (map) => map,
  server: {},
  engine: {},
  client: {},
};
