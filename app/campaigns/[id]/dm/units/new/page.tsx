"use client";

import { use } from "react";
import Link from "next/link";

import { withAbilityErrors } from "@/components/abilities";
import { ActionBar } from "@/components/common/ActionBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnitFormFields } from "@/components/units/form/UnitFormFields";
import { useUnitCreateForm } from "@/lib/hooks/units";

export default function NewUnitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const form = useUnitCreateForm(id);

  return (
    <div className="container mx-auto max-w-4xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Новий юніт</CardTitle>
          <CardDescription>Заповніть характеристики, расу й атаки</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.submit} className="space-y-6">
            <UnitFormFields campaignId={id} form={form} />
            <ActionBar>
              <Button type="button" variant="outline" asChild>
                <Link href={form.listHref}>Скасувати</Link>
              </Button>
              <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
                {form.isSaving ? "Створення..." : withAbilityErrors("Створити юніта", form.abilityErrors)}
              </Button>
            </ActionBar>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
