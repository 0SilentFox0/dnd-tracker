import { docText } from "./doc";

import type { ScenarioContent } from "@/types/scenario";

const SECTION_PREFIX = "§";

export const SNIPPET_RADIUS = 60;

export const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildSearchText(title: string, content: ScenarioContent): string {
  const lines = content.sections.map((s) => {
    const body = s.rows.map((r) => `${docText(r.story)} ${docText(r.notes)}`).join(" ");

    return `${SECTION_PREFIX}${s.id}\t${oneLine(`${s.title} ${body}`)}`;
  });

  return [oneLine(title), ...lines].join("\n").normalize("NFC");
}

export function sectionLead(line: string, title: string, max: number): string {
  const body = (line.startsWith(title) ? line.slice(title.length) : line).trim();

  const chars = Array.from(body);

  return chars.length > max ? `${chars.slice(0, max).join("").trimEnd()}…` : body;
}

export type SearchWindow = { win: string; at: number; cutBefore: boolean; needleLength: number };

// `win` is a slice of one section line cut in SQL: `at` is the match offset inside it
export function snippetFromWindow({ win, at, cutBefore, needleLength }: SearchWindow): string | null {
  const chars = Array.from(win);

  if (at < 0 || at > chars.length) return null;

  const head = chars.slice(0, at).join("");

  const afterAll = chars.slice(at + needleLength, at + needleLength + SNIPPET_RADIUS + 1).join("");

  const nl = afterAll.indexOf("\n");

  const tail = nl >= 0 ? afterAll.slice(0, nl) : afterAll.slice(0, SNIPPET_RADIUS);

  const more = nl < 0 && afterAll.length > SNIPPET_RADIUS;

  return `${cutBefore ? "…" : ""}${head}${chars.slice(at, at + needleLength).join("")}${tail}${more ? "…" : ""}`;
}
