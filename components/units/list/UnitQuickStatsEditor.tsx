"use client";

/**
 * Quick stat editor для UnitCard: inline-редактори AC, Initiative,
 * та damage dice (primary attack).
 *
 * Винесено з UnitCard.tsx (~150 рядків) щоб основна картка стала
 * читабельнішою. Зберігає поведінку:
 *  - uncontrolled inputs з `key` reset на сервер snapshot,
 *  - на blur/Enter/Save — mutate з onError → bump key (revert).
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateUnitAny } from "@/lib/hooks/units";
import type { Unit } from "@/types/units";

function parseQuickStatInt(raw: string): number | null {
  const t = raw.trim();

  if (t === "") return null;

  const n = Number.parseInt(t, 10);

  return Number.isFinite(n) ? n : null;
}

interface UnitQuickStatsEditorProps {
  unit: Unit;
  campaignId: string;
  /** Індекс primary attack в unit.attacks для редагування dice. -1 якщо нема. */
  primaryAttackIndex: number;
  /** Назва primary attack (для лейбла, коли атак > 1). Не використовується при -1. */
  primaryAttackName?: string;
}

export function UnitQuickStatsEditor({
  unit,
  campaignId,
  primaryAttackIndex,
  primaryAttackName,
}: UnitQuickStatsEditorProps) {
  const updateUnitMutation = useUpdateUnitAny(campaignId);

  const attacks: Unit["attacks"] = Array.isArray(unit.attacks)
    ? unit.attacks
    : [];

  const primaryAttack =
    primaryAttackIndex >= 0 ? attacks[primaryAttackIndex] : null;

  const savedDice = primaryAttack?.damageDice ?? "";

  // Reset uncontrolled input до server snapshot через key change замість
  // setState у useEffect (не ламає focus / typing).
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

    if (primaryAttackIndex < 0 || !primaryAttack) return;

    if (trimmed === (primaryAttack.damageDice ?? "").trim()) return;

    if (!trimmed) {
      bumpDiceField();

      return;
    }

    const nextAttacks = attacks.map((a, i) =>
      i === primaryAttackIndex ? { ...a, damageDice: trimmed } : a,
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

  const isBusy = updateUnitMutation.isPending;

  return (
    <>
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
              disabled={isBusy}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={isBusy}
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
              disabled={isBusy}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={isBusy}
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

      {primaryAttackIndex >= 0 && primaryAttack ? (
        <div
          className="mt-2 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Label
            htmlFor={`unit-dice-${unit.id}`}
            className="text-xs text-muted-foreground font-normal"
          >
            Кубики шкоди
            {attacks.length > 1 && primaryAttackName ? (
              <span className="text-muted-foreground/80">
                {" "}
                ({primaryAttackName})
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
              disabled={isBusy}
              title="Enter, кнопка «Зберегти» або втрата фокусу"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 shrink-0 px-2.5 text-xs"
              disabled={isBusy}
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
    </>
  );
}
