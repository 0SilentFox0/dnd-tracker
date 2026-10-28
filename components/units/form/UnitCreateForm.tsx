"use client";

import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { UnitFormError, unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitCreateForm } from "@/lib/hooks/units";

export function UnitCreateForm({ campaignId: id }: { campaignId: string }) {
  const editor = useUnitCreateForm(id);

  return (
    <HudFormPage title="Новий юніт" aside="Заповніть характеристики, расу й атаки">
      <UnitFormError error={editor.status.error} />
      <HudForm
        id="unit-form"
        onSubmit={editor.actions.submit}
        tabs={unitFormTabs({ campaignId: id, editor })}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={editor.listHref}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
              {editor.status.isSaving ? "Створення..." : withAbilityErrors("Створити юніта", editor.abilities.errors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
