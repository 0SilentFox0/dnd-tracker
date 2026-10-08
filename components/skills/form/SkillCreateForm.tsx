"use client";

import { useRouter } from "next/navigation";

import { SKILL_FORM_TAB, type SkillFormTabId } from "./skill-form-tabs";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { SkillBasicInfo } from "@/components/skills/form/basic";
import { SkillMainSkillSection } from "@/components/skills/form/main-skill";
import { SkillSpellSection } from "@/components/skills/form/spell";
import { Button } from "@/components/ui/button";
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
    mainSkill,
    handleSubmit,
  } = useSkillForm(
    campaignId,
    spells,
    initialData,
    initialMainSkills
  );

  const tabs: HudTab<SkillFormTabId>[] = [
    {
      id: SKILL_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-5">
          <SkillBasicInfo basicInfo={basicInfo} />
          <SkillMainSkillSection mainSkill={mainSkill} mainSkills={mainSkills} />
        </div>
      ),
    },
    {
      id: SKILL_FORM_TAB.spell,
      label: "Заклинання",
      content: <SkillSpellSection spell={spell} spells={spells} />,
    },
    {
      id: SKILL_FORM_TAB.abilities,
      label: "Вміння",
      invalid: abilitiesGroup.errors > 0,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={abilitiesGroup.abilities}
          onChange={abilitiesGroup.setAbilities}
          issues={abilitiesGroup.issues}
          onValidityChange={abilitiesGroup.onValidityChange}
        />
      ),
    },
  ];

  return (
    <HudFormPage
      title={isEdit ? "Редагувати скіл" : "Створити скіл"}
      aside={isEdit ? "Оновіть інформацію про скіл" : "Додайте новий скіл з його характеристиками та ефектами"}
    >
      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-md border border-hud-danger/50 bg-hud-danger/10 px-3 py-2 text-sm text-[#f0b4a6]">
          {error}
        </p>
      )}
      <HudForm
        id="skill-form"
        onSubmit={handleSubmit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => router.push(`/campaigns/${campaignId}/dm/skills`)} disabled={isSaving}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSaving || !abilitiesGroup.valid}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : withAbilityErrors(isEdit ? "Зберегти зміни" : "Створити скіл", abilitiesGroup.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
