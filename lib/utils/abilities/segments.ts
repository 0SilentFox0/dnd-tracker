import type { Translator } from "@/lib/i18n/translator";

export type SegmentParam = string | number | Segment | Segment[] | { join: string; items: Segment[] };

export interface Segment {
  key: string;
  params?: Record<string, SegmentParam>;
}

export const seg = (key: string, params?: Record<string, SegmentParam>): Segment => (params ? { key, params } : { key });

const isSegment = (p: SegmentParam): p is Segment => typeof p === "object" && !Array.isArray(p) && "key" in p;

function renderParam(t: Translator, p: SegmentParam): string | number {
  if (typeof p === "string" || typeof p === "number") return p;

  if (Array.isArray(p)) return renderSegments(t, p).join(", ");

  if (isSegment(p)) return renderSegment(t, p);

  return renderSegments(t, p.items).join(p.join);
}

export function renderSegment(t: Translator, s: Segment): string {
  if (!s.params) return t(s.key);

  return t(s.key, Object.fromEntries(Object.entries(s.params).map(([k, v]) => [k, renderParam(t, v)])));
}

export function renderSegments(t: Translator, list: readonly Segment[]): string[] {
  return list.map((s) => renderSegment(t, s));
}
