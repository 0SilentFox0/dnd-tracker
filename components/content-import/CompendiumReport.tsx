"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

import { CompendiumMediaSummary } from "./CompendiumMediaSummary";
import { SourceNotes } from "./SourceNotes";

import { PagerNav } from "@/components/common/PagerNav";
import { HudChipTabs, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import { useTranslator } from "@/lib/i18n/use-translator";
import { downloadText } from "@/lib/utils/common/download-text";
import { categoryLabel, destination } from "@/lib/utils/compendium-import/flow";
import { coverageLabel, editionLabel, entryParts, groupIssues, infoSummary, type IssueGroup, readablePath, REPORT_ROW_FILTERS, sourceLabel, splitCategories, splitInfoIssues, statusLabel } from "@/lib/utils/compendium-import/labels";
import type { CompendiumReport as Report } from "@/types/compendium-import";

type Row = Report["rows"][number];

type Filter = keyof typeof REPORT_ROW_FILTERS;

const GROUP_ITEMS_STEP = 20;

const BLOCKER_PREVIEW = 5;

const CATEGORY_ROW = "grid grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)] items-center gap-x-1 py-1";

export const DEPENDENCIES_ANCHOR = "compendium-dependencies";

function Counts({ counts }: { counts: Report["counts"] }) {
  const t = useTranslator("compendium");

  const tiles = [[t("report.tileCreated"), counts.created, false], [t("report.tileUpdated"), counts.updated, false], [t("report.tileUnchanged"), counts.unchanged, false], [t("report.tileErrors"), counts.errors, counts.errors > 0]] as const;

  return <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tiles.map(([label, value, bad]) => <li className="rounded-lg border border-hud-line bg-hud-panel px-3 py-2 text-center" key={label}><b className={`block text-lg ${bad ? "text-hud-bad" : "text-hud-ink"}`}>{value}</b><span className="text-xs text-hud-muted">{label}</span></li>)}</ul>;
}

function BlockerCard({ group, actions }: { group: IssueGroup; actions?: BlockerActions }) {
  const t = useTranslator("compendium");

  const [shown, setShown] = useState(BLOCKER_PREVIEW);

  return <li className="space-y-2 rounded-lg bg-hud-bad/10 p-2">
    <p><strong>{group.title}</strong> <HudPill tone="muted">{t("report.groupRecords", { count: group.items.length })}</HudPill></p>
    <p>{group.action}{group.code === "NOTES_SIZE" && ` ${t("report.removeChapter")}`}</p>
    {group.code === "MIXED_EDITION_CONFIRMATION_REQUIRED" && actions?.allowMixedEdition && <Button size="sm" disabled={actions.busy} onClick={actions.allowMixedEdition}>{t("report.allowMixed")}</Button>}
    {group.code === "UNRESOLVED_REF" && <a className="inline-block text-hud-gold underline" href={`#${DEPENDENCIES_ANCHOR}`}>{t("report.goToBinding")}</a>}
    <ul className="flex flex-wrap gap-1">{group.items.slice(0, shown).map((item, index) => <li className="max-w-full break-words rounded-full px-2 text-xs text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]" key={index}>{readablePath(t, item.path)}</li>)}</ul>
    {group.items.length > shown && <Button variant="outline" size="sm" onClick={() => setShown(shown + GROUP_ITEMS_STEP)}>{t("report.showMore", { count: group.items.length - shown })}</Button>}
  </li>;
}

function IssueGroupCard({ group, link }: { group: IssueGroup; link?: (code: string, path: string) => string }) {
  const t = useTranslator("compendium");

  const [shown, setShown] = useState(GROUP_ITEMS_STEP);

  return <li><details className="rounded-lg border border-hud-rule px-3 py-2">
    <summary className="cursor-pointer"><strong>{group.title}</strong> <HudPill tone="muted">{group.items.length}</HudPill></summary>
    <p className="mt-2">{group.action}</p>
    <ul className="mt-2 space-y-1">{group.items.slice(0, shown).map((item, index) => <li className="break-words" key={index}>
      <span className="text-xs text-hud-muted">{readablePath(t, item.path)}</span>
      {item.action && <span> — {item.action}</span>}
      {link && <> <Link className="text-hud-gold underline" href={link(group.code, item.path)}>{t("report.goToAction")}</Link></>}
    </li>)}</ul>
    {group.items.length > shown && <Button className="mt-2" variant="outline" size="sm" onClick={() => setShown(shown + GROUP_ITEMS_STEP)}>{t("report.showMore", { count: group.items.length - shown })}</Button>}
  </details></li>;
}

