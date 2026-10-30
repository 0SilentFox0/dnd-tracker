import type { ScenarioAiOp } from "@/types/ai";
import type { RichDoc, RichNode } from "@/types/scenario";

export const REF_PREFIX = "@ref:";

export const refPlaceholder = (ref: string) => `${REF_PREFIX}${ref}`;

const mapNodes = (nodes: RichNode[], id: (v: string) => string): RichNode[] =>
  nodes.map((n) => {
    const attrs = n.type === "mention" && typeof n.attrs?.id === "string" ? { ...n.attrs, id: id(n.attrs.id) } : n.attrs;

    return { ...n, ...(attrs && { attrs }), ...(n.content && { content: mapNodes(n.content, id) }) };
  });

const mapDoc = (doc: RichDoc, id: (v: string) => string): RichDoc => ({ ...doc, content: mapNodes(doc.content, id) });

const mapOps = (ops: ScenarioAiOp[], id: (v: string) => string): ScenarioAiOp[] =>
  ops.map((op) => (op.op === "replaceRow" ? { ...op, ...(op.story && { story: mapDoc(op.story, id) }), ...(op.notes && { notes: mapDoc(op.notes, id) }) } : op));

export const substituteRefs = (ops: ScenarioAiOp[], ids: ReadonlyMap<string, string>): ScenarioAiOp[] =>
  mapOps(ops, (v) => (v.startsWith(REF_PREFIX) ? (ids.get(v.slice(REF_PREFIX.length)) ?? v) : v));

export function hasRefPlaceholder(ops: ScenarioAiOp[]): boolean {
  let found = false;

  mapOps(ops, (v) => {
    if (v.startsWith(REF_PREFIX)) found = true;

    return v;
  });

  return found;
}

const collectIds = (nodes: RichNode[], out: Set<string>) => {
  for (const n of nodes) {
    if (n.type === "mention" && n.attrs?.type === "acquaintance" && typeof n.attrs.id === "string") out.add(n.attrs.id);

    if (n.content) collectIds(n.content, out);
  }
};

const opDocs = (op: ScenarioAiOp): { after: RichDoc; before?: RichDoc }[] => {
  if (op.op === "replaceRow") return [...(op.story ? [{ after: op.story, before: op.before.story }] : []), ...(op.notes ? [{ after: op.notes, before: op.before.notes }] : [])];

  if (op.op === "insertRow") return [{ after: op.row.story }, { after: op.row.notes }];

  if (op.op === "addSection") return op.section.rows.flatMap((r) => [{ after: r.story }, { after: r.notes }]);

  return [];
};

const idsOf = (doc?: RichDoc) => {
  const out = new Set<string>();

  if (doc) collectIds(doc.content, out);

  return out;
};

/** Chips introduced by the ops: present in the new content, absent from the replaced one. */
export function acquaintanceMentionIds(ops: ScenarioAiOp[]): string[] {
  const out = new Set<string>();

  for (const op of ops)
    for (const { after, before } of opDocs(op)) {
      const old = idsOf(before);

      for (const id of idsOf(after)) if (!old.has(id)) out.add(id);
    }

  return [...out];
}

export function sectionOfMention(ops: ScenarioAiOp[], id: string): string | undefined {
  for (const op of ops) {
    if (!opDocs(op).some(({ after }) => idsOf(after).has(id))) continue;

    if (op.op === "addSection") return op.section.id;

    if (op.op === "replaceRow" || op.op === "insertRow") return op.sectionId;
  }

  return undefined;
}

const countMentions = (nodes: RichNode[]): number => nodes.reduce((n, node) => n + (node.type === "mention" ? 1 : 0) + countMentions(node.content ?? []), 0);

const asText = (n: RichNode): RichNode => (n.type === "mention" ? { type: "text", text: String(n.attrs?.label ?? ""), ...(n.marks && { marks: n.marks }) } : n);

const sameMarks = (a: RichNode, b: RichNode) => JSON.stringify(a.marks ?? []) === JSON.stringify(b.marks ?? []);

function flatten(nodes: RichNode[]): RichNode[] {
  const out: RichNode[] = [];

  for (const raw of nodes) {
    const n = asText(raw);

    const last = out[out.length - 1];

    if (n.type === "text" && last?.type === "text" && sameMarks(last, n)) {
      out[out.length - 1] = { ...last, text: `${last.text ?? ""}${n.text ?? ""}` };
      continue;
    }

    out.push(n.content ? { ...n, content: flatten(n.content) } : n);
  }

  return out;
}

/** Number of chips added when the doc differs only by turning plain text into chips (marks and atoms intact), else null. */
export function addedMentionCount(before: RichDoc, after: RichDoc): number | null {
  if (JSON.stringify(flatten(before.content)) !== JSON.stringify(flatten(after.content))) return null;

  const added = countMentions(after.content) - countMentions(before.content);

  return added > 0 ? added : null;
}
