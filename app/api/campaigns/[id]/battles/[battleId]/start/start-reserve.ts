import { toReserve } from "@/lib/utils/battle/participant/reserve";
import type { BattleParticipant } from "@/types/battle";

export function isReservedSlot(entry: { quantity?: number; reserved?: number }, instanceIndex: number): boolean {
  const quantity = entry.quantity ?? 1;

  return instanceIndex >= quantity - Math.min(entry.reserved ?? 0, quantity);
}

export function partitionReserve(slots: { reserved: boolean }[], built: BattleParticipant[]): { field: BattleParticipant[]; reserve: BattleParticipant[] } {
  const field: BattleParticipant[] = [];

  const reserve: BattleParticipant[] = [];

  built.forEach((p, i) => (slots[i]?.reserved ? reserve.push(toReserve(p)) : field.push(p)));

  return { field, reserve };
}
