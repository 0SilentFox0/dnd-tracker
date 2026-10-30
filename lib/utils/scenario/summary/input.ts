import type { PageSummary } from "@/lib/schemas/scenario-summary";
import { entityKey } from "@/lib/utils/scenario/index/build";
import { extractPageFacts } from "@/lib/utils/scenario/index/extract";
import { docToMarkdown } from "@/lib/utils/scenario/markdown";
import type { IndexRef, RichDoc, ScenarioContent } from "@/types/scenario";

export interface SummaryInputPage {
  title: string;
  kind: string;
  arc: string | null;
  content: ScenarioContent;
}

const PREFACE = "Text wrapped in ||double bars|| is hidden from players (DM-only secret).";

const TRUNCATED = "\n[truncated]";

const mdOf = (doc: RichDoc) => docToMarkdown(doc).trim();

const isBlank = (md: string) => md === "" || md === "—";

const refLine = (ref: IndexRef) => `${entityKey(ref.type, ref.id)} — ${ref.label || ref.id}`;

export function buildSummaryInput(page: SummaryInputPage, maxChars: number) {
  const facts = extractPageFacts(page.content);

  const head = `${PREFACE}\nTitle: ${page.title}\nKind: ${page.kind}\nArc: ${page.arc ?? "-"}\nAllowed entities:`;

  const labels = new Map<string, IndexRef>();

  const lines: string[] = [];

  const blocks: string[] = [];

  let used = head.length;

  let truncated = false;

  let empty = true;

  for (const [i, section] of page.content.sections.entries()) {
    const parts: string[] = [];

    for (const row of section.rows) {
      const story = mdOf(row.story);

      const notes = mdOf(row.notes);

      if (!isBlank(story)) parts.push(`Story:\n${story}`);

      if (!isBlank(notes)) parts.push(`DM notes:\n${notes}`);
    }

    if (parts.length === 0) continue;

    empty = false;

    if (truncated) continue;

    const text = `## ${section.title}${section.played ? " (played)" : ""}\n${parts.join("\n")}`;

    const fresh = facts.sections[i].refs.filter((r) => !labels.has(entityKey(r.type, r.id)));

    const freshLines = fresh.map(refLine);

    const cost = text.length + 1 + freshLines.reduce((n, l) => n + l.length + 1, 0);

    let body = text;

    if (used + cost > maxChars) {
      truncated = true;

      const room = maxChars - used - freshLines.reduce((n, l) => n + l.length + 1, 0) - 1 - TRUNCATED.length;

      if (room <= 0) {
        const last = blocks.length - 1;

        if (last >= 0 && used + TRUNCATED.length <= maxChars) {
          blocks[last] += TRUNCATED;
          used += TRUNCATED.length;
        }

        continue;
      }

      body = text.slice(0, room) + TRUNCATED;
    }

    used += body.length + 1 + freshLines.reduce((n, l) => n + l.length + 1, 0);
    blocks.push(body);
    lines.push(...freshLines);

    for (const r of fresh) labels.set(entityKey(r.type, r.id), r);
  }

  return {
    prompt: [head, ...lines, ...blocks].join("\n"),
    allowedKeys: new Set(labels.keys()),
    truncated,
    empty,
  };
}

export function filterSummaryEntities(summary: PageSummary, allowed: Set<string>): PageSummary {
  return { ...summary, entities: [...new Set(summary.entities.filter((k) => allowed.has(k)))] };
}
