"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useUpdateMainSkill } from "./useMainSkills";

import { useNotify } from "@/lib/hooks/common";
import { useSpellGroups } from "@/lib/hooks/spells";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

export function useMainSkillForm(campaignId: string, mainSkill: MainSkill) {
  const notify = useNotify();

  const router = useRouter();

  const update = useUpdateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const [formData, setFormData] = useState<MainSkillFormData>({
    name: mainSkill.name,
    color: mainSkill.color,
    icon: mainSkill.icon || "",
    isEnableInSkillTree: mainSkill.isEnableInSkillTree ?? false,
    spellGroupId: mainSkill.spellGroupId ?? null,
  });

  const listHref = `/campaigns/${campaignId}/dm/main-skills`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({ mainSkillId: mainSkill.id, data: formData });
      router.push(listHref);
      router.refresh();
    } catch (error) {
      console.error("Error updating main skill:", error);
      void notify("Помилка при оновленні основного навику");
    }
  };

  return {
    formData,
    patch: (patch: Partial<MainSkillFormData>) => setFormData((prev) => ({ ...prev, ...patch })),
    spellGroups,
    isSaving: update.isPending,
    submit,
    cancel: () => router.push(listHref),
  };
}
