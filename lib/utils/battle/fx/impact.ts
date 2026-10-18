import { mapAction } from "./map-action";
import { IMPACT_MS } from "./timing";
import type { FxElement } from "./types";

import type { BattleAction } from "@/types/battle";

export interface FxImpact {
  element: FxElement;
  kind: "damage" | "heal";
  delayMs: number;
  attack?: "melee" | "ranged";
}

export function impactFor(action: BattleAction | undefined, participantId: string): FxImpact | null {
  const spec = action ? mapAction(action)[0] : undefined;

  if (!spec || !spec.hit || !spec.targetIds.includes(participantId)) return null;

  const impact: FxImpact = { element: spec.element, kind: spec.archetype === "heal" ? "heal" : "damage", delayMs: IMPACT_MS[spec.archetype] };

  if (spec.archetype === "melee" || spec.archetype === "ranged") impact.attack = spec.archetype;

  return impact;
}
