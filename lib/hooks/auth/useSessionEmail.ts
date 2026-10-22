"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

// display only: getSession reads the cookie without a network round trip, the server still verifies every request
export function useSessionEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    createClient()
      .auth.getSession()
      .then(({ data }) => alive && setEmail(data.session?.user.email ?? null));

    return () => {
      alive = false;
    };
  }, []);

  return email;
}
