"use client";

import { use } from "react";
import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { ActionBar } from "@/components/common/ActionBar";
import { LoadingState, QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitFormFields } from "@/components/units/form/UnitFormFields";
import { useUnitEditForm } from "@/lib/hooks/units";

export default function EditUnitPage({ params }: { params: Promise<{ id: string; unitId: string }> }) {
  const { id, unitId } = use(params);

  const form = useUnitEditForm(id, unitId);

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <QueryState query={form.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>
        {(unit) => (
          <Card>
            <CardHeader>
              <CardTitle>Редагувати юніта: {form.formData.name}</CardTitle>
              <CardDescription>Оновіть інформацію про юніта</CardDescription>
            </CardHeader>
            <CardContent>
              <form key={unitId} onSubmit={form.submit} className="space-y-6">
                <UnitFormFields campaignId={id} form={form} abilityIssues={unit.abilityIssues} />
                <ActionBar>
                  <Button type="button" variant="destructive" onClick={() => void form.remove()} disabled={form.isDeleting}>
                    Видалити
                  </Button>
                  <Button type="button" variant="outline" asChild>
                    <Link href={form.listHref}>Скасувати</Link>
                  </Button>
                  <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
                    {form.isSaving ? "Збереження..." : withAbilityErrors("Зберегти зміни", form.abilityErrors)}
                  </Button>
                </ActionBar>
              </form>
            </CardContent>
          </Card>
        )}
      </QueryState>
    </div>
  );
}
