import { createDrift } from "./drift";
import type { WeatherEffect } from "./types";

export const fog: WeatherEffect = {
  tint: "rgba(190,195,205,.35)",
  opacity: 0.8,
  density: 14,
  maxParticles: 12,
  minParticles: 6,
  create: (size, count, rand) =>
    createDrift(size, count, rand, { vx: 14, vy: 0, color: "rgba(205,210,220,.32)", clear: "rgba(205,210,220,0)", minR: 0.25, maxR: 0.45 }),
};