function RowCard({ row, committed, onNotes, campaignId }: { row: Row; committed: boolean; onNotes: (row: Row) => void; campaignId: string }) {
  const t = useTranslator("compendium");

  const actions = splitInfoIssues(row.issues).actions;

  const { kind, name, owner, source } = entryParts(t, row.canonicalKey);

  return <li className="min-w-0"><details className="rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
    <summary className="cursor-pointer space-y-1">
      {kind && <span className="block text-[11px] uppercase text-hud-muted">{kind}</span>}
      <span className="hud-sc block break-words text-[15px] text-hud-ink">{kind ? `«${name}»${owner}` : name}</span>
      {source && <span className="block break-words text-xs text-hud-muted">{source}</span>}
      <span className="flex flex-wrap gap-1 pt-1"><HudPill tone={row.status === "unchanged" ? "muted" : "accent"}>{statusLabel(t, row.status)}</HudPill><HudPill>{coverageLabel(t, row.coverage)}</HudPill>{actions.length > 0 && <HudPill tone="bone">{t("report.manualActionsCount", { count: actions.length })}</HudPill>}</span>
    </summary>
    <div className="mt-2 space-y-1">
      {actions.map((issue, i) => <p key={i} title={issue.code}>{issue.action} <span className="break-words text-xs text-hud-muted">({readablePath(t, issue.path)})</span></p>)}
      {committed && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><Link href={destination(campaignId, row)}>{t("report.openEditor")}</Link></Button><Button variant="outline" size="sm" onClick={() => onNotes(row)}>{t("report.sourceNotes")}</Button></div>}
    </div>
  </details></li>;
}

export type BlockerActions = { allowMixedEdition?: () => void; busy?: boolean };

