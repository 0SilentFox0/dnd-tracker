import { integrate } from "./physics";
import { sprite } from "./texture";

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
    integrate(p, dt, p.drag, p.gravity);
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
