'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useBattleScene } from './useBattleScene';

import {
    aimInRange,
    cellsOf,
    footprintSizeOf,
    gridOf,
} from '@/lib/utils/battle/grid';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import type { ResolvedAbility } from '@/types/abilities';
import type { BattleParticipant } from '@/types/battle';
import type { GridPoint } from '@/types/battle-grid';

export function useAbilityMapAim(
    participant: BattleParticipant,
    onAim: (ability: ResolvedAbility, cell: GridPoint) => void
) {
    const {
        intents: { setMapAim },
        battle: { rules, map },
    } = useBattleScene();

    const [ability, setAbility] = useState<ResolvedAbility | null>(null);

    const fire = useRef(onAim);

    const grid = gridOf(map);

    const origin = useRef(cellsOf(participant, grid));

    useEffect(() => {
        fire.current = onAim;
        origin.current = cellsOf(participant, grid);
    });

    const casterId = participant.basicInfo.id;

    const size = footprintSizeOf(participant, grid) * cellFeetOf(rules);

    useEffect(() => {
        if (!ability?.aim) return;

        const { kind, range } = ability.aim;

        setMapAim({
            template:
                kind === 'direction'
                    ? { shape: 'line', size: range }
                    : { shape: 'cube', size },
            casterId,
            range,
            onAim: (cell) => {
                if (
                    kind === 'direction' &&
                    !aimInRange(origin.current, cell, range, rules, grid)
                )
                    return;

                setAbility(null);
                fire.current(ability, cell);
            },
        });

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setAbility(null);
        };

        window.addEventListener('keydown', onKey);

        return () => {
            window.removeEventListener('keydown', onKey);
            setMapAim(null);
        };
    }, [ability, casterId, size, setMapAim, rules, grid]);

    const cancel = useCallback(() => setAbility(null), []);

    return { ability, start: setAbility, cancel };
}
