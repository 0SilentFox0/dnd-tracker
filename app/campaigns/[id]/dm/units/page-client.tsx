"use client";

import { useState, useMemo } from "react";
import { Accordion } from "@/components/ui/accordion";
import {
  useUnits,
  useUnitGroups,
  useDeleteAllUnits,
  useDeleteUnit,
} from "@/lib/hooks/useUnits";
import type { Unit } from "@/lib/api/units";
import { UnitsPageHeader } from "@/components/units/UnitsPageHeader";
import { UnitGroupAccordion } from "@/components/units/UnitGroupAccordion";
import { DeleteAllUnitsDialog } from "@/components/units/DeleteAllUnitsDialog";

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

  // Запити для юнітів та груп
  const { data: units = initialUnits, isLoading: unitsLoading } = useUnits(
    campaignId,
    initialUnits
  );
  const { data: unitGroups = [] } = useUnitGroups(campaignId);

  // Мутації
  const deleteAllUnitsMutation = useDeleteAllUnits(campaignId);
  const deleteUnitMutation = useDeleteUnit(campaignId);

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

  // Групуємо юніти по групах
  const groupedUnits = useMemo(() => {
    const grouped: Record<string, Unit[]> = {};
    for (const unit of units) {
      const groupName = unit.unitGroup?.name || "Без групи";
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(unit);
    }
    return Object.entries(grouped).sort(([a], [b]) => {
      if (a === "Без групи") return 1;
      if (b === "Без групи") return -1;
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

      {unitsLoading && (
        <div className="text-center py-4">
          <p className="text-sm sm:text-base text-muted-foreground">
            Оновлення...
          </p>
        </div>
      )}

      {!unitsLoading && units.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-muted-foreground">
            Юніти ще не додані. Створіть першого юніта або імпортуйте їх з файлу.
          </p>
        </div>
      ) : (
        <Accordion className="space-y-2 sm:space-y-4">
          {groupedUnits.map(([groupName, groupUnits]) => (
            <UnitGroupAccordion
              key={groupName}
              groupName={groupName}
              units={groupUnits}
              campaignId={campaignId}
              unitGroups={unitGroups}
              onDeleteUnit={handleDeleteUnit}
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
