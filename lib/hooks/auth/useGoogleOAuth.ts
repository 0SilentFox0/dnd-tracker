"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { useNotify } from "@/lib/hooks/common";
import { createClient } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/utils/auth";

export function useGoogleOAuth() {
  const notify = useNotify();

  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);

    try {
      const redirectTo = new URL("/auth/callback", window.location.origin);

      const next = searchParams.get("next");

      if (next) redirectTo.searchParams.set("next", next);

      const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo.toString() } });

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

  return { loading, start };
}
