"use client";

import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { HudCard } from "@/components/hud/page";
import type { XpBudgetResult, XpDifficulty } from "@/lib/utils/battle/balance/xp-budget";

interface XpBalanceSummaryProps {
  xp: XpBudgetResult | null;
  units: Array<{ id: string; name: string }>;
}

export function XpBalanceSummary({ xp, units }: XpBalanceSummaryProps) {
  const t = useTranslations("battleSetup.xp");

  const tDifficulty = useTranslations("battleTerms.encounterDifficulty");

  const nameOf = (id: string) => units.find((u) => u.id === id)?.name ?? id;

  return (
    <HudSection title={t("title")} className="mb-4">
      <HudCard className="space-y-3" data-testid="xp-balance-summary">
        {!xp ? (
          <p className="text-sm text-[var(--hud-muted)]">{t("empty")}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded border border-border bg-card px-2 py-0.5" data-testid="xp-difficulty">
                {t("difficulty", { label: tDifficulty(xp.difficulty) })}
              </span>
              <span>{xp.multiplier === 1 ? t("enemyXp", { xp: String(xp.enemyXp) }) : t("enemyXpScaled", { xp: String(xp.enemyXp), multiplier: String(xp.multiplier), adjusted: String(xp.adjustedXp) })}</span>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-[var(--hud-muted)]">
              {(Object.entries(xp.thresholds) as Array<[XpDifficulty, number]>).map(([k, v]) => (
                <span key={k}>{`${tDifficulty(k)} ${v}`}</span>
              ))}
            </div>
            {xp.missingCr.length > 0 && (
              <p className="text-xs text-destructive" data-testid="xp-missing-cr">
                {t("missingCr", { names: xp.missingCr.map(nameOf).join(", ") })}
              </p>
            )}
          </>
        )}
      </HudCard>
    </HudSection>
  );
}
