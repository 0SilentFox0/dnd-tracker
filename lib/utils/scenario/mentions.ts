import type { RichDoc, RichNode,ScenarioContent } from "@/types/scenario";

export type MentionField = "story" | "notes";

export type MentionHit = { sectionId: string; rowId: string; field: MentionField; snippet: string; forms: string[]; inMention: boolean };

const MIN_STEM = 4;

const MAX_ENDING = 3;

const STRIPPABLE = /[аеєиіїоуюяьй]$/iu;

const SNIPPET_RADIUS = 50;

export const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// drops case endings so an oblique form of a name finds every other form, keeping at least MIN_STEM letters
export function wordStem(word: string): string {
  let stem = word;

  while (Array.from(stem).length > MIN_STEM && STRIPPABLE.test(stem)) stem = Array.from(stem).slice(0, -1).join("");

  return stem;
}

const POSSESSIVE = /(?:['’]s|['’])$/iu;

const GZ = "[\\u0433\\u0437]";

const KC = "[\\u043a\\u0446]";

const XS = "[\\u0445\\u0441]";

const ALTERNATION: [RegExp, string][] = [[/[гз]$/iu, GZ], [/[кц]$/iu, KC], [/[хс]$/iu, XS]];

function queryTokens(query: string): string[] {
  return query
    .normalize("NFC")
    .split(/\s+/u)
    .map((t) => t.replace(POSSESSIVE, ""))
    .filter(Boolean);
}

type TokenParts = { head: string; alt: string; literal: boolean };

// the last stem letter alternates (г/з, к/ц, х/с) only when a case ending was actually dropped
function tokenParts(token: string): TokenParts {
  if (Array.from(token).length < MIN_STEM) return { head: token, alt: "", literal: true };

  const stem = wordStem(token);

  const last = Array.from(stem).pop() ?? "";

  const alt = stem !== token ? ALTERNATION.find(([re]) => re.test(last))?.[1] : undefined;

  return alt ? { head: Array.from(stem).slice(0, -1).join(""), alt, literal: false } : { head: stem, alt: "", literal: false };
}

export function buildMentionPattern(query: string): RegExp | null {
  const tokens = queryTokens(query);

  if (!tokens.length) return null;

  const parts = tokens.map((t) => {
    const { head, alt, literal } = tokenParts(t);

    return literal ? escapeRe(head) : `${escapeRe(head)}${alt}\\p{L}{0,${MAX_ENDING}}`;
  });

  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${parts.join("[\\s\\u00a0]+")})(?![\\p{L}\\p{N}_])`, "giu");
}

// lowercase literal prefix of each token; every match of buildMentionPattern contains all of them
export function mentionPrefixes(query: string): string[] {
  return queryTokens(query).map((t) => tokenParts(t).head.toLowerCase());
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
      if (k.type === "text") text += (k.text ?? "").normalize("NFC");
      else if (k.type === "hardBreak") text += "\n";
      else if (k.type === "mention") {
        const label = String(k.attrs?.label ?? "").normalize("NFC");

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
