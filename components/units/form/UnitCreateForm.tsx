"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitCreateForm } from "@/lib/hooks/units";
import { useTranslator } from "@/lib/i18n/use-translator";

export function UnitCreateForm({ campaignId: id }: { campaignId: string }) {
  const ta = useTranslator("abilities");

  const t = useTranslations("units.form");

  const tc = useTranslations("common.actions");

  const tr = useTranslator();

  const editor = useUnitCreateForm(id);

  return (
    <HudFormPage title={t("newTitle")} aside={t("newAside")}>
      <HudForm
        id="unit-form"
        onSubmit={editor.actions.submit}
        tabs={unitFormTabs({ campaignId: id, editor, t: tr })}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={editor.listHref}>{tc("cancel")}</Link>
            </Button>
            {editor.status.error && (
              <p role="alert" className="w-full text-sm text-destructive">
                {editor.status.error.message || t("error")}
              </p>
            )}
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? tc("creating") : withAbilityErrors(t("submitCreate"), editor.abilities.errors, ta)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
