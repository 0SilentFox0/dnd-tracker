import { impactFor } from "./impact";

import type { BattleAction } from "@/types/battle";

export function impactDelayFor(action: BattleAction | undefined, participantId: string): number {
  return impactFor(action, participantId)?.delayMs ?? 0;
}
