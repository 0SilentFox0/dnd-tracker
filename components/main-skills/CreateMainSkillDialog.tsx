"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { MainSkillFormFields } from "./MainSkillFormFields";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useNotify } from "@/lib/hooks/common";
import { useCreateMainSkill } from "@/lib/hooks/skills";
import { useSpellGroups } from "@/lib/hooks/spells";
import type { MainSkillFormData } from "@/types/main-skills";

const EMPTY: MainSkillFormData = { name: "", color: "#000000", icon: "", isEnableInSkillTree: false, spellGroupId: null };

interface CreateMainSkillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
}

export function CreateMainSkillDialog({ open, onOpenChange, campaignId }: CreateMainSkillDialogProps) {
  const t = useTranslations();

  const notify = useNotify();

  const router = useRouter();

  const createMainSkillMutation = useCreateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId, { enabled: open });

  const [formData, setFormData] = useState<MainSkillFormData>(EMPTY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      void notify(t("common.form.nameRequired"));

      return;
    }

    try {
      await createMainSkillMutation.mutateAsync({ ...formData, name: formData.name.trim(), icon: formData.icon?.trim() || undefined });
      setFormData(EMPTY);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating main skill:", error);
      void notify(error instanceof Error ? error.message : t("skills.mainSkills.list.createFailed"));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("skills.mainSkills.create.title")}
      description={t("skills.mainSkills.create.description")}
      size="sm"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" form="create-main-skill-form" disabled={createMainSkillMutation.isPending}>
            {createMainSkillMutation.isPending ? t("common.actions.creating") : t("common.actions.create")}
          </Button>
        </>
      }
    >
      <form id="create-main-skill-form" onSubmit={handleSubmit} className="space-y-4">
        <MainSkillFormFields form={formData} onChange={(patch) => setFormData((prev) => ({ ...prev, ...patch }))} spellGroups={spellGroups} />
      </form>
    </ResponsiveDialog>
  );
}
