import type { BranchLevel } from "./types";

export const branchLevelNodeId = (branchId: string, level: BranchLevel) => `${branchId}_${level}_level`;

export const racialNodeId = (level: BranchLevel) => `racial_${level}_racial`;

// мок-генератор дерев писав такі id у порожні слоти й ультимейт
const PLACEHOLDER_RE = /^placeholder_|_circle[123]_skill\d+$|_ultimate$/;

export function isPlaceholderSkillId(id: unknown): boolean {
  return typeof id !== "string" || id.trim() === "" || PLACEHOLDER_RE.test(id);
}

export function realSkillId(id: unknown): string | null {
  return isPlaceholderSkillId(id) ? null : (id as string);
}
