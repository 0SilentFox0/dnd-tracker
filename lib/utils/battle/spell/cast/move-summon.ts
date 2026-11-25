import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import {
    type ActionFlow,
    getP,
    put,
} from '@/lib/utils/battle/common/action-flow';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { cellDistance, cellLine } from '@/lib/utils/battle/grid/geometry';
import { footprintSizeOf } from '@/lib/utils/battle/grid/occupancy';
import {
    fits,
    isOnMap,
    occupiedBy,
} from '@/lib/utils/battle/grid/occupancy';
import { zoneMove } from '@/lib/utils/battle/spell/zone-triggers';
import type { GridPoint } from '@/types/battle-grid';

interface MoveSummonInput {
    flow: ActionFlow;
    casterId: string;
    spell: { id: string };
    feet: number;
    aim: GridPoint | undefined;
}

export function moveSummon({
    flow,
    casterId,
    spell,
    feet,
    aim,
}: MoveSummonInput): void {
    const { map, rules, round, rng } = flow.ctx;

    const caster = getP(flow, casterId).basicInfo.name;

    const summon = flow.ps.find(
        (p) =>
            isActive(p) &&
            p.battleData.summonedBy === casterId &&
            p.battleData.object?.spellId === spell.id
    );

    if (!summon) {
        flow.messages.push(textRef('battleLog.spellFx.moveSummonNone', { caster }));

        return;
    }

    const name = summon.basicInfo.name;

    const from = summon.battleData.position;

    if (!map || !aim || !from || !isOnMap(summon)) return;

    const grid = gridOf(map);

    if (cellDistance(from, aim, grid) * cellFeetOf(rules) > feet) {
        flow.messages.push(
            textRef('battleLog.spellFx.moveSummonFar', {
                caster,
                summon: name,
                feet,
            })
        );

        return;
    }

    const blocked = occupiedBy(
        flow.ps,
        (p) => p.basicInfo.id !== summon.basicInfo.id,
        grid
    );

    const path: GridPoint[] = [];

    for (const cell of cellLine(from, aim, grid).slice(1)) {
        if (!fits(map, cell, footprintSizeOf(summon, grid), blocked)) break;

        path.push(cell);
    }

    const end = path[path.length - 1];

    if (!end) {
        flow.messages.push(
            textRef('battleLog.spellFx.moveSummonBlocked', {
                caster,
                summon: name,
            })
        );

        return;
    }

    const moved = {
        ...summon,
        battleData: { ...summon.battleData, position: end },
    };

    put(flow, moved);
    flow.messages.push(
        textRef('battleLog.spellFx.moveSummon', {
            caster,
            summon: name,
            feet: path.length * cellFeetOf(rules),
        })
    );

    const result = zoneMove({
        map,
        participants: flow.ps,
        moved,
        from,
        path,
        round,
        rng,
        rules,
    });

    flow.ps = result.participants;
    flow.messages.push(...result.messages);
}
