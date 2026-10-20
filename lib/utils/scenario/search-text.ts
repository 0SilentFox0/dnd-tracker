import { docText } from "./doc";

import type { ScenarioContent } from "@/types/scenario";

const SECTION_PREFIX = "§";

export const SNIPPET_RADIUS = 60;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildSearchText(title: string, content: ScenarioContent): string {
  const lines = content.sections.map((s) => {
    const body = s.rows.map((r) => `${docText(r.story)} ${docText(r.notes)}`).join(" ");

    return `${SECTION_PREFIX}${s.id}\t${oneLine(`${s.title} ${body}`)}`;
  });

  return [oneLine(title), ...lines].join("\n");
}

export type SearchWindow = { win: string; at: number; cutBefore: boolean; needleLength: number };

// `win` is a slice of one section line cut in SQL: `at` is the match offset inside it
export function snippetFromWindow({ win, at, cutBefore, needleLength }: SearchWindow): string | null {
  if (at < 0 || at > win.length) return null;

  const head = win.slice(0, at);

  const afterAll = win.slice(at + needleLength, at + needleLength + SNIPPET_RADIUS + 1);

  const nl = afterAll.indexOf("\n");

  const tail = nl >= 0 ? afterAll.slice(0, nl) : afterAll.slice(0, SNIPPET_RADIUS);

  const more = nl < 0 && afterAll.length > SNIPPET_RADIUS;

  return `${cutBefore ? "…" : ""}${head}${win.slice(at, at + needleLength)}${tail}${more ? "…" : ""}`;
}
