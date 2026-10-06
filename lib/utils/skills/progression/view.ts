import { branchLevelNodeId, racialNodeId } from "./ids";
import { learnedInTree } from "./progress";
import { canLearn } from "./rules";
import type { BranchGrid, BranchLevel, LearnBlockReason, ProgressionNode, TreeNodes } from "./types";

const NO_CELLS: BranchGrid = { outer: [], middle: [], inner: [] };

import { BRANCH_LEVELS, CIRCLES } from "./types";

export interface NodeState { nodeId: string | null; state: "learned" | "available" | "locked"; reason?: LearnBlockReason }

export interface BranchRow { branchId: string; level: BranchLevel | null; outer: NodeState[]; middle: NodeState[]; inner: NodeState[] }

export interface ProgressionView {
  points: { spent: number; total: number; free: number };
  racial: NodeState[];
  branches: BranchRow[];
  untouchedBranchCount: number;
  ultimate: NodeState | null;
  orphans: string[];
}

export function branchLevelOf(tree: TreeNodes, learned: Set<string>, branchId: string): BranchLevel | null {
  let level: BranchLevel | null = null;

  for (const l of BRANCH_LEVELS) if (learned.has(branchLevelNodeId(branchId, l))) level = l;

  return level;
}

function touches(tree: TreeNodes, learned: Set<string>, branchId: string): boolean {
  for (const id of learned) {
    const node = tree.nodes.get(id);

    if (node && (node.kind === "branchLevel" || node.kind === "slot") && node.branchId === branchId) return true;
  }

  return false;
}

export function skillPoints(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionView["points"] {
  const spent = learnedInTree(tree, unlocked).length;

  return { spent, total: characterLevel, free: Math.max(0, characterLevel - spent) };
}

export function progressionView(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionView {
  const inTree = learnedInTree(tree, unlocked);

  const learned = new Set(inTree);

  const state = (nodeId: string | null): NodeState => {
    if (!nodeId) return { nodeId: null, state: "locked", reason: "notInTree" };

    if (learned.has(nodeId)) return { nodeId, state: "learned" };

    const check = canLearn(tree, inTree, characterLevel, nodeId);

    return check.ok ? { nodeId, state: "available" } : { nodeId, state: "locked", reason: check.reason };
  };

  const rows = tree.branches.filter((b) => touches(tree, learned, b.id));

  return {
    points: skillPoints(tree, unlocked, characterLevel),
    racial: BRANCH_LEVELS.map((l) => state(racialNodeId(l))),
    branches: rows.map((b) => {
      const cells = tree.grid.get(b.id) ?? NO_CELLS;

      return { branchId: b.id, level: branchLevelOf(tree, learned, b.id), outer: cells.outer.map(state), middle: cells.middle.map(state), inner: cells.inner.map(state) };
    }),
    untouchedBranchCount: tree.branches.length - rows.length,
    ultimate: tree.ultimateId ? state(tree.ultimateId) : null,
    orphans: unlocked.filter((id) => !tree.nodes.has(id)),
  };
}

export function rankOffers(tree: TreeNodes, unlocked: string[], characterLevel: number): ProgressionNode[] {
  const inTree = learnedInTree(tree, unlocked);

  const learned = new Set(inTree);

  const out: string[] = [];

  const offer = (id: string | null) => {
    if (id && !out.includes(id) && canLearn(tree, inTree, characterLevel, id).ok) out.push(id);
  };

  BRANCH_LEVELS.forEach((l) => offer(racialNodeId(l)));
  offer(tree.ultimateId);

  const rank = (id: string) => BRANCH_LEVELS.indexOf(branchLevelOf(tree, learned, id) ?? "basic");

  const touched = tree.branches
    .filter((b) => learned.has(branchLevelNodeId(b.id, "basic")))
    .sort((a, b) => rank(b.id) - rank(a.id));

  touched.forEach((b) => BRANCH_LEVELS.forEach((l) => offer(branchLevelNodeId(b.id, l))));
  touched.forEach((b) => CIRCLES.forEach((c) => (tree.grid.get(b.id) ?? NO_CELLS)[c].forEach(offer)));
  tree.branches.filter((b) => !learned.has(branchLevelNodeId(b.id, "basic"))).forEach((b) => offer(branchLevelNodeId(b.id, "basic")));

  return out.flatMap((id) => tree.nodes.get(id) ?? []);
}
