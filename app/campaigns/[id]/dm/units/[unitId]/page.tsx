"use client";

import { use } from "react";
import Link from "next/link";

import { AbilityListEditor, withAbilityErrors } from "@/components/abilities";
import { ActionBar } from "@/components/common/ActionBar";
import { IconUrlField } from "@/components/common/IconUrlField";
import { LoadingState, QueryState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UnitAbilityScores } from "@/components/units/form/UnitAbilityScores";
import { UnitAttacks } from "@/components/units/form/UnitAttacks";
import { UnitBasicInfo } from "@/components/units/form/UnitBasicInfo";
import { UnitDamageModifier } from "@/components/units/form/UnitDamageModifier";
import { UnitImmunities } from "@/components/units/form/UnitImmunities";
import { UnitKnownSpells } from "@/components/units/form/UnitKnownSpells";
import { useUnitEditForm } from "@/lib/hooks/units";

export default function EditUnitPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = use(params);

  const form = useUnitEditForm(id, unitId);

  const { formData, change, races } = form;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <QueryState query={form.query} loading={<LoadingState rows={8} label="Завантаження юніта…" />}>
        {(unit) => (
      <Card>
        <CardHeader>
          <CardTitle>Редагувати юніта: {formData.name}</CardTitle>
          <CardDescription>Оновіть інформацію про юніта</CardDescription>
        </CardHeader>
        <CardContent>
          {form.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Помилка:</strong>
              <span className="block sm:inline"> {form.error.message || "Помилка"}</span>
            </div>
          )}
          <form key={unitId} onSubmit={form.submit} className="space-y-6">
            <UnitBasicInfo
              formData={formData}
              races={races}
              onChange={change}
            />

            <UnitAbilityScores
              formData={formData}
              onChange={change}
            />

            <UnitAttacks
              formData={formData}
              onChange={change}
            />

            <IconUrlField id="avatar" label="Посилання на картинку" value={formData.avatar ?? ""} onChange={(avatar) => change({ avatar: avatar || null })} fallbackText={formData.name ?? ""} />

            <UnitDamageModifier
              formData={formData}
              onChange={change}
            />

            <UnitImmunities
              formData={formData}
              race={
                formData.race
                  ? races.find((r) => r.name === formData.race) || null
                  : null
              }
              onChange={change}
            />

            <AbilityListEditor
              campaignId={id}
              value={formData.abilities ?? []}
              onChange={(abilities) => change({ abilities })}
              issues={unit.abilityIssues}
              onValidityChange={(_, n) => form.setAbilityErrors(n)}
            />

            <UnitKnownSpells
              formData={formData}
              spells={form.spells}
              onChange={change}
            />

            <ActionBar>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void form.remove()}
                disabled={form.isDeleting}
              >
                Видалити
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href={`/campaigns/${id}/dm/units`}>Скасувати</Link>
              </Button>
              <Button type="submit" disabled={form.isSaving || !form.abilitiesValid}>
                {form.isSaving
                  ? "Збереження..."
                  : withAbilityErrors("Зберегти зміни", form.abilityErrors)}
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
