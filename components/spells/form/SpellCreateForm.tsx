"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { HudFormPage } from "@/components/hud/form";
import type { SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { getDefaultSpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellFormBody } from "@/components/spells/form/SpellFormBody";
import { useNotify } from "@/lib/hooks/common";
import { useCreateSpell, useSpellGroups, useSpellIssueText } from "@/lib/hooks/spells";
import { formToPayload, spellFormIssue } from "@/lib/utils/spells/model/form";

export function SpellCreateForm({ campaignId: id }: { campaignId: string }) {
  const t = useTranslations("spellEditor.page");

  const notify = useNotify();

  const issueText = useSpellIssueText();

  const router = useRouter();

  const [formData, setFormData] = useState<SpellFormData>(getDefaultSpellFormData);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const createSpellMutation = useCreateSpell(id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = spellFormIssue(formData);

    if (problem) {
      void notify(issueText(problem));

      return;
    }

    createSpellMutation.mutate(formToPayload(formData), {
      onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
      onError: (error) => console.error("Error creating spell:", error),
    });
  };

  return (
    <HudFormPage title={t("createTitle")} aside={t("createAside")}>
      <SpellFormBody
        campaignId={id}
        form={{ data: formData, set: setFormData }}
        spellGroups={spellGroups}
        submit={{
          onSubmit: handleSubmit,
          isPending: createSpellMutation.isPending,
          label: t("createSubmit"),
          error: (createSpellMutation.error as Error)?.message ?? null,
        }}
      />
    </HudFormPage>
  );
}
