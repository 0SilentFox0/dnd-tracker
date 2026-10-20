"use client";

import { SKILL_FORM_TAB, type SkillFormTabId } from "./skill-form-tabs";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage, type HudTab } from "@/components/hud/form";
import { SkillBasicInfo } from "@/components/skills/form/basic";
import { SkillMainSkillSection } from "@/components/skills/form/main-skill";
import { SkillSpellSection } from "@/components/skills/form/spell";
import { Button } from "@/components/ui/button";
import { useSkillForm } from "@/lib/hooks/skills";
import type { IdName } from "@/types/common";
import type { MainSkill } from "@/types/main-skills";
import type { Skill } from "@/types/skills";

interface SkillCreateFormProps {
  campaignId: string;
  spells: IdName[];
  initialMainSkills?: MainSkill[];
  initialData?: Skill;
}

export function SkillCreateForm({ campaignId, spells, initialMainSkills, initialData }: SkillCreateFormProps) {
  const { form, mainSkills, abilities, status, actions } = useSkillForm(campaignId, { initialData, initialMainSkills });

  const { isSaving, error, isEdit } = status;

  const tabs: HudTab<SkillFormTabId>[] = [
    {
      id: SKILL_FORM_TAB.basic,
      label: "Основне",
      content: (
        <div className="space-y-5">
          <SkillBasicInfo form={form} />
          <SkillMainSkillSection form={form} mainSkills={mainSkills} />
        </div>
      ),
    },
    {
      id: SKILL_FORM_TAB.spell,
      label: "Заклинання",
      content: <SkillSpellSection form={form} spells={spells} />,
    },
    {
      id: SKILL_FORM_TAB.abilities,
      label: "Вміння",
      invalid: !abilities.valid,
      content: (
        <AbilityListEditor
          campaignId={campaignId}
          value={form.data.abilities}
          onChange={(next) => form.set("abilities", next)}
          issues={abilities.issues}
          onValidityChange={abilities.onValidityChange}
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
        onSubmit={actions.submit}
        tabs={tabs}
        actions={
          <>
            <Button type="button" variant="outline" onClick={actions.cancel} disabled={isSaving}>
              Скасувати
            </Button>
            <Button type="submit" disabled={isSaving || !abilities.valid}>
              {isSaving
                ? isEdit
                  ? "Збереження..."
                  : "Створення..."
                : withAbilityErrors(isEdit ? "Зберегти зміни" : "Створити скіл", abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
