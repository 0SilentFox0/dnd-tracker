import { damageTaken } from "./damage-taken";

import type { BattleAction } from "@/types/battle";

export interface RetaliationOutcome {
  name: string;
  damage: number;
}

export function retaliationOutcome(log: BattleAction[], seen: ReadonlySet<number>): RetaliationOutcome | undefined {
  const e = log.find((x) => x.actionType === "retaliation" && !seen.has(x.actionIndex));

  if (!e) return undefined;

  const targetId = e.targets[0]?.participantId;

  const damage = damageTaken(e, targetId);

  return { name: e.actorName, damage };
}
