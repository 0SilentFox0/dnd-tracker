'use client';

import { createContext, type ReactNode, useContext } from 'react';

export interface IdentityDraft {
    name?: string;
    race?: string;
    subrace?: string | null;
    class?: string;
    subclass?: string | null;
    alignment?: string | null;
    avatar?: string | null;
    level?: number;
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
