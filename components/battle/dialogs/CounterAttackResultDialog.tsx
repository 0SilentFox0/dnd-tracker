"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Контр-атака</AlertDialogTitle>
          <AlertDialogDescription>
            {info.defenderName} виконав(ла) контр-атаку та завдав(ла){" "}
            <strong>{info.damage}</strong> урону {info.attackerName}.
            {info.baseDamage != null && info.bonusPercent != null && (
              <span className="mt-2 block text-sm text-muted-foreground">
                Базовий урон {info.baseDamage} + бонус {info.bonusPercent}% ={" "}
                {info.damage} урону
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => onOpenChange(false)}>Зрозуміло</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
