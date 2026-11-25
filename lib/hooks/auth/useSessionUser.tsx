'use client';

import {
    createContext,
    type ReactNode, useContext, useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';
import { type SessionUser, toSessionUser } from '@/lib/utils/auth/session-user';

export type { SessionUser };

export type AccountSeedValue = { user: SessionUser; hasPassword: boolean };

const AccountSeedContext = createContext<AccountSeedValue | null>(null);

export function AccountSeedProvider({
    value,
    children,
}: {
    value: AccountSeedValue | null;
    children: ReactNode;
}) {
    return (
        <AccountSeedContext.Provider value={value}>
            {children}
        </AccountSeedContext.Provider>
    );
}

export const useAccountSeed = () => useContext(AccountSeedContext);

// display only: getSession reads the cookie without a network round trip, the server still verifies every request
export function useSessionUser(): SessionUser | null {
    const seed = useAccountSeed();

    const [user, setUser] = useState<SessionUser | null>(seed?.user ?? null);

    useEffect(() => {
        const supabase = createClient();

        let alive = true;

        supabase.auth.getSession().then(({ data }) => {
            if (alive) setUser(toSessionUser(data.session?.user));
        });

        const { data: sub } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                if (alive) setUser(toSessionUser(session?.user));
            }
        );

        return () => {
            alive = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    return user;
}
