"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { UnitCard } from "@/components/units/list/UnitCard";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

interface UnitGroupAccordionProps {
  groupName: string;
  units: Unit[];
  campaignId: string;
  races?: Race[];
  onDeleteUnit: (unitId: string) => void;
}

export function UnitGroupAccordion({
  groupName,
  units,
  campaignId,
  races = [],
  onDeleteUnit,
}: UnitGroupAccordionProps) {
  // Знаходимо расу за назвою
  const race = races.find((r) => r.name === groupName) || null;

  return (
    <>
      <AccordionItem value={groupName} key={groupName}>
        <AccordionTrigger className="px-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4 text-left w-full">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{groupName}</CardTitle>
              <CardDescription className="mt-1">
                {units.length} юнітів
              </CardDescription>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="px-1 sm:px-2 pb-4">
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
                <Accordion
                  type="multiple"
                  defaultValue={sortedLevels.map((level) => `level-${level}`)}
                  className="w-full"
                >
                  {sortedLevels.map((level) => (
                    <AccordionItem value={`level-${level}`} key={level}>
                      <AccordionTrigger className="px-2 py-2 text-sm font-semibold">
                        Рівень {level} ({unitsByLevel[level].length} юнітів)
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pt-2">
                          {unitsByLevel[level].map((unit) => {
                            // Знаходимо расу для конкретного юніта
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
