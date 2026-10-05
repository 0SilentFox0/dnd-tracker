export type BranchLevel = "basic" | "advanced" | "expert";

export const BRANCH_LEVELS: readonly BranchLevel[] = ["basic", "advanced", "expert"];

export const BRANCH_LEVEL_LABEL: Record<BranchLevel, string> = { basic: "Основи", advanced: "Просунутий", expert: "Експерт" };

export type Circle = "outer" | "middle" | "inner";

export const CIRCLES: readonly Circle[] = ["outer", "middle", "inner"];

export const CIRCLE_SIZE: Record<Circle, number> = { outer: 3, middle: 2, inner: 1 };

export const CIRCLE_LABEL: Record<Circle, string> = { outer: "зовнішнє коло", middle: "середнє коло", inner: "внутрішнє коло" };

export const RACIAL_BRANCH_ID = "racial";

export const ULTIMATE_BRANCH_ID = "ultimate";

export const RACIAL_MIN_LEVEL: Record<BranchLevel, number> = { basic: 5, advanced: 10, expert: 15 };

export interface BranchLevelNode { kind: "branchLevel"; nodeId: string; branchId: string; level: BranchLevel; skillId: string | null }

export interface RacialNode { kind: "racial"; nodeId: string; level: BranchLevel; skillId: string | null }

export interface SlotNode { kind: "slot"; nodeId: string; branchId: string; circle: Circle; index: number; skillId: string }

export interface UltimateNode { kind: "ultimate"; nodeId: string; skillId: string }

export type ProgressionNode = BranchLevelNode | RacialNode | SlotNode | UltimateNode;

export interface TreeBranch { id: string; name: string; color: string; icon: string | null; spellGroupId: string | null }

export type BranchGrid = Record<Circle, (string | null)[]>;

export interface TreeNodes {
  treeId: string;
  jsonId: string | null;
  race: string;
  branches: TreeBranch[];
  nodes: Map<string, ProgressionNode>;
  grid: Map<string, BranchGrid>;
  ultimateId: string | null;
}

export type LearnBlockReason = "noPoints" | "alreadyLearned" | "notInTree" | "branchOrder" | "outerLimit" | "needOuter" | "needMiddleAndExpert" | "racialLevel" | "needInner";

export type UnlearnBlockReason = "notLearned" | "hasDependents";

export type Check<R> = { ok: true } | { ok: false; reason: R };
