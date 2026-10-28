export { mulberry32, type Rng, seedFrom } from "@/lib/utils/common/rng";
import type { Rng } from "@/lib/utils/common/rng";

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
