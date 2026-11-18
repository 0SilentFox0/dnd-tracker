import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { type BattleActor, controls } from '@/lib/utils/battle/common/control';
import type { BattleParticipant } from '@/types/battle';

interface SaveRoll {
    participantId: string;
    roll: number;
}

export function splitSaveRolls(
    actor: BattleActor,
    order: BattleParticipant[],
    sent: SaveRoll[] = []
): { trusted: SaveRoll[]; serverRolled: string[] } {
    const trusted = sent.filter((s) =>
        controls(actor, findParticipant(order, s.participantId))
    );

    return {
        trusted,
        serverRolled: sent
            .filter((s) => !trusted.includes(s))
            .map((s) => s.participantId),
    };
}
