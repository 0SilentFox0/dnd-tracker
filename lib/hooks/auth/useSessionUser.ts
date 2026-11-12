'use client';

import { useEffect, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export type SessionUser = { email: string | null; avatarUrl: string | null };

// display only: getSession reads the cookie without a network round trip, the server still verifies every request
export function useSessionUser(): SessionUser | null {
    const [user, setUser] = useState<SessionUser | null>(null);

    useEffect(() => {
        let alive = true;

        createClient()
            .auth.getSession()
            .then(({ data }) => {
                if (!alive) return;

                const u = data.session?.user;

                const meta = u?.user_metadata as
                    | { avatar_url?: unknown; picture?: unknown }
                    | undefined;

                const photo = [meta?.avatar_url, meta?.picture].find(
                    (v): v is string =>
                        typeof v === 'string' && v.startsWith('https://')
                );

                setUser(
                    u
                        ? { email: u.email ?? null, avatarUrl: photo ?? null }
                        : null
                );
            });

        return () => {
            alive = false;
        };
    }, []);

    return user;
}
