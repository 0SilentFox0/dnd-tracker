import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { skillKeys } from "./keys";
import { useSkills } from "./useSkills";

import { getSkillTrees } from "@/lib/api/skill-trees";
import { type RaceRacialSkills, raceRacialSkills } from "@/lib/utils/races/racial-skills";

export function useRacialSkills(campaignId: string, raceName: string): RaceRacialSkills {
  const trees = useQuery({ queryKey: skillKeys.trees(campaignId), queryFn: () => getSkillTrees(campaignId), enabled: !!campaignId });

  const { data: skills = [] } = useSkills(campaignId);

  const tree = trees.data?.find((t) => t.race.toLowerCase() === raceName.toLowerCase());

  return useMemo(() => raceRacialSkills(tree?.skills, skills), [tree, skills]);
}
