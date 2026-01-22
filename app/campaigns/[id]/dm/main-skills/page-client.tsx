"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMainSkills, useDeleteMainSkill } from "@/lib/hooks/useMainSkills";
import type { MainSkill } from "@/types/main-skills";
import { MainSkillsPageHeader } from "@/components/main-skills/MainSkillsPageHeader";
import { MainSkillCard } from "@/components/main-skills/MainSkillCard";
import { CreateMainSkillDialog } from "@/components/main-skills/CreateMainSkillDialog";

interface DMMainSkillsPageClientProps {
  campaignId: string;
  initialMainSkills: MainSkill[];
}

export function DMMainSkillsPageClient({
  campaignId,
  initialMainSkills,
}: DMMainSkillsPageClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: mainSkills = initialMainSkills } = useMainSkills(campaignId);
  const deleteMainSkillMutation = useDeleteMainSkill(campaignId);

  const handleDelete = async (mainSkillId: string) => {
    if (
      confirm(
        "Ви впевнені, що хочете видалити цей основний навик? Це також видалить всі скіли, пов'язані з ним."
      )
    ) {
      try {
        await deleteMainSkillMutation.mutateAsync(mainSkillId);
      } catch (error) {
        console.error("Error deleting main skill:", error);
        alert("Помилка при видаленні основного навику");
      }
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <MainSkillsPageHeader
        mainSkillsCount={mainSkills.length}
        onCreateClick={() => setCreateDialogOpen(true)}
      />

      {mainSkills.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Немає основних навиків. Створіть перший основний навик.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
    </div>
  );
}
