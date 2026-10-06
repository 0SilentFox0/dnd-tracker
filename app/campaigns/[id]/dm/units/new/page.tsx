"use client";

import { use } from "react";
import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { UnitFormError, unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitCreateForm } from "@/lib/hooks/units";

export default function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const form = useUnitCreateForm(id);

  return (
    <HudFormPage title="Новий юніт" aside="Заповніть характеристики, расу й атаки">
      <UnitFormError error={form.error} />
      <HudForm
        id="unit-form"
        onSubmit={form.submit}
        tabs={unitFormTabs({ campaignId: id, form })}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href={form.listHref}>Скасувати</Link>
            </Button>
            <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
              {form.isSaving ? "Створення..." : withAbilityErrors("Створити юніта", form.abilityErrors)}
            </Button>
          </>
        }
      />
    </HudFormPage>
  );
}
