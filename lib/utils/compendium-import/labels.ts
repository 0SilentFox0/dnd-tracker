import { COMPENDIUM_INFO_ISSUE_CODES, type JsonRecord } from "@/lib/constants/compendium-import";
import type { Translator } from "@/lib/i18n/translator";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ImportIssue } from "@/types/compendium-import";

const known = (t: Translator, group: string, id: string) => t.has(`${group}.${id}`) ? t(`${group}.${id}`) : undefined;

export const kindLabel = (t: Translator, kind: string): string => kind.startsWith("template:") ? t("templateKind", { kind: known(t, "targetKinds", kind.slice(9)) ?? kind.slice(9) }) : known(t, "inputKinds", kind) ?? known(t, "targetKinds", kind) ?? kind;

export const editionLabel = (t: Translator, edition: string) => t(`editions.${edition === "classic" || edition === "one" ? edition : "unknown"}`);

function leadingKey(text: string): { key: unknown[]; rest: string } | undefined {
  if (!text.startsWith("[1,")) return;

  let depth = 0, inString = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) { if (c === "\\") i++; else if (c === '"') inString = false; } else if (c === '"') inString = true;
    else if (c === "[") depth++;
    else if (c === "]" && --depth === 0) {
      try {
        const key = JSON.parse(text.slice(0, i + 1));

        return Array.isArray(key) ? { key, rest: text.slice(i + 1).replace(/^\./, "") } : undefined;
      } catch { return; }
    }
  }
}

function keyLabel(t: Translator, key: unknown[]) {
  const [, kind, source, , name, parent] = key;

  const owner = Array.isArray(parent) && parent.length ? ` (${parent.join(", ")})` : "";

  return `${kindLabel(t, String(kind))} «${String(name)}»${owner}${source ? ` · ${String(source)}` : ""}`;
}

export function entryLabel(t: Translator, key: string) {
  const parsed = leadingKey(key);

  return parsed ? keyLabel(t, parsed.key) : key;
}

export function readablePath(t: Translator, path: string) {
  const parsed = leadingKey(path);

  if (parsed) return parsed.rest ? `${keyLabel(t, parsed.key)} · ${t("path.field", { path: parsed.rest })}` : keyLabel(t, parsed.key);

  const input = /^([a-zA-Z]+)\[(\d+)\](.*)$/.exec(path);

  if (input) return `${t("path.inFile", { kind: known(t, "inputKinds", input[1]) ?? input[1], n: Number(input[2]) + 1 })}${input[3] ? ` · ${input[3].replace(/^\./, "")}` : ""}`;

  return path;
}

export const statusLabel = (t: Translator, status: string) => known(t, "statuses", status) ?? status;

export function sourceLabel(t: Translator, source: unknown) {
  if (!isRecord(source)) return String(source);

  const name = String(source.full ?? source.json ?? t("path.unknownSource"));

  const authors = Array.isArray(source.authors) ? source.authors.join(", ") : "";

  return [name, source.abbreviation && `(${String(source.abbreviation)})`, authors && `— ${authors}`, source.version && `v${String(source.version)}`, source.dateReleased && String(source.dateReleased), typeof source.url === "string" && source.url].filter(Boolean).join(" ");
}

const metaEditionLabel = (t: Translator, edition: unknown) => edition === "classic" || edition === "one" ? editionLabel(t, edition) : undefined;

export function metaSummary(t: Translator, meta: unknown): { sources: string[]; edition?: string } {
  const record = isRecord(meta) ? meta : {};

  return { sources: Array.isArray(record.sources) ? record.sources.map((source) => sourceLabel(t, source)) : [], edition: metaEditionLabel(t, record.edition) };
}

export function describeRulesPatch(t: Translator, patch: JsonRecord | undefined) {
  if (!patch) return t("rulesPatch.none");

  const parts: string[] = [];

  if (isRecord(patch.classes) && typeof patch.classes.enabled === "boolean") parts.push(t(patch.classes.enabled ? "rulesPatch.enableClasses" : "rulesPatch.disableClasses"));

  const other = Object.keys(patch).filter((key) => key !== "classes").length;

  if (other) parts.push(t("rulesPatch.otherSections", { count: other }));

  return parts.join("; ") || t("rulesPatch.none");
}

export function summaryLines(t: Translator, summary: unknown): string[] {
  if (!isRecord(summary)) return [];

  const count = (value: unknown) => Array.isArray(value) ? value.length : 0;

  const originFeat = Array.isArray(summary.originFeat) ? summary.originFeat.map((feat) => isRecord(feat) ? `«${String(feat.name)}»` : "").filter(Boolean).join(", ") : "";

  return [t("summary.choices", { count: count(summary.choices) }), t("summary.skillsTools", { skills: count(summary.skills), tools: count(summary.tools) }), ...(originFeat ? [t("summary.originFeat", { names: originFeat })] : []), t("summary.manualGear")];
}

export function splitInfoIssues(issues: ImportIssue[]) {
  const info = issues.filter((i) => COMPENDIUM_INFO_ISSUE_CODES.has(i.code));

  return { actions: issues.filter((i) => !COMPENDIUM_INFO_ISSUE_CODES.has(i.code)), info };
}

export function infoSummary(t: Translator, info: ImportIssue[]) {
  if (!info.length) return "";

  const categories = [...new Set(info.filter((i) => i.code === "UNSUPPORTED_CATEGORY").map((i) => i.path))];

  const media = info.filter((i) => i.code === "MEDIA_OR_FOUNDRY_SKIPPED").length;

  return [categories.length && t("info.unsupportedCategories", { categories: categories.join(", ") }), media && t("info.mediaSkipped", { count: media })].filter(Boolean).join(". ");
}
