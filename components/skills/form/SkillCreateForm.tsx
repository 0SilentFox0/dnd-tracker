"use client";

import { useRouter } from "next/navigation";

import { AbilityListEditor } from "@/components/abilities";
import { SkillBasicInfo } from "@/components/skills/form/basic";
import { SkillMainSkillSection } from "@/components/skills/form/main-skill";
import { SkillSpellSection } from "@/components/skills/form/spell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSkillForm } from "@/lib/hooks/skills";

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
  initialData?: Skill | GroupedSkill;
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
    abilitiesGroup,
    spell,
    spellEnhancement,
    mainSkill,
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

          <SkillSpellSection
            campaignId={campaignId}
            spell={spell}
            spellEnhancement={spellEnhancement}
            spells={spells}
          />

          <SkillMainSkillSection
            mainSkill={mainSkill}
            mainSkills={mainSkills}
          />

          <AbilityListEditor
            campaignId={campaignId}
            value={abilitiesGroup.abilities}
            onChange={abilitiesGroup.setAbilities}
            issues={abilitiesGroup.issues}
            onValidityChange={abilitiesGroup.setAbilitiesValid}
          />

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving || !abilitiesGroup.valid}>
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
