"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Lock } from "lucide-react";

import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGenerateScenarioSummary, useScenarioSummaries } from "@/lib/hooks/scenario";

function SummaryList({ title, items, icon }: { title: string; items: string[]; icon?: ReactNode }) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-1 flex items-center gap-1 font-medium">{icon}{title}</p>
      <ul className="list-disc pl-5">
        {items.map((e, i) => <li key={`${i}-${e}`}>{e}</li>)}
      </ul>
    </div>
  );
}

export function ScenarioSummaryPanel({ campaignId, pageId }: { campaignId: string; pageId: string }) {
  const t = useTranslations("scenario.summary");

  const query = useScenarioSummaries(campaignId);

  const { generate, pendingPageId, errorFor } = useGenerateScenarioSummary(campaignId);

  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  if (query.isPending) return <div role="status" aria-label={t("loading")} className="h-16 animate-pulse rounded bg-muted" />;

  const available = query.data?.available ?? false;

  const entry = query.data?.summaries[pageId];

  const pending = pendingPageId === pageId;

  const error = errorFor(pageId);

  const disabled = !available || pending;

  return (
    <div className="flex flex-col gap-3 text-sm">
      {entry ? (
        <>
          {entry.stale ? <Badge variant="outline" className="self-start">{t("stale")}</Badge> : null}
          <p>{entry.summary.overview}</p>
          <SummaryList title={t("events")} items={entry.summary.events} />
          <SummaryList title={t("secrets")} items={entry.summary.secrets} icon={<Lock className="size-3.5" aria-hidden />} />
        </>
      ) : (
        <p className="text-muted-foreground">{t("empty")}</p>
      )}
      <Button size="sm" variant={entry ? "outline" : "default"} className="self-start" disabled={disabled} onClick={() => generate(pageId, !!entry)}>
        {pending ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden /> : null}
        {pending ? t("generating") : entry ? t("refresh") : t("generate")}
      </Button>
      {!available ? <p className="text-xs text-muted-foreground">{t("unavailable")}</p> : null}
      {error !== null ? <p role="alert" className="text-sm text-destructive">{error || t("failed")}</p> : null}
    </div>
  );
}
