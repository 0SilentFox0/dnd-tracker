import { mapAction } from "./map-action";
import { IMPACT_MS } from "./timing";
import type { FxArchetype, FxElement } from "./types";

import type { BattleAction } from "@/types/battle";

export interface FxImpact {
  element: FxElement;
  kind: "damage" | "heal";
  delayMs: number;
  attack?: "melee" | "ranged";
}

// buff/debuff never deal damage themselves, so they must not borrow a damage frame
const NO_IMPACT = new Set<FxArchetype>(["buff", "debuff"]);

export function impactFor(action: BattleAction | undefined, participantId: string): FxImpact | null {
  const spec = action ? mapAction(action)[0] : undefined;

  if (!spec || !spec.hit || !spec.targetIds.includes(participantId) || NO_IMPACT.has(spec.archetype)) return null;

  const impact: FxImpact = { element: spec.element, kind: spec.archetype === "heal" ? "heal" : "damage", delayMs: IMPACT_MS[spec.archetype] };

  if (spec.archetype === "melee" || spec.archetype === "ranged") impact.attack = spec.archetype;

  return impact;
}
