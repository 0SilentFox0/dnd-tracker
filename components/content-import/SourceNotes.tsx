"use client";
import { PagerNav } from "@/components/common/PagerNav";
import { FormAlert } from "@/components/common/states";
import { useSourceNotes } from "@/lib/hooks/compendium-import";
import { isRecord } from "@/lib/utils/common/is-record";
import { editionLabel, readablePath } from "@/lib/utils/compendium-import/labels";

export function SourceNotes({ campaignId, kind, targetId }: { campaignId: string; kind: string; targetId: string }) {
  const { entries, pager, isError } = useSourceNotes(campaignId, kind, targetId);

  if (isError) return <FormAlert>Не вдалося завантажити примітки джерела</FormAlert>;

  if (!entries.length) return null;

  return <details open className="my-3 rounded-lg border border-hud-rule p-3"><summary>Джерело та примітки імпорту</summary>{entries.map(entry => <article className="space-y-2" key={entry.canonicalKey}><h3>{entry.originalName}</h3><p>{entry.sourceJson} · {editionLabel(entry.edition)}</p><p className="whitespace-pre-wrap">{entry.notes}</p>{Array.isArray(entry.issues) && entry.issues.filter(isRecord).map((issue, i) => <p className="text-xs" key={i}>{String(issue.action)} ({readablePath(String(issue.path))})</p>)}</article>)}<PagerNav pager={pager} labels={{ prev: "Попередні примітки", next: "Наступні примітки" }} /></details>;
}
