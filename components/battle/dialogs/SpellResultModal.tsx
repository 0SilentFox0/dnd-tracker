"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BattleAction } from "@/types/battle";

interface SpellResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Остання дія типу spell з battleLog після касту або з preview */
  lastSpellAction: BattleAction | null;
  /** Якщо передано — режим підтвердження: кнопка "Застосувати шкоду" замість "Зрозуміло" */
  onApply?: () => void;
}

export function SpellResultModal({
  open,
  onOpenChange,
  lastSpellAction,
  onApply,
}: SpellResultModalProps) {
  if (!lastSpellAction || lastSpellAction.actionType !== "spell") {
    return null;
  }

  const details = lastSpellAction.actionDetails;

  const savingThrows = details?.savingThrows ?? [];

  const allPassed =
    savingThrows.length > 0 &&
    savingThrows.every((st) => st.result === "success");

  const hasDamage =
    (details?.totalDamage != null && details.totalDamage > 0) ||
    (lastSpellAction.hpChanges?.length ?? 0) > 0;

  const hasHealing =
    (details?.totalHealing != null && details.totalHealing > 0) ||
    (lastSpellAction.hpChanges?.some((h) => h.change < 0) ?? false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {allPassed && savingThrows.length > 0
              ? "Перевірка пройдена"
              : details?.spellName ?? "Результат заклинання"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {allPassed && savingThrows.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              Ціль(і) пройшли перевірку рятунку ({details?.savingThrows?.[0]?.ability ?? ""}
              ). Заклинання не завдало ефекту (промах).
            </p>
          ) : (
            <>
              {details?.totalDamage != null && details.totalDamage > 0 && (
                <div>
                  <p className="text-sm font-medium">Загальний урон</p>
                  <p className="text-lg font-semibold text-destructive">
                    {details.totalDamage} урону
                  </p>
                  {details.damageBreakdown && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {details.damageBreakdown}
                    </p>
                  )}
                </div>
              )}
              {details?.totalHealing != null && details.totalHealing > 0 && (
                <div>
                  <p className="text-sm font-medium">Лікування</p>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {details.totalHealing} HP
                  </p>
                  {details.damageBreakdown && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {details.damageBreakdown}
                    </p>
                  )}
                </div>
              )}
              {lastSpellAction.hpChanges && lastSpellAction.hpChanges.length > 0 && (
                <div className="border-t pt-2">
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Зміна HP по цілях
                  </p>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    {lastSpellAction.hpChanges.map((h) => (
                      <li key={h.participantId}>
                        {h.participantName}: {h.oldHp} → {h.newHp}
                        {h.change !== 0 && (
                          <span
                            className={
                              h.change > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                            }
                          >
                            {" "}
                            ({h.change > 0 ? "-" : "+"}
                            {Math.abs(h.change)})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {savingThrows.some((st) => st.result === "fail") && (
                <p className="text-muted-foreground text-xs">
                  Перевірка рятунку не пройдена — застосовано повний ефект.
                </p>
              )}
              {!hasDamage && !hasHealing && (
                <p className="text-muted-foreground text-sm">
                  {lastSpellAction.resultText || "Заклинання застосовано."}
                </p>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          {onApply ? (
            <Button onClick={onApply}>Застосувати шкоду</Button>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Зрозуміло</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
