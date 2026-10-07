"use client";

import { Suspense } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { HudPage, HudPanel } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { type GoogleAuthMode, useGoogleOAuth } from "@/lib/hooks/auth";

const COPY: Record<GoogleAuthMode, { title: string; description: string; idle: string; busy: string }> = {
  "sign-in": { title: "Вхід в D&D Combat Tracker", description: "Увійдіть щоб продовжити", idle: "Вхід через Google", busy: "Вхід..." },
  "sign-up": { title: "Реєстрація в D&D Combat Tracker", description: "Створіть акаунт щоб продовжити", idle: "Реєстрація через Google", busy: "Реєстрація..." },
};

function GoogleAuthCard({ mode }: { mode: GoogleAuthMode }) {
  const { loading, error, start } = useGoogleOAuth(mode);

  const copy = COPY[mode];

  return (
    <AuthCard title={copy.title} description={copy.description} error={error}>
      <Button onClick={start} disabled={loading} className="w-full" size="lg">
        {loading ? copy.busy : copy.idle}
      </Button>
    </AuthCard>
  );
}

export function GoogleAuthForm({ mode }: { mode: GoogleAuthMode }) {
  return (
    <Suspense
      fallback={
        <HudPage width="md" className="flex min-h-[80vh] items-center justify-center">
          <HudPanel className="w-full max-w-sm text-center">Завантаження...</HudPanel>
        </HudPage>
      }
    >
      <GoogleAuthCard mode={mode} />
    </Suspense>
  );
}
