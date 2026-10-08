import type { BattleAction } from "@/types/battle";

export interface CritOutcome {
  name: string;
  flavor?: string;
  type: "success" | "fail";
}

export type CritEffectFx = Omit<CritOutcome, "type">;

export function critOutcome(log: BattleAction[], seen: ReadonlySet<number>, attackerId: string, targetId: string): CritOutcome | undefined {
  const e = log.find((x) => !seen.has(x.actionIndex) && x.actionType === "attack" && x.actorId === attackerId && x.targets[0]?.participantId === targetId && x.actionDetails.criticalEffect);

  const c = e?.actionDetails.criticalEffect;

  if (!c) return undefined;

  return { name: c.name, type: c.type, ...(c.flavor && { flavor: c.flavor }) };
}
