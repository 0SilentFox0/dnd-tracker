import { fadeInOut } from "./easing";
import { rand } from "./geometry";
import { glow, sprite, spritePx } from "./texture";

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  life: number;
  age: number;
}

export abstract class ParticlePool<P extends Body> {
  protected list: P[] = [];

  get count() {
    return this.list.length;
  }

  add(p: P) {
    this.list.push(p);
  }

  clear() {
    this.list.length = 0;
  }

  protected move(p: P, dt: number) {
    p.vx *= 1 - p.drag * dt;
    p.vy = p.vy * (1 - p.drag * dt) + p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  protected abstract draw(g: CanvasRenderingContext2D, p: P, k: number): void;

  // Compacts survivors in place, keeping draw order (it matters for non-additive particles).
  step(g: CanvasRenderingContext2D, dt: number) {
    const list = this.list;

    const n = list.length;

    let w = 0;

    for (let i = 0; i < n; i++) {
      const p = list[i];

      p.age += dt;

      if (p.age >= p.life) continue;

      this.move(p, dt);
      this.draw(g, p, p.age / p.life);
      list[w++] = p;
    }

    for (let i = n; i < list.length; i++) list[w++] = list[i];

    list.length = w;
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
  }
}

interface SpriteParticle extends Body {
  scale0: number;
  scale1: number;
  alpha0: number;
  tex: HTMLCanvasElement;
  additive: boolean;
}

export class SpriteParticles extends ParticlePool<SpriteParticle> {
  protected draw(g: CanvasRenderingContext2D, p: SpriteParticle, k: number) {
    sprite(g, p.tex, p.x, p.y, p.scale0 + (p.scale1 - p.scale0) * k, undefined, p.alpha0 * (1 - k), p.additive);
  }
}

/** `data` carries what a custom `move`/`draw` needs, so both can be declared once per aura file. */
export interface AuraParticle<D = unknown> extends Body {
  size0: number;
  size1: number;
  alpha: number;
  tint: string;
  additive: boolean;
  phase: number;
  data: D;
  tex?: HTMLCanvasElement;
  move?(p: AuraParticle<D>, dt: number): void;
  draw?(g: CanvasRenderingContext2D, p: AuraParticle<D>, k: number): void;
}

type AuraParticleInit<D = unknown> = Partial<AuraParticle<D>> & Pick<AuraParticle<D>, "x" | "y" | "life" | "size0">;

const MAX_AURA_PARTICLES = 70;

export class AuraParticles extends ParticlePool<AuraParticle> {
  spawn<D>(init: AuraParticleInit<D>) {
    if (this.count >= MAX_AURA_PARTICLES) return;

    this.add({ vx: 0, vy: 0, gravity: 0, drag: 0, age: 0, size1: init.size0, alpha: 1, tint: "#ffffff", additive: true, phase: rand(0, Math.PI * 2), data: undefined, ...init } as AuraParticle);
  }

  // Spawns ~rate per second regardless of the frame rate.
  emit<D>(rate: number, dt: number, make: () => AuraParticleInit<D>) {
    const n = Math.floor(rate * dt + Math.random());

    for (let i = 0; i < n; i++) this.spawn(make());
  }

  protected move(p: AuraParticle, dt: number) {
    if (p.move) p.move(p, dt);
    else super.move(p, dt);
  }

  protected draw(g: CanvasRenderingContext2D, p: AuraParticle, k: number) {
    if (p.draw) p.draw(g, p, k);
    else spritePx(g, (p.tex ??= glow(p.tint)), p.x, p.y, p.size0 + (p.size1 - p.size0) * k, undefined, p.alpha * fadeInOut(k), p.additive);
  }
}
