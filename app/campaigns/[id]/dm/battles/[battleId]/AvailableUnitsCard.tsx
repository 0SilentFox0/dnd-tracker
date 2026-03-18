"use client";

import Image from "next/image";

import type { EditBattleUnit } from "./useEditBattleData";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AvailableUnitsCardProps {
  units: EditBattleUnit[];
  isParticipantSelected: (id: string) => boolean;
  getParticipantQuantity: (id: string) => number;
  onParticipantToggle: (
    id: string,
    type: "unit",
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
    <Card>
      <CardHeader>
        <CardTitle>⚔️ Усі Юніти</CardTitle>
        <CardDescription>
          NPC юніти з можливістю вибору кількості
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        {units.length > 0 ? (
          <div className="space-y-2">
            {units.map((unit) => {
              const isSelected = isParticipantSelected(unit.id);

              const quantity = getParticipantQuantity(unit.id);

              return (
                <div
                  key={unit.id}
                  className="flex flex-col gap-2 p-3 border rounded hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        onParticipantToggle(unit.id, "unit", checked as boolean)
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
      </CardContent>
    </Card>
  );
}
