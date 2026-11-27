'use client';

import { createStorageFlag, useStorageValue } from '@/lib/hooks/common';

const autoEndTurnFlag = createStorageFlag('battle-auto-end-turn', true);

export const readAutoEndTurn = autoEndTurnFlag.get;

export function useAutoEndTurnSetting() {
    const autoEnd = useStorageValue(autoEndTurnFlag, true);

    return { autoEnd, setAutoEnd: autoEndTurnFlag.set };
}
