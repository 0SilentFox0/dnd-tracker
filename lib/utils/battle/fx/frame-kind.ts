import type { FxImpact } from "./impact";
import type { FxElement } from "./types";

export type FxFrameKind = Exclude<FxElement, "physical"> | "heal" | "physical-melee" | "physical-ranged";

/** Which frame a hit plays around the row: heals share one, physical hits split into blade and arrow. */
export function frameKindOf(impact: FxImpact): FxFrameKind {
  if (impact.kind === "heal") return "heal";

  if (impact.element === "physical") return impact.attack === "ranged" ? "physical-ranged" : "physical-melee";

  return impact.element;
}
