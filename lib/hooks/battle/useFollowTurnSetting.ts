'use client';

import { createStorageFlag, useStorageValue } from '@/lib/hooks/common';

const followTurnFlag = createStorageFlag('battle-map-follow-turn', false);

export function useFollowTurnSetting() {
    const follow = useStorageValue(followTurnFlag, false);

    return { follow, setFollow: followTurnFlag.set };
}
