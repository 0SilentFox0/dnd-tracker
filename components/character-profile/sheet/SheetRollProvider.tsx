'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { SheetRollDialog } from '../rest/SheetRollDialog';
import { useSheetRollRequest } from './useSheetRoll';

import type { SheetRollRequest } from '@/components/systems/types';

interface SheetRoll {
    onRoll: (request: SheetRollRequest) => void;
    canRoll: boolean;
}

const NO_ROLL: SheetRoll = { onRoll: () => {}, canRoll: false };

const SheetRollContext = createContext<SheetRoll>(NO_ROLL);

export const useSheetRoll = () => useContext(SheetRollContext);

export function SheetRollProvider({ children }: { children: ReactNode }) {
    const { request, setRequest, close, canRoll } = useSheetRollRequest();

    const value = useMemo(
        () => ({ onRoll: setRequest, canRoll }),
        [setRequest, canRoll]
    );

    return (
        <SheetRollContext.Provider value={value}>
            {children}
            {canRoll && <SheetRollDialog request={request} onClose={close} />}
        </SheetRollContext.Provider>
    );
}
