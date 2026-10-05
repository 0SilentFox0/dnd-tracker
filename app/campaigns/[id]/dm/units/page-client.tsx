"use client";

import { useMemo, useState } from "react";
import { Skull } from "lucide-react";

import { EmptyState, LoadingState } from "@/components/common/states";
import { Accordion } from "@/components/ui/accordion";
import { DeleteAllUnitsDialog } from "@/components/units/dialogs/DeleteAllUnitsDialog";
import { UnitGroupAccordion } from "@/components/units/list/UnitGroupAccordion";
import { UnitsPageHeader } from "@/components/units/ui/UnitsPageHeader";
import { useRaces } from "@/lib/hooks/races";
import {
  useDeleteAllUnits,
  useDeleteUnit,
  useUnitGroups,
  useUnits,
  useUpdateUnitAny,
} from "@/lib/hooks/units";
import type { Unit } from "@/types/units";

interface DMUnitsPageClientProps {
  campaignId: string;
  initialUnits: Unit[];
}

export function DMUnitsPageClient({
  campaignId,
  initialUnits,
}: DMUnitsPageClientProps) {
  const [deleteAllUnitsDialogOpen, setDeleteAllUnitsDialogOpen] =
    useState(false);

  // Запити для юнітів
  const { data: units = initialUnits, isLoading: unitsLoading } = useUnits(
    campaignId,
    initialUnits
  );

  // Запити для рас та груп
  const { data: races = [] } = useRaces(campaignId);

  const { data: unitGroups = [] } = useUnitGroups(campaignId);

  // Мутації
  const deleteAllUnitsMutation = useDeleteAllUnits(campaignId);

  const deleteUnitMutation = useDeleteUnit(campaignId);

  const updateUnitAnyMutation = useUpdateUnitAny(campaignId);

  const handleDeleteUnit = (unitId: string) => {
    deleteUnitMutation.mutate(unitId);
  };

  const handleDeleteAllUnits = () => {
    deleteAllUnitsMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteAllUnitsDialogOpen(false);
      },
    });
  };

  const handleDropOnGroup = (unitId: string, targetRaceName: string) => {
    const group = unitGroups.find((g) => g.name === targetRaceName);

    updateUnitAnyMutation.mutate({
      unitId,
      data: {
        race: targetRaceName,
        groupId: group?.id ?? null,
      },
    });
  };

  const handleDropOnLevel = (unitId: string, targetLevel: number) => {
    updateUnitAnyMutation.mutate({
      unitId,
      data: { level: targetLevel },
    });
  };

  // Групуємо юніти по расах
  const groupedUnits = useMemo(() => {
    const grouped: Record<string, Unit[]> = {};

    for (const unit of units) {
      const raceName = unit.race || "Без раси";

      if (!grouped[raceName]) {
        grouped[raceName] = [];
      }

      grouped[raceName].push(unit);
    }

    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === "Без раси") return 1;

      if (b === "Без раси") return -1;

      return a.localeCompare(b);
    });
  }, [units]);

  return (
    <div className="container mx-auto p-2 sm:p-4 space-y-4 sm:space-y-6 max-w-full">
      <UnitsPageHeader
        campaignId={campaignId}
        unitsCount={units.length}
        onDeleteAll={() => setDeleteAllUnitsDialogOpen(true)}
      />

      {unitsLoading && units.length === 0 ? (
        <LoadingState rows={6} label="Завантаження юнітів…" />
      ) : units.length === 0 ? (
        <EmptyState icon={Skull} title="Ще немає юнітів" description="Створіть першого юніта або імпортуйте їх з файлу." />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupedUnits.map(([raceName]) => raceName)}
          className="space-y-2 sm:space-y-4"
        >
          {groupedUnits.map(([raceName, raceUnits]) => (
            <UnitGroupAccordion
              key={raceName}
              groupName={raceName}
              units={raceUnits}
              campaignId={campaignId}
              races={races}
              onDeleteUnit={handleDeleteUnit}
              onDropOnGroup={handleDropOnGroup}
              onDropOnLevel={handleDropOnLevel}
            />
          ))}
        </Accordion>
      )}

      <DeleteAllUnitsDialog
        open={deleteAllUnitsDialogOpen}
        onOpenChange={setDeleteAllUnitsDialogOpen}
        unitsCount={units.length}
        onConfirm={handleDeleteAllUnits}
        isDeleting={deleteAllUnitsMutation.isPending}
      />
    </div>
  );
}
