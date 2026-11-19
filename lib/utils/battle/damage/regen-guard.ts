import { resolvedAbilitiesOf } from '@/lib/utils/abilities/engine/core/participants';
import type { BattleParticipant } from '@/types/battle';

const guardedTypes = (p: BattleParticipant): string[] =>
    resolvedAbilitiesOf(p).flatMap((a) =>
        a.effects.flatMap((e) =>
            e.kind === 'heal' ? (e.unlessDamagedBy ?? []) : []
        )
    );

/** Remembers a damage type that switches off the participant's regeneration until its next turn. */
export function markGuardedDamage(
    p: BattleParticipant,
    damageType: string | undefined
): BattleParticipant {
    const type = damageType?.toLowerCase();

    if (!type || p.battleData.damagedByTypes?.includes(type)) return p;

    if (!guardedTypes(p).some((g) => g.toLowerCase() === type)) return p;

    return {
        ...p,
        battleData: {
            ...p.battleData,
            damagedByTypes: [...(p.battleData.damagedByTypes ?? []), type],
        },
    };
}

export function regenSuppressed(
    p: BattleParticipant,
    unlessDamagedBy: readonly string[] | undefined
): boolean {
    const hit = p.battleData.damagedByTypes;

    return (
        !!unlessDamagedBy &&
        !!hit &&
        unlessDamagedBy.some((t) => hit.includes(t.toLowerCase()))
    );
}

export function clearGuardedDamage(p: BattleParticipant): BattleParticipant {
    if (!p.battleData.damagedByTypes) return p;

    return {
        ...p,
        battleData: { ...p.battleData, damagedByTypes: undefined },
    };
}
