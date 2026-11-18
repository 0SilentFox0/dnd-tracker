import { useMemo } from 'react';

import type { BattleSceneData, BattleSceneValue } from './types';

export function useBattleSceneDataValue(
    value: BattleSceneValue
): BattleSceneData {
    const {
        campaignId,
        battleId,
        battle,
        viewer,
        turn,
        roster,
        awaiting,
        effects,
        dmControl,
        select,
        clickParticipant,
        readBattle,
    } = value;

    return useMemo(
        () => ({
            campaignId,
            battleId,
            battle,
            viewer,
            turn,
            roster,
            awaiting,
            effects,
            dmControl,
            select,
            clickParticipant,
            readBattle,
        }),
        [
            campaignId,
            battleId,
            battle,
            viewer,
            turn,
            roster,
            awaiting,
            effects,
            dmControl,
            select,
            clickParticipant,
            readBattle,
        ]
    );
}
