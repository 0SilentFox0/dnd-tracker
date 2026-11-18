'use client';

import { createContext, useContext, useMemo } from 'react';

import { useBattleSceneData } from '@/lib/hooks/battle/useBattleScene';
import type { ModeView } from '@/lib/utils/battle/modes';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';

export interface ModeViewValue {
    view: ModeView | null;
    visible(p: BattleParticipant): boolean;
    /** Журнал для FX: уже відфільтрований режимом */
    fxLog: BattleAction[];
}

export const ModeViewContext = createContext<ModeViewValue | null>(null);

const seesAll = () => true;

const NO_LOG: BattleAction[] = [];

/** Без провайдера режиму — бачить усіх і весь журнал (звичайний бій). */
export function useModeView(): ModeViewValue {
    const value = useContext(ModeViewContext);

    const { battle } = useBattleSceneData();

    const log = battle.battleLog ?? NO_LOG;

    const fallback = useMemo<ModeViewValue>(
        () => ({ view: null, visible: seesAll, fxLog: log }),
        [log]
    );

    return value ?? fallback;
}
