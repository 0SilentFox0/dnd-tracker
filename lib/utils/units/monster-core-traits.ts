import type { Ability } from "@/lib/utils/abilities/schema";

const REGEN = /regains (\d+) Hit Points at the start of (?:each of )?its turns?/i;

type TraitCore = Pick<Ability, "trigger" | "effects">;

/** Engine form of the traits every monster source shares; undefined means the trait stays a note. */
export function coreTrait(name: string, description: string): TraitCore | undefined {
  if (name.startsWith("Magic Resistance")) return { trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "saveAdvantage", abilities: "all", vsSpells: true }] };

  const regen = name.startsWith("Regeneration") ? REGEN.exec(description) : null;

  if (regen) return { trigger: { event: "turnStart" }, effects: [{ kind: "heal", amount: Number(regen[1]), target: "self" }] };
}

/** The engine reads one speed: the fastest of walk/fly, else swim, climb, burrow. */
export function battleSpeed(s: { walk?: number | null; fly?: number | null; swim?: number | null; climb?: number | null; burrow?: number | null }): number {
  return Math.max(s.walk ?? 0, s.fly ?? 0) || s.swim || s.climb || s.burrow || 0;
}
