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
  /** стеля кількості; без неї — density */
  maxParticles?: number;
  minParticles?: number;
  create(size: WeatherSize, count: number, rand: Rand): WeatherSim;
}

export function particleCount(size: WeatherSize, effect: Pick<WeatherEffect, "density" | "maxParticles" | "minParticles">, scale = 1): number {
  const { density, maxParticles = density, minParticles = 0 } = effect;

  return Math.max(minParticles, Math.min(Math.round(maxParticles * scale), Math.round(((size.width * size.height) / 1e6) * density * scale)));
}

export const rgba = (rgb: string, alpha: number) => `rgba(${rgb},${alpha.toFixed(3)})`;

export function fillFrame(g: CanvasRenderingContext2D, size: WeatherSize, style: CanvasRenderingContext2D["fillStyle"]) {
  g.fillStyle = style;
  g.fillRect(0, 0, size.width, size.height);
}

export const wrap = (v: number, max: number) => ((v % max) + max) % max;
