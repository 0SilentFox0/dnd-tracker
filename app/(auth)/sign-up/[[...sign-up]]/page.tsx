"use client";

import { Suspense,useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

function SignUpForm() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Перевіряємо чи користувач вже авторизований
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        router.push("/campaigns");
      }
    };

    checkUser();
  }, [router, supabase]);

  // Перевіряємо помилки з URL
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
          alert("Google OAuth не налаштований. Будь ласка, зверніться до адміністратора.");
        } else {
          alert(`Помилка при реєстрації: ${error.message}`);
        }

        return;
      }
    } catch (error) {
      console.error("Error signing up:", error);

      const errorMessage = error instanceof Error ? error.message : "Невідома помилка";

      alert(`Помилка при реєстрації: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Реєстрація в D&D Combat Tracker</CardTitle>
          <CardDescription>
            Створіть акаунт щоб продовжити
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              Помилка: {error}
            </div>
          )}
          <Button
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? "Реєстрація..." : "Реєстрація через Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <div className="text-center">Завантаження...</div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
