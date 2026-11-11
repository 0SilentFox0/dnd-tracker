import type { Pack } from "../lib/pack";
import type { PackIssue } from "../systems/types";
import { findForbiddenTerms } from "./forbidden-terms";

function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];

  if (Array.isArray(value)) return value.flatMap(stringLeaves);

  return value && typeof value === "object" ? Object.values(value).flatMap(stringLeaves) : [];
}

export function forbiddenTermIssues(pack: Pack): PackIssue[] {
  const scan = (where: string, value: unknown, extra: Partial<PackIssue> = {}) => [...new Set(stringLeaves(value).flatMap(findForbiddenTerms))].map((term): PackIssue => ({ level: "error", message: `${where}: forbidden term "${term}"`, ...extra }));

  const rowIssues = Object.entries(pack.rows).flatMap(([kind, rows]) => (rows ?? []).flatMap((row, index) => scan(`${kind} #${index + 1}${typeof row.name === "string" ? ` "${row.name}"` : ""}`, row, { kind, slug: row.slug })));

  const profiles = (pack.extras["race-profiles"] ?? []) as Array<{ race: string }>;

  return [...rowIssues, ...scan("rules", pack.rules), ...profiles.flatMap(({ race }, index) => scan(`race-profiles #${index + 1} "${race}"`, race))];
}
