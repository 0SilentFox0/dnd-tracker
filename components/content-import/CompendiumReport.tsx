"use client";
import { useState } from "react";

import { SourceNotes } from "./SourceNotes";

import type { CompendiumReport as Report } from "@/lib/server/compendium-import/service";
import { downloadText } from "@/lib/utils/common/download-text";
import { CATEGORY_LABELS, destination } from "@/lib/utils/compendium-import/flow";

export function CompendiumReport({ campaignId, report, committed = false }: { campaignId: string; report: Report; committed?: boolean }) {
  const [page, setPage] = useState(0), [actionPage, setActionPage] = useState(0);

  const [notes, setNotes] = useState<{ kind: string; targetId: string } | null>(null);

  return <section className="space-y-3 break-words" aria-label="Звіт імпорту">
    <p>{report.readyToImport ? "Можна імпортувати" : "Імпорт заблоковано"}</p>
    <p>{report.readyToPlay ? "Готовність до гри підтверджена" : "Потрібні ручні дії до гри"}</p>
    <p>Створено / заплановано: {report.counts.created}; оновлено: {report.counts.updated}; без змін: {report.counts.unchanged}; помилки: {report.counts.errors}</p>
    <details open><summary>Джерела й редакції</summary>
      {report.sources.map((source, index) => <pre className="whitespace-pre-wrap text-xs" key={index}>{JSON.stringify(source, null, 2)}</pre>)}
      <p>{Object.entries(report.editionSummary).map(([key, value]) => `${key}: ${value}`).join("; ")}</p>
    </details>
    <table className="w-full text-left text-sm"><thead><tr><th>Категорія</th><th>Є</th><th>Перенесено</th><th>Частково</th><th>Пропущено</th></tr></thead><tbody>
      {Object.entries(report.countsByCategory).map(([kind, count]) => <tr key={kind}><td>{CATEGORY_LABELS[kind] ?? kind}</td><td>{count.present}</td><td>{count.mapped}</td><td>{count.partial}</td><td>{count.skipped}</td></tr>)}
    </tbody></table>
    <h3>Записи та покриття</h3>
    <ul>{report.rows.slice(page * 50, (page + 1) * 50).map((row, index) => <li className="mb-3" key={`${row.canonicalKey}:${index}`}>
      <p>{row.canonicalKey} · {row.status} · {row.coverage === "native" ? "структуровано" : row.coverage === "manual" ? "вручну" : "частково"}</p>
      {row.issues.map((issue, i) => <p key={i}>{issue.code}: {issue.action} ({issue.path})</p>)}
      {committed && <><a className="underline" href={destination(campaignId, row)}>Відкрити редактор / опис</a>{" · "}<button className="underline" onClick={() => setNotes(row)}>Джерело й примітки</button></>}
    </li>)}</ul>
    <nav aria-label="Сторінки записів"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Попередні записи</button>{" · "}<button disabled={(page + 1) * 50 >= report.rows.length} onClick={() => setPage(page + 1)}>Наступні записи</button></nav>
    <h3>Що далі</h3>
    <ol>{report.nextActions.slice(actionPage * 50, (actionPage + 1) * 50).map((issue, index) => {
      const row = report.rows.find(r => issue.path.startsWith(r.canonicalKey) || r.issues.some(owned => owned.code === issue.code && owned.path === issue.path));

      return <li className="mb-2" key={index}><strong>{issue.severity === "error" ? "Блокер" : "Ручна перевірка"} · {issue.code}</strong><p>{issue.action}</p><p className="text-xs">{issue.path}</p>{committed && <a className="underline" href={destination(campaignId, { ...row, code: issue.code })}>Перейти до дії</a>}</li>;
    })}</ol>
    <nav aria-label="Сторінки дій"><button disabled={actionPage === 0} onClick={() => setActionPage(actionPage - 1)}>Попередні дії</button>{" · "}<button disabled={(actionPage + 1) * 50 >= report.nextActions.length} onClick={() => setActionPage(actionPage + 1)}>Наступні дії</button></nav>
    {report.omittedIssues > 0 && <p>Ще {report.omittedIssues} попереджень; кількість за кодами: {JSON.stringify(report.issueCounts)}</p>}
    <p>Передісторії: ASI, навички, інструменти й origin feat — через чинні Choice/Picks. Спорядження й гроші видайте героям вручну.</p>
    <a className="underline" href={`/campaigns/${campaignId}/dm/characters`}>Створити персонажів / видати спорядження й гроші</a>
    <p>Матеріали ДМ оновлюються через JSON-імпорт або вручну; source-sync їх не оновлює.</p>
    <button className="underline" onClick={() => downloadText(`compendium-report-${report.runId ?? "preview"}.json`, JSON.stringify(report, null, 2), "application/json")}>Завантажити звіт JSON</button>
    {notes && <SourceNotes campaignId={campaignId} {...notes} />}
  </section>;
}
