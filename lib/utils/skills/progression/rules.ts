import { branchLevelNodeId, racialNodeId } from "./ids";
import type { Check, LearnBlockReason, ProgressionNode, TreeNodes, UnlearnBlockReason } from "./types";
import { BRANCH_LEVELS, RACIAL_MIN_LEVEL } from "./types";

export const LEARN_BLOCK_TEXT: Record<LearnBlockReason, string> = {
  noPoints: "Немає вільних очок — підніміть рівень",
  alreadyLearned: "Уже вивчено",
  notInTree: "Цього вміння немає в дереві",
  branchOrder: "Спершу вивчіть попередній рівень",
  outerLimit: "Зовнішніх умінь у гілці не більше, ніж її рівнів — підвищте рівень гілки",
  needOuter: "Потрібне хоча б одне вміння зовнішнього кола цієї гілки",
  needMiddleAndExpert: "Потрібні вміння середнього кола й рівень Експерт цієї гілки",
  racialLevel: "Доступно з вищого рівня персонажа",
  needInner: "Потрібні 3 вміння внутрішнього кола",
};

export const UNLEARN_BLOCK_TEXT: Record<UnlearnBlockReason, string> = {
  notLearned: "Це вміння не вивчене",
  hasDependents: "Від цього вміння залежать інші вивчені — спершу зніміть їх",
};

const no = <R>(reason: R): Check<R> => ({ ok: false, reason });

const OK = { ok: true } as const;

function branchStats(tree: TreeNodes, learned: Set<string>, branchId: string) {
  const levels = BRANCH_LEVELS.filter((l) => learned.has(branchLevelNodeId(branchId, l))).length;

  const cells = tree.grid.get(branchId);

  const count = (ids: (string | null)[] | undefined) => (ids ?? []).filter((id) => id && learned.has(id)).length;

  return { levels, outer: count(cells?.outer), middle: count(cells?.middle), inner: count(cells?.inner) };
}

function innerTotal(tree: TreeNodes, learned: Set<string>): number {
  let total = 0;

  for (const cells of tree.grid.values()) total += cells.inner.filter((id) => id && learned.has(id)).length;

  return total;
}

function nodeRules(tree: TreeNodes, learned: Set<string>, characterLevel: number, node: ProgressionNode): Check<LearnBlockReason> {
  switch (node.kind) {
    case "branchLevel":
    case "racial": {
      if (node.kind === "racial" && characterLevel < RACIAL_MIN_LEVEL[node.level]) return no("racialLevel");

      const index = BRANCH_LEVELS.indexOf(node.level);

      if (index === 0) return OK;

      const prev = BRANCH_LEVELS[index - 1];

      const prevId = node.kind === "racial" ? racialNodeId(prev) : branchLevelNodeId(node.branchId, prev);

      return learned.has(prevId) ? OK : no("branchOrder");
    }

    case "slot": {
      const stats = branchStats(tree, learned, node.branchId);

      if (node.circle === "outer") return stats.outer < stats.levels ? OK : no("outerLimit");

      if (node.circle === "middle") return stats.outer >= 1 ? OK : no("needOuter");

      return stats.middle >= 1 && stats.levels === BRANCH_LEVELS.length ? OK : no("needMiddleAndExpert");
    }

    case "ultimate":
      return innerTotal(tree, learned) >= 3 ? OK : no("needInner");
  }
}

export function canLearn(tree: TreeNodes, unlocked: string[], characterLevel: number, nodeId: string): Check<LearnBlockReason> {
  const learned = new Set(unlocked.filter((id) => tree.nodes.has(id)));

  if (learned.size >= characterLevel) return no("noPoints");

  if (learned.has(nodeId)) return no("alreadyLearned");

  const node = tree.nodes.get(nodeId);

  if (!node) return no("notInTree");

  return nodeRules(tree, learned, characterLevel, node);
}

export function canUnlearn(tree: TreeNodes, unlocked: string[], nodeId: string): Check<UnlearnBlockReason> {
  if (!unlocked.includes(nodeId)) return no("notLearned");

  if (!tree.nodes.has(nodeId)) return OK;

  const remaining = new Set(unlocked.filter((id) => id !== nodeId && tree.nodes.has(id)));

  for (const id of remaining) {
    const node = tree.nodes.get(id);

    const others = new Set(remaining);

    others.delete(id);

    if (node && !nodeRules(tree, others, Number.POSITIVE_INFINITY, node).ok) return no("hasDependents");
  }

  return OK;
}
