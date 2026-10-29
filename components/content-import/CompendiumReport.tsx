"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

import { SourceNotes } from "./SourceNotes";

import { PagerNav } from "@/components/common/PagerNav";
import { HudChipTabs, HudPill } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import { downloadText } from "@/lib/utils/common/download-text";
import { CATEGORY_LABELS, destination } from "@/lib/utils/compendium-import/flow";
import { coverageLabel, editionLabel, entryParts, groupIssues, infoSummary, type IssueGroup, readablePath, REPORT_ROW_FILTERS, sourceLabel, splitCategories, splitInfoIssues, statusLabel } from "@/lib/utils/compendium-import/labels";
import type { CompendiumReport as Report } from "@/types/compendium-import";

type Row = Report["rows"][number];

type Filter = keyof typeof REPORT_ROW_FILTERS;

const GROUP_ITEMS_STEP = 20;

const BLOCKER_PREVIEW = 5;

const CATEGORY_ROW = "grid grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)] items-center gap-x-1 py-1";

export const DEPENDENCIES_ANCHOR = "compendium-dependencies";

function Counts({ counts }: { counts: Report["counts"] }) {
  const tiles = [["Створено", counts.created, false], ["Оновлено", counts.updated, false], ["Без змін", counts.unchanged, false], ["Помилки", counts.errors, counts.errors > 0]] as const;

  return <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">{tiles.map(([label, value, bad]) => <li className="rounded-lg border border-hud-line bg-hud-panel px-3 py-2 text-center" key={label}><b className={`block text-lg ${bad ? "text-hud-bad" : "text-hud-ink"}`}>{value}</b><span className="text-xs text-hud-muted">{label}</span></li>)}</ul>;
}

function BlockerCard({ group, actions }: { group: IssueGroup; actions?: BlockerActions }) {
  const [shown, setShown] = useState(BLOCKER_PREVIEW);

  return <li className="space-y-2 rounded-lg bg-hud-bad/10 p-2">
    <p><strong>{group.title}</strong> <HudPill tone="muted">{group.items.length} записів</HudPill></p>
    <p>{group.action}{group.code === "NOTES_SIZE" && ". Зніміть розділ у «Матеріали ДМ»."}</p>
    {group.code === "MIXED_EDITION_CONFIRMATION_REQUIRED" && actions?.allowMixedEdition && <Button size="sm" disabled={actions.busy} onClick={actions.allowMixedEdition}>Дозволити змішування classic / one і перевірити знову</Button>}
    {group.code === "UNRESOLVED_REF" && <a className="inline-block text-hud-gold underline" href={`#${DEPENDENCIES_ANCHOR}`}>Перейти до зіставлення</a>}
    <ul className="flex flex-wrap gap-1">{group.items.slice(0, shown).map((item, index) => <li className="max-w-full break-words rounded-full px-2 text-xs text-hud-muted shadow-[inset_0_0_0_1px_var(--color-hud-line)]" key={index}>{readablePath(item.path)}</li>)}</ul>
    {group.items.length > shown && <Button variant="outline" size="sm" onClick={() => setShown(shown + GROUP_ITEMS_STEP)}>Показати ще ({group.items.length - shown})</Button>}
  </li>;
}

function IssueGroupCard({ group, link }: { group: IssueGroup; link?: (code: string, path: string) => string }) {
  const [shown, setShown] = useState(GROUP_ITEMS_STEP);

  return <li><details className="rounded-lg border border-hud-rule px-3 py-2">
    <summary className="cursor-pointer"><strong>{group.title}</strong> <HudPill tone="muted">{group.items.length}</HudPill></summary>
    <p className="mt-2">{group.action}</p>
    <ul className="mt-2 space-y-1">{group.items.slice(0, shown).map((item, index) => <li className="break-words" key={index}>
      <span className="text-xs text-hud-muted">{readablePath(item.path)}</span>
      {item.action && <span> — {item.action}</span>}
      {link && <> <Link className="text-hud-gold underline" href={link(group.code, item.path)}>Перейти до дії</Link></>}
    </li>)}</ul>
    {group.items.length > shown && <Button className="mt-2" variant="outline" size="sm" onClick={() => setShown(shown + GROUP_ITEMS_STEP)}>Показати ще ({group.items.length - shown})</Button>}
  </details></li>;
}

