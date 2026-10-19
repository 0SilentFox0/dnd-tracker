"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { HudFormPage } from "@/components/hud/form";
import type { SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { getDefaultSpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellFormBody } from "@/components/spells/form/SpellFormBody";
import { useNotify } from "@/lib/hooks/common";
import { useCreateSpell, useSpellGroups } from "@/lib/hooks/spells";
import { formToPayload, spellFormError } from "@/lib/utils/spells/model/form";

export function SpellCreateForm({ campaignId: id }: { campaignId: string }) {
  const notify = useNotify();

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
        form={{ data: formData, set: setFormData }}
        spellGroups={spellGroups}
        submit={{
          onSubmit: handleSubmit,
          isPending: createSpellMutation.isPending,
          label: "Створити заклинання",
          error: (createSpellMutation.error as Error)?.message ?? null,
        }}
      />
    </HudFormPage>
  );
}
