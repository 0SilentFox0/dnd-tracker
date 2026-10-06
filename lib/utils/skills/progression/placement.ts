import { normalizeTree } from "./normalize";
import type { ProgressionNode } from "./types";
import { BRANCH_LEVEL_LABEL } from "./types";

export interface SkillPlacement { group: number; label: string }

export const PLACEMENT_UNPLACED: SkillPlacement = { group: 6, label: "Без місця в дереві" };

const CIRCLE_PLACEMENT = { outer: { group: 1, label: "Зовнішнє коло" }, middle: { group: 2, label: "Середнє коло" }, inner: { group: 3, label: "Внутрішнє коло" } } as const;

function placementOf(node: ProgressionNode): SkillPlacement {
  switch (node.kind) {
    case "branchLevel":
      return { group: 0, label: `Рівень гілки · ${BRANCH_LEVEL_LABEL[node.level]}` };
    case "slot":
      return { ...CIRCLE_PLACEMENT[node.circle] };
    case "racial":
      return { group: 4, label: `Расове · ${BRANCH_LEVEL_LABEL[node.level]}` };
    case "ultimate":
      return { group: 5, label: "Ультимейт" };
  }
}

/** Де стоїть кожен скіл бібліотеки в деревах кампанії (перше входження виграє). */
export function skillPlacements(rows: Array<{ id: string; skills: unknown }>): Map<string, SkillPlacement> {
  const out = new Map<string, SkillPlacement>();

  for (const row of rows) {
    for (const node of normalizeTree(row).nodes.values()) {
      if (node.skillId && !out.has(node.skillId)) out.set(node.skillId, placementOf(node));
    }
  }

  return out;
}
