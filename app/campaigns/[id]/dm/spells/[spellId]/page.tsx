"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";

import type { SpellFormData } from "../spell-form-defaults";
import { getDefaultSpellFormData } from "../spell-form-defaults";
import { SpellFormBody } from "../SpellFormBody";

import { LoadingState } from "@/components/common/states";
import { HudFormPage } from "@/components/hud/form";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import {
  useDeleteSpell,
  useSpell,
  useSpellFormSync,
  useSpellGroups,
  useUpdateSpell,
} from "@/lib/hooks/spells";
import { formToPayload, spellFormError, spellToForm } from "@/lib/utils/spells/model/form";

export default function EditSpellPage({
  params,
}: {
  params: Promise<{ id: string; spellId: string }>;
}) {
  const confirm = useConfirm();

  const notify = useNotify();

  const { id, spellId } = use(params);

  const router = useRouter();

  const [formData, setFormData] = useState<SpellFormData>(getDefaultSpellFormData);

  const { data: spell, isLoading: fetching } = useSpell(id, spellId);

  const { data: spellGroups = [] } = useSpellGroups(id);

  const updateSpellMutation = useUpdateSpell(id, spellId);

  const deleteSpellMutation = useDeleteSpell(id, spellId);

  useSpellFormSync(spell, setFormData, spellToForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const problem = spellFormError(formData);

    if (problem) {
      void notify(problem);

      return;
    }

    updateSpellMutation.mutate(formToPayload(formData), {
      onSuccess: () => router.push(`/campaigns/${id}/dm/spells`),
      onError: (error) => console.error("Error updating spell:", error),
    });
  };

  const handleDelete = async () => {
    if (!(await confirm({ title: "Ви впевнені, що хочете видалити це заклинання?", confirmLabel: "Видалити", destructive: true }))) {
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
      <HudFormPage title="Редагувати заклинання">
        <div className="px-4 py-3">
          <LoadingState rows={6} label="Завантаження..." />
        </div>
      </HudFormPage>
    );
  }

  return (
    <HudFormPage title={`Редагувати заклинання: ${formData.name ?? ""}`} aside="Оновіть інформацію про заклинання">
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
    </HudFormPage>
  );
}
