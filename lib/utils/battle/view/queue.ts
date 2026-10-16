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

  const live = (e: QueueEntry) => e.kind === "round" || e.current || !e.down;

  const all: QueueEntry[] = [...rest, ...extras, { kind: "round", round: round + 1 }, ...order.map((p) => item("turn", p))];

  return all.filter(live);
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

/** Стабільні ключі для анімації: учасник + номер його появи в черзі, межа раунду — одна. */
export function queueKeys(queue: QueueEntry[]): string[] {
  const seen = new Map<string, number>();

  return queue.map((e) => {
    if (e.kind === "round") return "round";

    const id = e.participant.basicInfo.id;

    const n = seen.get(id) ?? 0;

    seen.set(id, n + 1);

    return `${id}#${n}`;
  });
}
