"use client";

import { useCallback, useMemo } from "react";

import { useMainSkills } from "./useMainSkills";
import { useDeleteAllSkills, useDeleteSkill, useDuplicateSkill, useSkills } from "./useSkills";

import { useSearch } from "@/lib/hooks/common";
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

  const fieldsOf = useCallback((skill: Skill) => [skill.name, mainSkills.find((ms) => ms.id === skill.mainSkillId)?.name], [mainSkills]);

  const search = useSearch(skills, fieldsOf);

  const groups = useMemo<SkillListGroup[]>(
    () =>
      convertGroupedSkillsToArray(groupSkillsByMainSkill(search.items, mainSkills)).map(([name, groupSkills]) => ({
        name,
        skills: groupSkills,
        color: mainSkills.find((ms) => ms.name === name)?.color,
      })),
    [search.items, mainSkills],
  );

  return {
    skills,
    isLoading,
    search,
    groups,
    actions: {
      deleteSkill: (skillId: string) => deleteOne.mutateAsync(skillId),
      duplicateSkill: (skillId: string) => void duplicate.mutateOk(skillId),
      removeAll: () => deleteAll.mutateAsync(),
    },
  };
}
