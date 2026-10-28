"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations();

  const { form, spellGroups, status, actions } = useMainSkillForm(campaignId, mainSkill);

  return (
    <HudFormPage title={t("skills.mainSkills.edit.title")} aside={t("skills.mainSkills.edit.aside")}>
      <HudForm
        id="main-skill-form"
        onSubmit={actions.submit}
        error={status.error}
        actions={
          <>
            <Button type="button" variant="outline" onClick={actions.cancel}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={status.isSaving}>
              {status.isSaving ? t("common.actions.saving") : t("skills.mainSkills.edit.submit")}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <MainSkillFormFields form={form.data} onChange={form.set} spellGroups={spellGroups} />
        </div>
      </HudForm>
    </HudFormPage>
  );
}
