"use client";

import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { LoadingState, QueryState } from "@/components/common/states";
import { HudForm, HudFormPage } from "@/components/hud/form";
import { Button } from "@/components/ui/button";
import { unitFormTabs } from "@/components/units/form/UnitFormFields";
import { useUnitEditForm } from "@/lib/hooks/units";
import { useTranslator } from "@/lib/i18n/use-translator";

export function UnitEditForm({ campaignId: id, unitId }: { campaignId: string; unitId: string }) {
  const ta = useTranslator("abilities");

  const editor = useUnitEditForm(id, unitId);

  return (
    <HudFormPage title={`Редагувати юніта: ${editor.form.data.name ?? ""}`} aside="Оновіть інформацію про юніта">
      <QueryState query={editor.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>
        {(unit) => (
          <>
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
                  {editor.status.error && (
                    <p role="alert" className="w-full text-sm text-destructive">
                      {editor.status.error.message || "Помилка"}
                    </p>
                  )}
                  <Button type="submit" disabled={editor.status.isSaving || !editor.abilities.valid}>
                    {editor.status.isSaving ? "Збереження..." : withAbilityErrors("Зберегти зміни", editor.abilities.errors, ta)}
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
