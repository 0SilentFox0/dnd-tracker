"use client";

import { useTranslations } from "next-intl";

import { HudSection } from "@/components/hud/form";
import { HudCard } from "@/components/hud/page";
import type { BalanceHint, FairScaling, PartyPower } from "@/lib/utils/battle/balance";
import { mult, round1 } from "@/lib/utils/common/format";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="hud-sc text-[11px] tracking-[.06em] text-[var(--hud-muted)]">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function BalanceSummary({ fair }: { fair: { party: PartyPower; scaling: FairScaling } | null }) {
  const t = useTranslations("battleSetup.balance");

  const scaling = fair?.scaling;

  const describeHint = (hint: BalanceHint) => {
    const list = hint.changes.map((c) => `${c.name} ×${Math.abs(c.delta)}`).join(", ");

    return t(hint.kind === "weak" ? "hintWeak" : "hintExcess", { list });
  };

  return (
    <HudSection title={t("title")} className="mb-4">
      <HudCard className="space-y-3" data-testid="balance-summary">
        {!fair || !scaling || scaling.verdict === "empty" ? (
          <p className="text-sm text-[var(--hud-muted)]">{t("empty")}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label={t("heroPower")}>
                DPR {round1(fair.party.dpr)} · HP {Math.round(fair.party.hp)}
              </Stat>
              <Stat label={t("enemyPower")}>
                <span data-testid="enemy-power">
                  DPR {round1(scaling.base.dpr)} → {round1(scaling.reached.dpr)} · HP {Math.round(scaling.base.hp)} → {Math.round(scaling.reached.hp)}
                </span>
              </Stat>
              {scaling.fixed.hp > 0 && (
                <Stat label={t("npcEnemies")}>
                  <span data-testid="fixed-enemy-power">
                    DPR {round1(scaling.fixed.dpr)} · HP {Math.round(scaling.fixed.hp)}
                  </span>
                </Stat>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded border border-border bg-card px-2 py-0.5">{mult(scaling.hpScale)} HP</span>
              <span className="rounded border border-border bg-card px-2 py-0.5">{t("damage", { value: mult(scaling.dmgScale) })}</span>
              {scaling.verdict === "even" ? (
                <span className="rounded border border-[#6f8f4e] bg-[#1d2615] px-2 py-0.5 text-[#b7d68f]" data-testid="balance-verdict">
                  {t("even")}
                </span>
              ) : (
                <span className="rounded border border-destructive/70 bg-secondary px-2 py-0.5 text-destructive" data-testid="balance-verdict">
                  {scaling.hint ? describeHint(scaling.hint) : t(scaling.verdict === "weak" ? "weak" : "excess")}
                </span>
              )}
            </div>
          </>
        )}
      </HudCard>
    </HudSection>
  );
}
