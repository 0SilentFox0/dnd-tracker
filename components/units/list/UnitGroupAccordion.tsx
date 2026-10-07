"use client";

import { useState } from "react";

import { EntityIcon } from "@/components/common/EntityIcon";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { UnitCard } from "@/components/units/list/UnitCard";
import { parseUnitDragPayload, planUnitDrop, UNIT_DRAG_TYPE, type UnitDropTarget } from "@/lib/utils/units/drag";
import { raceIdOfGroup, type UnitRaceGroup } from "@/lib/utils/units/group-units";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

interface UnitGroupAccordionProps {
  group: UnitRaceGroup<Race>;
  campaignId: string;
  onDeleteUnit: (unitId: string) => void;
  onDrop: (unitId: string, data: Partial<Unit>) => void;
}

const carriesUnit = (e: React.DragEvent) => e.dataTransfer.types.includes(UNIT_DRAG_TYPE);

export function UnitGroupAccordion({ group, campaignId, onDeleteUnit, onDrop }: UnitGroupAccordionProps) {
  const [over, setOver] = useState<string | null>(null);

  const title = group.race?.name ?? "Без раси";

  const allowDrop = (e: React.DragEvent) => {
    if (!carriesUnit(e)) return;

    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const dropOn = (target: UnitDropTarget) => (e: React.DragEvent) => {
    setOver(null);

    const payload = parseUnitDragPayload(e.dataTransfer.getData(UNIT_DRAG_TYPE));

    const data = payload && planUnitDrop(payload, target);

    if (!payload || !data) return;

    e.preventDefault();
    onDrop(payload.unitId, data);
  };

  const highlight = (key: string) => (over === key ? "bg-[rgba(230,194,90,.08)] ring-1 ring-[#e6c25a]/60" : "");

  return (
    <AccordionItem value={group.key} className="border-l-4" style={group.race?.color ? { borderLeftColor: group.race.color } : undefined}>
      <AccordionTrigger className="px-4 sm:px-6">
        <div
          className={`flex w-full items-center gap-3 rounded-md text-left transition-colors sm:gap-4 ${highlight("race")}`}
          onDragOver={allowDrop}
          onDragEnter={(e) => carriesUnit(e) && setOver("race")}
          onDragLeave={() => setOver(null)}
          onDrop={dropOn({ raceId: raceIdOfGroup(group.key) })}
        >
          <EntityIcon src={group.race?.icon ?? null} name={title} className="h-9 w-9 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="hud-sc truncate text-lg text-hud-ink">{title}</h3>
            <p className="mt-1 text-sm text-hud-muted">{group.total} юнітів</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-1 pb-4 sm:px-2">
          {group.tiers.length === 0 ? (
            <p className="px-2 text-sm text-hud-muted">Перетягніть сюди юніта, щоб призначити расу</p>
          ) : (
            <Accordion type="multiple" defaultValue={group.tiers.map((t) => `level-${t.level}`)} className="w-full">
              {group.tiers.map((tier) => (
                <AccordionItem value={`level-${tier.level}`} key={tier.level}>
                  <AccordionTrigger className="px-2 py-2 text-sm font-semibold">
                    <div
                      className={`-mx-1 w-full rounded px-1 text-left transition-colors ${highlight(`level-${tier.level}`)}`}
                      onDragOver={allowDrop}
                      onDragEnter={(e) => carriesUnit(e) && setOver(`level-${tier.level}`)}
                      onDragLeave={() => setOver(null)}
                      onDrop={dropOn({ level: tier.level })}
                    >
                      Рівень {tier.level} ({tier.units.length} юнітів)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 pt-2 md:grid-cols-2 lg:grid-cols-3">
                      {tier.units.map((unit) => (
                        <UnitCard key={unit.id} unit={unit} campaignId={campaignId} race={group.race} onDelete={onDeleteUnit} />
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
