"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { LoadingState } from "@/components/common/states";
import { HudFormPage } from "@/components/hud/form";
import type { SpellFormData } from "@/components/spells/form/spell-form-defaults";
import { getDefaultSpellFormData } from "@/components/spells/form/spell-form-defaults";
import { SpellFormBody } from "@/components/spells/form/SpellFormBody";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import {
  useDeleteSpell,
  useSpell,
  useSpellFormSync,
  useSpellGroups,
  useSpellIssueText,
  useUpdateSpell,
} from "@/lib/hooks/spells";
import { formToPayload, spellFormIssue, spellToForm } from "@/lib/utils/spells/model/form";

export function SpellEditForm({ campaignId: id, spellId }: { campaignId: string; spellId: string }) {
  const t = useTranslations();

  const confirm = useConfirm();

  const notify = useNotify();

  const router = useRouter();

  const issueText = useSpellIssueText();

  const [formData, setFormData] = useState<SpellFormData>(getDefaultSpellFormData);

  const { data: spell, isLoading: fetching } = useSpell(id, spellId);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const updateSpellMutation = useUpdateSpell(id, spellId);

  const deleteSpellMutation = useDeleteSpell(id, spellId);

  useSpellFormSync(spell, setFormData, spellToForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = spellFormIssue(formData);

    if (problem) {
      void notify(issueText(problem));

      return;
    }

    updateSpellMutation.mutate(formToPayload(formData), {
      onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
      onError: (error) => console.error("Error updating spell:", error),
    });
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: t("spellEditor.page.deleteConfirm"), confirmLabel: t("common.actions.delete"), destructive: true }))) {
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
      <HudFormPage title={t("spellEditor.page.editTitle")}>
        <div className="px-4 py-3">
          <LoadingState rows={6} label={t("spellEditor.page.loading")} />
        </div>
      </HudFormPage>
    );
  }

  return (
    <HudFormPage title={t("spellEditor.page.editTitleNamed", { name: formData.name ?? "" })} aside={t("spellEditor.page.editAside")}>
      <SpellFormBody
        campaignId={id}
        form={{ data: formData, set: setFormData }}
        spellGroups={spellGroups}
        submit={{
          onSubmit: handleSubmit,
          isPending: updateSpellMutation.isPending,
          label: t("spellEditor.page.editSubmit"),
          error:
            (updateSpellMutation.error as Error)?.message ||
            (deleteSpellMutation.error as Error)?.message ||
            null,
        }}
        remove={{ onDelete: handleDelete, isDeleting: deleteSpellMutation.isPending }}
      />
    </HudFormPage>
  );
}
