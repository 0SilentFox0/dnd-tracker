import type { RichDoc, RichNode } from "@/types/scenario";

export const EMPTY_DOC: RichDoc = { type: "doc", content: [] };

const LINE_BLOCKS = new Set(["paragraph", "heading", "say", "listItem", "tableCell", "tableHeader"]);

const isSecret = (node: RichNode) => node.marks?.some((m) => m.type === "secret") ?? false;

function nodeText(node: RichNode): string {
  if (node.type === "text") return node.text ?? "";

  if (node.type === "mention") return String(node.attrs?.label ?? "");

  if (node.type === "hardBreak") return "\n";

  const inner = (node.content ?? []).map(nodeText).join("");

  if (node.type === "callout") return `${String(node.attrs?.tag ?? "")}\n${inner}`;

  return LINE_BLOCKS.has(node.type) ? `${inner}\n` : inner;
}

export function docText(doc: RichDoc): string {
  return doc.content.map(nodeText).join("").replace(/\n{2,}/g, "\n").trim();
}

export function isDocEmpty(doc: RichDoc): boolean {
  const hasAtom = (n: RichNode): boolean => n.type === "token" || n.type === "mention" || n.type === "image" || (n.content ?? []).some(hasAtom);

  return docText(doc) === "" && !doc.content.some(hasAtom);
}

function strip(node: RichNode): RichNode | null {
  if (isSecret(node)) return null;

  if (!node.content) return node;

  const content = node.content.map(strip).filter((n): n is RichNode => n !== null);

  // a block that had text and lost all of it was wholly secret — drop it rather than leave an empty shell
  if (node.content.length > 0 && content.length === 0) return null;

  return { ...node, content };
}

export function stripSecrets(doc: RichDoc): RichDoc {
  return { type: "doc", content: doc.content.map(strip).filter((n): n is RichNode => n !== null) };
}
