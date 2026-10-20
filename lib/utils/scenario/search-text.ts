import { docText } from "./doc";

import type { ScenarioContent } from "@/types/scenario";

const SECTION_PREFIX = "§";

const SNIPPET_RADIUS = 60;

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

export function buildSearchText(title: string, content: ScenarioContent): string {
  const lines = content.sections.map((s) => {
    const body = s.rows.map((r) => `${docText(r.story)} ${docText(r.notes)}`).join(" ");

    return `${SECTION_PREFIX}${s.id}\t${oneLine(`${s.title} ${body}`)}`;
  });

  return [oneLine(title), ...lines].join("\n");
}

export function findSnippet(searchText: string, query: string): { sectionId: string | null; snippet: string } | null {
  const needle = query.trim().toLocaleLowerCase("uk");

  if (!needle) return null;

  for (const line of searchText.split("\n")) {
    const tab = line.startsWith(SECTION_PREFIX) ? line.indexOf("\t") : -1;

    const text = tab >= 0 ? line.slice(tab + 1) : line;

    const at = text.toLocaleLowerCase("uk").indexOf(needle);

    if (at < 0) continue;

    const start = Math.max(0, at - SNIPPET_RADIUS);

    const end = Math.min(text.length, at + needle.length + SNIPPET_RADIUS);

    return { sectionId: tab >= 0 ? line.slice(1, tab) : null, snippet: `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}` };
  }

  return null;
}
