"use client";

import Link from "next/link";
import { Lightbulb, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHydrated } from "@/lib/hooks/common";
import { useMarkPlayerSheetSeen, useOnboardingHint } from "@/lib/hooks/onboarding";
import { useTranslator } from "@/lib/i18n/use-translator";
import { HINTS } from "@/lib/onboarding/hints";
import { cn } from "@/lib/utils";

export function OnboardingHint({ id, className }: { id: string; className?: string }) {
  const t = useTranslator("onboarding");

  const { visible, dismiss } = useOnboardingHint(id);

  const hydrated = useHydrated();

  const hint = HINTS[id];

  // flags may already be cached on the client (soft navigation, back) while the server HTML has no hint
  if (!hint || !visible || !hydrated) return null;

  return (
    <aside className={cn("flex items-start gap-3 rounded-lg border border-hud-rule bg-hud-panel p-3 text-sm", className)}>
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-hud-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-hud-ink">{t(`hints.${id}.title`)}</p>
        <p className="text-hud-muted">{t(`hints.${id}.body`)}</p>
        {hint.helpSlug && (
          <Link href={`/help/${hint.helpSlug}`} className="text-hud-gold hover:underline">
            {t("ui.learnMore")}
          </Link>
        )}
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={dismiss} aria-label={t("ui.closeHint")}>
        <X className="size-4" />
      </Button>
    </aside>
  );
}

/** Owner of an approved hero: the hint plus the «sheet seen» step of the player checklist. */
export function PlayerSheetHint({ className }: { className?: string }) {
  useMarkPlayerSheetSeen();

  return <OnboardingHint id="player.character" className={className} />;
}
