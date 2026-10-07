"use client";

import { MainSkillFormFields } from "./MainSkillFormFields";

import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { useMainSkillForm } from "@/lib/hooks/skills";
import type { MainSkill } from "@/types/main-skills";

interface MainSkillEditFormProps {
  campaignId: string;
  mainSkill: MainSkill;
}

export function MainSkillEditForm({ campaignId, mainSkill }: MainSkillEditFormProps) {
  const form = useMainSkillForm(campaignId, mainSkill);

  return (
    <HudFormPage title="Редагувати основний навик" aside="Оновіть інформацію про основний навик">
      <HudForm
        id="main-skill-form"
        onSubmit={form.submit}
        actions={
          <>
            <Button type="button" variant="outline" onClick={form.cancel}>
              Скасувати
            </Button>
            <Button type="submit" disabled={form.isSaving}>
              {form.isSaving ? "Збереження..." : "Зберегти зміни"}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <MainSkillFormFields form={form.formData} onChange={form.patch} spellGroups={form.spellGroups} />
        </div>
      </HudForm>
    </HudFormPage>
  );
}
