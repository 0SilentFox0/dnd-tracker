"use client";
import { useEffect, useState } from "react";
export function SourceNotes({ campaignId, kind, targetId }: { campaignId: string; kind: string; targetId: string }) {
  const [data, setData] = useState<Array<{ canonicalKey: string; originalName: string; sourceJson: string; edition: string; attribution: unknown; notes: string; issues: unknown }>>([]);

  const [offset, setOffset] = useState(0), [more, setMore] = useState(false), [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/campaigns/${encodeURIComponent(campaignId)}/compendium/entries?${new URLSearchParams({ kind, targetId, offset: String(offset) })}`, { cache: "no-store", signal: controller.signal }).then(async r => { if (!r.ok) throw new Error();

 return r.json(); }).then(result => { setData(result.entries); setMore(result.hasMore); }).catch(() => { if (!controller.signal.aborted) setError(true); });

    return () => controller.abort();
  }, [campaignId, kind, targetId, offset]);

  if (error) return <p role="alert">Не вдалося завантажити примітки джерела</p>;

  if (!data.length) return null;

  return <details open className="my-3 border p-3"><summary>Джерело та примітки імпорту</summary>{data.map(entry => <article className="space-y-2" key={entry.canonicalKey}><h3>{entry.originalName}</h3><p>{entry.sourceJson} · {entry.edition}</p><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(entry.attribution, null, 2)}</pre><p className="whitespace-pre-wrap">{entry.notes}</p><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(entry.issues, null, 2)}</pre></article>)}<button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>Попередні примітки</button>{" · "}<button disabled={!more} onClick={() => setOffset(offset + 50)}>Наступні примітки</button></details>;
}
