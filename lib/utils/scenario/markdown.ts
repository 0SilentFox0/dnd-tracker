import { CALLOUT_KINDS, MENTION_TYPES } from "@/lib/constants/scenario";
import type { RichDoc, RichMark, RichMarkType, RichNode } from "@/types/scenario";

// a fixed opening order keeps the serialization of a mark set deterministic
const MARK_ORDER: RichMarkType[] = ["secret", "bold", "italic"];

const MARK_TOKEN: Record<RichMarkType, string> = { secret: "||", bold: "**", italic: "_" };

const ESCAPE = /[\\*_|[\]{}]/g;

const escapeText = (s: string) => s.replace(ESCAPE, (c) => `\\${c}`);

const markSet = (n: RichNode) => new Set((n.marks ?? []).map((m) => m.type));

function inlineToMd(nodes: RichNode[]): string {
  const open: RichMarkType[] = [];

  let out = "";

  const closeTo = (keep: Set<RichMarkType>) => {
    while (open.length && !open.every((m) => keep.has(m))) out += MARK_TOKEN[open.pop()!];
  };

  for (const n of nodes) {
    const want = markSet(n);

    closeTo(want);

    for (const m of MARK_ORDER) {
      if (want.has(m) && !open.includes(m)) {
        open.push(m);
        out += MARK_TOKEN[m];
      }
    }

    if (n.type === "text") out += escapeText(n.text ?? "");
    else if (n.type === "hardBreak") out += "\\\n";
    else if (n.type === "mention") out += `[@${escapeText(String(n.attrs?.label ?? ""))}](${String(n.attrs?.type ?? "character")}:${String(n.attrs?.id ?? "")})`;
    else if (n.type === "token") out += `{{token:${n.attrs?.color === "red" ? "red" : "green"}}}`;
  }

  closeTo(new Set());

  return out;
}

const isEmptyParagraph = (n: RichNode) => n.type === "paragraph" && !(n.content ?? []).length;

function blocksToMd(nodes: RichNode[]): string {
  return nodes.filter((n) => !isEmptyParagraph(n)).map(blockToMd).join("\n\n");
}

const cellText = (cell: RichNode) => inlineToMd(cell.content?.[0]?.content ?? []);

function blockToMd(n: RichNode): string {
  const inner = n.content ?? [];

  switch (n.type) {
    case "paragraph":
      return inlineToMd(inner);
    case "heading":
      return `### ${inlineToMd(inner)}`;
    case "bulletList":
      return inner.map((li) => `- ${inlineToMd(li.content?.[0]?.content ?? [])}`).join("\n");
    case "orderedList":
      return inner.map((li, i) => `${i + 1}. ${inlineToMd(li.content?.[0]?.content ?? [])}`).join("\n");
    case "readAloud":
      return `:::read\n${blocksToMd(inner)}\n:::`;
    case "say":
      return `:::say\n${inlineToMd(inner)}\n:::`;
    case "callout":
      return `:::callout kind="${String(n.attrs?.kind ?? "event")}" tag="${String(n.attrs?.tag ?? "").replace(/"/g, "'")}"\n${blocksToMd(inner)}\n:::`;
    case "table": {
      const rows = inner.map((r) => `| ${(r.content ?? []).map(cellText).join(" | ")} |`);

      const cols = inner[0]?.content?.length ?? 0;

      const headerless = inner[0]?.content?.[0]?.type !== "tableHeader";

      const head = headerless ? `| ${Array(cols).fill("").join(" | ")} |` : rows[0];

      return [head, `|${" --- |".repeat(cols)}`, ...(headerless ? rows : rows.slice(1))].join("\n");
    }
    case "image":
      return `{{image:${escapeText(String(n.attrs?.alt || n.attrs?.mediaId || ""))}}}`;
    default:
      return "";
  }
}

export function docToMarkdown(doc: RichDoc): string {
  return blocksToMd(doc.content);
}

// ---------- parsing ----------

const INLINE_TOKEN = /\\([\\*_|[\]{}])|\\\n|\*\*|\|\||_|\*|\[@((?:\\.|[^\]\\])*)\]\(([a-z]+):([^)\s]+)\)|\{\{token:(red|green)\}\}/g;

function parseInline(src: string): RichNode[] {
  const out: RichNode[] = [];

  const active = new Set<RichMarkType>();

  const marks = (): RichMark[] | undefined => (active.size ? MARK_ORDER.filter((m) => active.has(m)).map((type) => ({ type })) : undefined);

  const pushText = (text: string) => {
    if (!text) return;

    const m = marks();

    const last = out[out.length - 1];

    if (last?.type === "text" && JSON.stringify(last.marks) === JSON.stringify(m)) last.text += text;
    else out.push({ type: "text", text, ...(m && { marks: m }) });
  };

  const toggle = (m: RichMarkType) => (active.has(m) ? active.delete(m) : active.add(m));

  let at = 0;

  for (const match of src.matchAll(INLINE_TOKEN)) {
    pushText(src.slice(at, match.index));
    at = match.index! + match[0].length;

    const [tok, escaped, label, mType, mId, color] = match;

    if (escaped) pushText(escaped);
    else if (tok === "\\\n") out.push({ type: "hardBreak", ...(marks() && { marks: marks() }) });
    else if (tok === "**") toggle("bold");
    else if (tok === "||") toggle("secret");
    else if (tok === "_" || tok === "*") toggle("italic");
    else if (label !== undefined && (MENTION_TYPES as readonly string[]).includes(mType)) out.push({ type: "mention", attrs: { id: mId, label: label.replace(/\\(.)/g, "$1"), type: mType }, ...(marks() && { marks: marks() }) });
    else if (label !== undefined) pushText(tok);
    else if (color) out.push({ type: "token", attrs: { color }, ...(marks() && { marks: marks() }) });
  }

  pushText(src.slice(at));

  return out;
}

