"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import type { SpellFormData } from "../spell-form-defaults";
import { getDefaultSpellFormData } from "../spell-form-defaults";
import { SpellFormBody } from "../SpellFormBody";
import { useSpellFormSync } from "../useSpellFormSync";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDeleteSpell,
  useSpell,
  useSpellGroups,
  useUpdateSpell,
} from "@/lib/hooks/spells";

export default function EditSpellPage({
  params,
}: {
  params: Promise<{ id: string; spellId: string }>;
}) {
  const { id, spellId } = use(params);

  const router = useRouter();

  const [formData, setFormData] = useState<SpellFormData>(getDefaultSpellFormData);

  const { data: spell, isLoading: fetching } = useSpell(id, spellId);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const updateSpellMutation = useUpdateSpell(id, spellId);

  const deleteSpellMutation = useDeleteSpell(id, spellId);

  useSpellFormSync(spell, setFormData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    updateSpellMutation.mutate(
      {
        ...formData,
        target: formData.target || null,
        damageElement: formData.damageElement || null,
        damageModifier: formData.damageModifier || null,
        healModifier: formData.healModifier || null,
        castingTime: formData.castingTime || null,
        range: formData.range || null,
        duration: formData.duration || null,
        diceCount: formData.diceCount || null,
        diceType: formData.diceType || null,
        savingThrow: formData.savingThrow || null,
        description: formData.description ?? null,
        effects: formData.effects ?? null,
        groupId: formData.groupId || null,
        icon: formData.icon || null,
        summonUnitId: formData.summonUnitId || null,
      },
      {
        onSuccess: () => {
          router.push(`/campaigns/${id}/dm/spells`);
        },
        onError: (error) => {
          console.error("Error updating spell:", error);
        },
      },
    );
  };

  const handleDelete = async () => {
    if (!confirm("Ви впевнені, що хочете видалити це заклинання?")) {
      return;
    }

    deleteSpellMutation.mutate(undefined, {
      onSuccess: () => {
        router.push(`/campaigns/${id}/dm/spells`);
      },
      onError: (error) => {
        console.error("Error deleting spell:", error);
      },
    });
  };

  if (fetching) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Редагувати заклинання: {formData.name}</CardTitle>
          <CardDescription>Оновіть інформацію про заклинання</CardDescription>
        </CardHeader>
        <CardContent>
          <SpellFormBody
            campaignId={id}
            formData={formData}
            setFormData={setFormData}
            spellGroups={spellGroups}
            onSubmit={handleSubmit}
            isSubmitting={updateSpellMutation.isPending}
            submitLabel="Зберегти зміни"
            error={
              (updateSpellMutation.error as Error)?.message ||
              (deleteSpellMutation.error as Error)?.message ||
              null
            }
            onDelete={handleDelete}
            isDeleting={deleteSpellMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
