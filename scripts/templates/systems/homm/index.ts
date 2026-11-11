import { settleJsonRefs } from "../../lib/json-refs-db";
import type { Pack, PackRow } from "../../lib/pack";
import type { PackHooks, PackIssue } from "../types";
import { nameRefIssues } from "./name-refs";
import { treeFromPack, treeToPack, unresolvedTreeSlugs } from "./skill-trees";

function treeIssues(pack: Pack): PackIssue[] {
  if (pack.manifest.include?.length) return [];

  const slugsOf = (kind: "main-skills" | "skills" | "spell-groups") => new Set((pack.rows[kind] ?? []).map((row) => row.slug));

  const known = { "main-skills": slugsOf("main-skills"), skills: slugsOf("skills"), "spell-groups": slugsOf("spell-groups") };

  return (pack.rows.skillTrees ?? []).flatMap((row) => unresolvedTreeSlugs(row, known).map((ref): PackIssue => ({ level: "error", kind: "skillTrees", slug: row.slug, message: `skillTrees "${String(row.race)}": unknown ${ref}` })));
}

/** Skill trees hold row names only inside JSON branches; they follow the rows by the D30 overlay instead of the catalog. */
const i18nRows = (pack: Pack) => Object.fromEntries(Object.entries(pack.rows).filter(([kind]) => kind !== "skillTrees")) as Record<string, PackRow[]>;

export const HOMM_HOOKS: PackHooks = {
  validatePack: (pack) => [...treeIssues(pack), ...nameRefIssues(pack)],
  i18nRows,
  afterImport: async ({ templateId, idBySlug }) => void (await settleJsonRefs(templateId, idBySlug)),
  toPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeToPack(row, refs) : (row as never)),
  fromPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeFromPack(row, refs) : row),
};

export const HOMM_MODULE_HOOKS = HOMM_HOOKS;
