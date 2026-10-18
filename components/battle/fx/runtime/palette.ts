import type { SHEETS } from "./sprites";

import type { FxElement } from "@/lib/utils/battle/fx";

export interface FxPalette {
  core: string;
  tints: string[];
  sprite?: keyof typeof SHEETS;
  filter?: string;
}

export const PALETTE: Record<FxElement, FxPalette> = {
  fire: { core: "#ff7a1a", tints: ["#fff3b0", "#ffd25a", "#ff8a1f", "#ff4a00"], sprite: "explosion" },
  cold: { core: "#6fd3ff", tints: ["#ffffff", "#c8f1ff", "#6fd3ff", "#2a8bd6"], sprite: "rings", filter: "hue-rotate(0deg)" },
  lightning: { core: "#9fd8ff", tints: ["#ffffff", "#fff6a8", "#9fd8ff"], sprite: "lightning" },
  poison: { core: "#8fe04a", tints: ["#e8ffb0", "#8fe04a", "#4a9a1a"] },
  necrotic: { core: "#9b3dff", tints: ["#f3d0ff", "#b04dff", "#8a2be2"], sprite: "darkBolt" },
  radiant: { core: "#ffd86b", tints: ["#ffffff", "#fff1b8", "#ffd86b"] },
  arcane: { core: "#c27aff", tints: ["#ffffff", "#e3c6ff", "#c27aff", "#7a3dff"] },
  physical: { core: "#ffe7a8", tints: ["#ffffff", "#e3eeff", "#ffe7a8"], sprite: "spark", filter: "hue-rotate(170deg) saturate(.5) brightness(1.7)" },
  nature: { core: "#6dff8a", tints: ["#ffffff", "#c8ffd0", "#7dff98", "#3fd46a"], sprite: "rings", filter: "hue-rotate(-75deg) brightness(1.2)" },
};
