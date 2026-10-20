export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;

  return () => {
    a = (a + 0x6d2b79f5) >>> 0;

    let t = a;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFrom(rng: Rng): number {
  return Math.floor(rng() * 4294967296) >>> 0;
}

export function randInt(rnd: Rng, n: number): number {
  return Math.floor(rnd() * n);
}

export function pick<T>(rnd: Rng, list: readonly T[]): T {
  return list[randInt(rnd, list.length)];
}

export function shuffled<T>(rnd: Rng, list: readonly T[]): T[] {
  const out = [...list];

  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rnd, i + 1);

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}
