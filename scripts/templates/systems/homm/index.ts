import type { Pack } from "../../lib/pack";
import type { PackHooks, PackIssue } from "../types";
import { treeFromPack, treeToPack, unresolvedTreeSlugs } from "./skill-trees";

function treeIssues(pack: Pack): PackIssue[] {
  if (pack.manifest.include?.length) return [];

  const slugsOf = (kind: "main-skills" | "skills" | "spell-groups") => new Set((pack.rows[kind] ?? []).map((row) => row.slug));

  const known = { "main-skills": slugsOf("main-skills"), skills: slugsOf("skills"), "spell-groups": slugsOf("spell-groups") };

  return (pack.rows.skillTrees ?? []).flatMap((row) => unresolvedTreeSlugs(row, known).map((ref): PackIssue => ({ level: "error", kind: "skillTrees", slug: row.slug, message: `skillTrees "${String(row.race)}": unknown ${ref}` })));
}

export const HOMM_HOOKS: PackHooks = {
  validatePack: treeIssues,
  toPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeToPack(row, refs) : (row as never)),
  fromPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeFromPack(row, refs) : row),
};
