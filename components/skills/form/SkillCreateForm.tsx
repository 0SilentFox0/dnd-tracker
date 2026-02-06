"use client";

import { useRouter } from "next/navigation";

import { SkillBasicInfo } from "@/components/skills/form/basic";
import { SkillEffectsEditor } from "@/components/skills/form/effects";
import { SkillMainSkillSection } from "@/components/skills/form/main-skill";
import { SkillSpellSection } from "@/components/skills/form/spell";
import { SkillTriggersEditor } from "@/components/skills/form/triggers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSkillForm } from "@/lib/hooks/useSkillForm";
import type { SkillTriggers } from "@/types/skill-triggers";

interface SpellOption {
  id: string;
  name: string;
}

interface SpellGroupOption {
  id: string;
  name: string;
}

import type { MainSkill } from "@/types/main-skills";
import type { GroupedSkill, Skill } from "@/types/skills";

interface SkillCreateFormProps {
  campaignId: string;
  spells: SpellOption[];
  spellGroups?: SpellGroupOption[];
  initialMainSkills?: MainSkill[];
  initialData?: Skill | GroupedSkill | {
    id: string;
    name: string;
    description: string | null;
    icon: string | null;
    bonuses: unknown;
    damage: number | null;
    armor: number | null;
    speed: number | null;
    physicalResistance: number | null;
    magicalResistance: number | null;
    spellId: string | null;
    spellGroupId: string | null;
    grantedSpellId?: string | null;
    mainSkillId: string | null;
    spellEnhancementTypes?: unknown;
    spellEffectIncrease?: number | null;
    spellTargetChange?: unknown;
    spellAdditionalModifier?: unknown;
    spellNewSpellId?: string | null;
    skillTriggers?: SkillTriggers;
  };
}

export function SkillCreateForm({
  campaignId,
  spells,
  initialMainSkills,
  initialData,
}: SkillCreateFormProps) {
  const router = useRouter();

  const {
    isSaving,
    error,
    isEdit,
    mainSkills,
    basicInfo,
    effectsGroup,
    spell,
    spellEnhancement,
    mainSkill,
    skillTriggers: skillTriggersGroup,
    handleSubmit,
  } = useSkillForm(
    campaignId,
    spells,
    initialData,
    initialMainSkills
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Редагувати скіл" : "Створити скіл"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Оновіть інформацію про скіл"
            : "Додайте новий скіл з його характеристиками та ефектами"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="text-sm text-destructive mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <SkillBasicInfo basicInfo={basicInfo} />

          <SkillEffectsEditor
            effects={effectsGroup.effects}
            minTargets={effectsGroup.minTargets}
            maxTargets={effectsGroup.maxTargets}
            onEffectsChange={effectsGroup.setters.setEffects}
            onMinTargetsChange={effectsGroup.setters.setMinTargets}
            onMaxTargetsChange={effectsGroup.setters.setMaxTargets}
          />

          <SkillSpellSection
            spell={spell}
            spellEnhancement={spellEnhancement}
            spells={spells}
          />

          <SkillMainSkillSection
            mainSkill={mainSkill}
            mainSkills={mainSkills}
          />

          <SkillTriggersEditor
            triggers={skillTriggersGroup.skillTriggers}
            onChange={skillTriggersGroup.setters.setSkillTriggers}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : isEdit
                ? "Зберегти зміни"
                : "Створити скіл"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/dm/skills`)}
              disabled={isSaving}
            >
              Скасувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
