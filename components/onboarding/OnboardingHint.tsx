"use client";

import Link from "next/link";
import { Lightbulb, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useOnboardingHint } from "@/lib/hooks/onboarding";
import { HINTS } from "@/lib/onboarding/hints";
import { cn } from "@/lib/utils";

export function OnboardingHint({ id, className }: { id: string; className?: string }) {
  const { visible, dismiss } = useOnboardingHint(id);

  const hint = HINTS[id];

  if (!hint || !visible) return null;

  return (
    <aside className={cn("flex items-start gap-3 rounded-lg border border-hud-rule bg-hud-panel p-3 text-sm", className)}>
      <Lightbulb className="mt-0.5 size-4 shrink-0 text-hud-gold" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-hud-ink">{hint.title}</p>
        <p className="text-hud-muted">{hint.body}</p>
        {hint.helpSlug && (
          <Link href={`/help/${hint.helpSlug}`} className="text-hud-gold hover:underline">
            Детальніше
          </Link>
        )}
      </div>
      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={dismiss} aria-label="Закрити підказку">
        <X className="size-4" />
      </Button>
    </aside>
  );
}
