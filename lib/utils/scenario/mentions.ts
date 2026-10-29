import type { RichDoc, RichNode,ScenarioContent } from "@/types/scenario";

export type MentionField = "story" | "notes";

export type MentionHit = { sectionId: string; rowId: string; field: MentionField; snippet: string; forms: string[]; inMention: boolean };

const MIN_STEM = 4;

const MAX_ENDING = 3;

const STRIPPABLE = /[аеєиіїоуюяьй]$/iu;

const SNIPPET_RADIUS = 50;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// drops case endings so an oblique form of a name finds every other form, keeping at least MIN_STEM letters
export function wordStem(word: string): string {
  let stem = word;

  while (Array.from(stem).length > MIN_STEM && STRIPPABLE.test(stem)) stem = Array.from(stem).slice(0, -1).join("");

  return stem;
}

export function buildMentionPattern(query: string): RegExp | null {
  const tokens = query.trim().split(/\s+/u).filter(Boolean);

  if (!tokens.length) return null;

  const parts = tokens.map((t) => (Array.from(t).length >= MIN_STEM ? `${escapeRe(wordStem(t))}\\p{L}{0,${MAX_ENDING}}` : escapeRe(t)));

  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${parts.join("[\\s\\u00a0]+")})(?![\\p{L}\\p{N}_])`, "giu");
}

type Block = { text: string; mentionRanges: [number, number][] };

const INLINE = new Set(["text", "mention", "hardBreak"]);

function collectBlocks(nodes: RichNode[], out: Block[]) {
  for (const node of nodes) {
    const kids = node.content ?? [];

    if (!kids.some((k) => INLINE.has(k.type))) {
      collectBlocks(kids, out);
      continue;
    }

    let text = "";

    const mentionRanges: [number, number][] = [];

    for (const k of kids) {
      if (k.type === "text") text += k.text ?? "";
      else if (k.type === "hardBreak") text += "\n";
      else if (k.type === "mention") {
        const label = String(k.attrs?.label ?? "");

        mentionRanges.push([text.length, text.length + label.length]);
        text += label;
      } else text += "￼";
    }

    out.push({ text, mentionRanges });
  }
}

function snippetAround(text: string, start: number, end: number): string {
  const from = Math.max(0, start - SNIPPET_RADIUS);

  const to = Math.min(text.length, end + SNIPPET_RADIUS);

  return `${from > 0 ? "…" : ""}${text.slice(from, to).replace(/\s+/g, " ")}${to < text.length ? "…" : ""}`;
}

function scanDoc(doc: RichDoc, re: RegExp): { snippet: string; form: string; inMention: boolean }[] {
  const blocks: Block[] = [];

  collectBlocks(doc.content, blocks);

  return blocks.flatMap((b) =>
    Array.from(b.text.matchAll(re), (m) => {
      const start = m.index;

      const end = start + m[0].length;

      return { snippet: snippetAround(b.text, start, end), form: m[0], inMention: b.mentionRanges.some(([a, z]) => start < z && end > a) };
    }),
  );
}

// one hit per matching occurrence; `forms` are the distinct spellings found in the same field of the row
export function findMentions(content: ScenarioContent, query: string, opts: { sectionId?: string } = {}): MentionHit[] {
  const re = buildMentionPattern(query);

  if (!re) return [];

  const hits: MentionHit[] = [];

  for (const s of content.sections) {
    if (opts.sectionId && s.id !== opts.sectionId) continue;

    for (const r of s.rows) {
      for (const field of ["story", "notes"] as const) {
        const found = scanDoc(r[field], re);

        const forms = [...new Set(found.map((f) => f.form))];

        for (const f of found) hits.push({ sectionId: s.id, rowId: r.id, field, snippet: f.snippet, forms, inMention: f.inMention });
      }
    }
  }

  return hits;
}
