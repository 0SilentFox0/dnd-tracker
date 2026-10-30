import { escapeRe } from "./mentions";

import type { MentionType, RichDoc, RichNode } from "@/types/scenario";

export type MentionTarget = { id: string; type: MentionType };

export function buildFormsPattern(forms: string[]): RegExp | null {
  const parts = [...new Set(forms.map((f) => f.trim()).filter(Boolean))].sort((a, b) => b.length - a.length).map(escapeRe);

  return parts.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${parts.join("|")})(?![\\p{L}\\p{N}_])`, "giu") : null;
}

type Mark = NonNullable<RichNode["marks"]>[number];

type Accept = (match: string) => boolean;

const isCapital = (ch: string) => ch !== ch.toLowerCase();

// a capitalised form matches only a capitalised occurrence, so a name that is also a common word does not hit the word
function caseAccept(forms: string[]): Accept {
  const trimmed = [...new Set(forms.map((f) => f.trim()).filter(Boolean))];

  return (match) => {
    const lower = match.toLowerCase();

    const same = trimmed.filter((f) => f.toLowerCase() === lower);

    return same.length === 0 || same.some((f) => !isCapital(f[0])) || isCapital(match[0]);
  };
}

function commonMarks(nodes: RichNode[]): Mark[] {
  const [first, ...rest] = nodes.map((n) => n.marks ?? []);

  return first.filter((m) => rest.every((r) => r.some((x) => JSON.stringify(x) === JSON.stringify(m))));
}

function wrapRun(run: RichNode[], re: RegExp, accept: Accept, target: MentionTarget, count: { n: number }): RichNode[] {
  const text = run.map((n) => n.text ?? "").join("");

  const matches = Array.from(text.matchAll(re)).filter((m) => accept(m[0]));

  if (!matches.length) return run;

  const out: RichNode[] = [];

  const covered: RichNode[] = [];

  let mi = 0;

  let ns = 0;

  for (const node of run) {
    const ne = ns + (node.text ?? "").length;

    let at = ns;

    while (at < ne) {
      const m = matches[mi];

      if (!m || m.index >= ne) {
        out.push({ ...node, text: text.slice(at, ne) });
        break;
      }

      if (m.index > at) {
        out.push({ ...node, text: text.slice(at, m.index) });
        at = m.index;
      }

      covered.push(node);

      at = Math.min(ne, m.index + m[0].length);

      if (at === m.index + m[0].length) {
        const marks = commonMarks(covered);

        out.push({ type: "mention", attrs: { id: target.id, label: m[0], type: target.type }, ...(marks.length ? { marks } : {}) });
        covered.length = 0;
        mi++;
        count.n++;
      }
    }

    ns = ne;
  }

  return out;
}

function wrapNodes(nodes: RichNode[], re: RegExp, accept: Accept, target: MentionTarget, count: { n: number }): RichNode[] {
  const out: RichNode[] = [];

  let run: RichNode[] = [];

  const flush = () => {
    if (run.length) out.push(...wrapRun(run, re, accept, target, count));

    run = [];
  };

  for (const node of nodes) {
    if (node.type === "text") {
      run.push(node);
      continue;
    }

    flush();
    out.push(node.type === "mention" || !node.content ? node : { ...node, content: wrapNodes(node.content, re, accept, target, count) });
  }

  flush();

  return out;
}

// existing chips are left untouched; `count` is the number of new chips
export function wrapMentions(doc: RichDoc, forms: string[], target: MentionTarget): { doc: RichDoc; count: number } {
  const re = buildFormsPattern(forms);

  if (!re) return { doc, count: 0 };

  const count = { n: 0 };

  const content = wrapNodes(doc.content, re, caseAccept(forms), target, count);

  return count.n ? { doc: { ...doc, content }, count: count.n } : { doc, count: 0 };
}
