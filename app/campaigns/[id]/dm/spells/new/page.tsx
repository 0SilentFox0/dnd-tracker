"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import type { SpellFormData } from "../spell-form-defaults";
import { getDefaultSpellFormData } from "../spell-form-defaults";
import { SpellFormBody } from "../SpellFormBody";

import { HudFormPage } from "@/components/hud/form";
import { useNotify } from "@/lib/hooks/common";
import { useCreateSpell, useSpellGroups } from "@/lib/hooks/spells";
import { formToPayload, spellFormError } from "@/lib/utils/spells/model/form";

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

    const problem = spellFormError(formData);

    if (problem) {
      void notify(problem);

      return;
    }

    createSpellMutation.mutate(formToPayload(formData), {
      onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
      onError: (error) => console.error("Error creating spell:", error),
    });
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
