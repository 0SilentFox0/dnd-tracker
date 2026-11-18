import type { ActiveEffect, BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

export type ConcentrationTag = NonNullable<ActiveEffect['concentrationOf']>;

export function castIdFor(
    casterId: string,
    spellId: string,
    round: number,
    seq: number
): string {
    return `${casterId}:${spellId}@${round}#${seq}`;
}

function castIdTaken(
    ps: BattleParticipant[],
    map: BattleMapConfig | null | undefined,
    castId: string
): boolean {
    const zonePrefix = `${castId}@`;

    return (
        Object.keys(map?.spellZones ?? {}).some((id) =>
            id.startsWith(zonePrefix)
        ) ||
        ps.some(
            (p) =>
                p.basicInfo.id.startsWith(`inline:${castId}:`) ||
                (p.spellcasting.grants ?? []).some((g) =>
                    g.key?.startsWith(`cast:${castId}:`)
                ) ||
                p.battleData.activeEffects.some(
                    (e) =>
                        e.concentration?.castId === castId ||
                        e.concentrationOf?.castId === castId
                )
        )
    );
}

export function uniqueCastId(
    ps: BattleParticipant[],
    map: BattleMapConfig | null | undefined,
    casterId: string,
    spellId: string,
    round: number
): string {
    let seq = 0;

    while (castIdTaken(ps, map, castIdFor(casterId, spellId, round, seq)))
        seq += 1;

    return castIdFor(casterId, spellId, round, seq);
}
