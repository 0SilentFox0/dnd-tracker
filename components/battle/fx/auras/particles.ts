import { fadeInOut } from "@/components/battle/fx/runtime/easing";
import { rand } from "@/components/battle/fx/runtime/geometry";
import { type Body, ParticlePool } from "@/components/battle/fx/runtime/particles";
import { glow, spritePx } from "@/components/battle/fx/runtime/texture";

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
