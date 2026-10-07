"use client";

import { useState } from "react";
import { Network } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { CreateMainSkillDialog } from "@/components/main-skills/CreateMainSkillDialog";
import { MainSkillCard } from "@/components/main-skills/MainSkillCard";
import { Button } from "@/components/ui/button";
import { useConfirm, useNotify } from "@/lib/hooks/common";
import { useDeleteMainSkill, useMainSkills } from "@/lib/hooks/skills";
import type { MainSkill } from "@/types/main-skills";

interface DMMainSkillsPageClientProps {
  campaignId: string;
  initialMainSkills: MainSkill[];
}

export function DMMainSkillsPageClient({
  campaignId,
  initialMainSkills,
}: DMMainSkillsPageClientProps) {
  const notify = useNotify();

  const confirm = useConfirm();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: mainSkills = initialMainSkills } = useMainSkills(campaignId);

  const deleteMainSkillMutation = useDeleteMainSkill(campaignId);

  const handleDelete = async (mainSkillId: string) => {
    if (
      (await confirm({ title: "Ви впевнені, що хочете видалити цей основний навик? Це також видалить всі скіли, пов'язані з ним.", confirmLabel: "Видалити", destructive: true }))
    ) {
      try {
        await deleteMainSkillMutation.mutateAsync(mainSkillId);
      } catch (error) {
        console.error("Error deleting main skill:", error);
        void notify("Помилка при видаленні основного навику");
      }
    }
  };

  return (
    <HudPage>
      <HudPageHeader
        title="Основні Навики"
        subtitle={`Управління основними навиками для дерев прокачки Всього: ${mainSkills.length}`}
        actions={<Button onClick={() => setCreateDialogOpen(true)}>Створити основний навик</Button>}
      />

      {mainSkills.length === 0 ? (
        <EmptyState icon={Network} title="Ще немає основних навиків" description="Створіть перший основний навик — він групує скіли в дереві прокачки." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {mainSkills.map((mainSkill) => (
            <MainSkillCard
              key={mainSkill.id}
              mainSkill={mainSkill}
              campaignId={campaignId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateMainSkillDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        campaignId={campaignId}
      />
    </HudPage>
  );
}
