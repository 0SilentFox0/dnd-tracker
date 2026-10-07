"use client";

import { Suspense,useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { HudPage, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useNotify } from "@/lib/hooks/common";
import { createClient } from "@/lib/supabase/client";

function SignUpForm() {
  const notify = useNotify();

  const router = useRouter();

  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.push("/campaigns");
      }
    };

    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error signing up:", error);

        if (error.message?.includes("provider is not enabled")) {
          void notify("Google OAuth не налаштований. Будь ласка, зверніться до адміністратора.");
        } else {
          void notify(`Помилка при реєстрації: ${error.message}`);
        }

        return;
      }
    } catch (error) {
      console.error("Error signing up:", error);

      const errorMessage = error instanceof Error ? error.message : "Невідома помилка";

      void notify(`Помилка при реєстрації: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Реєстрація в D&D Combat Tracker" description="Створіть акаунт щоб продовжити" error={error}>
      <Button
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? "Реєстрація..." : "Реєстрація через Google"}
      </Button>
    </AuthCard>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <HudPage width="md" className="flex min-h-[80vh] items-center justify-center">
          <HudPanel className="w-full max-w-sm text-center">Завантаження...</HudPanel>
        </HudPage>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
