import { ARCHETYPE_FX } from "./archetypes";
import type { FxElement, FxSpec } from "./types";

export interface FxImpact {
  element: FxElement;
  kind: "damage" | "heal";
  delayMs: number;
  attack?: "melee" | "ranged";
  /** Бій: кадр чекає `fireFxImpact(actionId)` замість `delayMs`. */
  actionId?: string;
  waitMs?: number;
}

/** `spec` is the first FX of the last action (`mapAction(action)[0]`), mapped once for all rows. */
export function impactFor(spec: FxSpec | undefined, participantId: string): FxImpact | null {
  if (!spec || !spec.hit || !spec.targetIds.includes(participantId)) return null;

  const { impact: kind, impactMs } = ARCHETYPE_FX[spec.archetype];

  if (kind === "none") return null;

  const impact: FxImpact = { element: spec.element, kind, delayMs: impactMs };

  if (spec.archetype === "melee" || spec.archetype === "ranged") impact.attack = spec.archetype;

  return impact;
}