function RowCard({ row, committed, onNotes, campaignId }: { row: Row; committed: boolean; onNotes: (row: Row) => void; campaignId: string }) {
  const actions = splitInfoIssues(row.issues).actions;

  const { kind, name, owner, source } = entryParts(row.canonicalKey);

  return <li className="min-w-0"><details className="rounded-lg bg-[rgba(20,16,12,.85)] p-3 shadow-[inset_0_0_0_1px_rgba(230,194,90,.25)]">
    <summary className="cursor-pointer space-y-1">
      {kind && <span className="block text-[11px] uppercase text-hud-muted">{kind}</span>}
      <span className="hud-sc block break-words text-[15px] text-hud-ink">{kind ? `«${name}»${owner}` : name}</span>
      {source && <span className="block break-words text-xs text-hud-muted">{source}</span>}
      <span className="flex flex-wrap gap-1 pt-1"><HudPill tone={row.status === "unchanged" ? "muted" : "accent"}>{statusLabel(row.status)}</HudPill><HudPill>{coverageLabel(row.coverage)}</HudPill>{actions.length > 0 && <HudPill tone="bone">ручних дій: {actions.length}</HudPill>}</span>
    </summary>
    <div className="mt-2 space-y-1">
      {actions.map((issue, i) => <p key={i} title={issue.code}>{issue.action} <span className="break-words text-xs text-hud-muted">({readablePath(issue.path)})</span></p>)}
      {committed && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" asChild><Link href={destination(campaignId, row)}>Відкрити редактор / опис</Link></Button><Button variant="outline" size="sm" onClick={() => onNotes(row)}>Джерело й примітки</Button></div>}
    </div>
  </details></li>;
}

export type BlockerActions = { allowMixedEdition?: () => void; busy?: boolean };

export function CompendiumReport({ campaignId, report, committed = false, blockerActions }: { campaignId: string; report: Report; committed?: boolean; blockerActions?: BlockerActions }) {
  const { actions: manualActions, info } = useMemo(() => splitInfoIssues(report.nextActions), [report.nextActions]);

  const blockers = useMemo(() => groupIssues(manualActions.filter(issue => issue.severity === "error")), [manualActions]);

  const groups = useMemo(() => groupIssues(manualActions.filter(issue => issue.severity !== "error")), [manualActions]);

  const categories = useMemo(() => splitCategories(report.countsByCategory), [report.countsByCategory]);

  const [filter, setFilter] = useState<Filter>(() => report.rows.some(REPORT_ROW_FILTERS.changed) || !report.rows.some(REPORT_ROW_FILTERS.manual) ? "changed" : "manual");

  const visible = useMemo(() => report.rows.filter(REPORT_ROW_FILTERS[filter]), [report.rows, filter]);

  const rows = usePager(visible, COMPENDIUM_PAGE_SIZES.reportRows);

  const [notes, setNotes] = useState<{ kind: string; targetId: string } | null>(null);

  const actionLink = (code: string, path: string) => destination(campaignId, { ...report.rows.find(r => path.startsWith(r.canonicalKey) || r.issues.some(owned => owned.code === code && owned.path === path)), code });

  const chips = ([["changed", "Змінені"], ["manual", "З ручними діями"], ["all", "Усі"]] as const).map(([key, label]) => ({ key, label: `${label} (${report.rows.filter(REPORT_ROW_FILTERS[key]).length})`, active: filter === key, onSelect: () => setFilter(key) }));

  const hidden = report.rows.length - visible.length;

  return <section className="space-y-4 break-words text-sm" aria-label="Звіт імпорту">
    <div className="space-y-3 rounded-xl border border-hud-line p-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <p className={`text-base font-semibold ${report.readyToImport ? "text-hud-good" : "text-hud-bad"}`}>{report.readyToImport ? "Можна імпортувати" : "Імпорт заблоковано"}</p>
        <p className="text-hud-muted">{report.readyToPlay ? "Готовність до гри підтверджена" : "Потрібні ручні дії до гри"}</p>
      </div>
      <Counts counts={report.counts} />
    </div>
    {blockers.length > 0 && <div role="alert" className="space-y-2 rounded-xl border border-hud-bad p-3"><h3 className="hud-sc text-base text-hud-bad">Блокери ({blockers.reduce((sum, group) => sum + group.items.length, 0)})</h3>
      <ul className="space-y-2">{blockers.map(group => <BlockerCard key={group.code} group={group} actions={blockerActions} />)}</ul>
    </div>}
    <details open><summary className="cursor-pointer text-hud-gold">Джерела й редакції</summary>
      <ul className="text-hud-muted">{report.sources.map((source, index) => <li key={index}>{sourceLabel(source)}</li>)}</ul>
      <p>{Object.entries(report.editionSummary).map(([key, value]) => `${editionLabel(key)}: ${value}`).join("; ")}</p>
    </details>
    {categories.main.length > 0 && <div className="space-y-1"><h3 className="hud-sc text-base text-hud-ink">Покриття за категоріями</h3>
      <div role="table" className="text-xs">
        <div role="row" className={`${CATEGORY_ROW} text-hud-muted`}><span role="columnheader">Категорія</span><span role="columnheader" className="text-right">Є</span><span role="columnheader" className="text-right">Перен.</span><span role="columnheader" className="text-right">Частк.</span><span role="columnheader" className="text-right">Проп.</span></div>
        {categories.main.map(([kind, count]) => <div role="row" key={kind} className={`${CATEGORY_ROW} border-t border-hud-rule ${count.partial > 0 ? "bg-hud-gold/10" : ""}`}>
          <span role="cell" className="min-w-0 break-words">{CATEGORY_LABELS[kind] ?? kind}</span>
          {[count.present, count.mapped, count.partial, count.skipped].map((value, i) => <span role="cell" className={`text-right ${value === 0 ? "text-hud-muted" : ""}`} key={i}>{value === 0 ? "—" : value}</span>)}
        </div>)}
      </div>
    </div>}
    {categories.technical.length > 0 && <details className="text-xs text-hud-muted"><summary className="cursor-pointer">Технічні категорії ({categories.technical.length}): пропущено, зображення/Foundry не завантажуються</summary>
      <ul className="mt-1">{categories.technical.map(([kind, count]) => <li key={kind}>{CATEGORY_LABELS[kind] ? `${CATEGORY_LABELS[kind]} (${kind})` : kind}: {count.present}</li>)}</ul>
    </details>}
    <div className="space-y-2"><h3 className="hud-sc text-base text-hud-ink">Записи</h3>
      <HudChipTabs ariaLabel="Фільтр записів" items={chips} />
      <ul className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 lg:grid-cols-3">{rows.pageItems.map((row, index) => <RowCard key={`${row.canonicalKey}:${index}`} row={row} committed={committed} onNotes={setNotes} campaignId={campaignId} />)}</ul>
      {visible.length === 0 && <p className="text-hud-muted">Немає записів за цим фільтром.</p>}
      {filter !== "all" && hidden > 0 && <Button variant="outline" size="sm" onClick={() => setFilter("all")}>{hidden} без змін — показати</Button>}
      <PagerNav ariaLabel="Сторінки записів" pager={rows} labels={{ prev: "Попередні записи", next: "Наступні записи" }} />
    </div>
    {groups.length > 0 && <div className="space-y-2"><h3 className="hud-sc text-base text-hud-ink">Що далі</h3><ul className="space-y-2">{groups.map(group => <IssueGroupCard key={group.code} group={group} link={committed ? actionLink : undefined} />)}</ul></div>}
    {info.length > 0 && <p className="text-hud-muted">{infoSummary(info)}. Це не потребує дій.</p>}
    {report.omittedIssues > 0 && <p>Ще {report.omittedIssues} попереджень; кількість за кодами: {Object.entries(report.issueCounts).map(([code, n]) => `${code} — ${n}`).join("; ")}</p>}
    <p>Передісторії: ASI, навички, інструменти й origin feat — через чинні Choice/Picks. Спорядження й гроші видайте героям вручну.</p>
    <Button variant="outline" className="h-auto whitespace-normal" asChild><Link href={`/campaigns/${campaignId}/dm/characters`}>Створити персонажів / видати спорядження й гроші</Link></Button>
    <p>Матеріали ДМ оновлюються через JSON-імпорт або вручну; source-sync їх не оновлює.</p>
    <Button variant="outline" onClick={() => downloadText(`compendium-report-${report.runId ?? "preview"}.json`, JSON.stringify(report, null, 2), "application/json")}>Завантажити звіт JSON</Button>
    {notes && <SourceNotes campaignId={campaignId} {...notes} />}
  </section>;
}
