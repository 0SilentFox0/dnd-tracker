import { byteLength, CompendiumError } from "./parse";
import { type ImportIssue, issue } from "./types";

import { isRecord } from "@/lib/utils/common/is-record";

const refs = new Set(["spell", "item", "creature", "race", "class", "feat", "background", "subclassFeature", "classFeature", "optionalfeature", "table", "skill", "condition", "language", "sense"]);

const plain = new Set(["b", "i", "h", "dice", "damage", "hit", "dc", "recharge", "atk", "chance", "quickref", "filter", "font", "style", "color", "link", "area", "adventure", "status", "reward", "itemProperty"]);

export function renderEntries(value: unknown, path = "entries"): { text: string; issues: ImportIssue[] } {
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

  function walk(v: unknown, at: string): string {
    if (typeof v === "string") return text(v, at);

    if (typeof v === "number" || typeof v === "boolean") return String(v);

    if (Array.isArray(v)) return v.map((x, i) => walk(x, `${at}[${i}]`)).filter(Boolean).join("\n");

    if (!isRecord(v)) return "";

    const type = v.type;

    if (type === "image" || type === "gallery") { issues.push(issue("MEDIA_SKIPPED", at));

 return ""; }

    if (typeof type === "string" && !["entries", "section", "list", "options", "table", "tableGroup", "inset", "insetReadaloud", "quote", "item", "itemSub", "itemSpell", "link", "refSubclassFeature", "refClassFeature", "refOptionalfeature", "refFeat"].includes(type)) issues.push(issue("UNSUPPORTED_ENTRY", at));

    const known = ["name", "caption", "colLabels", "entries", "entry", "items", "rows", "tables", "by", "from", "subclassFeature", "classFeature", "optionalfeature", "feat"];

    const rendered = known.filter((key) => v[key] !== undefined).map((key) => walk(v[key], `${at}.${key}`)).filter(Boolean).join("\n");

    if (rendered) return rendered;

    if (typeof type !== "string") issues.push(issue("UNSUPPORTED_ENTRY", at));

    return "";
  }

  const rendered = walk(value, path);

  if (byteLength(rendered) > 64 * 1024) throw new CompendiumError("NOTES_SIZE", path, `${path}: ${Math.round(byteLength(rendered) / 1024)} КБ`);

  return { text: rendered, issues };
}
