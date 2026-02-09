"use client";

import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CardDescription, CardTitle } from "@/components/ui/card";
import {
  parseUnitDragPayload,
  UnitCard,
} from "@/components/units/list/UnitCard";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

const DRAG_TYPE = "application/x-unit-id";

interface UnitGroupAccordionProps {
  groupName: string;
  units: Unit[];
  campaignId: string;
  races?: Race[];
  onDeleteUnit: (unitId: string) => void;
  onDropOnGroup?: (unitId: string, targetRaceName: string) => void;
  onDropOnLevel?: (unitId: string, targetLevel: number) => void;
}

export function UnitGroupAccordion({
  groupName,
  units,
  campaignId,
  races = [],
  onDeleteUnit,
  onDropOnGroup,
  onDropOnLevel,
}: UnitGroupAccordionProps) {
  const [dragOverGroup, setDragOverGroup] = useState(false);

  const [dragOverLevel, setDragOverLevel] = useState<number | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(DRAG_TYPE)) {
      e.preventDefault();

      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDropOnGroup = (e: React.DragEvent) => {
    setDragOverGroup(false);

    const raw = e.dataTransfer.getData(DRAG_TYPE);

    if (!raw || !onDropOnGroup) return;

    const payload = parseUnitDragPayload(raw);

    if (payload && payload.currentRace !== groupName) {
      e.preventDefault();

      onDropOnGroup(payload.unitId, groupName);
    }
  };

  const handleDropOnLevel = (e: React.DragEvent, level: number) => {
    setDragOverLevel(null);

    const raw = e.dataTransfer.getData(DRAG_TYPE);

    if (!raw || !onDropOnLevel) return;

    const payload = parseUnitDragPayload(raw);

    if (payload && payload.currentLevel !== level) {
      e.preventDefault();

      onDropOnLevel(payload.unitId, level);
    }
  };

  return (
    <>
      <AccordionItem value={groupName} key={groupName}>
        <AccordionTrigger className="px-4 sm:px-6">
          <div
            className={`flex items-center gap-3 sm:gap-4 text-left w-full rounded-md transition-colors ${dragOverGroup ? "bg-primary/15 ring-2 ring-primary/50" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragOverGroup(false)}
            onDrop={handleDropOnGroup}
            onDragEnter={(e) => e.dataTransfer.types.includes(DRAG_TYPE) && setDragOverGroup(true)}
          >
            <div
              className="flex-1 min-w-0"
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes(DRAG_TYPE)) {
                  e.preventDefault();
                  setDragOverGroup(true);
                }
              }}
            >
              <CardTitle className="text-lg truncate">{groupName}</CardTitle>
              <CardDescription className="mt-1">
                {units.length} юнітів
              </CardDescription>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="px-1 sm:px-2 pb-4">
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
                <Accordion
                  type="multiple"
                  defaultValue={sortedLevels.map((level) => `level-${level}`)}
                  className="w-full"
                >
                  {sortedLevels.map((level) => (
                    <AccordionItem value={`level-${level}`} key={level}>
                      <AccordionTrigger className="px-2 py-2 text-sm font-semibold">
                        <div
                          className={`w-full text-left rounded px-1 -mx-1 transition-colors ${dragOverLevel === level ? "bg-primary/15 ring-2 ring-primary/50" : ""}`}
                          onDragOver={handleDragOver}
                          onDragLeave={() => setDragOverLevel(null)}
                          onDrop={(e) => handleDropOnLevel(e, level)}
                          onDragEnter={() => setDragOverLevel(level)}
                        >
                          Рівень {level} ({unitsByLevel[level].length} юнітів)
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                          {unitsByLevel[level].map((unit) => {
                            const unitRace =
                              unit.race && races
                                ? races.find((r) => r.name === unit.race) || null
                                : null;

                            return (
                              <UnitCard
                                key={unit.id}
                                unit={unit}
                                campaignId={campaignId}
                                race={unitRace}
                                onDelete={onDeleteUnit}
                              />
                            );
                          })}
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
    </>
  );
}
