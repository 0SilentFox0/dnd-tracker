"use client";

import Link from "next/link";
import { GripVertical, X } from "lucide-react";

import { UnitQuickStatsEditor } from "./UnitQuickStatsEditor";

import { AbilitySummary } from "@/components/abilities";
import { EntityIcon } from "@/components/common/EntityIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDamageElementLabel } from "@/lib/constants/damage";
import { useConfirm } from "@/lib/hooks/common";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { diceAverage } from "@/lib/utils/common/dice";
import { pluralUk } from "@/lib/utils/plural";
import {
  getUnitDamageModifiers,
  getUnitImmunities,
} from "@/lib/utils/races/race-effects";
import { UNIT_DRAG_TYPE, unitDragPayload } from "@/lib/utils/units/drag";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

function primaryAttackIndex(attacks: Unit["attacks"]): number {
  if (!attacks.length) return -1;

  const meleeIdx = attacks.findIndex(
    (a) => (a as { type?: string }).type === "melee" || !a.type,
  );

  return meleeIdx >= 0 ? meleeIdx : 0;
}

interface UnitCardProps {
  unit: Unit;
  campaignId: string;
  race?: Race | null;
  onDelete: (unitId: string) => void;
}

export function UnitCard({ unit, campaignId, race, onDelete }: UnitCardProps) {
  const confirm = useConfirm();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(UNIT_DRAG_TYPE, unitDragPayload(unit));
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", unit.name);
  };

  const attacks: Unit["attacks"] = Array.isArray(unit.attacks)
    ? unit.attacks
    : [];

  const abilitySummary = unit.abilitySummary ?? [];

  const allDamageModifiers = getUnitDamageModifiers(unit, race);

  const damageModifiers = allDamageModifiers
    .map((modifier) => getDamageElementLabel(modifier))
    .filter(Boolean);

  const allImmunities = getUnitImmunities(unit, race);

  const strMod = getAbilityModifier(unit.strength);

  const avgDamage =
    attacks.length > 0
      ? Math.round(
          Math.max(
            ...attacks.map(
              (a) => diceAverage(a.damageDice || "1d6") + strMod,
            ),
          ),
        )
      : null;

  const primaryIdx = primaryAttackIndex(attacks);

  const primaryAttack = primaryIdx >= 0 ? attacks[primaryIdx] : null;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3 flex flex-col justify-between relative group/card">
      <div
        draggable
        onDragStart={handleDragStart}
        className="absolute left-1 top-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
        title="Перетягніть на расу або рівень"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="pl-5">
        <div className="flex items-start gap-3">
          <EntityIcon src={unit.avatar} name={unit.name} size={80} className="size-16 rounded-lg text-2xl sm:size-20" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base">{unit.name}</h3>
            {damageModifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {damageModifiers.map((modifier, dmIdx) => (
                  <Badge
                    key={`dm-${dmIdx}-${modifier}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {modifier}
                  </Badge>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Рівень {unit.level} • HP {unit.maxHp}
                {avgDamage !== null && ` • Урон ~${avgDamage}`}
              </div>
            </div>

            <UnitQuickStatsEditor
              unit={unit}
              campaignId={campaignId}
              primaryAttackIndex={primaryIdx}
              primaryAttackName={primaryAttack?.name}
            />
          </div>
        </div>

        {abilitySummary.length > 0 && (
          <div className="space-y-1 mt-4">
            <div className="text-xs font-semibold">Вміння:</div>
            <div className="text-muted-foreground">
              <AbilitySummary lines={abilitySummary} />
            </div>
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
              {unit.knownSpells.length} {pluralUk(unit.knownSpells.length, ["заклинання", "заклинання", "заклинань"])}
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
          aria-label={`Видалити юніт ${unit.name}`}
          onClick={async () => {
            if ((await confirm({ title: `Видалити юніт «${unit.name}»?`, confirmLabel: "Видалити", destructive: true }))) onDelete(unit.id);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
