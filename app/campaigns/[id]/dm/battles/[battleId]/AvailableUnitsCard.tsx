"use client";

import Image from "next/image";

import { HudSection } from "@/components/hud/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticipantSourceType } from "@/lib/constants/battle";
import type { EditBattleUnit } from "@/types/battle-setup";

interface AvailableUnitsCardProps {
  units: EditBattleUnit[];
  isParticipantSelected: (id: string) => boolean;
  getParticipantQuantity: (id: string) => number;
  onParticipantToggle: (
    id: string,
    type: typeof ParticipantSourceType.UNIT,
    checked: boolean,
  ) => void;
  onQuantityChange: (participantId: string, quantity: number) => void;
}

export function AvailableUnitsCard({
  units,
  isParticipantSelected,
  getParticipantQuantity,
  onParticipantToggle,
  onQuantityChange,
}: AvailableUnitsCardProps) {
  return (
    <HudSection title="Усі Юніти" className="max-h-[600px] space-y-4 overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          NPC юніти з можливістю вибору кількості
        </p>
        {units.length > 0 ? (
          <div className="space-y-2">
            {units.map((unit) => {
              const isSelected = isParticipantSelected(unit.id);

              const quantity = getParticipantQuantity(unit.id);

              return (
                <div
                  key={unit.id}
                  className="flex flex-col gap-2 rounded border border-[#4a3c2c] bg-[#1a140f] p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onParticipantToggle(unit.id, ParticipantSourceType.UNIT, checked as boolean)
                      }
                    />
                    {unit.avatar && (
                      <Image
                        src={unit.avatar}
                        alt={unit.name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded"
                      />
                    )}
                    <span className="text-sm font-medium flex-1">
                      {unit.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-2 pl-6">
                      <Label
                        htmlFor={`quantity-${unit.id}`}
                        className="text-sm text-muted-foreground"
                      >
                        Кількість:
                      </Label>
                      <Input
                        id={`quantity-${unit.id}`}
                        type="number"
                        min={1}
                        max={20}
                        value={quantity}
                        onChange={(e) =>
                          onQuantityChange(
                            unit.id,
                            Math.max(1, parseInt(e.target.value, 10) || 1),
                          )
                        }
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Немає доступних юнітів
          </p>
        )}
    </HudSection>
  );
}
