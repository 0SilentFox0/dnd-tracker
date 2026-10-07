"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useNotify } from "@/lib/hooks/common";
import { createClient } from "@/lib/supabase/client";

export type GoogleAuthMode = "sign-in" | "sign-up";

const FAILURE: Record<GoogleAuthMode, string> = { "sign-in": "Помилка при вході", "sign-up": "Помилка при реєстрації" };

export function useGoogleOAuth(mode: GoogleAuthMode) {
  const notify = useNotify();

  const router = useRouter();

  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const errorParam = searchParams.get("error");

  const error = errorParam ? decodeURIComponent(errorParam) : null;

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push("/campaigns");
    });
  }, [router, supabase]);

  const start = async () => {
    try {
      setLoading(true);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });

      if (oauthError) {
        console.error(FAILURE[mode], oauthError);
        void notify(oauthError.message?.includes("provider is not enabled") ? "Google OAuth не налаштований. Будь ласка, зверніться до адміністратора." : `${FAILURE[mode]}: ${oauthError.message}`);
      }
    } catch (err) {
      console.error(FAILURE[mode], err);
      void notify(`${FAILURE[mode]}: ${err instanceof Error ? err.message : "Невідома помилка"}`);
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, start };
}
