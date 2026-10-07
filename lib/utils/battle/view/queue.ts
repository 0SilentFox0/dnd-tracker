import { isDown } from "@/lib/utils/battle/participant/state";
import type { BattleParticipant } from "@/types/battle";

export type QueueEntry =
  | { kind: "turn" | "extra"; participant: BattleParticipant; current: boolean; down: boolean }
  | { kind: "round"; round: number };

const item = (kind: "turn" | "extra", participant: BattleParticipant, current = false): QueueEntry => ({
  kind, participant, current, down: isDown(participant),
});

export function turnQueue(order: BattleParticipant[], turnIndex: number, round: number): QueueEntry[] {
  const current = order[turnIndex];

  const extraActive = current?.battleData.extraTurnActive === true;

  const extras = order.filter((p) => p !== current && p.actionFlags.hasExtraTurn && !isDown(p)).map((p) => item("extra", p));

  const rest = extraActive ? [item("extra", current, true)] : order.slice(turnIndex).map((p, i) => item("turn", p, i === 0));

  return [...rest, ...extras, { kind: "round", round: round + 1 }, ...order.map((p) => item("turn", p))];
}

export function turnsUntil(queue: QueueEntry[], myIds: string[]): number | null {
  let count = 0;

  for (const e of queue) {
    if (e.kind === "round") continue;

    if (myIds.includes(e.participant.basicInfo.id) && !e.down) return e.current ? 0 : count;

    if (!e.down) count += 1;
  }

  return null;
}
