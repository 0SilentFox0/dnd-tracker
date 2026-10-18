import { IMPACT_MS } from "./timing";
import type { FxArchetype, FxElement, FxSpec } from "./types";

export interface FxImpact {
  element: FxElement;
  kind: "damage" | "heal";
  delayMs: number;
  attack?: "melee" | "ranged";
}

// buff/debuff never deal damage themselves, so they must not borrow a damage frame
const NO_IMPACT = new Set<FxArchetype>(["buff", "debuff"]);

/** `spec` is the first FX of the last action (`mapAction(action)[0]`), mapped once for all rows. */
export function impactFor(spec: FxSpec | undefined, participantId: string): FxImpact | null {
  if (!spec || !spec.hit || !spec.targetIds.includes(participantId) || NO_IMPACT.has(spec.archetype)) return null;

  const impact: FxImpact = { element: spec.element, kind: spec.archetype === "heal" ? "heal" : "damage", delayMs: IMPACT_MS[spec.archetype] };

  if (spec.archetype === "melee" || spec.archetype === "ranged") impact.attack = spec.archetype;

  return impact;
}
