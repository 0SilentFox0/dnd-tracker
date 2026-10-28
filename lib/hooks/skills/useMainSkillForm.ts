"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useUpdateMainSkill } from "./useMainSkills";

import { useNavigateFresh } from "@/lib/hooks/common";
import { useSpellGroups } from "@/lib/hooks/spells";
import { errorMessage } from "@/lib/utils/common/error-message";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

export function useMainSkillForm(campaignId: string, mainSkill: MainSkill) {
  const t = useTranslations();

  const router = useRouter();

  const navigateFresh = useNavigateFresh();

  const update = useUpdateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const [formData, setFormData] = useState<MainSkillFormData>({
    name: mainSkill.name,
    color: mainSkill.color,
    icon: mainSkill.icon || "",
    isEnableInSkillTree: mainSkill.isEnableInSkillTree ?? false,
    spellGroupId: mainSkill.spellGroupId ?? null,
    role: (mainSkill.role as MainSkillFormData["role"]) ?? null,
  });

  const [error, setError] = useState<string | null>(null);

  const listHref = `/campaigns/${campaignId}/dm/main-skills`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError(t("common.form.nameRequired"));

      return;
    }

    setError(null);

    try {
      await update.mutateAsync({ mainSkillId: mainSkill.id, data: { ...formData, name: formData.name.trim(), icon: formData.icon?.trim() || undefined } });
      navigateFresh(listHref);
    } catch (err) {
      setError(errorMessage(err, t("skills.mainSkills.list.updateFailed")));
    }
  };

  return {
    form: { data: formData, set: (patch: Partial<MainSkillFormData>) => setFormData((prev) => ({ ...prev, ...patch })) },
    spellGroups,
    status: { isSaving: update.isPending, error },
    actions: { submit, cancel: () => router.push(listHref) },
  };
}
