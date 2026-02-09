"use client";

import Link from "next/link";
import { GripVertical, X } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDamageElementLabel } from "@/lib/constants/damage";
import {
  getUnitDamageModifiers,
  getUnitImmunities,
} from "@/lib/utils/races/race-effects";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

const DRAG_TYPE = "application/x-unit-id";

export function getUnitDragPayload(unit: Unit): string {
  return JSON.stringify({
    unitId: unit.id,
    unitName: unit.name,
    currentRace: unit.race ?? "",
    currentLevel: unit.level,
  });
}

export function parseUnitDragPayload(data: string): {
  unitId: string;
  unitName: string;
  currentRace: string;
  currentLevel: number;
} | null {
  try {
    const parsed = JSON.parse(data) as {
      unitId?: string;
      unitName?: string;
      currentRace?: string;
      currentLevel?: number;
    };

    if (parsed?.unitId) {
      return {
        unitId: parsed.unitId,
        unitName: parsed.unitName ?? "",
        currentRace: parsed.currentRace ?? "",
        currentLevel:
          typeof parsed.currentLevel === "number" ? parsed.currentLevel : 1,
      };
    }
  } catch {
    // ignore
  }

  return null;
}

interface UnitCardProps {
  unit: Unit;
  campaignId: string;
  race?: Race | null;
  onDelete: (unitId: string) => void;
}

export function UnitCard({ unit, campaignId, race, onDelete }: UnitCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_TYPE, getUnitDragPayload(unit));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", unit.name);
  };

  const attacks: Unit["attacks"] = Array.isArray(unit.attacks)
    ? unit.attacks
    : [];

  const specialAbilities: Unit["specialAbilities"] = Array.isArray(
    unit.specialAbilities,
  )
    ? unit.specialAbilities
    : [];

  // Отримуємо модифікатори урону з раси та юніта
  const allDamageModifiers = getUnitDamageModifiers(unit, race);

  const damageModifiers = allDamageModifiers
    .map((modifier) => getDamageElementLabel(modifier))
    .filter(Boolean);

  // Отримуємо імунітети з раси та юніта
  const allImmunities = getUnitImmunities(unit, race);

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between relative group/card">
      <div
        draggable
        onDragStart={handleDragStart}
        className="absolute left-1 top-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        title="Перетягніть для зміни групи або рівня"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-5">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 relative">
            {unit.avatar ? (
              <OptimizedImage
                src={unit.avatar}
                alt={unit.name}
                width={80}
                height={80}
                className="w-full h-full object-cover"
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-2xl text-muted-foreground">
                      {unit.name[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <span className="text-2xl text-muted-foreground">
                  {unit.name[0]?.toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{unit.name}</h3>
            {damageModifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {damageModifiers.map((modifier) => (
                  <Badge key={modifier} variant="outline" className="text-xs">
                    {modifier}
                  </Badge>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Рівень {unit.level} • AC {unit.armorClass} • HP {unit.maxHp}
              </div>
              <div className="text-xs">
                Швидкість: {unit.speed} фт. • Ініціатива: {unit.initiative}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          <div className="text-xs grid grid-cols-3 gap-1">
            <div>СИЛ: {unit.strength}</div>
            <div>ЛОВ: {unit.dexterity}</div>
            <div>ТІЛ: {unit.constitution}</div>
            <div>ІНТ: {unit.intelligence}</div>
            <div>МДР: {unit.wisdom}</div>
            <div>ХАР: {unit.charisma}</div>
          </div>
        </div>

        {attacks.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Атаки:</div>
            <div className="text-xs space-y-0.5">
              {attacks.slice(0, 2).map((attack, idx: number) => (
                <div key={idx}>
                  {attack.name}: +{attack.attackBonus}, {attack.damageDice}{" "}
                  {attack.damageType}
                </div>
              ))}
              {attacks.length > 2 && (
                <div className="text-muted-foreground">
                  +{attacks.length - 2} інших...
                </div>
              )}
            </div>
          </div>
        )}

        {specialAbilities.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Здібності:</div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {specialAbilities[0]?.name ||
                specialAbilities[0]?.description ||
                ""}
            </div>
            {specialAbilities.length > 1 && (
              <div className="text-xs text-muted-foreground">
                +{specialAbilities.length - 1} інших...
              </div>
            )}
          </div>
        )}

        {allImmunities.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Імунітети:</div>
            <div className="flex flex-wrap gap-1">
              {allImmunities.slice(0, 3).map((immunity, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {immunity}
                </Badge>
              ))}
              {allImmunities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{allImmunities.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {unit.knownSpells && unit.knownSpells.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold">Заклинання:</div>
            <div className="text-xs text-muted-foreground">
              {unit.knownSpells.length}{" "}
              {unit.knownSpells.length === 1 ? "заклинання" : "заклинань"}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pl-5">
        <Link
          href={`/campaigns/${campaignId}/dm/units/${unit.id}`}
          className="flex-1"
        >
          <Button variant="outline" size="sm" className="w-full">
            Редагувати
          </Button>
        </Link>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(unit.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
