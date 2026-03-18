/**
 * Формування об'єкта return для useSkillForm.
 */

import { SpellEnhancementType } from "@/lib/constants/spell-enhancement";
import type { SkillEffect } from "@/types/battle";
import type { MainSkill } from "@/types/main-skills";
import type { SkillTriggers } from "@/types/skill-triggers";

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
  effects: SkillEffect[];
  minTargets: string;
  maxTargets: string;
  setEffects: React.Dispatch<React.SetStateAction<SkillEffect[]>>;
  setMinTargets: (v: string) => void;
  setMaxTargets: (v: string) => void;
  affectsDamage: boolean;
  damageType: "melee" | "ranged" | "magic" | null;
  setAffectsDamage: (v: boolean) => void;
  setDamageType: (v: "melee" | "ranged" | "magic" | null) => void;
  spellId: string | null;
  spellGroupId: string | null;
  grantedSpellId: string | null;
  setSpellId: (v: string | null) => void;
  setSpellGroupId: (v: string | null) => void;
  setGrantedSpellId: (v: string | null) => void;
  spellEnhancementTypes: SpellEnhancementType[];
  spellEffectIncrease: string;
  spellTargetChange: string | null;
  spellAdditionalModifier: { modifier?: string; damageDice?: string; duration?: number };
  spellNewSpellId: string | null;
  setSpellEffectIncrease: (v: string) => void;
  setSpellTargetChange: (v: string | null) => void;
  setSpellAdditionalModifier: (v: { modifier?: string; damageDice?: string; duration?: number }) => void;
  setSpellNewSpellId: (v: string | null) => void;
  handleEnhancementTypeToggle: (type: SpellEnhancementType) => void;
  mainSkillId: string | null;
  setMainSkillId: (v: string | null) => void;
  skillTriggers: SkillTriggers;
  setSkillTriggers: React.Dispatch<React.SetStateAction<SkillTriggers>>;
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
    effectsGroup: {
      effects: p.effects,
      minTargets: p.minTargets,
      maxTargets: p.maxTargets,
      setters: { setEffects: p.setEffects, setMinTargets: p.setMinTargets, setMaxTargets: p.setMaxTargets },
    },
    damageGroup: {
      affectsDamage: p.affectsDamage,
      damageType: p.damageType,
      setters: { setAffectsDamage: p.setAffectsDamage, setDamageType: p.setDamageType },
    },
    spell: {
      spellId: p.spellId,
      spellGroupId: p.spellGroupId,
      grantedSpellId: p.grantedSpellId,
      setters: { setSpellId: p.setSpellId, setSpellGroupId: p.setSpellGroupId, setGrantedSpellId: p.setGrantedSpellId },
    },
    spellEnhancement: {
      spellEnhancementTypes: p.spellEnhancementTypes,
      spellEffectIncrease: p.spellEffectIncrease,
      spellTargetChange: p.spellTargetChange,
      spellAdditionalModifier: p.spellAdditionalModifier,
      spellNewSpellId: p.spellNewSpellId,
      setters: {
        setSpellEffectIncrease: p.setSpellEffectIncrease,
        setSpellTargetChange: p.setSpellTargetChange,
        setSpellAdditionalModifier: p.setSpellAdditionalModifier,
        setSpellNewSpellId: p.setSpellNewSpellId,
      },
      handlers: { handleEnhancementTypeToggle: p.handleEnhancementTypeToggle },
    },
    mainSkill: {
      mainSkillId: p.mainSkillId,
      setters: { setMainSkillId: p.setMainSkillId },
    },
    skillTriggers: {
      skillTriggers: p.skillTriggers,
      setters: { setSkillTriggers: p.setSkillTriggers },
    },
    handleSubmit: p.handleSubmit,
  };
}
