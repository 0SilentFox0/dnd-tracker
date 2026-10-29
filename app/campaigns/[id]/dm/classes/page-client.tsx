"use client";

import { useTranslations } from "next-intl";
import { GraduationCap, Plus } from "lucide-react";

import { ClassCard } from "@/components/classes/ClassCard";
import { CreateClassDialog } from "@/components/classes/CreateClassDialog";
import { DmCardGrid, DmListBody } from "@/components/common/DmListBody";
import { EmptyState } from "@/components/common/states";
import { ContentTransferButtons } from "@/components/content-import/ContentTransferButtons";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useClassesList } from "@/lib/hooks/classes";

export function DMClassesPageClient({ campaignId }: { campaignId: string }) {
  const t = useTranslations("classes");

  const list = useClassesList(campaignId);

  const { classes } = list;

  return (
    <HudPage>
      <HudPageHeader
        title={t("page.title")}
        subtitle={t("page.subtitle", { count: classes.length })}
        actions={
          <>
            <ContentTransferButtons campaignId={campaignId} kind="classes" />
            <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {t("page.newClass")}
            </Button>
          </>
        }
      />

      <DmListBody
        isLoading={list.isLoading}
        isEmpty={classes.length === 0}
        loadingLabel={t("page.loading")}
        empty={<EmptyState icon={GraduationCap} title={t("page.emptyTitle")} description={t("page.emptyDescription")} />}
      >
        <DmCardGrid>
          {classes.map((gameClass) => (
            <ClassCard key={gameClass.id} gameClass={gameClass} campaignId={campaignId} onDelete={list.actions.deleteClass} />
          ))}
        </DmCardGrid>
      </DmListBody>

      <CreateClassDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateClass={list.actions.createClass} />
    </HudPage>
  );
}