const FENCE_OPEN = /^:::(read|say|callout)(.*)$/;

const ATTR = /(\w+)="([^"]*)"/g;

function splitBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];

  let cur: string[] = [];

  let depth = 0;

  for (const line of lines) {
    if (depth === 0 && line.trim() === "") {
      if (cur.length) blocks.push(cur);

      cur = [];
      continue;
    }

    if (FENCE_OPEN.test(line.trim())) depth++;
    else if (line.trim() === ":::" && depth > 0) depth--;

    cur.push(line);
  }

  if (cur.length) blocks.push(cur);

  return blocks;
}

const paragraph = (src: string): RichNode => ({ type: "paragraph", content: parseInline(src) });

const splitRow = (line: string) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));

const TABLE_SEP = /^\|?(\s*:?-{3,}:?\s*\|)+\s*$/;

function parseBlock(lines: string[]): RichNode[] {
  const first = lines[0].trim();

  const fence = first.match(FENCE_OPEN);

  if (fence && lines[lines.length - 1].trim() === ":::") {
    const body = lines.slice(1, -1);

    if (fence[1] === "say") return [{ type: "say", content: parseInline(body.join("\n")) }];

    const content = parseBlocks(body);

    if (fence[1] === "read") return [{ type: "readAloud", content: content.filter((n) => n.type === "paragraph") }];

    const attrs = Object.fromEntries([...fence[2].matchAll(ATTR)].map(([, k, v]) => [k, v]));

    const kind = (CALLOUT_KINDS as readonly string[]).includes(attrs.kind) ? attrs.kind : "event";

    return [{ type: "callout", attrs: { kind, tag: attrs.tag ?? "" }, content }];
  }

  if (first.startsWith("### ")) return [{ type: "heading", attrs: { level: 3 }, content: parseInline(first.slice(4)) }];

  if (lines.every((l) => /^- /.test(l))) return [{ type: "bulletList", content: lines.map((l) => ({ type: "listItem", content: [paragraph(l.slice(2))] })) }];

  if (lines.every((l) => /^\d+\. /.test(l))) return [{ type: "orderedList", attrs: { start: 1 }, content: lines.map((l) => ({ type: "listItem", content: [paragraph(l.replace(/^\d+\. /, ""))] })) }];

  if (lines.length >= 2 && first.startsWith("|") && TABLE_SEP.test(lines[1].trim())) {
    const row = (line: string, type: "tableHeader" | "tableCell"): RichNode => ({
      type: "tableRow",
      content: splitRow(line).map((c) => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [paragraph(c)] })),
    });

    const headerless = splitRow(lines[0]).every((c) => c === "");

    const body = lines.slice(2).map((l) => row(l, "tableCell"));

    return [{ type: "table", content: headerless ? body : [row(lines[0], "tableHeader"), ...body] }];
  }

  return [paragraph(lines.join("\n"))];
}

function parseBlocks(lines: string[]): RichNode[] {
  return splitBlocks(lines).flatMap(parseBlock).filter((n) => !isEmptyParagraph(n));
}

export function markdownToDoc(md: string): RichDoc {
  return { type: "doc", content: parseBlocks(md.replace(/\r\n?/g, "\n").split("\n")) };
}

// ---------- comparison ----------

const DEFAULT_ATTRS: Record<string, Record<string, unknown>> = {
  tableCell: { colspan: 1, rowspan: 1, colwidth: null },
  tableHeader: { colspan: 1, rowspan: 1, colwidth: null },
  orderedList: { start: 1, type: null },
  heading: { level: 3 },
};

// Tiptap writes default and editor-only attrs (mentionSuggestionChar, textAlign…); they carry no content
const IGNORED_ATTRS = new Set(["mentionSuggestionChar", "textAlign"]);

function normalizeNode(n: RichNode): RichNode | null {
  if (isEmptyParagraph(n)) return null;

  const defaults = DEFAULT_ATTRS[n.type] ?? {};

  const attrs = Object.fromEntries(Object.entries(n.attrs ?? {}).filter(([k, v]) => !IGNORED_ATTRS.has(k) && v !== undefined && defaults[k] !== v && !(v === null && !(k in defaults))));

  const content = n.content?.map(normalizeNode).filter((c): c is RichNode => c !== null);

  const marks = n.marks?.length ? [...n.marks].sort((a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type)).map((m) => ({ type: m.type })) : undefined;

  return { type: n.type, ...(Object.keys(attrs).length && { attrs }), ...(content?.length && { content }), ...(marks && { marks }), ...(n.text !== undefined && { text: n.text }) };
}

function mergeTexts(nodes: RichNode[]): RichNode[] {
  return nodes.reduce<RichNode[]>((acc, n) => {
    const last = acc[acc.length - 1];

    if (n.type === "text" && last?.type === "text" && JSON.stringify(last.marks) === JSON.stringify(n.marks)) acc[acc.length - 1] = { ...last, text: `${last.text}${n.text}` };
    else acc.push(n.content ? { ...n, content: mergeTexts(n.content) } : n);

    return acc;
  }, []);
}

const normalizeDoc = (d: RichDoc): RichDoc => ({ type: "doc", content: mergeTexts(d.content.map(normalizeNode).filter((n): n is RichNode => n !== null)) });

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
}

export function isLosslessDoc(doc: RichDoc): boolean {
  return canonicalJson(normalizeDoc(markdownToDoc(docToMarkdown(doc)))) === canonicalJson(normalizeDoc(doc));
}
