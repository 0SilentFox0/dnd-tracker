'use client';

import { DockWaiting } from './DockWaiting';

import { MyTurnControls } from '@/components/battle/turn/MyTurnControls';
import { BattleStatus } from '@/lib/constants/battle';
import { useBattleScene } from '@/lib/hooks/battle';
import { myTurnKey, showDock } from '@/lib/utils/battle/view';

export function TurnDock() {
    const {
        battle,
        roster: { hero },
        turn: { current, isMyTurn },
        viewer: { readOnly },
    } = useBattleScene();

    return (
        <>
            {hero &&
                showDock(hero, readOnly) &&
                battle.status === BattleStatus.ACTIVE &&
                (isMyTurn ? (
                    <MyTurnControls
                        key={myTurnKey(hero, battle.currentRound)}
                        hero={hero}
                        dock
                    />
                ) : (
                    current && <DockWaiting name={current.basicInfo.name} />
                ))}
        </>
    );
}
