'use client';

import { createContext, type ReactNode, useContext } from 'react';

export interface IdentityDraft {
    name: string;
    race: string;
    subrace: string;
    className: string;
    subclass: string;
    alignment: string;
    avatar: string | null;
    level: number;
    raceColor: string | null;
    raceIcon: string | null;
}

const IdentityDraftContext = createContext<IdentityDraft | null>(null);

export function IdentityDraftProvider({
    value,
    children,
}: {
    value: IdentityDraft | null;
    children: ReactNode;
}) {
    return (
        <IdentityDraftContext.Provider value={value}>
            {children}
        </IdentityDraftContext.Provider>
    );
}

export const useIdentityDraft = () => useContext(IdentityDraftContext);
