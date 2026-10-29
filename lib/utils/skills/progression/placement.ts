import { normalizeTree } from "./normalize";
import type { ProgressionNode } from "./types";

export interface SkillPlacement { group: number; label: string; params?: { tier: string } }

export const PLACEMENT_UNPLACED: SkillPlacement = { group: 6, label: "skillTree.placement.unplaced" };

const CIRCLE_PLACEMENT = { outer: { group: 1, label: "skillTree.placement.outer" }, middle: { group: 2, label: "skillTree.placement.middle" }, inner: { group: 3, label: "skillTree.placement.inner" } } as const;

function placementOf(node: ProgressionNode): SkillPlacement {
  switch (node.kind) {
    case "branchLevel":
      return { group: 0, label: "skillTree.placement.branchLevel", params: { tier: node.level } };
    case "slot":
      return { ...CIRCLE_PLACEMENT[node.circle] };
    case "racial":
      return { group: 4, label: "skillTree.placement.racial", params: { tier: node.level } };
    case "ultimate":
      return { group: 5, label: "skillTree.placement.ultimate" };
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
