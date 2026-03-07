"use client";

interface DamageCalculatorResultProps {
  diceSum: number;
  breakdown: string[];
  total: number;
}

export function DamageCalculatorResult({
  diceSum,
  breakdown,
  total,
}: DamageCalculatorResultProps) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <p className="text-sm font-semibold tabular-nums">Сума кидків: {diceSum}</p>
      {breakdown.length > 0 && (
        <>
          <p className="text-xs font-medium text-muted-foreground">
            Бонуси до шкоди
          </p>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {breakdown.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <p className="text-lg font-bold tabular-nums pt-1">
        Загалом: {total} урону
      </p>
    </div>
  );
}
