import type { ParticipantSide } from '@/lib/constants/battle';
import type { BattleParticipant } from '@/types/battle';

export function originalSide(p: BattleParticipant): ParticipantSide {
    const origin =
        p.battleData.charmReturn ??
        p.battleData.activeEffects.find((e) => e.charmOrigin)?.charmOrigin;

    return origin?.side ?? p.basicInfo.side;
}
