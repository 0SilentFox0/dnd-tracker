"use client";
import { PagerNav } from "@/components/common/PagerNav";
import { useSourceNotes } from "@/lib/hooks/compendium-import";

export function SourceNotes({ campaignId, kind, targetId }: { campaignId: string; kind: string; targetId: string }) {
  const { entries, pager, isError } = useSourceNotes(campaignId, kind, targetId);

  if (isError) return <p role="alert">Не вдалося завантажити примітки джерела</p>;

  if (!entries.length) return null;

  return <details open className="my-3 border p-3"><summary>Джерело та примітки імпорту</summary>{entries.map(entry => <article className="space-y-2" key={entry.canonicalKey}><h3>{entry.originalName}</h3><p>{entry.sourceJson} · {entry.edition}</p><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(entry.attribution, null, 2)}</pre><p className="whitespace-pre-wrap">{entry.notes}</p><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(entry.issues, null, 2)}</pre></article>)}<PagerNav pager={pager} labels={{ prev: "Попередні примітки", next: "Наступні примітки" }} /></details>;
}
