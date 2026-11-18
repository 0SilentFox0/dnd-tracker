'use client';

import {
    createStorageFlag,
    useReducedMotion,
    useStorageValue,
} from '@/lib/hooks/common';

const fxFlag = createStorageFlag('battle-fx', true);

export function useFxEnabled() {
    const userEnabled = useStorageValue(fxFlag, false);

    const motionAllowed = !useReducedMotion();

    return {
        enabled: userEnabled && motionAllowed,
        userEnabled,
        motionAllowed,
        setEnabled: fxFlag.set,
    };
}
