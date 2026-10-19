"use client";

import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { LoadingState, QueryState } from "@/components/common/states";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { UnitFormError, unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitEditForm } from "@/lib/hooks/units";

export function UnitEditForm({ campaignId: id, unitId }: { campaignId: string; unitId: string }) {
  const editor = useUnitEditForm(id, unitId);

  return (
    <HudFormPage title={`Редагувати юніта: ${editor.form.data.name ?? ""}`} aside="Оновіть інформацію про юніта">
      <QueryState query={editor.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>
        {(unit) => (
          <>
            <UnitFormError error={editor.status.error} />
            <HudForm
              key={unitId}
              id="unit-form"
              onSubmit={editor.actions.submit}
              tabs={unitFormTabs({ campaignId: id, editor, abilityIssues: unit.abilityIssues })}
              actions={
                <>
                  <Button type="button" variant="destructive" onClick={() => void editor.actions.remove()} disabled={editor.status.isDeleting}>
                    Видалити
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={editor.listHref}>Скасувати</Link>
                  </Button>
                  <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
                    {editor.status.isSaving ? "Збереження..." : withAbilityErrors("Зберегти зміни", editor.abilities.errors)}
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
