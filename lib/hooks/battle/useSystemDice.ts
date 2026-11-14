import { useMemo } from 'react';

import { useModeView } from './modes/useModeView';
import { useBattleSceneData } from './useBattleScene';

import type { SystemDice, SystemFx } from '@/lib/utils/battle/fx';

const NONE: SystemDice[] = [];

export function useSystemDice(fx?: SystemFx): SystemDice[] {
    const { visible } = useModeView();

    const { battle } = useBattleSceneData();

    const { currentRound, currentTurnIndex, initiativeOrder } = battle;

    const { pendingMoraleCheck } = battle;

    return useMemo(() => {
        const sources = fx?.dice;

        if (!sources?.length) return NONE;

        const event = {
            round: currentRound,
            turnIndex: currentTurnIndex,
            participants: initiativeOrder,
            scene: { pendingMoraleCheck },
            visible,
        };

        return sources.flatMap((source) => source(event) ?? []);
    }, [
        fx,
        pendingMoraleCheck,
        currentRound,
        currentTurnIndex,
        initiativeOrder,
        visible,
    ]);
}
