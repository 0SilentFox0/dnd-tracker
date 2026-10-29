import type { MediaReason } from "./media/types";
import { normalizeMediaUrl } from "./media/url";
import { byteLength, CompendiumError } from "./parse";
import { type ImportIssue, issue } from "./types";

import { isRecord } from "@/lib/utils/common/is-record";

const refs = new Set(["spell", "item", "creature", "race", "class", "feat", "background", "subclassFeature", "classFeature", "optionalfeature", "table", "skill", "condition", "language", "sense"]);

const plain = new Set(["b", "i", "h", "dice", "damage", "hit", "dc", "recharge", "atk", "chance", "quickref", "filter", "font", "style", "color", "link", "area", "adventure", "status", "reward", "itemProperty"]);

export type EntryBlock = { text: string } | { image: { url: string; alt?: string; caption?: string; path: string; skip?: MediaReason } };

const CAPTION_MAX = 300;

export function renderEntries(value: unknown, path = "entries"): { text: string; issues: ImportIssue[] } {
  const { blocks, issues } = renderEntryBlocks(value, path);

  for (const block of blocks) if ("image" in block) issues.push(issue("MEDIA_SKIPPED", block.image.path));

  return { text: blocks.flatMap((b) => ("text" in b ? [b.text] : [])).join("\n"), issues };
}

export function renderEntryBlocks(value: unknown, path = "entries"): { blocks: EntryBlock[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];

  function text(input: string, at: string): string {
    let result = input;

    for (let n = 0; n < 32 && result.includes("{@"); n++) {
      const next = result.replace(/\{@([\w]+)(?:\s+([^{}]*))?\}/g, (_, tag: string, body = "") => {
        if (tag === "h") return "Hit: ";

        const parts = body.split("|");

        if (refs.has(tag)) return parts[2] || parts[0];

        if (!plain.has(tag)) issues.push(issue("UNSUPPORTED_TAG", at));

        if (["font", "style", "color"].includes(tag)) return parts[1] ?? parts[0];

        return parts[0];
      });

      if (next === result) break;

      result = next;
    }

    // Output is plain text; consumers must render as text/RichNode, never dangerouslySetInnerHTML.
    return result;
  }

  function image(v: Record<string, unknown>, at: string): EntryBlock {
    const normalized = normalizeMediaUrl(v.href);

    const clip = (x: unknown) => (typeof x === "string" && x.trim() ? text(x, at).slice(0, CAPTION_MAX) : undefined);

    const alt = clip(v.title);

    const caption = clip(v.credit) ?? alt;

    const base = { ...(alt && { alt }), ...(caption && { caption }), path: at };

    if ("reason" in normalized) return { image: { url: typeof v.href === "string" ? v.href.slice(0, 1024) : "", ...base, skip: normalized.reason } };

    return { image: { url: normalized.url, ...base } };
  }

  function walk(v: unknown, at: string): EntryBlock[] {
    if (typeof v === "string") {
      const t = text(v, at);

      return t ? [{ text: t }] : [];
    }

    if (typeof v === "number" || typeof v === "boolean") return [{ text: String(v) }];

    if (Array.isArray(v)) return v.flatMap((x, i) => walk(x, `${at}[${i}]`));

    if (!isRecord(v)) return [];

    const type = v.type;

    if (type === "image") return [image(v, at)];

    if (type === "gallery") return (Array.isArray(v.images) ? v.images : []).flatMap((x, i) => (isRecord(x) ? [image(x, `${at}.images[${i}]`)] : []));

    if (typeof type === "string" && !["entries", "section", "list", "options", "table", "tableGroup", "inset", "insetReadaloud", "quote", "item", "itemSub", "itemSpell", "link", "refSubclassFeature", "refClassFeature", "refOptionalfeature", "refFeat"].includes(type)) issues.push(issue("UNSUPPORTED_ENTRY", at));

    const known = ["name", "caption", "colLabels", "entries", "entry", "items", "rows", "tables", "by", "from", "subclassFeature", "classFeature", "optionalfeature", "feat"];

    const rendered = known.filter((key) => v[key] !== undefined).flatMap((key) => walk(v[key], `${at}.${key}`));

    if (rendered.length > 0) return rendered;

    if (typeof type !== "string") issues.push(issue("UNSUPPORTED_ENTRY", at));

    return [];
  }

  const blocks: EntryBlock[] = [];

  for (const block of walk(value, path)) {
    const last = blocks[blocks.length - 1];

    if ("text" in block && last && "text" in last) last.text += `\n${block.text}`;
    else blocks.push("text" in block ? { text: block.text } : block);
  }

  const size = blocks.reduce((sum, b) => sum + ("text" in b ? byteLength(b.text) : 0), 0);

  if (size > 64 * 1024) throw new CompendiumError("NOTES_SIZE", path, `${path}: ${Math.round(size / 1024)} KiB`);

  return { blocks, issues };
}
