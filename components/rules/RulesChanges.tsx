'use client';

import { createContext, useContext } from 'react';

interface RulesChanges {
    dirty: ReadonlySet<string>;
    reset: (key: string) => void;
}

export const RulesChangesContext = createContext<RulesChanges | null>(null);

export const useRulesChanges = () => useContext(RulesChangesContext);
