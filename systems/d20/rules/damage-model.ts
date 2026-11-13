import type { BattleParticipant } from '@/types/battle';

export const isFiveE = (p: BattleParticipant): boolean =>
    p.abilities.damageModel === '5e';
