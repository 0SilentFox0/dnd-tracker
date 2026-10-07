"use client";

import Link from "next/link";
import { Skull } from "lucide-react";

import { DeleteAllButton } from "@/components/common/DeleteAllButton";
import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { UnitImportDialog } from "@/components/units/dialogs/UnitImportDialog";
import { UnitGroupAccordion } from "@/components/units/list/UnitGroupAccordion";
import { UnitsToolbar } from "@/components/units/list/UnitsToolbar";
import { useUnitsList } from "@/lib/hooks/units";
import type { Unit } from "@/types/units";

interface DMUnitsPageClientProps {
  campaignId: string;
  initialUnits: Unit[];
}

export function DMUnitsPageClient({ campaignId, initialUnits }: DMUnitsPageClientProps) {
  const list = useUnitsList(campaignId, initialUnits);

  return (
    <HudPage>
      <HudPageHeader
        title="NPC Юніти"
        subtitle={`Управління мобами та юнітами Всього: ${list.units.length}`}
        actions={
          <>
            <UnitImportDialog campaignId={campaignId} />
            <Button variant="outline" className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/races`}>+ Раса</Link>
            </Button>
            <Button className="whitespace-nowrap text-xs sm:text-sm" asChild>
              <Link href={`/campaigns/${campaignId}/dm/units/new`}>+ Створити юніта</Link>
            </Button>
            <DeleteAllButton
              count={list.units.length}
              nouns={["юніт", "юніти", "юнітів"]}
              label="Видалити всі юніти"
              description={`Ви впевнені, що хочете видалити всі юніти з кампанії? Ця дія незворотна. Буде видалено ${list.units.length} юнітів.`}
              onConfirm={list.removeAll}
            />
          </>
        }
      >
        {list.units.length > 0 && (
          <UnitsToolbar query={list.query} onSearch={list.search} chips={list.chips} selected={list.raceFilter} onToggle={list.toggleRace} />
        )}
      </HudPageHeader>

      {list.isLoading && list.units.length === 0 ? (
        <LoadingState rows={6} label="Завантаження юнітів…" />
      ) : list.units.length === 0 ? (
        <EmptyState icon={Skull} title="Ще немає юнітів" description="Створіть першого юніта або імпортуйте їх з файлу." />
      ) : list.groups.length === 0 ? (
        <p className="text-sm text-[#8f8473]">Нічого не знайдено</p>
      ) : (
        <Accordion type="multiple" value={list.open} onValueChange={list.setOpen} className="space-y-2">
          {list.groups.map((group) => (
            <UnitGroupAccordion key={group.key} group={group} campaignId={campaignId} onDeleteUnit={list.deleteUnit} onDrop={list.drop} />
          ))}
        </Accordion>
      )}
    </HudPage>
  );
}
