"use client";

import { useTranslations } from "next-intl";

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
  const t = useTranslations();

  const { form, mainSkills, abilities, status, actions } = useSkillForm(campaignId, { initialData, initialMainSkills });

  const { isSaving, error, isEdit } = status;

  const tabs: HudTab<SkillFormTabId>[] = [
    {
      id: SKILL_FORM_TAB.basic,
      label: t("common.tabs.basic"),
      content: (
        <div className="space-y-5">
          <SkillBasicInfo form={form} />
          <SkillMainSkillSection form={form} mainSkills={mainSkills} />
        </div>
      ),
    },
    {
      id: SKILL_FORM_TAB.spell,
      label: t("skills.form.tabs.spell"),
      content: <SkillSpellSection form={form} spells={spells} />,
    },
    {
      id: SKILL_FORM_TAB.abilities,
      label: t("common.tabs.abilities"),
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
      title={isEdit ? t("skills.form.editTitle") : t("skills.form.createTitle")}
      aside={isEdit ? t("skills.form.editAside") : t("skills.form.createAside")}
    >
      <HudForm
        id="skill-form"
        onSubmit={actions.submit}
        tabs={tabs}
        error={error}
        actions={
          <>
            <Button type="button" variant="outline" onClick={actions.cancel} disabled={isSaving}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSaving || !abilities.valid}>
              {isSaving
                ? isEdit
                  ? t("common.actions.saving")
                  : t("common.actions.creating")
                : withAbilityErrors(isEdit ? t("skills.form.submitEdit") : t("skills.form.submitCreate"), abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
