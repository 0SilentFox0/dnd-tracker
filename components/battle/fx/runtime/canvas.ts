import { arcControl, bezier, type FxPoint, rand } from "./geometry";

type Draw = (g: CanvasRenderingContext2D) => void;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  life: number;
  age: number;
  scale0: number;
  scale1: number;
  alpha0: number;
  tex: HTMLCanvasElement;
  additive: boolean;
}

interface Tween {
  t: number;
  ms: number;
  fn: (k: number) => void;
  done: () => void;
}

export interface Stage {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  particles: Particle[];
  tweens: Set<Tween>;
  draws: Set<Draw>;
  running: boolean;
  last: number;
}

const TEX = 64;

const textures = new Map<string, HTMLCanvasElement>();

// Needs 6-digit hex: the alpha stops append a two-digit suffix.
export function glow(color: string) {
  let tex = textures.get(color);

  if (!tex) {
    tex = document.createElement("canvas");
    tex.width = tex.height = TEX;

    const g = tex.getContext("2d");

    if (g) {
      const grad = g.createRadialGradient(TEX / 2, TEX / 2, 0, TEX / 2, TEX / 2, TEX / 2);

      grad.addColorStop(0, color);
      grad.addColorStop(0.3, `${color}b3`);
      grad.addColorStop(1, `${color}00`);
      g.fillStyle = grad;
      g.fillRect(0, 0, TEX, TEX);
    }

    textures.set(color, tex);
  }

  return tex;
}

export function sprite(g: CanvasRenderingContext2D, tex: HTMLCanvasElement, x: number, y: number, sx: number, sy = sx, alpha = 1, additive = true, anchorY = 0.5) {
  g.globalAlpha = Math.max(0, alpha);
  g.globalCompositeOperation = additive ? "lighter" : "source-over";
  g.drawImage(tex, x - (TEX * sx) / 2, y - TEX * sy * anchorY, TEX * sx, TEX * sy);
}

const stages = new WeakMap<HTMLElement, Stage>();

export function stageFor(layer: HTMLElement) {
  let s = stages.get(layer);

  if (!s) {
    const canvas = document.createElement("canvas");

    layer.appendChild(canvas);

    const g = canvas.getContext("2d");

    if (!g) throw new Error("Canvas 2D недоступний");

    s = { canvas, g, particles: [], tweens: new Set(), draws: new Set(), running: false, last: 0 };
    stages.set(layer, s);
  }

  const dpr = window.devicePixelRatio || 1;

  s.canvas.width = layer.clientWidth * dpr;
  s.canvas.height = layer.clientHeight * dpr;
  s.g.setTransform(dpr, 0, 0, dpr, 0, 0);

  return s;
}

// The loop only runs while something is alive, so an idle battle costs nothing.
function wake(s: Stage) {
  if (s.running) return;

  s.running = true;
  s.last = performance.now();
  requestAnimationFrame((now) => tick(s, now));
}

function tick(s: Stage, now: number) {
  const dt = Math.min(0.05, (now - s.last) / 1000);

  s.last = now;

  for (const tw of s.tweens) {
    tw.t += dt * 1000;

    const k = Math.min(1, tw.t / tw.ms);

    tw.fn(k);

    if (k >= 1) {
      s.tweens.delete(tw);
      tw.done();
    }
  }

  const { g, canvas } = s;

  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.restore();

  for (const draw of s.draws) draw(g);

  s.particles = s.particles.filter((p) => {
    p.age += dt;

    if (p.age >= p.life) return false;

    const k = p.age / p.life;

    p.vx *= 1 - p.drag * dt;
    p.vy = p.vy * (1 - p.drag * dt) + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    sprite(g, p.tex, p.x, p.y, p.scale0 + (p.scale1 - p.scale0) * k, undefined, p.alpha0 * (1 - k), p.additive);

    return true;
  });
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";

  if (s.particles.length || s.tweens.size || s.draws.size) requestAnimationFrame((t) => tick(s, t));
  else s.running = false;
}

export function pick<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export function emit(s: Stage, at: FxPoint, opts: { tints: string[]; speed: [number, number]; life: [number, number]; scale: [number, number]; angle?: [number, number]; gravity?: number; drag?: number; spread?: number; additive?: boolean; alpha?: number }) {
  const angle = rand(...(opts.angle ?? [0, Math.PI * 2]));

  const speed = rand(...opts.speed);

  const spread = opts.spread ?? 0;

  s.particles.push({
    x: at.x + rand(-spread, spread),
    y: at.y + rand(-spread / 3, spread / 3),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    gravity: opts.gravity ?? 0,
    drag: opts.drag ?? 0,
    life: rand(...opts.life),
    age: 0,
    scale0: opts.scale[0],
    scale1: opts.scale[1],
    alpha0: opts.alpha ?? 1,
    tex: glow(pick(opts.tints)),
    additive: opts.additive !== false,
  });
  wake(s);
}

export function tween(s: Stage, ms: number, fn: (k: number) => void) {
  return new Promise<void>((resolve) => {
    s.tweens.add({ t: 0, ms, fn, done: resolve });
    wake(s);
  });
}

export function show(s: Stage, draw: Draw) {
  s.draws.add(draw);
  wake(s);

  return () => s.draws.delete(draw);
}

export async function shoot(s: Stage, from: FxPoint, to: FxPoint, ms: number, tint: string, tints: string[], wobble = 0) {
  const ctrl = arcControl(from, to, wobble ? 30 : 60);

  let pos = from;

  const halo = glow(tint);

  const core = glow("#ffffff");

  const hide = show(s, (g) => {
    sprite(g, halo, pos.x, pos.y, 30 / 32);
    sprite(g, core, pos.x, pos.y, 30 / 90);
  });

  await tween(s, ms, (k) => {
    const p = bezier(from, ctrl, to, wobble ? k : k ** 1.4);

    pos = { x: p.x, y: p.y + Math.sin(k * Math.PI * 4) * wobble };

    for (let i = 0; i < 3; i++) emit(s, pos, { tints, speed: [10, 50], life: [0.25, 0.5], scale: [0.45, 0.05], spread: 4 });
  });
  hide();
}

export function ring(s: Stage, at: FxPoint, color: string, ms: number, to: number, width = 3) {
  let k = 0;

  const hide = show(s, (g) => {
    const e = 1 - (1 - k) ** 3;

    g.globalAlpha = 1 - k;
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = color;
    g.lineWidth = width * (1 - k) + 0.5;
    g.beginPath();
    g.arc(at.x, at.y, 8 + e * to, 0, Math.PI * 2);
    g.stroke();
  });

  return tween(s, ms, (v) => (k = v)).then(hide);
}

export function flash(s: Stage, at: FxPoint, tint: string, size: number, ms: number) {
  let k = 0;

  const tex = glow(tint);

  const hide = show(s, (g) => sprite(g, tex, at.x, at.y, (size / 32) * (0.4 + k), undefined, 1 - k));

  return tween(s, ms, (v) => (k = v)).then(hide);
}
