import { branchLevelNodeId, racialNodeId, realSkillId } from "./ids";
import { CIRCLE_KEY, readTreeJson } from "./tree-json";
import type { BranchGrid, ProgressionNode, TreeBranch, TreeNodes } from "./types";
import { BRANCH_LEVELS, CIRCLE_SIZE, CIRCLES, RACIAL_BRANCH_ID, ULTIMATE_BRANCH_ID } from "./types";

export function normalizeTree(row: { id: string; race?: string; skills: unknown }): TreeNodes {
  const raw = readTreeJson(row.skills);

  const nodes = new Map<string, ProgressionNode>();

  const grid = new Map<string, BranchGrid>();

  const branches: TreeBranch[] = [];

  const racial = raw.mainSkills.find((b) => b.id === RACIAL_BRANCH_ID);

  for (const level of BRANCH_LEVELS) {
    const nodeId = racialNodeId(level);

    nodes.set(nodeId, { kind: "racial", nodeId, level, skillId: realSkillId(racial?.levelSkillIds?.[level]) });
  }

  for (const b of raw.mainSkills) {
    if (b.id === RACIAL_BRANCH_ID || b.id === ULTIMATE_BRANCH_ID || grid.has(b.id)) continue;

    branches.push({ id: b.id, name: b.name ?? b.id, color: b.color ?? "gray", icon: b.icon ?? null, spellGroupId: b.spellGroupId ?? null });

    for (const level of BRANCH_LEVELS) {
      const nodeId = branchLevelNodeId(b.id, level);

      nodes.set(nodeId, { kind: "branchLevel", nodeId, branchId: b.id, level, skillId: realSkillId(b.levelSkillIds?.[level]) });
    }

    const cells: BranchGrid = { outer: [], middle: [], inner: [] };

    for (const circle of CIRCLES) {
      const list = b.levels?.basic?.[CIRCLE_KEY[circle]] ?? [];

      for (let index = 0; index < CIRCLE_SIZE[circle]; index++) {
        const id = realSkillId(list[index]?.id);

        if (id && !nodes.has(id)) {
          nodes.set(id, { kind: "slot", nodeId: id, branchId: b.id, circle, index, skillId: id });
          cells[circle].push(id);
        } else {
          cells[circle].push(null);
        }
      }
    }

    grid.set(b.id, cells);
  }

  const ultimateId = realSkillId(raw.ultimateSkill?.id);

  if (ultimateId && !nodes.has(ultimateId)) nodes.set(ultimateId, { kind: "ultimate", nodeId: ultimateId, skillId: ultimateId });

  return {
    treeId: row.id,
    jsonId: typeof raw.id === "string" ? raw.id : null,
    race: row.race ?? (typeof raw.race === "string" ? raw.race : ""),
    branches,
    nodes,
    grid,
    ultimateId: ultimateId && nodes.get(ultimateId)?.kind === "ultimate" ? ultimateId : null,
  };
}
