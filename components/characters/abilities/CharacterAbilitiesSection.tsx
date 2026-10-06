"use client";

import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/ui/select-field";
import { MAIN_SKILL_BY_CATEGORY } from "@/lib/constants/main-skills";
import { useMainSkills, usePersonalSkills } from "@/lib/hooks/skills";

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
  const { data: mainSkills = [] } = useMainSkills(campaignId);

  const personalMainSkillId = mainSkills.find((ms) => ms.name === MAIN_SKILL_BY_CATEGORY.Personal)?.id;

  const { data: personalSkills = [] } = usePersonalSkills(campaignId, personalMainSkillId);

  const options = useMemo(() => personalSkills.map((s) => ({ value: s.id, label: s.name })), [personalSkills]);

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
