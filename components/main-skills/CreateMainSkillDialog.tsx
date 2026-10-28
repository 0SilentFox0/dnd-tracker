"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const notify = useNotify();

  const router = useRouter();

  const createMainSkillMutation = useCreateMainSkill(campaignId);

  const { data: spellGroups = [] } = useSpellGroups(campaignId, { enabled: open });

  const [formData, setFormData] = useState<MainSkillFormData>(EMPTY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMainSkillMutation.mutateAsync({ ...formData, icon: formData.icon?.trim() || undefined });
      setFormData(EMPTY);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error("Error creating main skill:", error);
      void notify(error instanceof Error ? error.message : "Помилка при створенні основного навику");
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Створити основний навик"
      description="Основні навики використовуються для групування скілів в дереві прокачки"
      size="sm"
      hud
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button type="submit" form="create-main-skill-form" disabled={createMainSkillMutation.isPending}>
            {createMainSkillMutation.isPending ? "Створення..." : "Створити"}
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
