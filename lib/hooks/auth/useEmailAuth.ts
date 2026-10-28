"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { localeApi } from "@/lib/api/locale";
import { AFTER_SIGN_IN_PATH, RESET_PASSWORD_PATH } from "@/lib/constants/auth";
import { LOCALE_CHANGE_EVENT } from "@/lib/i18n/client-locale-provider";
import type { NewPasswordValues, SignInValues, SignUpValues } from "@/lib/schemas/auth";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage, safeNextPath } from "@/lib/utils/auth";

function useAuthClient() {
  return useMemo(() => createClient(), []);
}

function callbackUrl(next?: string): string {
  const url = new URL("/auth/callback", window.location.origin);

  if (next) url.searchParams.set("next", next);

  return url.toString();
}

function useRequestState() {
  const [pending, setPending] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const run = async (request: () => Promise<{ code?: string; message?: string } | null>): Promise<boolean> => {
    setPending(true);
    setError(null);

    try {
      const failure = await request();

      if (failure) setError(authErrorMessage(failure));

      return !failure;
    } catch (e) {
      setError(authErrorMessage(e instanceof Error ? e : null));

      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, error, run };
}

export function useResendConfirmation() {
  const supabase = useAuthClient();

  const { pending, error, run } = useRequestState();

  const [sent, setSent] = useState(false);

  const resend = async (email: string) => {
    const ok = await run(async () => (await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: callbackUrl() } })).error);

    setSent(ok);
  };

  return { pending, error, sent, resend };
}

export function useEmailSignIn() {
  const supabase = useAuthClient();

  const router = useRouter();

  const searchParams = useSearchParams();

  const { pending, error, run } = useRequestState();

  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);

  const signIn = async (values: SignInValues) => {
    setUnconfirmedEmail(null);

    const ok = await run(async () => {
      const { error: failure } = await supabase.auth.signInWithPassword(values);

      if (failure?.code === "email_not_confirmed") setUnconfirmedEmail(values.email);

      return failure;
    });

    if (!ok) return;

    await localeApi.get().catch(() => null);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
    router.replace(safeNextPath(searchParams.get("next")));
    router.refresh();
  };

  return { pending, error, unconfirmedEmail, signIn };
}

export function useEmailSignUp() {
  const supabase = useAuthClient();

  const router = useRouter();

  const { pending, error, run } = useRequestState();

  const [sentTo, setSentTo] = useState<string | null>(null);

  const signUp = async ({ displayName, email, password }: SignUpValues) => {
    let signedIn = false;

    const ok = await run(async () => {
      const { data, error: failure } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl(), data: { full_name: displayName } },
      });

      signedIn = !!data.session;

      return failure;
    });

    if (!ok) return;

    // projects without email confirmation hand back a session right away
    if (signedIn) {
      router.replace(AFTER_SIGN_IN_PATH);
      router.refresh();

      return;
    }

    setSentTo(email);
  };

  return { pending, error, sentTo, signUp, reset: () => setSentTo(null) };
}

export function usePasswordResetRequest() {
  const supabase = useAuthClient();

  const { pending, error, run } = useRequestState();

  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async (email: string) => {
    const ok = await run(async () => (await supabase.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl(RESET_PASSWORD_PATH) })).error);

    if (ok) setSentTo(email);
  };

  return { pending, error, sentTo, send };
}

export type PasswordSession = "checking" | "ready" | "missing";

/** Sets a new password for the signed-in user: after a recovery link, or from the account settings. */
export function useUpdatePassword() {
  const supabase = useAuthClient();

  const { pending, error, run } = useRequestState();

  const [session, setSession] = useState<PasswordSession>("checking");

  const [email, setEmail] = useState<string | null>(null);

  const [hasPassword, setHasPassword] = useState(false);

  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!alive) return;

      setSession(user ? "ready" : "missing");
      setEmail(user?.email ?? null);
      setHasPassword(!!user?.identities?.some((i) => i.provider === "email"));
    });

    return () => {
      alive = false;
    };
  }, [supabase]);

  const update = async ({ password }: NewPasswordValues) => {
    setDone(false);

    const ok = await run(async () => (await supabase.auth.updateUser({ password })).error);

    if (ok) {
      setDone(true);
      setHasPassword(true);
    }
  };

  return { session, email, hasPassword, pending, error, done, update };
}

/** Bounces an already signed-in visitor away from the auth screens. */
export function useRedirectIfSignedIn() {
  const supabase = useAuthClient();

  const router = useRouter();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace(AFTER_SIGN_IN_PATH);
    });
  }, [router, supabase]);
}

export function useAuthUrlError(): string | null {
  const params = useSearchParams();

  const code = params.get("error_code") ?? params.get("error");

  return code ? authErrorMessage(code) : null;
}