export function CompendiumReport({ campaignId, report, committed = false, blockerActions }: { campaignId: string; report: Report; committed?: boolean; blockerActions?: BlockerActions }) {
  const t = useTranslator("compendium");

  const { actions: manualActions, info } = useMemo(() => splitInfoIssues(report.nextActions), [report.nextActions]);

  const blockers = useMemo(() => groupIssues(t, manualActions.filter(issue => issue.severity === "error")), [t, manualActions]);

  const groups = useMemo(() => groupIssues(t, manualActions.filter(issue => issue.severity !== "error")), [t, manualActions]);

  const categories = useMemo(() => splitCategories(report.countsByCategory), [report.countsByCategory]);

  const [filter, setFilter] = useState<Filter>(() => report.rows.some(REPORT_ROW_FILTERS.changed) || !report.rows.some(REPORT_ROW_FILTERS.manual) ? "changed" : "manual");

  const visible = useMemo(() => report.rows.filter(REPORT_ROW_FILTERS[filter]), [report.rows, filter]);

  const rows = usePager(visible, COMPENDIUM_PAGE_SIZES.reportRows);

  const [notes, setNotes] = useState<{ kind: string; targetId: string } | null>(null);

  const actionLink = (code: string, path: string) => destination(campaignId, { ...report.rows.find(r => path.startsWith(r.canonicalKey) || r.issues.some(owned => owned.code === code && owned.path === path)), code });

  const chips = ([["changed", t("report.filterChanged")], ["manual", t("report.filterManual")], ["all", t("report.filterAll")]] as const).map(([key, label]) => ({ key, label: `${label} (${report.rows.filter(REPORT_ROW_FILTERS[key]).length})`, active: filter === key, onSelect: () => setFilter(key) }));

  const hidden = report.rows.length - visible.length;

  return <section className="space-y-4 break-words text-sm" aria-label={t("report.ariaLabel")}>
    <div className="space-y-3 rounded-xl border border-hud-line p-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className={`text-base font-semibold ${report.readyToImport ? "text-hud-good" : "text-hud-bad"}`}>{t(report.readyToImport ? "report.canImport" : "report.blocked")}</p>
        <p className="text-hud-muted">{t(report.readyToPlay ? "report.playReady" : "report.manualNeeded")}</p>
      </div>
      <Counts counts={report.counts} />
    </div>
    {blockers.length > 0 && <div role="alert" className="space-y-2 rounded-xl border border-hud-bad p-3"><h3 className="hud-sc text-base text-hud-bad">{t("report.blockersTitle", { count: blockers.reduce((sum, group) => sum + group.items.length, 0) })}</h3>
      <ul className="space-y-2">{blockers.map(group => <BlockerCard key={group.code} group={group} actions={blockerActions} />)}</ul>
    </div>}
    <details open><summary className="cursor-pointer text-hud-gold">{t("report.sources")}</summary>
      <ul className="text-hud-muted">{report.sources.map((source, index) => <li key={index}>{sourceLabel(t, source)}</li>)}</ul>
      <p>{Object.entries(report.editionSummary).map(([key, value]) => t("report.editionCount", { edition: editionLabel(t, key), count: value })).join("; ")}</p>
    </details>
    {categories.main.length > 0 && <div className="space-y-1"><h3 className="hud-sc text-base text-hud-ink">{t("report.coverage")}</h3>
      <div role="table" className="text-xs">
        <div role="row" className={`${CATEGORY_ROW} text-hud-muted`}><span role="columnheader">{t("report.colCategory")}</span><span role="columnheader" className="text-right">{t("report.colPresent")}</span><span role="columnheader" className="text-right">{t("report.colMappedShort")}</span><span role="columnheader" className="text-right">{t("report.colPartialShort")}</span><span role="columnheader" className="text-right">{t("report.colSkippedShort")}</span></div>
        {categories.main.map(([kind, count]) => <div role="row" key={kind} className={`${CATEGORY_ROW} border-t border-hud-rule ${count.partial > 0 ? "bg-hud-gold/10" : ""}`}>
          <span role="cell" className="min-w-0 break-words">{categoryLabel(t, kind)}</span>
          {[count.present, count.mapped, count.partial, count.skipped].map((value, i) => <span role="cell" className={`text-right ${value === 0 ? "text-hud-muted" : ""}`} key={i}>{value === 0 ? "—" : value}</span>)}
        </div>)}
      </div>
    </div>}
    {categories.technical.length > 0 && <details className="text-xs text-hud-muted"><summary className="cursor-pointer">{t("report.technical", { count: categories.technical.length })}</summary>
      <ul className="mt-1">{categories.technical.map(([kind, count]) => <li key={kind}>{t.has(`categories.${kind}`) ? `${categoryLabel(t, kind)} (${kind})` : kind}: {count.present}</li>)}</ul>
    </details>}
    <div className="space-y-2"><h3 className="hud-sc text-base text-hud-ink">{t("report.records")}</h3>
      <HudChipTabs ariaLabel={t("report.filterLabel")} items={chips} />
      <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.pageItems.map((row, index) => <RowCard key={`${row.canonicalKey}:${index}`} row={row} committed={committed} onNotes={setNotes} campaignId={campaignId} />)}</ul>
      {visible.length === 0 && <p className="text-hud-muted">{t("report.noRows")}</p>}
      {filter !== "all" && hidden > 0 && <Button variant="outline" size="sm" onClick={() => setFilter("all")}>{t("report.showUnchanged", { count: hidden })}</Button>}
      <PagerNav ariaLabel={t("report.rowsPager")} pager={rows} labels={{ prev: t("report.rowsPrev"), next: t("report.rowsNext") }} />
    </div>
    {groups.length > 0 && <div className="space-y-2"><h3 className="hud-sc text-base text-hud-ink">{t("report.next")}</h3><ul className="space-y-2">{groups.map(group => <IssueGroupCard key={group.code} group={group} link={committed ? actionLink : undefined} />)}</ul></div>}
    {!committed && report.media && <CompendiumMediaSummary media={report.media} />}
    {info.length > 0 && <p className="text-hud-muted">{t("report.infoNote", { summary: infoSummary(t, info) })}</p>}
    {report.omittedIssues > 0 && <p>{t("report.omitted", { count: report.omittedIssues, codes: Object.entries(report.issueCounts).map(([code, n]) => t("report.codeCount", { code, count: n })).join("; ") })}</p>}
    <p>{t("report.backstories")}</p>
    <Button variant="outline" className="h-auto whitespace-normal" asChild><Link href={`/campaigns/${campaignId}/dm/characters`}>{t("report.createCharacters")}</Link></Button>
    <p>{t("report.dmMaterials")}</p>
    <Button variant="outline" onClick={() => downloadText(`compendium-report-${report.runId ?? "preview"}.json`, JSON.stringify(report, null, 2), "application/json")}>{t("report.download")}</Button>
    {notes && <SourceNotes campaignId={campaignId} {...notes} />}
  </section>;
}
