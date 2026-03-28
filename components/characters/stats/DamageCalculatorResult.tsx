"use client";

import type { SpellEffectKind } from "./damage-calculator-utils";

interface DamageCalculatorResultProps {
  diceSum: number;
  breakdown: string[];
  total: number;
  /** Для вкладки магії: підпис підсумку (шкода / лікування / ефект) */
  spellEffectKind?: SpellEffectKind;
}

function totalUnitLabel(kind?: SpellEffectKind): string {
  if (kind === "heal") return "лікування";

  if (kind === "all") return "ефекту заклинання";

  return "урону";
}

function bonusesTitle(kind?: SpellEffectKind): string {
  if (kind) return "Модифікатори заклинання";

  return "Бонуси до шкоди";
}

export function DamageCalculatorResult({
  diceSum,
  breakdown,
  total,
  spellEffectKind,
}: DamageCalculatorResultProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-semibold tabular-nums">Сума кидків: {diceSum}</p>
      {breakdown.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            {bonusesTitle(spellEffectKind)}
          </p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <p className="text-lg font-bold tabular-nums pt-1">
        Загалом: {total} {totalUnitLabel(spellEffectKind)}
      </p>
    </div>
  );
}
