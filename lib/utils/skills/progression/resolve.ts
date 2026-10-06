import { readUnlocked } from "./progress";
import type { BranchLevel, Circle, ProgressionNode, TreeNodes } from "./types";
import { BRANCH_LEVELS } from "./types";

export interface LearnedNode { nodeId: string; kind: ProgressionNode["kind"]; skillId: string | null; branchId: string | null; level: BranchLevel | null; circle: Circle | null }

function toLearned(node: ProgressionNode): LearnedNode {
  switch (node.kind) {
    case "branchLevel":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: node.branchId, level: node.level, circle: null };
    case "racial":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: null, level: node.level, circle: null };
    case "slot":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: node.branchId, level: null, circle: node.circle };
    case "ultimate":
      return { nodeId: node.nodeId, kind: node.kind, skillId: node.skillId, branchId: null, level: null, circle: null };
  }
}

export function resolveLearned(tree: TreeNodes, progress: unknown): LearnedNode[] {
  return readUnlocked(tree, progress).flatMap((id) => {
    const node = tree.nodes.get(id);

    return node ? [toLearned(node)] : [];
  });
}

const rank = (n: LearnedNode) => (n.level ? BRANCH_LEVELS.indexOf(n.level) : -1);

export function uniqueSkills(learned: LearnedNode[]): LearnedNode[] {
  const best = new Map<string, LearnedNode>();

  for (const n of learned) {
    if (!n.skillId) continue;

    const prev = best.get(n.skillId);

    if (!prev || rank(n) > rank(prev)) best.set(n.skillId, n);
  }

  return learned.filter((n) => !n.skillId || best.get(n.skillId) === n);
}

export function branchLevels(learned: LearnedNode[]): Record<string, BranchLevel> {
  const out: Record<string, BranchLevel> = {};

  for (const n of learned) {
    if (n.kind !== "branchLevel" || !n.branchId || !n.level) continue;

    const current = out[n.branchId];

    if (!current || BRANCH_LEVELS.indexOf(n.level) > BRANCH_LEVELS.indexOf(current)) out[n.branchId] = n.level;
  }

  return out;
}
