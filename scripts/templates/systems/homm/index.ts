import type { PackHooks } from "../types";
import { treeFromPack, treeToPack } from "./skill-trees";

export const HOMM_HOOKS: PackHooks = {
  toPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeToPack(row, refs) : (row as never)),
  fromPackRow: (kind, row, refs) => (kind === "skillTrees" ? treeFromPack(row, refs) : row),
};
