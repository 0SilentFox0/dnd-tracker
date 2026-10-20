"use client";

import { useMemo } from "react";

import { useMainSkills } from "./useMainSkills";
import { useDeleteAllSkills, useDeleteSkill, useDuplicateSkill, useSkills } from "./useSkills";

import { convertGroupedSkillsToArray, groupSkillsByMainSkill } from "@/lib/utils/skills/skills";
import type { Skill } from "@/types/skills";

export interface SkillListGroup {
  name: string;
  skills: Skill[];
  color?: string;
}

export function useSkillsList(campaignId: string) {
  const { data: skills = [], isLoading } = useSkills(campaignId);

  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const deleteAll = useDeleteAllSkills(campaignId);

  const deleteOne = useDeleteSkill(campaignId);

  const duplicate = useDuplicateSkill(campaignId);

  const groups = useMemo<SkillListGroup[]>(
    () =>
      convertGroupedSkillsToArray(groupSkillsByMainSkill(skills, mainSkills)).map(([name, groupSkills]) => ({
        name,
        skills: groupSkills,
        color: mainSkills.find((ms) => ms.name === name)?.color,
      })),
    [skills, mainSkills],
  );

  return {
    skills,
    isLoading,
    groups,
    actions: {
      deleteSkill: (skillId: string) => deleteOne.mutateAsync(skillId),
      duplicateSkill: (skillId: string) => void duplicate.mutateOk(skillId),
      removeAll: () => deleteAll.mutateAsync(),
    },
  };
}
