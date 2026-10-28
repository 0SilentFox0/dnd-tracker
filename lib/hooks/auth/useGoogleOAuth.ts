"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useNotify } from "@/lib/hooks/common";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/utils/auth";

function useOAuthRunner() {
  const notify = useNotify();

  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<{ message: string } | null>) => {
    setLoading(true);

    try {
      const error = await action();

      if (error) {
        console.error("Google OAuth", error);
        void notify(authErrorMessage(error));
      }
    } catch (err) {
      console.error("Google OAuth", err);
      void notify(authErrorMessage(err instanceof Error ? err : null));
    } finally {
      setLoading(false);
    }
  };

  return { loading, run };
}

async function signInWithGoogle(next: string | null) {
  const redirectTo = new URL("/auth/callback", window.location.origin);

  if (next) redirectTo.searchParams.set("next", next);

  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString(), queryParams: { prompt: "select_account" } },
  });

  return error;
}

export function useGoogleOAuth() {
  const searchParams = useSearchParams();

  const { loading, run } = useOAuthRunner();

  const start = () => run(() => signInWithGoogle(searchParams.get("next")));

  return { loading, start };
}

export function useSwitchGoogleAccount() {
  const { loading, run } = useOAuthRunner();

  const start = () =>
    run(async () => {
      await createClient().auth.signOut({ scope: "local" });

      return signInWithGoogle(window.location.pathname);
    });

  return { loading, start };
}
