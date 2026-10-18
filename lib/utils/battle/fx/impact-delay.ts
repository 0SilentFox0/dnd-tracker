import { mapAction } from "./map-action";
import { IMPACT_MS } from "./timing";

import type { BattleAction } from "@/types/battle";

export function impactDelayFor(action: BattleAction | undefined, participantId: string): number {
  const spec = action ? mapAction(action)[0] : undefined;

  return spec && spec.targetIds.includes(participantId) ? IMPACT_MS[spec.archetype] : 0;
}
