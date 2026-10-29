"use client";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CompendiumImportController } from "@/lib/hooks/compendium-import";
import { useTranslator } from "@/lib/i18n/use-translator";
import { groupMediaFailures, mediaReasonLabel } from "@/lib/utils/compendium-import/labels";
import type { MediaProgress } from "@/types/compendium-import";

const FAILURES_STEP = 20;

type MediaActions = CompendiumImportController["actions"]["media"];

function FailureGroup({ group }: { group: ReturnType<typeof groupMediaFailures>[number] }) {
  const t = useTranslator("compendium");

  const { reason, params, items } = group;

  const [shown, setShown] = useState(FAILURES_STEP);

  return <li><details className="rounded-lg border border-hud-rule px-3 py-2">
    <summary className="cursor-pointer"><strong>{mediaReasonLabel(t, reason, params)}</strong> <span className="text-hud-muted">{items.length}</span></summary>
    <ul className="mt-2 space-y-1 text-xs">{items.slice(0, shown).map(item => <li className="break-all" key={item.id}>{item.host} · {item.file}</li>)}</ul>
    {items.length > shown && <Button className="mt-2" variant="outline" size="sm" onClick={() => setShown(shown + FAILURES_STEP)}>{t("report.showMore", { count: items.length - shown })}</Button>}
  </details></li>;
}

export function CompendiumMediaReport({ media, running, paused, actions }: { media: MediaProgress; running: boolean; paused: boolean; actions: Pick<MediaActions, "resume" | "retryFailed"> }) {
  const t = useTranslator("compendium");

  const groups = useMemo(() => groupMediaFailures(media.failures), [media.failures]);

  if (media.total === 0 && media.skipped === 0) return null;

  const tiles = [[t("import.media.saved"), media.saved, false], [t("import.media.failed"), media.failed, media.failed > 0], [t("import.media.skipped"), media.skipped, false], [t("import.media.queued"), media.pending, false]] as const;

  return <section className="space-y-3 text-sm" aria-label={t("import.media.title")}>
    <h3 className="hud-sc text-base text-hud-ink">{t("import.media.title")}</h3>
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tiles.map(([label, value, bad]) => <li className="rounded-lg border border-hud-line bg-hud-panel px-3 py-2 text-center" key={label}><b className={`block text-lg ${bad ? "text-hud-bad" : "text-hud-ink"}`}>{value}</b><span className="text-xs text-hud-muted">{label}</span></li>)}</ul>
    {paused && media.pending > 0 && <p className="text-hud-muted">{t("import.media.paused")}</p>}
    {groups.length > 0 && <ul className="space-y-2">{groups.map(group => <FailureGroup key={group.key} group={group} />)}</ul>}
    {!running && <div className="flex flex-wrap gap-2">
      {media.pending > 0 && <Button size="sm" onClick={actions.resume}>{t("import.media.resume")}</Button>}
      {media.retryable > 0 && <Button variant="outline" size="sm" onClick={actions.retryFailed}>{t("import.media.retry")}</Button>}
    </div>}
  </section>;
}
