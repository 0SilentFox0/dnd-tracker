import { CombatStatus, ParticipantSourceType } from '@/lib/constants/battle';
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

/** The unit's self-heal at turn start; `suppressedBy` are the damage types that switch it off. */
export function regenerationOf(
    p: BattleParticipant
): { suppressedBy: string[] } | undefined {
    if (p.basicInfo.sourceType !== ParticipantSourceType.UNIT) return undefined;

    const heals = resolvedAbilitiesOf(p)
        .filter((a) => a.trigger.event === 'turnStart')
        .flatMap((a) => a.effects)
        .filter((e) => e.kind === 'heal' && (e.target ?? 'self') === 'self');

    if (heals.length === 0) return undefined;

    return {
        suppressedBy: heals.flatMap((e) =>
            e.kind === 'heal' ? (e.unlessDamagedBy ?? []) : []
        ),
    };
}

/** A unit with regeneration falling to 0 HP survives unless this hit (or an earlier one) switched it off. */
export function regenKeepsAlive(
    p: BattleParticipant,
    damageType?: string
): boolean {
    const regen = regenerationOf(p);

    if (!regen) return false;

    const type = damageType?.toLowerCase();

    return (
        !regenSuppressed(p, regen.suppressedBy) &&
        !(type && regen.suppressedBy.some((t) => t.toLowerCase() === type))
    );
}

export const isRegenDowned = (p: BattleParticipant): boolean =>
    p.combatStats.status === CombatStatus.UNCONSCIOUS &&
    p.combatStats.currentHp <= 0 &&
    p.battleData.dying !== true &&
    !!regenerationOf(p);
