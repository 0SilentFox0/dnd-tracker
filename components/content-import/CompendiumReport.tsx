"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

import { SourceNotes } from "./SourceNotes";

import { PagerNav } from "@/components/common/PagerNav";
import { Button } from "@/components/ui/button";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import { useTranslator } from "@/lib/i18n/use-translator";
import { downloadText } from "@/lib/utils/common/download-text";
import { categoryLabel, destination } from "@/lib/utils/compendium-import/flow";
import { editionLabel, entryLabel, infoSummary, readablePath, sourceLabel, splitInfoIssues, statusLabel } from "@/lib/utils/compendium-import/labels";
import type { CompendiumReport as Report } from "@/types/compendium-import";

export function CompendiumReport({ campaignId, report, committed = false }: { campaignId: string; report: Report; committed?: boolean }) {
  const t = useTranslator("compendium");

  const { actions: manualActions, info } = useMemo(() => splitInfoIssues(report.nextActions), [report.nextActions]);

  const rows = usePager(report.rows, COMPENDIUM_PAGE_SIZES.reportRows), actions = usePager(manualActions, COMPENDIUM_PAGE_SIZES.reportActions);

  const [notes, setNotes] = useState<{ kind: string; targetId: string } | null>(null);

  return <section className="space-y-3 break-words text-sm" aria-label={t("report.ariaLabel")}>
    <p className={report.readyToImport ? "text-hud-good" : "text-hud-bad"}>{t(report.readyToImport ? "report.canImport" : "report.blocked")}</p>
    <p>{t(report.readyToPlay ? "report.playReady" : "report.manualNeeded")}</p>
    <p>{t("report.counts", report.counts)}</p>
    <details open><summary className="cursor-pointer text-hud-gold">{t("report.sources")}</summary>
      <ul className="text-hud-muted">{report.sources.map((source, index) => <li key={index}>{sourceLabel(t, source)}</li>)}</ul>
      <p>{Object.entries(report.editionSummary).map(([key, value]) => t("report.editionCount", { edition: editionLabel(t, key), count: value })).join("; ")}</p>
    </details>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm [&_td]:py-1 [&_td]:pr-3 [&_th]:pr-3 [&_th]:text-hud-muted"><thead><tr><th>{t("report.colCategory")}</th><th>{t("report.colPresent")}</th><th>{t("report.colMapped")}</th><th>{t("report.colPartial")}</th><th>{t("report.colSkipped")}</th></tr></thead><tbody>
      {Object.entries(report.countsByCategory).map(([kind, count]) => <tr key={kind}><td>{categoryLabel(t, kind)}</td><td>{count.present}</td><td>{count.mapped}</td><td>{count.partial}</td><td>{count.skipped}</td></tr>)}
    </tbody></table></div>
    <h3 className="hud-sc text-base text-hud-ink">{t("report.rows")}</h3>
    <ul>{rows.pageItems.map((row, index) => <li className="mb-3 space-y-1 break-all" key={`${row.canonicalKey}:${index}`}>
      <p>{entryLabel(t, row.canonicalKey)} · {statusLabel(t, row.status)} · {t(`coverage.${row.coverage === "native" || row.coverage === "manual" ? row.coverage : "partial"}`)}</p>
      {splitInfoIssues(row.issues).actions.map((issue, i) => <p key={i} title={issue.code}>{issue.action} ({readablePath(t, issue.path)})</p>)}
      {committed && <><Button variant="outline" size="sm" asChild><Link href={destination(campaignId, row)}>{t("report.openEditor")}</Link></Button>{" "}<Button variant="outline" size="sm" onClick={() => setNotes(row)}>{t("report.sourceNotes")}</Button></>}
    </li>)}</ul>
    <PagerNav ariaLabel={t("report.rowsPager")} pager={rows} labels={{ prev: t("report.rowsPrev"), next: t("report.rowsNext") }} />
    <h3 className="hud-sc text-base text-hud-ink">{t("report.next")}</h3>
    <ol>{actions.pageItems.map((issue, index) => {
      const row = report.rows.find(r => issue.path.startsWith(r.canonicalKey) || r.issues.some(owned => owned.code === issue.code && owned.path === issue.path));

      return <li className="mb-2" key={index}><strong>{t(issue.severity === "error" ? "report.blocker" : "report.manualCheck")} · {issue.code}</strong><p>{issue.action}</p><p className="text-xs">{readablePath(t, issue.path)}</p>{committed && <Button variant="outline" size="sm" asChild><Link href={destination(campaignId, { ...row, code: issue.code })}>{t("report.goToAction")}</Link></Button>}</li>;
    })}</ol>
    <PagerNav ariaLabel={t("report.actionsPager")} pager={actions} labels={{ prev: t("report.actionsPrev"), next: t("report.actionsNext") }} />
    {info.length > 0 && <p className="text-hud-muted">{t("report.infoNote", { summary: infoSummary(t, info) })}</p>}
    {report.omittedIssues > 0 && <p>{t("report.omitted", { count: report.omittedIssues, codes: Object.entries(report.issueCounts).map(([code, n]) => t("report.codeCount", { code, count: n })).join("; ") })}</p>}
    <p>{t("report.backstories")}</p>
    <Button variant="outline" className="h-auto whitespace-normal" asChild><Link href={`/campaigns/${campaignId}/dm/characters`}>{t("report.createCharacters")}</Link></Button>
    <p>{t("report.dmMaterials")}</p>
    <Button variant="outline" onClick={() => downloadText(`compendium-report-${report.runId ?? "preview"}.json`, JSON.stringify(report, null, 2), "application/json")}>{t("report.download")}</Button>
    {notes && <SourceNotes campaignId={campaignId} {...notes} />}
  </section>;
}
