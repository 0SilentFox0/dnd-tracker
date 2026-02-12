"use client";

import Image from "next/image";

import type { EntityStats, Unit } from "./types";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UnitsListCardProps {
  units: Unit[];
  entityStats: Record<string, EntityStats> | null;
  isParticipantSelected: (id: string) => boolean;
  getParticipantSide: (id: string) => "ally" | "enemy" | null;
  getParticipantQuantity: (id: string) => number;
  onParticipantToggle: (id: string, type: "unit", checked: boolean) => void;
  /** Додати юніта до ворогів (або перемістити з союзників). */
  onAddToEnemies: (id: string, quantity: number) => void;
  /** Перемістити в союзники (якщо зараз у ворогах). */
  onMoveToAllies: (id: string) => void;
  onQuantityChange: (id: string, quantity: number) => void;
}

function groupUnitsByRace(units: Unit[]): Map<string, Unit[]> {
  const byRace = new Map<string, Unit[]>();

  for (const u of units) {
    const raceKey = u.race?.trim() || "Без раси";

    if (!byRace.has(raceKey)) byRace.set(raceKey, []);

    byRace.get(raceKey)?.push(u);
  }
  for (const arr of byRace.values()) {
    arr.sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
  }

  return byRace;
}

function UnitRow({
  unit,
  stats,
  isSelected,
  side,
  quantity,
  onToggle,
  onAddToEnemies,
  onQuantityChange,
}: {
  unit: Unit;
  stats: EntityStats | undefined;
  isSelected: boolean;
  side: "ally" | "enemy" | null;
  quantity: number;
  onToggle: () => void;
  onAddToEnemies: () => void;
  onQuantityChange: (value: number) => void;
}) {
  const isAlly = side === "ally";

  const isEnemy = side === "enemy";

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-2 transition-all overflow-hidden ${
        isSelected
          ? isEnemy
            ? "border-red-500/70 bg-red-500/5 shadow-sm"
            : "border-primary bg-primary/10 shadow-sm"
          : "border-border hover:border-primary/50 hover:bg-accent/50"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-4 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-xl"
      >
        <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          {unit.avatar ? (
            <Image
              src={unit.avatar}
              alt={unit.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl text-muted-foreground">⚔️</span>
          )}
        </div>
        <div className="flex flex-col min-w-0 flex-1 gap-0.5">
          <span className="text-base font-semibold truncate">
            {unit.name}
            <span className="text-muted-foreground font-normal">
              {" "}
              · tier {unit.level ?? 1}
            </span>
          </span>
          {stats && (
            <span className="text-sm text-muted-foreground">
              DPR {stats.dpr} · HP {stats.hp} · KPI {stats.kpi}
            </span>
          )}
        </div>
        {isSelected && (
          <div className="shrink-0 flex items-center gap-2" aria-hidden>
            {isAlly && (
              <span className="text-xs font-medium text-primary">Союзник</span>
            )}
            {isEnemy && (
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Ворог
              </span>
            )}
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
      </button>
      {isSelected && (
        <div
          className="px-4 pb-4 pt-0 flex flex-wrap items-center gap-3 border-t border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <label
              htmlFor={`quantity-${unit.id}`}
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              Кількість:
            </label>
            <Input
              id={`quantity-${unit.id}`}
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(e) =>
                onQuantityChange(
                  Math.max(1, parseInt(e.target.value, 10) || 1),
                )
              }
              className="w-20 h-8"
            />
          </div>
          <Button
            type="button"
            variant={isEnemy ? "secondary" : "outline"}
            size="sm"
            onClick={onAddToEnemies}
            disabled={isEnemy}
          >
            {isEnemy ? "Вже ворог" : "До ворогів"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function UnitsListCard({
  units,
  entityStats,
  isParticipantSelected,
  getParticipantSide,
  getParticipantQuantity,
  onParticipantToggle,
  onAddToEnemies,
  onMoveToAllies,
  onQuantityChange,
}: UnitsListCardProps) {
  if (units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚔️ Юніти</CardTitle>
          <CardDescription>
            NPC юніти. Клік — до союзників, «До ворогів» — у колонку ворогів.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Немає доступних юнітів
          </p>
        </CardContent>
      </Card>
    );
  }

  const byRace = groupUnitsByRace(units);

  const raceOrder = [...byRace.keys()].sort((a, b) =>
    a.localeCompare(b, "uk"),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>⚔️ Юніти</CardTitle>
        <CardDescription>
          Клік по картці — додати до союзників або прибрати. «До ворогів» — одразу в колонку ворогів.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
        <Accordion
          type="multiple"
          defaultValue={raceOrder}
          className="space-y-2"
        >
          {raceOrder.map((raceKey) => {
            const raceUnits = byRace.get(raceKey) ?? [];

            return (
              <AccordionItem key={raceKey} value={raceKey}>
                <AccordionTrigger className="py-3 text-sm">
                  {raceKey} ({raceUnits.length})
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  {raceUnits.map((unit) => {
                    const isSelected = isParticipantSelected(unit.id);

                    const side = getParticipantSide(unit.id);

                    const quantity = getParticipantQuantity(unit.id);

                    const unitStats = entityStats?.[unit.id];

                    return (
                      <UnitRow
                        key={unit.id}
                        unit={unit}
                        stats={unitStats}
                        isSelected={isSelected}
                        side={side}
                        quantity={quantity}
                        onToggle={() => {
                          if (!isSelected) {
                            onParticipantToggle(unit.id, "unit", true);
                          } else if (side === "ally") {
                            onParticipantToggle(unit.id, "unit", false);
                          } else {
                            onMoveToAllies(unit.id);
                          }
                        }}
                        onAddToEnemies={() => {
                          if (side !== "enemy") onAddToEnemies(unit.id, quantity);
                        }}
                        onQuantityChange={(value) =>
                          onQuantityChange(unit.id, value)
                        }
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
