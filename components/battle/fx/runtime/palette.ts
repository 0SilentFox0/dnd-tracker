import type { SHEETS } from "./sprites";

import type { FxElement } from "@/lib/utils/battle/fx";

export interface FxPalette {
  core: string;
  tints: string[];
  /** The second tint: rings, pillars and glyphs use it so they read lighter than the core. */
  accent: string;
  sprite?: keyof typeof SHEETS;
  filter?: string;
}

const BASE: Record<FxElement, Omit<FxPalette, "accent">> = {
  fire: { core: "#ff7a1a", tints: ["#fff3b0", "#ffd25a", "#ff8a1f", "#ff4a00"], sprite: "explosion" },
  cold: { core: "#6fd3ff", tints: ["#ffffff", "#c8f1ff", "#6fd3ff", "#2a8bd6"], sprite: "rings" },
  lightning: { core: "#9fd8ff", tints: ["#ffffff", "#fff6a8", "#9fd8ff"], sprite: "lightning" },
  poison: { core: "#8fe04a", tints: ["#e8ffb0", "#8fe04a", "#4a9a1a"] },
  necrotic: { core: "#9b3dff", tints: ["#f3d0ff", "#b04dff", "#8a2be2"], sprite: "darkBolt" },
  radiant: { core: "#ffd86b", tints: ["#ffffff", "#fff1b8", "#ffd86b"] },
  arcane: { core: "#c27aff", tints: ["#ffffff", "#e3c6ff", "#c27aff", "#7a3dff"] },
  physical: { core: "#ffe7a8", tints: ["#ffffff", "#e3eeff", "#ffe7a8"], sprite: "spark", filter: "hue-rotate(170deg) saturate(.5) brightness(1.7)" },
  nature: { core: "#6dff8a", tints: ["#ffffff", "#c8ffd0", "#7dff98", "#3fd46a"], sprite: "rings", filter: "hue-rotate(-75deg) brightness(1.2)" },
  earth: { core: "#b08850", tints: ["#e8d3a8", "#c8a26a", "#8a6234", "#5a3e20"] },
  wind: { core: "#d8f4ff", tints: ["#ffffff", "#e6fbff", "#b8e8f5", "#7cc8dc"] },
  fury: { core: "#ff3030", tints: ["#ffd0c0", "#ff6a4a", "#e01818", "#7a0808"] },
};

export const PALETTE = Object.fromEntries(Object.entries(BASE).map(([element, p]) => [element, { ...p, accent: p.tints[1] ?? p.core }])) as Record<FxElement, FxPalette>;
