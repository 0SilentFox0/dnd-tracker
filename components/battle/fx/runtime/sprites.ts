import type { FxPoint } from "./geometry";

export interface Sheet {
  src: string;
  frames: number;
  fw: number;
  fh: number;
}

export const SHEETS = {
  fireball: { src: "/fx/sprites/fireball.png", frames: 9, fw: 64, fh: 32 },
  explosion: { src: "/fx/sprites/explosion.png", frames: 7, fw: 64, fh: 64 },
  rings: { src: "/fx/sprites/rings.png", frames: 7, fw: 64, fh: 64 },
  spark: { src: "/fx/sprites/spark.png", frames: 7, fw: 32, fh: 32 },
  darkBolt: { src: "/fx/sprites/dark-bolt.png", frames: 11, fw: 64, fh: 88 },
  lightning: { src: "/fx/sprites/lightning.png", frames: 10, fw: 64, fh: 128 },
} satisfies Record<string, Sheet>;

export async function playSheet(layer: HTMLElement, sheet: Sheet, at: FxPoint, opts: { scale: number; ms: number; filter?: string; rotate?: number; delayMs?: number; anchorY?: number }) {
  const el = document.createElement("div");

  const w = sheet.fw * opts.scale;

  const h = sheet.fh * opts.scale;

  el.className = "fxs-sheet";
  el.style.setProperty("--src", `url(${sheet.src})`);
  el.style.setProperty("--frames", String(sheet.frames));
  el.style.setProperty("--w", `${w}px`);
  el.style.setProperty("--h", `${h}px`);
  el.style.setProperty("--sheet-w", `${sheet.frames * w}px`);
  el.style.setProperty("--dur", `${opts.ms}ms`);
  el.style.left = `${at.x - w / 2}px`;
  el.style.top = `${at.y - h * (opts.anchorY ?? 0.5)}px`;

  if (opts.filter) el.style.filter = opts.filter;

  if (opts.rotate) el.style.rotate = `${opts.rotate}rad`;

  if (opts.delayMs) el.style.animationDelay = `${opts.delayMs}ms`;

  layer.appendChild(el);
  await Promise.all(el.getAnimations().map((a) => a.finished.catch(() => undefined)));
  el.remove();
}
