"use client";

import { useState } from "react";
import Link from "next/link";
import { GripVertical, X } from "lucide-react";

import { OptimizedImage } from "@/components/common/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDamageElementLabel } from "@/lib/constants/damage";
import { useUpdateUnitAny } from "@/lib/hooks/units";
import { getDiceAverage } from "@/lib/utils/battle/balance";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import {
  getUnitDamageModifiers,
  getUnitImmunities,
} from "@/lib/utils/races/race-effects";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

/** Індекс атаки для швидкого редагування кубиків: ближня, інакше перша */
function primaryAttackIndex(attacks: Unit["attacks"]): number {
  if (!attacks.length) return -1;

  const meleeIdx = attacks.findIndex(
    (a) => (a as { type?: string }).type === "melee" || !a.type,
  );

  return meleeIdx >= 0 ? meleeIdx : 0;
}

function parseQuickStatInt(raw: string): number | null {
  const t = raw.trim();

  if (t === "") return null;

  const n = Number.parseInt(t, 10);

  return Number.isFinite(n) ? n : null;
}

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
  const updateUnitMutation = useUpdateUnitAny(campaignId);

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

  // Середній урон: max серед атак (dice avg + мод. сили для melee)
  const strMod = getAbilityModifier(unit.strength);

  const avgDamage =
    attacks.length > 0
      ? Math.round(
          Math.max(
            ...attacks.map(
              (a) => getDiceAverage(a.damageDice || "1d6") + strMod,
            ),
          ),
        )
      : null;

  const primaryIdx = primaryAttackIndex(attacks);

  const primaryAttack = primaryIdx >= 0 ? attacks[primaryIdx] : null;

  const savedDice = primaryAttack?.damageDice ?? "";

  /** Скидання uncontrolled інпутів до знімка сервера без setState в useEffect (новий key → remount). */
  const [acFieldEpoch, setAcFieldEpoch] = useState(0);

  const [initFieldEpoch, setInitFieldEpoch] = useState(0);

  const [diceFieldEpoch, setDiceFieldEpoch] = useState(0);

  const bumpAcField = () => setAcFieldEpoch((e) => e + 1);

  const bumpInitField = () => setInitFieldEpoch((e) => e + 1);

  const bumpDiceField = () => setDiceFieldEpoch((e) => e + 1);

  const persistArmor = () => {
    const raw =
      (
        document.getElementById(
          `unit-ac-${unit.id}`,
        ) as HTMLInputElement | null
      )?.value ?? "";

    const n = parseQuickStatInt(raw);

    if (n === null) {
      bumpAcField();

      return;
    }

    const clamped = Math.max(0, n);

    if (clamped === unit.armorClass) return;

    updateUnitMutation.mutate(
      { unitId: unit.id, data: { armorClass: clamped } },
      {
        onError: () => {
          bumpAcField();
        },
      },
    );
  };

  const persistInitiative = () => {
    const raw =
      (
        document.getElementById(
          `unit-init-${unit.id}`,
        ) as HTMLInputElement | null
      )?.value ?? "";

    const n = parseQuickStatInt(raw);

    if (n === null) {
      bumpInitField();

      return;
    }

    if (n === unit.initiative) return;

    updateUnitMutation.mutate(
      { unitId: unit.id, data: { initiative: n } },
      {
        onError: () => {
          bumpInitField();
        },
      },
    );
  };

  const persistPrimaryDice = () => {
    const trimmed = (
      (
        document.getElementById(
          `unit-dice-${unit.id}`,
        ) as HTMLInputElement | null
      )?.value ?? ""
    ).trim();

    if (primaryIdx < 0 || !primaryAttack) return;

    if (trimmed === (primaryAttack.damageDice ?? "").trim()) return;

    if (!trimmed) {
      bumpDiceField();

      return;
    }

    const nextAttacks = attacks.map((a, i) =>
      i === primaryIdx ? { ...a, damageDice: trimmed } : a,
    );

    updateUnitMutation.mutate(
      { unitId: unit.id, data: { attacks: nextAttacks } },
      {
        onError: () => {
          bumpDiceField();
        },
      },
    );
  };

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

            <div
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <Label
                  htmlFor={`unit-ac-${unit.id}`}
                  className="text-xs text-muted-foreground font-normal"
                >
                  Броня (AC)
                </Label>
                <div className="flex gap-1.5 items-center">
                  <Input
                    key={`${unit.id}-ac-${unit.armorClass}-${acFieldEpoch}`}
                    id={`unit-ac-${unit.id}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="h-8 min-w-0 flex-1 text-sm tabular-nums"
                    defaultValue={String(unit.armorClass)}
                    onBlur={persistArmor}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        persistArmor();
                      }
                    }}
                    disabled={updateUnitMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    disabled={updateUnitMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      persistArmor();
                    }}
                  >
                    Зберегти
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor={`unit-init-${unit.id}`}
                  className="text-xs text-muted-foreground font-normal"
                >
                  Ініціатива
                </Label>
                <div className="flex gap-1.5 items-center">
                  <Input
                    key={`${unit.id}-init-${unit.initiative}-${initFieldEpoch}`}
                    id={`unit-init-${unit.id}`}
                    type="number"
                    inputMode="numeric"
                    className="h-8 min-w-0 flex-1 text-sm tabular-nums"
                    defaultValue={String(unit.initiative)}
                    onBlur={persistInitiative}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        persistInitiative();
                      }
                    }}
                    disabled={updateUnitMutation.isPending}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    disabled={updateUnitMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      persistInitiative();
                    }}
                  >
                    Зберегти
                  </Button>
                </div>
              </div>
            </div>

            {primaryIdx >= 0 && primaryAttack ? (
              <div
                className="mt-2 space-y-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Label
                  htmlFor={`unit-dice-${unit.id}`}
                  className="text-xs text-muted-foreground font-normal"
                >
                  Кубики шкоди
                  {attacks.length > 1 ? (
                    <span className="text-muted-foreground/80">
                      {" "}
                      ({primaryAttack.name})
                    </span>
                  ) : null}
                </Label>
                <div className="flex gap-1.5 items-center">
                  <Input
                    key={`${unit.id}-dice-${savedDice}-${diceFieldEpoch}`}
                    id={`unit-dice-${unit.id}`}
                    className="h-8 flex-1 min-w-0 text-sm font-mono"
                    defaultValue={savedDice}
                    onBlur={persistPrimaryDice}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        persistPrimaryDice();
                      }
                    }}
                    placeholder="напр. 2d6+3"
                    disabled={updateUnitMutation.isPending}
                    title="Enter, кнопка «Зберегти» або втрата фокусу"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 shrink-0 px-2.5 text-xs"
                    disabled={updateUnitMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      persistPrimaryDice();
                    }}
                  >
                    Зберегти
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Немає атак — кубики можна додати в повному редакторі
              </p>
            )}
          </div>
        </div>

        {specialAbilities.length > 0 && (
          <div className="space-y-1 mt-4">
            <div className="text-xs font-semibold">Здібності:</div>
            <div className="text-xs text-muted-foreground">
              {specialAbilities.map((ability, saIdx) => (
                <div key={`sa-${saIdx}-${ability.name}`}>{ability.name}</div>
              ))}
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
