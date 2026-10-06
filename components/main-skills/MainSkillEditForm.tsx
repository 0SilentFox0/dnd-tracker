"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MainSkillFormFields } from "./MainSkillFormFields";

import { FormCard } from "@/components/common/FormCard";
import { useNotify } from "@/lib/hooks/common";
import { useUpdateMainSkill } from "@/lib/hooks/skills";
import { useSpellGroups } from "@/lib/hooks/spells";
import type { MainSkill, MainSkillFormData } from "@/types/main-skills";

interface MainSkillEditFormProps {
  campaignId: string;
  mainSkill: MainSkill;
}

export function MainSkillEditForm({ campaignId, mainSkill }: MainSkillEditFormProps) {
  const notify = useNotify();

  const router = useRouter();

  const updateMainSkillMutation = useUpdateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId);

  const [formData, setFormData] = useState<MainSkillFormData>({
    name: mainSkill.name,
    color: mainSkill.color,
    icon: mainSkill.icon || "",
    isEnableInSkillTree: mainSkill.isEnableInSkillTree ?? false,
    spellGroupId: mainSkill.spellGroupId ?? null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMainSkillMutation.mutateAsync({ mainSkillId: mainSkill.id, data: formData });
      router.push(`/campaigns/${campaignId}/dm/main-skills`);
      router.refresh();
    } catch (error) {
      console.error("Error updating main skill:", error);
      void notify("Помилка при оновленні основного навику");
    }
  };

  return (
    <FormCard
      title="Редагувати основний навик"
      description="Оновіть інформацію про основний навик"
      onSubmit={handleSubmit}
      isSubmitting={updateMainSkillMutation.isPending}
      onCancel={() => router.push(`/campaigns/${campaignId}/dm/main-skills`)}
    >
      <MainSkillFormFields form={formData} onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))} spellGroups={spellGroups} />
    </FormCard>
  );
}
