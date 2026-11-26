import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import {
    type SessionUser as ClientSessionUser,
    toSessionUser,
} from '@/lib/utils/auth/session-user';

export interface SessionUser {
    id: string;
    email: string | null;
}

/** Verifies the session JWT locally (asymmetric signing keys); no Supabase Auth round trip. */
export async function getAuthUserOptional(): Promise<SessionUser | null> {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    const claims = data?.claims;

    if (!claims?.sub) return null;

    return { id: claims.sub, email: claims.email ?? null };
}

export async function getSessionUserId(): Promise<string | null> {
    return (await getAuthUserOptional())?.id ?? null;
}

export async function getAuthUser(): Promise<SessionUser> {
    const user = await getAuthUserOptional();

    if (!user) {
        redirect('/sign-in');
    }

    return user;
}

export interface AccountSeed {
    user: ClientSessionUser;
    hasPassword: boolean;
}

/** Display profile from the verified JWT claims, so account pages render fully in the first HTML. */
export async function getAccountSeed(): Promise<AccountSeed | null> {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    const claims = data?.claims;

    const user = claims?.sub
        ? toSessionUser({
              id: claims.sub,
              email: claims.email,
              user_metadata: claims.user_metadata,
          })
        : null;

    if (!user) return null;

    const providers = claims?.app_metadata?.providers;

    return {
        user,
        hasPassword: Array.isArray(providers) && providers.includes('email'),
    };
}
