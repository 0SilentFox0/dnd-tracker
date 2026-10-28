import { ARCHETYPE_FX } from "./archetypes";
import type { FxElement, FxSpec } from "./types";

import type { BattleAction } from "@/types/battle";

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

/** Жертви дії, яких немає серед цілей головного FX: вогняна хвиля, стріла сили. */
export function splashTargetIds(action: BattleAction, main: FxSpec | undefined): string[] {
  if (!main || (main.archetype !== "melee" && main.archetype !== "ranged")) return [];

  return splashVictimIds(action, [action.actorId, ...main.targetIds]);
}

export function splashVictimIds(action: BattleAction, exclude: string[]): string[] {
  const ids = action.hpChanges.filter((h) => h.change > 0 && !exclude.includes(h.participantId)).map((h) => h.participantId);

  return [...new Set(ids)];
}
