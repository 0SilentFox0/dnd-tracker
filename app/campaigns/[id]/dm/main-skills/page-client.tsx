"use client";

import { useTranslations } from "next-intl";
import { Network } from "lucide-react";

import { SearchEmptyState } from "@/components/common/SearchEmptyState";
import { SearchInput } from "@/components/common/SearchInput";
import { EmptyState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
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
  const t = useTranslations("skills.mainSkills.page");

  const { mainSkills, total, search, createDialog, actions } = useMainSkillsList(campaignId, initialMainSkills);

  return (
    <HudPage>
      <HudPageHeader
        title={t("title")}
        subtitle={t("subtitle", { total })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="main-skills" />
            <Button onClick={() => createDialog.setOpen(true)}>{t("create")}</Button>
          </>
        }
      />

      {total === 0 ? (
        <EmptyState icon={Network} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <>
          <SearchInput value={search.query.value} onChange={search.query.set} label={t("searchLabel")} />
          {mainSkills.length === 0 ? (
            <SearchEmptyState query={search.query.value} onClear={() => search.query.set("")} />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mainSkills.map((mainSkill) => (
                <MainSkillCard key={mainSkill.id} mainSkill={mainSkill} campaignId={campaignId} onDelete={(id) => void actions.remove(id)} />
              ))}
            </div>
          )}
        </>
      )}

      <CreateMainSkillDialog open={createDialog.open} onOpenChange={createDialog.setOpen} campaignId={campaignId} />
    </HudPage>
  );
}
