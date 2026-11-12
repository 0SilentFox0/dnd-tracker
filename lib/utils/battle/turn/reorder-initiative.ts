import type { BattleParticipant } from '@/types/battle';

/** Returns participants in `order`, or null when `order` is not an exact permutation of their ids. */
export function reorderParticipants(
    participants: BattleParticipant[],
    order: string[]
): BattleParticipant[] | null {
    const byId = new Map(participants.map((p) => [p.basicInfo.id, p]));

    if (
        order.length !== participants.length ||
        new Set(order).size !== order.length ||
        order.some((id) => !byId.has(id))
    )
        return null;

    return order.map((id) => byId.get(id) as BattleParticipant);
}
