import { describe, expect, it } from "vitest";

import { type Body, ParticlePool } from "../runtime/particles";

interface Dot extends Body {
  id: number;
}

class Pool extends ParticlePool<Dot> {
  drawn: number[] = [];

  protected draw(_: CanvasRenderingContext2D, p: Dot) {
    this.drawn.push(p.id);

    if (p.id === 1) this.add(dot(9, 5));
  }
}

const dot = (id: number, life: number): Dot => ({ id, life, x: 0, y: 0, vx: 10, vy: 0, gravity: 0, drag: 0, age: 0 });

const g = { globalAlpha: 1, globalCompositeOperation: "source-over" } as CanvasRenderingContext2D;

describe("ParticlePool", () => {
  it("drops expired particles in place, keeps draw order and particles spawned during the pass", () => {
    const pool = new Pool();

    [dot(0, 0.05), dot(1, 1), dot(2, 0.05), dot(3, 1)].forEach((p) => pool.add(p));
    pool.step(g, 0.1);

    expect(pool.drawn).toEqual([1, 3]);
    expect(pool.count).toBe(3);

    pool.drawn = [];
    pool.step(g, 0.1);
    expect(pool.drawn).toEqual([1, 3, 9]);
  });
});
