"use client";

import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

export interface CounterAttackResultInfo {
  defenderName: string;
  attackerName: string;
  damage: number;
  /** Базовий урон до бонусу (для breakdown) */
  baseDamage?: number;
  /** Бонус у % (counter_damage з ефектів) */
  bonusPercent?: number;
}

interface CounterAttackResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: CounterAttackResultInfo | null;
}

export function CounterAttackResultDialog({
  open,
  onOpenChange,
  info,
}: CounterAttackResultDialogProps) {
  if (!info) return null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Контр-атака"
      description={
        <>
          {info.defenderName} виконав(ла) контр-атаку та завдав(ла) <strong>{info.damage}</strong> урону {info.attackerName}.{" "}
          {info.baseDamage != null && info.bonusPercent != null && (
            <span className="mt-2 block text-sm text-muted-foreground">
              {" "}
              Базовий урон {info.baseDamage} + бонус {info.bonusPercent}% = {info.damage} урону{" "}
            </span>
          )}
        </>
      }
      size="sm"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Зрозуміло</Button>
        </>
      }
    />
  );
}
