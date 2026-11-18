import type { BattleParticipant } from '@/types/battle';

export const moraleCapOf = (p: BattleParticipant) => p.combatStats.moraleCap ?? 3;

export const clampMorale = (v: number, cap: number) =>
    Math.max(-cap, Math.min(cap, v));
