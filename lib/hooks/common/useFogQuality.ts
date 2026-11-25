import { useSyncExternalStore } from 'react';

import { useCoarsePointer } from './useCoarsePointer';
import { useIsMobile } from './useIsMobile';
import { usePageHidden } from './usePageHidden';
import { useReducedMotion } from './useReducedMotion';

export type FogQuality = 'live' | 'still' | 'flat';

export interface FogQualityInputs {
    reduced: boolean;
    hidden: boolean;
    compact: boolean;
    saveData?: boolean;
    memory?: number;
    cores?: number;
    effectiveType?: string;
}

export function fogQualityOf(i: FogQualityInputs): FogQuality {
    const slowLink = i.effectiveType === 'slow-2g' || i.effectiveType === '2g';

    const weak =
        (i.memory !== undefined && i.memory <= 2) ||
        (i.cores !== undefined && i.cores <= 2);

    if (i.saveData || slowLink || weak) return 'flat';

    const modest =
        (i.memory !== undefined && i.memory <= 4) ||
        (i.cores !== undefined && i.cores <= 4);

    if (i.reduced || i.hidden || (i.compact && modest)) return 'still';

    return 'live';
}

type Hints = Pick<
    FogQualityInputs,
    'saveData' | 'memory' | 'cores' | 'effectiveType'
>;

const NO_HINTS: Hints = {};

let hints: Hints | null = null;

function readHints(): Hints {
    if (hints) return hints;

    if (typeof navigator === 'undefined') return NO_HINTS;

    const nav = navigator as Navigator & {
        deviceMemory?: number;
        connection?: { saveData?: boolean; effectiveType?: string };
    };

    hints = {
        saveData: nav.connection?.saveData,
        memory: nav.deviceMemory,
        cores: nav.hardwareConcurrency,
        effectiveType: nav.connection?.effectiveType,
    };

    return hints;
}

const subscribeNone = () => () => {};

export function useFogCompact() {
    const mobile = useIsMobile();

    const coarse = useCoarsePointer();

    return mobile || coarse;
}

export function useFogQuality(): FogQuality {
    const reduced = useReducedMotion();

    const hidden = usePageHidden();

    const compact = useFogCompact();

    const device = useSyncExternalStore(
        subscribeNone,
        readHints,
        () => NO_HINTS
    );

    return fogQualityOf({ reduced, hidden, compact, ...device });
}
