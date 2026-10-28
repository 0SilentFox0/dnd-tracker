import { getAbilityModifier } from "@/lib/utils/common/calculations";
import type { ResolvedClassEntry } from "@/types/classes";

export function classHp(entries: ResolvedClassEntry[], constitution: number): number {
  const mod = getAbilityModifier(constitution);

  let total = 0;

  for (const [index, { class: cls, level }] of entries.entries()) {
    if (!cls) continue;

    for (let i = 1; i <= level; i++) {
      const base = index === 0 && i === 1 ? cls.hitDie : cls.hitDie / 2 + 1;

      total += Math.max(1, base + mod);
    }
  }

  return total;
}
