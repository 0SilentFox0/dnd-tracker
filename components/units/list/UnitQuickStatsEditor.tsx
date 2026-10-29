"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

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
  const tActions = useTranslations("common.actions");

  const commitFromInput = () => field.commit((document.getElementById(field.id) as HTMLInputElement | null)?.value ?? "");

  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={field.id} className="block truncate text-[11px] font-normal text-hud-muted">
        {label}
      </Label>
      <div className="flex items-center gap-1">
        <Input
          key={field.key}
          id={field.id}
          {...(numeric && { type: "number", inputMode: "numeric" as const })}
          className={cn("h-8 min-w-0 flex-1 px-2 text-sm", numeric ? "tabular-nums" : "font-mono")}
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
          variant="ghost"
          size="icon"
          aria-label={tActions("save")}
          className="size-7 shrink-0 text-hud-gold hover:text-hud-gold-strong"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            commitFromInput();
          }}
        >
          <Check className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function UnitQuickStatsEditor({
  unit,
  campaignId,
  primaryAttackIndex,
  primaryAttackName,
}: UnitQuickStatsEditorProps) {
  const t = useTranslations("units.quickStats");

  const tStats = useTranslations("common.stats");

  const { field, isBusy } = useUnitQuickStats(unit, campaignId, primaryAttackIndex);

  const attacks = Array.isArray(unit.attacks) ? unit.attacks : [];

  const hasPrimaryAttack = primaryAttackIndex >= 0 && !!attacks[primaryAttackIndex];

  return (
    <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2" onClick={(e) => e.stopPropagation()}>
      <QuickStatInput field={field("ac")} label={t("ac")} disabled={isBusy} numeric inputProps={{ min: 0 }} />
      <QuickStatInput field={field("init")} label={tStats("initiative")} disabled={isBusy} numeric />
      {hasPrimaryAttack ? (
        <QuickStatInput
          field={field("dice")}
          label={attacks.length > 1 && primaryAttackName ? t("diceNamed", { name: primaryAttackName }) : t("dice")}
          disabled={isBusy}
          inputProps={{ placeholder: "2d6+3", title: t("diceHint") }}
        />
      ) : (
        <p className="self-end text-[11px] leading-tight text-hud-muted">{t("noAttacks")}</p>
      )}
    </div>
  );
}
