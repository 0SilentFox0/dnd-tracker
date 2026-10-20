import { useMemo } from "react";

import { useSkills } from "./useSkills";
import { useSkillTrees } from "./useSkillTrees";

import { type RaceRacialSkills, raceRacialSkills } from "@/lib/utils/races/racial-skills";

export function useRacialSkills(campaignId: string, raceName: string): RaceRacialSkills {
  const trees = useSkillTrees(campaignId);

  const { data: skills = [] } = useSkills(campaignId);

  const tree = trees.data?.find((t) => t.race.trim() === raceName.trim());

  return useMemo(() => raceRacialSkills(tree?.skills, skills), [tree, skills]);
}
