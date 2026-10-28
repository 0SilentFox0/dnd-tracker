"use client";
import { useMemo, useState } from "react";
import Link from "next/link";

import { SourceNotes } from "./SourceNotes";

import { PagerNav } from "@/components/common/PagerNav";
import { Button } from "@/components/ui/button";
import { COMPENDIUM_PAGE_SIZES } from "@/lib/constants/compendium-import";
import { usePager } from "@/lib/hooks/common";
import { downloadText } from "@/lib/utils/common/download-text";
import { CATEGORY_LABELS, destination } from "@/lib/utils/compendium-import/flow";
import { editionLabel, entryLabel, infoSummary, readablePath, sourceLabel, splitInfoIssues, statusLabel } from "@/lib/utils/compendium-import/labels";
import type { CompendiumReport as Report } from "@/types/compendium-import";

export function CompendiumReport({ campaignId, report, committed = false }: { campaignId: string; report: Report; committed?: boolean }) {
  const { actions: manualActions, info } = useMemo(() => splitInfoIssues(report.nextActions), [report.nextActions]);

  const rows = usePager(report.rows, COMPENDIUM_PAGE_SIZES.reportRows), actions = usePager(manualActions, COMPENDIUM_PAGE_SIZES.reportActions);

  const [notes, setNotes] = useState<{ kind: string; targetId: string } | null>(null);

  return <section className="space-y-3 break-words text-sm" aria-label="Звіт імпорту">
    <p className={report.readyToImport ? "text-hud-good" : "text-hud-bad"}>{report.readyToImport ? "Можна імпортувати" : "Імпорт заблоковано"}</p>
    <p>{report.readyToPlay ? "Готовність до гри підтверджена" : "Потрібні ручні дії до гри"}</p>
    <p>Створено / заплановано: {report.counts.created}; оновлено: {report.counts.updated}; без змін: {report.counts.unchanged}; помилки: {report.counts.errors}</p>
    <details open><summary className="cursor-pointer text-hud-gold">Джерела й редакції</summary>
      <ul className="text-hud-muted">{report.sources.map((source, index) => <li key={index}>{sourceLabel(source)}</li>)}</ul>
      <p>{Object.entries(report.editionSummary).map(([key, value]) => `${editionLabel(key)}: ${value}`).join("; ")}</p>
    </details>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm [&_td]:py-1 [&_td]:pr-3 [&_th]:pr-3 [&_th]:text-hud-muted"><thead><tr><th>Категорія</th><th>Є</th><th>Перенесено</th><th>Частково</th><th>Пропущено</th></tr></thead><tbody>
      {Object.entries(report.countsByCategory).map(([kind, count]) => <tr key={kind}><td>{CATEGORY_LABELS[kind] ?? kind}</td><td>{count.present}</td><td>{count.mapped}</td><td>{count.partial}</td><td>{count.skipped}</td></tr>)}
    </tbody></table></div>
    <h3 className="hud-sc text-base text-hud-ink">Записи та покриття</h3>
    <ul>{rows.pageItems.map((row, index) => <li className="mb-3 space-y-1 break-all" key={`${row.canonicalKey}:${index}`}>
      <p>{entryLabel(row.canonicalKey)} · {statusLabel(row.status)} · {row.coverage === "native" ? "структуровано" : row.coverage === "manual" ? "вручну" : "частково"}</p>
      {splitInfoIssues(row.issues).actions.map((issue, i) => <p key={i} title={issue.code}>{issue.action} ({readablePath(issue.path)})</p>)}
      {committed && <><Button variant="outline" size="sm" asChild><Link href={destination(campaignId, row)}>Відкрити редактор / опис</Link></Button>{" "}<Button variant="outline" size="sm" onClick={() => setNotes(row)}>Джерело й примітки</Button></>}
    </li>)}</ul>
    <PagerNav ariaLabel="Сторінки записів" pager={rows} labels={{ prev: "Попередні записи", next: "Наступні записи" }} />
    <h3 className="hud-sc text-base text-hud-ink">Що далі</h3>
    <ol>{actions.pageItems.map((issue, index) => {
      const row = report.rows.find(r => issue.path.startsWith(r.canonicalKey) || r.issues.some(owned => owned.code === issue.code && owned.path === issue.path));

      return <li className="mb-2" key={index}><strong>{issue.severity === "error" ? "Блокер" : "Ручна перевірка"} · {issue.code}</strong><p>{issue.action}</p><p className="text-xs">{readablePath(issue.path)}</p>{committed && <Button variant="outline" size="sm" asChild><Link href={destination(campaignId, { ...row, code: issue.code })}>Перейти до дії</Link></Button>}</li>;
    })}</ol>
    <PagerNav ariaLabel="Сторінки дій" pager={actions} labels={{ prev: "Попередні дії", next: "Наступні дії" }} />
    {info.length > 0 && <p className="text-hud-muted">{infoSummary(info)}. Це не потребує дій.</p>}
    {report.omittedIssues > 0 && <p>Ще {report.omittedIssues} попереджень; кількість за кодами: {Object.entries(report.issueCounts).map(([code, n]) => `${code} — ${n}`).join("; ")}</p>}
    <p>Передісторії: ASI, навички, інструменти й origin feat — через чинні Choice/Picks. Спорядження й гроші видайте героям вручну.</p>
    <Button variant="outline" className="h-auto whitespace-normal" asChild><Link href={`/campaigns/${campaignId}/dm/characters`}>Створити персонажів / видати спорядження й гроші</Link></Button>
    <p>Матеріали ДМ оновлюються через JSON-імпорт або вручну; source-sync їх не оновлює.</p>
    <Button variant="outline" onClick={() => downloadText(`compendium-report-${report.runId ?? "preview"}.json`, JSON.stringify(report, null, 2), "application/json")}>Завантажити звіт JSON</Button>
    {notes && <SourceNotes campaignId={campaignId} {...notes} />}
  </section>;
}
