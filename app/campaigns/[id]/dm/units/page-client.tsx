"use client";

import { Skull } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { HudPage } from "@/components/hud/page";
import { Accordion } from "@/components/ui/accordion";
import { UnitGroupAccordion } from "@/components/units/list/UnitGroupAccordion";
import { UnitsToolbar } from "@/components/units/list/UnitsToolbar";
import { UnitsPageHeader } from "@/components/units/ui/UnitsPageHeader";
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
      <UnitsPageHeader campaignId={campaignId} unitsCount={list.units.length} onDeleteAll={() => void list.removeAll()}>
        {list.units.length > 0 && (
          <UnitsToolbar query={list.query} onSearch={list.search} chips={list.chips} selected={list.raceFilter} onToggle={list.toggleRace} />
        )}
      </UnitsPageHeader>

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
