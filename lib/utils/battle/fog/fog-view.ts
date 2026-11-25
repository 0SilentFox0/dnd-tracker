import { EffectMarker } from '@/lib/constants/battle';
import { isEscaped } from '@/lib/utils/abilities/engine/core/participants';
import { cellKey } from '@/lib/utils/battle/grid/geometry';
import { centreCell } from '@/lib/utils/battle/grid/map-scene';
import { cellsOf, isFallen } from '@/lib/utils/battle/grid/occupancy';
import { visibleFromMany } from '@/lib/utils/battle/vision/shadowcast';
import type { BattleParticipant } from '@/types/battle';
import type {
    BattleMapConfig,
    FogMode,
    RevealedRun,
} from '@/types/battle-grid';

export interface FogViewResult {
    visible: ReadonlySet<string>;
    explored: ReadonlySet<string>;
    visibleIds: ReadonlySet<string>;
}

export function fogView({
    map,
    participants,
    mode,
    viewerId,
    isDM,
    revealed,
    radius,
    explored = new Set<string>(),
    shareAllies = false,
    tileBlocksSight,
}: {
    map: BattleMapConfig;
    participants: readonly BattleParticipant[];
    mode: FogMode;
    viewerId: string | null;
    isDM: boolean;
    revealed: readonly RevealedRun[];
    radius: number;
    explored?: ReadonlySet<string>;
    shareAllies?: boolean;
    tileBlocksSight?: ReadonlySet<string>;
}): FogViewResult {
    const visible = new Set<string>();

    const bypass = isDM || map.maze || mode === 'off';

    if (bypass) {
        for (let y = 0; y < map.rows; y++)
            for (let x = 0; x < map.cols; x++) visible.add(cellKey({ x, y }));
    } else if (mode === 'reveal') {
        for (const [y, start, end] of revealed)
            for (let x = start; x < end; x++) visible.add(cellKey({ x, y }));
    } else {
        const viewers = participants.filter(
            (p) =>
                !!p.battleData.position &&
                !p.battleData.reserved &&
                !p.battleData.escaped &&
                !isFallen(p) &&
                (p.basicInfo.controlledBy === viewerId ||
                    (shareAllies &&
                        p.basicInfo.side ===
                            participants.find(
                                (candidate) =>
                                    candidate.basicInfo.controlledBy ===
                                    viewerId
                            )?.basicInfo.side))
        );

        const cells = visibleFromMany(
            map,
            viewers.map(centreCell),
            radius,
            tileBlocksSight
        );

        for (const cell of cells) visible.add(cell);
    }

    const visibleIds = new Set<string>();

    for (const participant of participants) {
        const { basicInfo, battleData } = participant;

        if (bypass) {
            visibleIds.add(basicInfo.id);
            continue;
        }

        if (
            battleData.reserved ||
            isEscaped(participant) ||
            isFallen(participant)
        )
            continue;

        const own = basicInfo.controlledBy === viewerId;

        const position = battleData.position;

        const hidden = (battleData.activeEffects ?? []).some((effect) =>
            effect.effects.some((item) => item.type === EffectMarker.HIDDEN)
        );

        if (
            (own && position) ||
            (!hidden &&
                position &&
                cellsOf(participant, 'square').some((cell) =>
                    visible.has(cellKey(cell))
                ))
        )
            visibleIds.add(basicInfo.id);
    }

    const exploredCells = new Set(explored);

    for (const cell of visible) exploredCells.add(cell);

    return { visible, explored: exploredCells, visibleIds };
}
