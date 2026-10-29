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

export function acquaintanceMentionIds(ops: ScenarioAiOp[]): string[] {
  const out = new Set<string>();

  for (const op of ops) {
    if (op.op !== "replaceRow") continue;

    if (op.story) collectIds(op.story.content, out);

    if (op.notes) collectIds(op.notes.content, out);
  }

  return [...out];
}
