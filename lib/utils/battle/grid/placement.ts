import { cellKey, cellsByRing, footprint, gridOf } from './geometry';
import { fits, footprintSizeOf, occupiesCells } from './occupancy';

import { ParticipantSide } from '@/lib/constants/battle';
import { modePlaceAll } from '@/lib/utils/battle/modes/server';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';

function sideAnchors(map: BattleMapConfig, side: string): GridPoint[] {
    const cols = Array.from({ length: map.cols }, (_, i) =>
        side === ParticipantSide.ENEMY ? map.cols - 1 - i : i
    );

    const mid = (map.rows - 1) / 2;

    const byMid = Array.from({ length: map.rows }, (_, i) => i).sort(
        (a, b) => Math.abs(a - mid) - Math.abs(b - mid) || a - b
    );

    const base = byMid[0] % 2;

    const spread = cols.slice(0, Math.max(1, Math.floor(map.cols / 2)));

    const primary = spread.flatMap((x, i) =>
        byMid.filter((y) => (y + i) % 2 === base).map((y) => ({ x, y }))
    );

    const taken = new Set(primary.map(cellKey));

    const rest = cols
        .flatMap((x) => byMid.map((y) => ({ x, y })))
        .filter((a) => !taken.has(cellKey(a)));

    return [...primary, ...rest];
}

export function placeParticipants(
    map: BattleMapConfig,
    participants: BattleParticipant[]
): BattleParticipant[] {
    const own = modePlaceAll(map, participants);

    if (own) return own;

    const grid = gridOf(map);

    const blocked = new Set<string>();

    const positions = new Map<string, GridPoint>();

    for (const p of participants) {
        const position = p.battleData.position;

        if (
            !position ||
            !occupiesCells(p) ||
            !fits(map, position, footprintSizeOf(p, grid), blocked)
        )
            continue;

        for (const c of footprint(position, footprintSizeOf(p, grid), grid))
            blocked.add(cellKey(c));
        positions.set(p.basicInfo.id, position);
    }

    const anchorsBySide = new Map<string, GridPoint[]>();

    const anchorsOf = (side: string): GridPoint[] => {
        let list = anchorsBySide.get(side);

        if (!list) {
            list = sideAnchors(map, side);
            anchorsBySide.set(side, list);
        }

        return list;
    };

    return participants.map((p) => {
        if (!occupiesCells(p) || positions.has(p.basicInfo.id)) return p;

        const size = footprintSizeOf(p, grid);

        const shift = (a: GridPoint) =>
            p.basicInfo.side === ParticipantSide.ENEMY
                ? { x: a.x - size + 1, y: a.y }
                : a;

        const summoner = p.battleData.summonedBy
            ? positions.get(p.battleData.summonedBy)
            : undefined;

        const near = p.battleData.position ?? summoner;

        let anchor: GridPoint | undefined;

        if (near) {
            for (const a of cellsByRing(map, near, grid))
                if (fits(map, a, size, blocked)) {
                    anchor = a;
                    break;
                }
        } else {
            for (const raw of anchorsOf(p.basicInfo.side)) {
                const a = shift(raw);

                if (fits(map, a, size, blocked)) {
                    anchor = a;
                    break;
                }
            }
        }

        if (!anchor) return p;

        for (const c of footprint(anchor, size, grid))
            blocked.add(cellKey(c));
        positions.set(p.basicInfo.id, anchor);

        return { ...p, battleData: { ...p.battleData, position: anchor } };
    });
}
