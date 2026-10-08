import type React from "react";

import type { ConversionIssue } from "@/lib/utils/abilities/schema";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { MainSkill } from "@/types/main-skills";

export interface SkillFormReturnParams {
  isSaving: boolean;
  error: string | null;
  isEdit: boolean;
  mainSkills: MainSkill[];
  name: string;
  description: string;
  icon: string;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setIcon: (v: string) => void;
  abilities: Ability[];
  abilityIssues: ConversionIssue[];
  abilitiesValid: boolean;
  abilityErrors: number;
  setAbilities: (v: Ability[]) => void;
  setAbilityErrors: (n: number) => void;
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId: string | null;
  setSpellId: (v: string | null) => void;
  setSpellGroupId: (v: string | null) => void;
  setGrantedSpellId: (v: string | null) => void;
  mainSkillId: string | null;
  setMainSkillId: (v: string | null) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

export function buildSkillFormReturn(p: SkillFormReturnParams) {
  return {
    isSaving: p.isSaving,
    error: p.error,
    isEdit: p.isEdit,
    mainSkills: p.mainSkills,
    basicInfo: {
      name: p.name,
      description: p.description,
      icon: p.icon,
      setters: { setName: p.setName, setDescription: p.setDescription, setIcon: p.setIcon },
    },
    abilitiesGroup: {
      abilities: p.abilities,
      issues: p.abilityIssues,
      valid: p.abilitiesValid,
      errors: p.abilityErrors,
      setAbilities: p.setAbilities,
      onValidityChange: (_ok: boolean, n: number) => p.setAbilityErrors(n),
    },
    spell: {
      spellId: p.spellId,
      spellGroupId: p.spellGroupId,
      grantedSpellId: p.grantedSpellId,
      setters: { setSpellId: p.setSpellId, setSpellGroupId: p.setSpellGroupId, setGrantedSpellId: p.setGrantedSpellId },
    },
    mainSkill: {
      mainSkillId: p.mainSkillId,
      setters: { setMainSkillId: p.setMainSkillId },
    },
    handleSubmit: p.handleSubmit,
  };
}
