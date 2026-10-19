export interface WeatherSize {
  width: number;
  height: number;
}

export type Rand = () => number;

export interface WeatherSim {
  step(dt: number): void;
  draw(g: CanvasRenderingContext2D): void;
}

export interface WeatherEffect {
  /** CSS-фон замість руху при prefers-reduced-motion */
  tint: string;
  /** прозорість шару: HP під токенами мусить лишатися читабельним */
  opacity: number;
  /** частинок на мегапіксель */
  density: number;
  cap: number;
  create(size: WeatherSize, count: number, rand: Rand): WeatherSim;
}

export function particleCount(size: WeatherSize, effect: Pick<WeatherEffect, "density" | "cap">, scale = 1): number {
  return Math.min(Math.round(effect.cap * scale), Math.round(((size.width * size.height) / 1e6) * effect.density * scale));
}

export const wrap = (v: number, max: number) => ((v % max) + max) % max;
