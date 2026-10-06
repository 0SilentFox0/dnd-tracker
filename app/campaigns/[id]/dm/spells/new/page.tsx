"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import type { SpellFormData } from "../spell-form-defaults";
import { getDefaultSpellFormData } from "../spell-form-defaults";
import { SpellFormBody } from "../SpellFormBody";

import { HudFormPage } from "@/components/hud/form";
import { useNotify } from "@/lib/hooks/common";
import { useCreateSpell, useSpellGroups } from "@/lib/hooks/spells";

export default function NewSpellPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const notify = useNotify();

  const { id } = use(params);

  const router = useRouter();

  const [formData, setFormData] = useState<SpellFormData>(getDefaultSpellFormData);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const createSpellMutation = useCreateSpell(id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      void notify("Будь ласка, вкажіть назву заклинання");

      return;
    }

    createSpellMutation.mutate(
      {
        ...formData,
        name: formData.name ?? "",
        description: formData.description ?? "",
        effects: formData.effects ?? null,
        type: formData.type || "target",
        damageType: formData.damageType || "damage",
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
        groupId: formData.groupId || null,
        icon: formData.icon || null,
        summonUnitId: formData.summonUnitId || null,
      },
      {
        onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
        onError: (error) => console.error("Error creating spell:", error),
      },
    );
  };

  return (
    <HudFormPage title="Створити нове заклинання" aside="Додайте інформацію про нове заклинання">
      <SpellFormBody
        campaignId={id}
        formData={formData}
        setFormData={setFormData}
        spellGroups={spellGroups}
        onSubmit={handleSubmit}
        isSubmitting={createSpellMutation.isPending}
        submitLabel="Створити заклинання"
        error={(createSpellMutation.error as Error)?.message ?? null}
      />
    </HudFormPage>
  );
}
