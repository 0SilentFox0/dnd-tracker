import type { FxArchetype, FxElement } from "./types";

export const SPELL_FX_OVERRIDES: Record<string, { archetype?: FxArchetype; element?: FxElement }> = {
  "Рій ос": { archetype: "swarm", element: "nature" },
  "Землетрус": { archetype: "quake", element: "earth" },
  "Телепортація": { archetype: "teleport", element: "arcane" },
};
