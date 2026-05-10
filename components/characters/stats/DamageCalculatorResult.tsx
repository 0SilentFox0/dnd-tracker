"use client";

import type { SpellEffectKind } from "./damage-calculator-utils";

interface DamageCalculatorResultProps {
  diceSum: number;
  breakdown: string[];
  total: number;
  /** Для вкладки магії: підпис підсумку (шкода / лікування / ефект) */
  spellEffectKind?: SpellEffectKind;
  /** AoE: damage per target (за damageDistribution атаки/спела). */
  targets?: number[];
  /** AoE: сума по targets (показуємо коли > 1 цілі). */
  targetsTotal?: number;
  /** AoE: розподіл у % per target — для UI підпису. */
  distribution?: number[] | null;
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
  targets,
  targetsTotal,
  distribution,
}: DamageCalculatorResultProps) {
  const multiTargets =
    Array.isArray(targets) && targets.length > 1 && targetsTotal !== undefined
      ? targets
      : null;

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
      {multiTargets ? (
        <>
          <p className="text-sm font-semibold pt-1">
            На одну ціль: {total} {totalUnitLabel(spellEffectKind)}
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Розподіл AoE по цілях:
          </p>
          <ul className="text-sm tabular-nums">
            {multiTargets.map((dmg, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground">Ціль {i + 1}:</span>
                <span className="font-medium">{dmg}</span>
                {distribution && distribution[i] !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ({distribution[i]}% від {total})
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-lg font-bold tabular-nums pt-1">
            Сума по {multiTargets.length} цілях: {targetsTotal}{" "}
            {totalUnitLabel(spellEffectKind)}
          </p>
        </>
      ) : (
        <p className="text-lg font-bold tabular-nums pt-1">
          Загалом: {total} {totalUnitLabel(spellEffectKind)}
        </p>
      )}
    </div>
  );
}
