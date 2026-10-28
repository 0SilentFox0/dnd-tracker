"use client";

import { GraduationCap, Plus } from "lucide-react";

import { ClassCard } from "@/components/classes/ClassCard";
import { CreateClassDialog } from "@/components/classes/CreateClassDialog";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { useClassesList } from "@/lib/hooks/classes";
import { pluralUk } from "@/lib/utils/common/plural";

export function DMClassesPageClient({ campaignId }: { campaignId: string }) {
  const list = useClassesList(campaignId);

  const { classes } = list;

  return (
    <HudPage>
      <HudPageHeader
        title="Класи"
        subtitle={`${classes.length} ${pluralUk(classes.length, ["клас", "класи", "класів"])}`}
        actions={
          <Button onClick={() => list.createDialog.setOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Новий клас
          </Button>
        }
      />

      {list.isLoading && classes.length === 0 ? (
        <LoadingState rows={6} label="Завантаження класів…" />
      ) : classes.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Ще немає класів" description="Створіть перший клас." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((gameClass) => (
            <ClassCard key={gameClass.id} gameClass={gameClass} campaignId={campaignId} onDelete={list.actions.deleteClass} />
          ))}
        </div>
      )}

      <CreateClassDialog open={list.createDialog.open} onOpenChange={list.createDialog.setOpen} onCreateClass={list.actions.createClass} />
    </HudPage>
  );
}
