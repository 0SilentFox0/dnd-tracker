import { HudSection } from "@/components/hud/form";
import { HudCard } from "@/components/hud/page";
import { XP_DIFFICULTY_LABELS, type XpBudgetResult, type XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";

interface XpBalanceSummaryProps {
  xp: XpBudgetResult | null;
  units: Array<{ id: string; name: string }>;
}

export function XpBalanceSummary({ xp, units }: XpBalanceSummaryProps) {
  const nameOf = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  return (
    <HudSection title="Баланс бою (XP 5e)" className="mb-4">
      <HudCard className="space-y-3" data-testid="xp-balance-summary">
        {!xp ? (
          <p className="text-sm text-[var(--hud-muted)]">Додайте героїв у союзники та юнітів у вороги, щоб побачити складність.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded border border-border bg-card px-2 py-0.5" data-testid="xp-difficulty">
                Складність: {XP_DIFFICULTY_LABELS[xp.difficulty]}
              </span>
              <span>{xp.multiplier === 1 ? `XP ворогів ${xp.enemyXp}` : `XP ворогів ${xp.enemyXp} × ${xp.multiplier} = ${xp.adjustedXp}`}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--hud-muted)]">
              {(Object.entries(xp.thresholds) as Array<[XpDifficulty, number]>).map(([k, v]) => (
                <span key={k}>{`${XP_DIFFICULTY_LABELS[k]} ${v}`}</span>
              ))}
            </div>
            {xp.missingCr.length > 0 && (
              <p className="text-xs text-destructive" data-testid="xp-missing-cr">
                {`Немає CR, не враховано: ${xp.missingCr.map(nameOf).join(", ")}`}
              </p>
            )}
          </>
        )}
      </HudCard>
    </HudSection>
  );
}
