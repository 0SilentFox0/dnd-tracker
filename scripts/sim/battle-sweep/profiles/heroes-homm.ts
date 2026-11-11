import type { SweepProfile } from "./types";

export const HEROES_HOMM_PROFILE: SweepProfile = {
  key: "heroes-homm",
  judge: "client",
  source: { kind: "campaign", name: "HOMM5" },
  modes: ["sweep", "targeted", "control", "level5", "aura", "reserve", "map", "maze"],
  maxBattles: Infinity,
  unitsPerBattle: 7,
  heroCount: 8,
  heroLevel: 9,
};
