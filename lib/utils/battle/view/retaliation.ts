import type { BattleAction } from "@/types/battle";

export interface RetaliationOutcome {
  name: string;
  damage: number;
}

export function retaliationOutcome(log: BattleAction[], seen: ReadonlySet<number>): RetaliationOutcome | undefined {
  const e = log.find((x) => x.actionType === "retaliation" && !seen.has(x.actionIndex));

  if (!e) return undefined;

  const targetId = e.targets[0]?.participantId;

  const damage = e.hpChanges.filter((h) => h.participantId === targetId).reduce((sum, h) => sum + Math.max(0, h.change), 0);

  return { name: e.actorName, damage };
}
