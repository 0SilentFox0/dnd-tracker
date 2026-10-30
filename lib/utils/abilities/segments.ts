import { dynamicTextRef, joinLines } from "@/lib/i18n/text-ref";
import type { Translator } from "@/lib/i18n/translator";
import type { LogLine, TextArg } from "@/types/text";

type SegmentTranslator = (key: string, values?: Record<string, string | number>) => string;

export type SegmentParam = string | number | Segment | Segment[] | { join: string; items: Segment[] };

export interface Segment {
  key: string;
  params?: Record<string, SegmentParam>;
}

export interface AbilityFlowSummary {
  when: Segment[];
  if: Segment[];
  then: Segment[][];
  limits: Segment[];
}

export const flowSegments = (f: AbilityFlowSummary): Segment[] => [...f.when, ...f.limits, ...f.then.flat()];

export const seg = (key: string, params?: Record<string, SegmentParam>): Segment => (params ? { key, params } : { key });

const isSegment = (p: SegmentParam): p is Segment => typeof p === "object" && !Array.isArray(p) && "key" in p;

function renderParam(t: SegmentTranslator, p: SegmentParam): string | number {
  if (typeof p === "string" || typeof p === "number") return p;

  if (Array.isArray(p)) return joinSegments(t, p, ", ");

  if (isSegment(p)) return renderSegment(t, p);

  return joinSegments(t, p.items, p.join);
}

export function renderSegment(t: SegmentTranslator, s: Segment): string {
  if (!s.params) return t(s.key);

  return t(s.key, Object.fromEntries(Object.entries(s.params).map(([k, v]) => [k, renderParam(t, v)])));
}

export function renderSegments(t: SegmentTranslator, list: readonly Segment[]): string[] {
  return list.map((s) => renderSegment(t, s));
}

export function uniqueLines(lines: Segment[][]): Segment[][] {
  return [...new Map(lines.map((l) => [JSON.stringify(l), l])).values()];
}

export function joinSegments(t: SegmentTranslator, list: readonly Segment[], sep = " · "): string {
  return renderSegments(t, list).join(sep);
}

export function linesText(t: SegmentTranslator, lines: readonly (readonly Segment[])[]): string[] {
  return lines.map((l) => joinSegments(t, l));
}

export const abilityRegistryOf =
  (t: Translator): SegmentTranslator =>
  (key, values) =>
    t(`abilityRegistry.${key}`, values);

const argOf = (p: SegmentParam): TextArg => {
  if (typeof p === "string" || typeof p === "number") return p;

  if (Array.isArray(p)) return segmentsLine(p, ", ");

  if (isSegment(p)) return segmentRef(p);

  return segmentsLine(p.items, p.join);
};

const segmentRef = (s: Segment) => dynamicTextRef(`abilityRegistry.${s.key}`, s.params && Object.fromEntries(Object.entries(s.params).map(([k, v]) => [k, argOf(v)])));

/** Battle-log counterpart of `joinSegments`: the translation happens at render time. */
export const segmentsLine = (list: readonly Segment[], sep = " · "): LogLine => (list.length === 1 ? segmentRef(list[0] as Segment) : joinLines(list.map(segmentRef), sep));
