"use client";
import { useTranslations } from "next-intl";

import { LoadingState } from "@/components/common/states";
import type { CompendiumPhase } from "@/lib/hooks/compendium-import";
import type { MediaProgress } from "@/types/compendium-import";

export function CompendiumProgress({ phase, media }: { phase: CompendiumPhase; media: MediaProgress | null }) {
  const t = useTranslations("compendium.import.progress");

  if (phase === "idle") return null;

  if (phase === "media" && media) {
    const done = media.saved + media.failed;

    const label = t("media", { done, total: media.total });

    return <div role="status" aria-live="polite" className="space-y-2 rounded-xl border border-hud-line p-3 text-sm">
      <p>{label}</p>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={media.total} aria-valuenow={done} className="h-2 overflow-hidden rounded-full bg-hud-line">
        <div className="h-full bg-hud-gold transition-[width]" style={{ width: `${media.total > 0 ? Math.min(100, (done / media.total) * 100) : 0}%` }} />
      </div>
    </div>;
  }

  const label = t(phase === "media" ? "confirming" : phase, { done: 0, total: 0 });

  return <div role="status" aria-live="polite" className="space-y-2 rounded-xl border border-hud-line p-3 text-sm">
    <p>{label}</p>
    <LoadingState rows={1} label={label} />
  </div>;
}
