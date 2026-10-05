"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUnitQuickStats } from "@/lib/hooks/units";
import { cn } from "@/lib/utils";
import type { Unit } from "@/types/units";

interface UnitQuickStatsEditorProps {
  unit: Unit;
  campaignId: string;
  /** -1 when the unit has no attacks. */
  primaryAttackIndex: number;
  primaryAttackName?: string;
}

type QuickField = ReturnType<ReturnType<typeof useUnitQuickStats>["field"]>;

function QuickStatInput({
  field,
  label,
  disabled,
  numeric,
  inputProps,
}: {
  field: QuickField;
  label: ReactNode;
  disabled: boolean;
  numeric?: boolean;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  const commitFromInput = () => field.commit((document.getElementById(field.id) as HTMLInputElement | null)?.value ?? "");

  return (
    <>
      <Label htmlFor={field.id} className="text-xs text-muted-foreground font-normal">
        {label}
      </Label>
      <div className="flex gap-1.5 items-center">
        <Input
          key={field.key}
          id={field.id}
          {...(numeric && { type: "number", inputMode: "numeric" as const })}
          className={cn("h-8 min-w-0 flex-1 text-sm", numeric ? "tabular-nums" : "font-mono")}
          defaultValue={field.defaultValue}
          onBlur={(e) => field.commit(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              field.commit(e.currentTarget.value);
            }
          }}
          disabled={disabled}
          {...inputProps}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8 shrink-0 px-2.5 text-xs"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            commitFromInput();
          }}
        >
          Зберегти
        </Button>
      </div>
    </>
  );
}

export function UnitQuickStatsEditor({
  unit,
  campaignId,
  primaryAttackIndex,
  primaryAttackName,
}: UnitQuickStatsEditorProps) {
  const { field, isBusy } = useUnitQuickStats(unit, campaignId, primaryAttackIndex);

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  const hasPrimaryAttack = primaryAttackIndex >= 0 && !!attacks[primaryAttackIndex];

  return (
    <>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-1">
          <QuickStatInput field={field("ac")} label="Броня (AC)" disabled={isBusy} numeric inputProps={{ min: 0 }} />
        </div>
        <div className="space-y-1">
          <QuickStatInput field={field("init")} label="Ініціатива" disabled={isBusy} numeric />
        </div>
      </div>

      {hasPrimaryAttack ? (
        <div className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
          <QuickStatInput
            field={field("dice")}
            label={
              <>
                Кубики шкоди
                {attacks.length > 1 && primaryAttackName ? (
                  <span className="text-muted-foreground/80"> ({primaryAttackName})</span>
                ) : null}
              </>
            }
            disabled={isBusy}
            inputProps={{ placeholder: "напр. 2d6+3", title: "Enter, кнопка «Зберегти» або втрата фокусу" }}
          />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Немає атак — кубики можна додати в повному редакторі
        </p>
      )}
    </>
  );
}
