import { escapeRe } from "./mentions";

import type { MentionType, RichDoc, RichNode } from "@/types/scenario";

export type MentionTarget = { id: string; type: MentionType };

const WORD_CHAR = /[\p{L}\p{N}_]/u;

export function buildFormsPattern(forms: string[]): RegExp | null {
  const parts = [...new Set(forms.map((f) => f.trim()).filter(Boolean))].sort((a, b) => b.length - a.length).map(escapeRe);

  return parts.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${parts.join("|")})(?![\\p{L}\\p{N}_])`, "giu") : null;
}

function wrapText(node: RichNode, re: RegExp, target: MentionTarget, edge: { before: string; after: string }): RichNode[] | null {
  const text = node.text ?? "";

  const matches = Array.from(text.matchAll(re)).filter((m) => !(m.index === 0 && WORD_CHAR.test(edge.before)) && !(m.index + m[0].length === text.length && WORD_CHAR.test(edge.after)));

  if (!matches.length) return null;

  const marks = node.marks?.length ? { marks: node.marks } : {};

  const out: RichNode[] = [];

  let at = 0;

  for (const m of matches) {
    if (m.index > at) out.push({ ...node, text: text.slice(at, m.index) });

    out.push({ type: "mention", attrs: { id: target.id, label: m[0], type: target.type }, ...marks });
    at = m.index + m[0].length;
  }

  if (at < text.length) out.push({ ...node, text: text.slice(at) });

  return out;
}

function wrapNodes(nodes: RichNode[], re: RegExp, target: MentionTarget, count: { n: number }): RichNode[] {
  return nodes.flatMap((node, i) => {
    if (node.type === "text") {
      const wrapped = wrapText(node, re, target, { before: nodes[i - 1]?.type === "text" ? (nodes[i - 1].text ?? "").slice(-1) : "", after: nodes[i + 1]?.type === "text" ? (nodes[i + 1].text ?? "").slice(0, 1) : "" });

      if (!wrapped) return [node];

      count.n += wrapped.filter((n) => n.type === "mention").length;

      return wrapped;
    }

    if (node.type === "mention" || !node.content) return [node];

    return [{ ...node, content: wrapNodes(node.content, re, target, count) }];
  });
}

// existing chips are left untouched; `count` is the number of new chips
export function wrapMentions(doc: RichDoc, forms: string[], target: MentionTarget): { doc: RichDoc; count: number } {
  const re = buildFormsPattern(forms);

  if (!re) return { doc, count: 0 };

  const count = { n: 0 };

  const content = wrapNodes(doc.content, re, target, count);

  return count.n ? { doc: { ...doc, content }, count: count.n } : { doc, count: 0 };
}
