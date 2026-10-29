"use client";
import { HudPill } from "@/components/hud/page";
import { useTranslator } from "@/lib/i18n/use-translator";
import { mediaReasonLabel } from "@/lib/utils/compendium-import/labels";
import type { MediaPlanSummary } from "@/types/compendium-import";

export function CompendiumMediaSummary({ media }: { media: MediaPlanSummary }) {
  const t = useTranslator("compendium");

  const skipped = Object.entries(media.skipped).filter(([, count]) => (count ?? 0) > 0);

  if (media.queued === 0 && skipped.length === 0) return null;

  return <div className="space-y-1">
    <p>{t("import.media.summary", { count: media.queued })}</p>
    {skipped.length > 0 && <details className="rounded-lg border border-hud-rule px-3 py-2 text-xs">
      <summary className="cursor-pointer">{t("import.media.skippedTitle")} <HudPill tone="muted">{skipped.reduce((sum, [, count]) => sum + (count ?? 0), 0)}</HudPill></summary>
      <ul className="mt-2 space-y-1">{skipped.map(([reason, count]) => <li key={reason}>{mediaReasonLabel(t, reason)}: {count}</li>)}</ul>
    </details>}
  </div>;
}
