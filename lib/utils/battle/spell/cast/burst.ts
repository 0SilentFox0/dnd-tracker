import {
    findParticipant,
    isActive,
    isObject,
} from '@/lib/utils/abilities/engine/core/participants';
import type { ActionFlow } from '@/lib/utils/battle/common/action-flow';
import { cellsOf, footprintDistance } from '@/lib/utils/battle/grid';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { gridOf } from '@/lib/utils/battle/grid/geometry';
import { bothOnMap } from '@/lib/utils/battle/grid/occupancy';
import { burstsOf } from '@/lib/utils/battle/spell/cast/state';
import { fireTrigger } from '@/lib/utils/battle/spell/zone-fire';
import { rollDice } from '@/lib/utils/common/dice';
import type { SpellEffect } from '@/lib/utils/spells/model/schema';

const DICE_COUNT = /^(\d+)d(\d+)$/;

const scaled = (dice: string, extra: number) => {
    const m = DICE_COUNT.exec(dice);

    return m && extra > 0 ? `${Number(m[1]) + extra}d${m[2]}` : dice;
};

interface BurstInput {
    flow: ActionFlow;
    effects: SpellEffect[];
    casterId: string;
    centreId: string | undefined;
    spell: { id: string; name: string };
    saveDc: number | undefined;
    upcastSteps: number;
}

export function applyBursts({
    flow,
    effects,
    casterId,
    centreId,
    spell,
    saveDc,
    upcastSteps,
}: BurstInput): void {
    const centre = centreId ? findParticipant(flow.ps, centreId) : undefined;

    if (!centre) return;

    const { map, rules, round, rng } = flow.ctx;

    const grid = gridOf(map);

    for (const { effect, index } of burstsOf(effects)) {
        const victims = flow.ps.filter(
            (p) =>
                isActive(p) &&
                !isObject(p) &&
                (p.basicInfo.id === centre.basicInfo.id ||
                    (bothOnMap(map, centre, p) &&
                        footprintDistance(
                            cellsOf(centre, grid),
                            cellsOf(p, grid),
                            grid
                        ) *
                            cellFeetOf(rules) <=
                            effect.radiusFeet))
        );

        const rolled = String(
            rollDice(
                scaled(effect.dice, (effect.upcastDice ?? 0) * upcastSteps),
                rng
            )
        );

        for (const v of victims) {
            const fired = fireTrigger(
                flow.ps,
                {
                    casterId,
                    spellId: spell.id,
                    spellName: spell.name,
                    ...(saveDc !== undefined && { dc: saveDc }),
                    side: 'all',
                    hitKey: `burst:${spell.id}:${index}`,
                    dice: rolled,
                },
                effect.trigger,
                'onTurnStart',
                v.basicInfo.id,
                { map, round, rng, rules }
            );

            flow.ps = fired.participants;
            flow.messages.push(...fired.messages);
        }
    }
}
