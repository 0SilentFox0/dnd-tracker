import { describe } from "vitest";

import { expectLabelKeys } from "../test/label-keys";

import type { LearnBlockReason, UnlearnBlockReason } from "@/lib/utils/skills/progression";
import {
  BRANCH_LEVELS,
  CIRCLES,
} from "@/lib/utils/skills/progression";
import type { TreeErrorCode } from "@/lib/utils/skills/progression/validate";

const LEARN: LearnBlockReason[] = ["noPoints", "alreadyLearned", "notInTree", "branchOrder", "outerLimit", "needOuter", "needMiddleAndExpert", "racialLevel", "expertLevel", "needInner"];

const UNLEARN: UnlearnBlockReason[] = ["notLearned", "hasDependents"];

const TREE_ERRORS: TreeErrorCode[] = ["duplicateSkill", "unknownBranch", "unknownSkill", "duplicateBranch"];

describe("skillTree label registries have translations", () => {
  expectLabelKeys("skillTree", "tiers", BRANCH_LEVELS);
  expectLabelKeys("skillTree", "circles", CIRCLES);
  expectLabelKeys("skillTree", "circleShort", CIRCLES);
  expectLabelKeys("skillTree", "reasons", [...LEARN, ...UNLEARN]);
  expectLabelKeys("skillTree", "treeErrors", TREE_ERRORS);
  expectLabelKeys("skillTree", "placement", ["branchLevel", "outer", "middle", "inner", "racial", "ultimate", "unplaced"]);
});
