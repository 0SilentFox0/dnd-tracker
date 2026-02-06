"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { useMainSkills } from "@/lib/hooks/useMainSkills";
import { useSkills } from "@/lib/hooks/useSkills";
import { getSkillMainSkillId } from "@/lib/utils/skills/skill-helpers";
import { MAIN_SKILL_BY_CATEGORY } from "@/lib/constants/main-skills";

/** Назва скіла: підтримка basicInfo.name та name в корені */
function getSkillDisplayName(skill: { id: string; basicInfo?: { name?: string }; name?: string }): string {
  if (
    skill.basicInfo &&
    typeof skill.basicInfo === "object" &&
    "name" in skill.basicInfo
  ) {
    return String((skill.basicInfo as { name?: string }).name ?? "");
  }

  return (skill as { name?: string }).name ?? skill.id;
}

interface CharacterAbilitiesSectionProps {
  campaignId: string;
  abilities: {
    personalSkillId: string;
    setters: {
      setPersonalSkillId: (value: string) => void;
    };
  };
}

export function CharacterAbilitiesSection({
  campaignId,
  abilities,
}: CharacterAbilitiesSectionProps) {
  const { data: skills = [] } = useSkills(campaignId);
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const personalMainSkill = useMemo(() => {
    const name = MAIN_SKILL_BY_CATEGORY.Personal;

    return mainSkills.find((ms) => ms.name === name) ?? null;
  }, [mainSkills]);

  const personalSkills = useMemo(() => {
    if (!personalMainSkill) return [];

    return skills.filter((skill) => {
      const mainSkillId = getSkillMainSkillId(skill as Parameters<typeof getSkillMainSkillId>[0]);

      return mainSkillId === personalMainSkill.id;
    });
  }, [skills, personalMainSkill]);

  const options = useMemo(() => {
    return personalSkills.map((s) => ({
      value: s.id,
      label: getSkillDisplayName(s as Parameters<typeof getSkillDisplayName>[0]),
    }));
  }, [personalSkills]);

  return (
    <div className="space-y-4 w-full">
      <div className="w-full min-w-0">
        <Label htmlFor="personalSkillId">Уміння (Персональні)</Label>
        <SelectField
          id="personalSkillId"
          value={abilities.personalSkillId}
          onValueChange={abilities.setters.setPersonalSkillId}
          options={options}
          placeholder="Виберіть скіл з групи Персональні"
          triggerClassName="w-full mt-1"
          allowNone
          noneLabel="Не обрано"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Скіл з групи основних навиків «Персональні»
        </p>
      </div>
    </div>
  );
}
