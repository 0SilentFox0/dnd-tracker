"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

import { SourceSyncDialog } from "@/components/campaigns/templates/SourceSyncDialog";
import { Button } from "@/components/ui/button";
import { useApplySafeSourceChanges } from "@/lib/hooks/campaigns";

export function SourceUpdateTile({ campaignId, version }: { campaignId: string; version: number }) {
  const t = useTranslations("dashboard");

  const [open, setOpen] = useState(false);

  const safe = useApplySafeSourceChanges(campaignId);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm text-hud-ink shadow-[inset_0_0_0_1px_var(--color-hud-gold-strong)]">
      <RefreshCw className="size-4 shrink-0 text-hud-gold" aria-hidden />
      <span className="min-w-0 flex-1">
        {t("sourceUpdate.text", { version })}
        {safe.data && <span className="block text-xs text-hud-muted" role="status">{t("sourceUpdate.applied", { count: safe.data.applied })}</span>}
        {safe.isError && <span className="block text-xs text-hud-danger" role="alert">{t("sourceUpdate.failed")}</span>}
      </span>
      <Button variant="outline" size="sm" disabled={safe.isPending} onClick={() => safe.mutate()}>{t("sourceUpdate.applySafe")}</Button>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>{t("sourceUpdate.review")}</Button>
      <SourceSyncDialog campaignId={campaignId} isTemplate={false} open={open} onOpenChange={setOpen} />
    </div>
  );
}
