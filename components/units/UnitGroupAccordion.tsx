"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical, Edit, X } from "lucide-react";
import type { Unit, UnitGroup } from "@/lib/api/units";
import { useUnitGroupActions } from "@/lib/hooks/useUnitGroupActions";
import { RenameGroupDialog } from "./RenameGroupDialog";
import { RemoveAllUnitsDialog } from "./RemoveAllUnitsDialog";
import { UnitCard } from "./UnitCard";
import { getDamageElementLabel } from "@/lib/constants/damage";

// Wrapper component to filter out accordion props from dropdown
function DropdownWrapper({
  children,
}: {
  children: React.ReactNode;
  id?: string;
  isOpen?: boolean;
  toggleItem?: (id: string) => void;
}) {
  return <>{children}</>;
}

// Wrapper that forwards accordion props to AccordionTrigger but filters them for dropdown
function AccordionTriggerWrapper({
  trigger,
  dropdown,
  id,
  isOpen,
  toggleItem,
}: {
  trigger: React.ReactNode;
  dropdown: React.ReactNode;
  id?: string;
  isOpen?: boolean;
  toggleItem?: (id: string) => void;
}) {
  return (
    <div className="relative">
      {React.isValidElement(trigger)
        ? React.cloneElement(
            trigger as React.ReactElement<{
              id?: string;
              isOpen?: boolean;
              toggleItem?: (id: string) => void;
            }>,
            { id, isOpen, toggleItem }
          )
        : trigger}
      {dropdown}
    </div>
  );
}

interface UnitGroupAccordionProps {
  groupName: string;
  units: Unit[];
  campaignId: string;
  unitGroups: UnitGroup[];
  onDeleteUnit: (unitId: string) => void;
}

export function UnitGroupAccordion({
  groupName,
  units,
  campaignId,
  unitGroups,
  onDeleteUnit,
}: UnitGroupAccordionProps) {
  const groupId = unitGroups.find((g) => g.name === groupName)?.id;
  const groupDamageModifier =
    unitGroups.find((g) => g.name === groupName)?.damageModifier || null;
  const isUngrouped = groupName === "Без групи";
  const groupColor = units[0]?.unitGroup?.color || "#666";

  const {
    renameDialogOpen,
    removeAllDialogOpen,
    newGroupName,
    setNewGroupName,
    newGroupDamageModifier,
    setNewGroupDamageModifier,
    setRenameDialogOpen,
    setRemoveAllDialogOpen,
    handleRenameGroup,
    handleRemoveAllUnits,
    openRenameDialog,
    closeRenameDialog,
    isRenaming,
    isRemoving,
  } = useUnitGroupActions({
    campaignId,
    groupName,
    groupId,
    groupDamageModifier,
  });

  return (
    <>
      <AccordionItem key={groupName} defaultOpen={true}>
        <AccordionTriggerWrapper
          trigger={
            <AccordionTrigger className="px-4 sm:px-6 pr-14 sm:pr-16">
              <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
                <div
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shrink-0"
                  style={{ backgroundColor: groupColor }}
                />
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{groupName}</CardTitle>
                  <CardDescription className="mt-1">
                    {units.length} юнітів
                  </CardDescription>
                  {groupDamageModifier && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      {getDamageElementLabel(groupDamageModifier)}
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
          }
          dropdown={
            !isUngrouped && groupId ? (
              <DropdownWrapper>
                <div
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={openRenameDialog}>
                        <Edit className="h-4 w-4 mr-2" />
                        Перейменувати групу
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setRemoveAllDialogOpen(true)}
                        className="text-destructive"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Видалити всі з групи
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DropdownWrapper>
            ) : null
          }
        />
        <AccordionContent>
          <div className="px-1 sm:px-6 pb-4">
            {/* Групуємо юніти за рівнями та створюємо accordion для кожного рівня */}
            {(() => {
              const unitsByLevel: Record<number, Unit[]> = {};
              units.forEach((unit) => {
                if (!unitsByLevel[unit.level]) {
                  unitsByLevel[unit.level] = [];
                }
                unitsByLevel[unit.level].push(unit);
              });

              const sortedLevels = Object.keys(unitsByLevel)
                .map(Number)
                .sort((a, b) => a - b);

              return (
                <Accordion className="w-full">
                  {sortedLevels.map((level) => (
                    <AccordionItem key={level} defaultOpen={true}>
                      <AccordionTrigger className="px-2 py-2 text-sm font-semibold">
                        Рівень {level} ({unitsByLevel[level].length} юнітів)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                          {unitsByLevel[level].map((unit) => (
                            <UnitCard
                              key={unit.id}
                              unit={unit}
                              campaignId={campaignId}
                              onDelete={onDeleteUnit}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              );
            })()}
          </div>
        </AccordionContent>
      </AccordionItem>

      <RenameGroupDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        groupName={groupName}
        newGroupName={newGroupName}
        onNewGroupNameChange={setNewGroupName}
        damageModifier={newGroupDamageModifier}
        onDamageModifierChange={setNewGroupDamageModifier}
        onConfirm={handleRenameGroup}
        onCancel={closeRenameDialog}
        isRenaming={isRenaming}
      />
      <RemoveAllUnitsDialog
        open={removeAllDialogOpen}
        onOpenChange={setRemoveAllDialogOpen}
        groupName={groupName}
        onConfirm={handleRemoveAllUnits}
        isRemoving={isRemoving}
      />
    </>
  );
}
