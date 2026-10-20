"use client";

import { Network } from "lucide-react";

import { EmptyState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { CreateMainSkillDialog } from "@/components/main-skills/CreateMainSkillDialog";
import { MainSkillCard } from "@/components/main-skills/MainSkillCard";
import { Button } from "@/components/ui/button";
import { useMainSkillsList } from "@/lib/hooks/skills";
import type { MainSkill } from "@/types/main-skills";

interface DMMainSkillsPageClientProps {
  campaignId: string;
  initialMainSkills: MainSkill[];
}

export function DMMainSkillsPageClient({ campaignId, initialMainSkills }: DMMainSkillsPageClientProps) {
  const { mainSkills, createDialog, actions } = useMainSkillsList(campaignId, initialMainSkills);

  return (
    <HudPage>
      <HudPageHeader
        title="Основні Навики"
        subtitle={`Управління основними навиками для дерев прокачки · Всього: ${mainSkills.length}`}
        actions={<Button onClick={() => createDialog.setOpen(true)}>Створити основний навик</Button>}
      />

      {mainSkills.length === 0 ? (
        <EmptyState icon={Network} title="Ще немає основних навиків" description="Створіть перший основний навик — він групує скіли в дереві прокачки." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {mainSkills.map((mainSkill) => (
            <MainSkillCard key={mainSkill.id} mainSkill={mainSkill} campaignId={campaignId} onDelete={(id) => void actions.remove(id)} />
          ))}
        </div>
      )}

      <CreateMainSkillDialog open={createDialog.open} onOpenChange={createDialog.setOpen} campaignId={campaignId} />
    </HudPage>
  );
}
