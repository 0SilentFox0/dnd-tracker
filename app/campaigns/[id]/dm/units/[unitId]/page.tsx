"use client";

import { use } from "react";
import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { LoadingState, QueryState } from "@/components/common/states";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { UnitFormError, unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitEditForm } from "@/lib/hooks/units";

export default function EditUnitPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = use(params);

  const form = useUnitEditForm(id, unitId);

  return (
    <HudFormPage title={`Редагувати юніта: ${form.formData.name ?? ""}`} aside="Оновіть інформацію про юніта">
      <QueryState query={form.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>
        {(unit) => (
          <>
            <UnitFormError error={form.error} />
            <HudForm
              key={unitId}
              id="unit-form"
              onSubmit={form.submit}
              tabs={unitFormTabs({ campaignId: id, form, abilityIssues: unit.abilityIssues })}
              actions={
                <>
                  <Button type="button" variant="destructive" onClick={() => void form.remove()} disabled={form.isDeleting}>
                    Видалити
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={form.listHref}>Скасувати</Link>
                  </Button>
                  <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
                    {form.isSaving ? "Збереження..." : withAbilityErrors("Зберегти зміни", form.abilityErrors)}
                  </Button>
                </>
              }
            />
          </>
        )}
      </QueryState>
    </HudFormPage>
  );
}
