import { docText } from "./doc";
import { docToMarkdown } from "./markdown";
import { oneLine } from "./search-text";

import type { ScenarioContent, ScenarioRow, ScenarioSection } from "@/types/scenario";

const SEP = "\n\n";

const rowToMarkdown = (r: ScenarioRow) => `### Row ${r.id}\n**Story:**\n${docToMarkdown(r.story) || "—"}\n\n**DM notes:**\n${docToMarkdown(r.notes) || "—"}`;

const sectionHeading = (s: ScenarioSection) => `## ${s.title} [${s.id}]${s.played ? " (played)" : ""}`;

export function sectionToMarkdown(s: ScenarioSection): string {
  return [sectionHeading(s), ...s.rows.map(rowToMarkdown)].join(SEP);
}

export function contentToMarkdown(title: string, content: ScenarioContent, sectionId?: string): string {
  return buildLayout(title, content, sectionId).markdown;
}

type Unit = { start: number; end: number };

export type MarkdownLayout = { markdown: string; units: Unit[]; sections: { id: string; start: number; end: number; rows: { id: string; start: number; end: number }[] }[] };

// a unit is the smallest piece a chunk may start at: the preamble, or a row (the first row carries its section heading)
export function buildLayout(title: string, content: ScenarioContent, sectionId?: string): MarkdownLayout {
  const legend = content.legend.length ? `Legend: ${content.legend.map((l) => l.label).join(", ")}` : "";

  const sections = sectionId ? content.sections.filter((s) => s.id === sectionId) : content.sections;

  const parts: string[] = [];

  const units: Unit[] = [];

  const layoutSections: MarkdownLayout["sections"] = [];

  let pos = 0;

  const push = (text: string, unit: boolean) => {
    if (!text) return { start: pos, end: pos };

    if (parts.length) pos += SEP.length;

    const start = pos;

    parts.push(text);
    pos += text.length;

    if (unit) units.push({ start, end: pos });

    return { start, end: pos };
  };

  push(`# ${title}`, false);
  push(legend, false);

  for (const s of sections) {
    const rows: MarkdownLayout["sections"][number]["rows"] = [];

    const sectionStart = pos + (parts.length ? SEP.length : 0);

    if (!s.rows.length) push(sectionHeading(s), true);

    s.rows.forEach((r, i) => {
      const text = i === 0 ? `${sectionHeading(s)}${SEP}${rowToMarkdown(r)}` : rowToMarkdown(r);

      const at = push(text, true);

      rows.push({ id: r.id, start: i === 0 ? at.start + sectionHeading(s).length + SEP.length : at.start, end: at.end });
    });

    layoutSections.push({ id: s.id, start: sectionStart, end: pos, rows });
  }

  return { markdown: parts.join(SEP), units, sections: layoutSections };
}

export type ChunkResult = { text: string; nextOffset: number | null; total: number };

const isLowSurrogate = (code: number) => code >= 0xdc00 && code <= 0xdfff;

export function chunkContentMarkdown(title: string, content: ScenarioContent, opts: { sectionId?: string; offset?: number; limit: number }): ChunkResult {
  const { markdown, units, sections } = buildLayout(title, content);

  const section = opts.sectionId ? sections.find((s) => s.id === opts.sectionId) : undefined;

  if (opts.sectionId && !section) return { text: `[section ${opts.sectionId} not found]`, nextOffset: null, total: markdown.length };

  const scope = section ?? { start: 0, end: markdown.length };

  const total = scope.end;

  const offset = Math.max(0, Math.floor(opts.offset ?? scope.start));

  if (section && (offset < scope.start || offset >= scope.end)) return { text: `[offset ${offset} is outside section ${section.id}: ${scope.start}..${scope.end}]`, nextOffset: null, total };

  if (offset >= total) return { text: `[offset ${offset} is past the end of the page, total ${total}]`, nextOffset: null, total };

  const limit = Math.max(1, opts.limit);

  if (total - offset <= limit) return { text: markdown.slice(offset, total), nextOffset: null, total };

  let end = offset;

  for (const u of units) if (u.end <= total && u.end > offset && u.end - offset <= limit) end = Math.max(end, u.end);

  let split = false;

  if (end === offset) {
    split = true;
    end = offset + limit;

    if (isLowSurrogate(markdown.charCodeAt(end))) end -= 1;
  }

  const body = markdown.slice(offset, end);

  const nextOffset = end >= total ? null : end + (split ? 0 : SEP.length);

  const next = nextOffset === null ? "" : `${SEP}[next offset ${nextOffset} of ${total}]`;

  return { text: `${split ? "[row split]\n" : ""}${body}${next}`, nextOffset, total };
}

const OUTLINE_BUDGET = 3800;

const clip = (s: string, n: number) => (s.length > n ? `${Array.from(s).slice(0, n).join("")}…` : s);

export function outlineContent(title: string, content: ScenarioContent, budget = OUTLINE_BUDGET): string {
  const { markdown, sections: layout } = buildLayout(title, content);

  const rowCount = content.sections.reduce((n, s) => n + s.rows.length, 0);

  const head = `# ${oneLine(title)} (${markdown.length} chars, ${content.sections.length} sections, ${rowCount} rows; offsets are for read_scenario_page)`;

  const sizes = content.sections.map((s) =>
    s.rows.map((r) => {
      const story = docText(r.story);

      const notes = docText(r.notes);

      return { id: r.id, story: story.length, notes: notes.length, preview: oneLine(story || notes) };
    }),
  );

  const render = (previewChars: number | null, maxSections: number) => {
    const lines = [head];

    content.sections.slice(0, maxSections).forEach((s, i) => {
      const rows = sizes[i];

      const story = rows.reduce((n, r) => n + r.story, 0);

      const notes = rows.reduce((n, r) => n + r.notes, 0);

      lines.push(`## [${s.id}] ${clip(oneLine(s.title), 40)}${s.played ? " (played)" : ""} @${layout[i].start} · ${rows.length} rows · story ${story} / notes ${notes}`);

      if (previewChars === null) {
        if (rows.length) lines.push(`rows ${rows[0].id}..${rows[rows.length - 1].id}`);

        return;
      }

      rows.forEach((r, j) => lines.push(`- ${r.id} @${layout[i].rows[j].start} s${r.story} n${r.notes}${previewChars ? `: ${clip(r.preview, previewChars)}` : ""}`));
    });

    if (maxSections < content.sections.length) lines.push(`[outline truncated: ${content.sections.length - maxSections} more sections; read the rest with read_scenario_page offset]`);

    return lines.join("\n");
  };

  for (const previewChars of [80, 30, 0, null]) {
    const text = render(previewChars, content.sections.length);

    if (text.length <= budget) return text;
  }

  let n = content.sections.length;

  while (n > 1 && render(null, n).length > budget) n = Math.floor(n * 0.8);

  return render(null, n);
}
