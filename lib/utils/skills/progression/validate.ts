import { realSkillId } from "./ids";
import type { RawTree } from "./tree-json";
import { CIRCLE_KEY } from "./tree-json";
import { BRANCH_LEVELS, CIRCLES, RACIAL_BRANCH_ID, ULTIMATE_BRANCH_ID } from "./types";

export type TreeErrorCode = "duplicateSkill" | "unknownBranch" | "unknownSkill" | "duplicateBranch";

export interface TreeError { code: TreeErrorCode; ref: string }

export const TREE_ERROR_TEXT: Record<TreeErrorCode, string> = {
  duplicateSkill: "Цей скіл уже стоїть в іншому місці дерева",
  unknownBranch: "Гілки немає серед основних навичок кампанії",
  unknownSkill: "Скіла немає в бібліотеці кампанії",
  duplicateBranch: "Гілка додана двічі",
};

export function validateTree(raw: RawTree, ctx: { mainSkillIds: Set<string>; skillIds: Set<string> }): TreeError[] {
  const errors: TreeError[] = [];

  const branches = new Set<string>();

  const skills = new Set<string>();

  const addSkill = (value: unknown) => {
    const id = realSkillId(value);

    if (!id) return;

    if (!ctx.skillIds.has(id)) errors.push({ code: "unknownSkill", ref: id });

    if (skills.has(id)) errors.push({ code: "duplicateSkill", ref: id });

    skills.add(id);
  };

  for (const b of raw.mainSkills) {
    const pseudo = b.id === RACIAL_BRANCH_ID || b.id === ULTIMATE_BRANCH_ID;

    if (branches.has(b.id)) {
      errors.push({ code: "duplicateBranch", ref: b.id });
      continue;
    }

    branches.add(b.id);

    if (!pseudo && !ctx.mainSkillIds.has(b.id)) errors.push({ code: "unknownBranch", ref: b.id });

    BRANCH_LEVELS.forEach((l) => addSkill(b.levelSkillIds?.[l]));
    CIRCLES.forEach((c) => (b.levels?.basic?.[CIRCLE_KEY[c]] ?? []).forEach((s) => addSkill(s?.id)));
  }

  addSkill(raw.ultimateSkill?.id);

  return errors;
}
