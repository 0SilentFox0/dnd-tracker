"use client";

import { HudSection } from "@/components/hud/form";
import { HudCard } from "@/components/hud/page";
import type { BalanceHint, FairScaling, PartyPower } from "@/lib/utils/battle/balance";

const round1 = (n: number) => Math.round(n * 10) / 10;

const mult = (n: number) => `×${(Math.round(n * 100) / 100).toString()}`;

export function describeHint(hint: BalanceHint): string {
  const list = hint.changes.map((c) => `${c.name} ×${Math.abs(c.delta)}`).join(", ");

  return hint.kind === "weak" ? `Слабко: додайте ${list}` : `Забагато: приберіть ${list}`;
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="hud-sc text-[11px] tracking-[.06em] text-[var(--hud-muted)]">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function BalanceSummary({ fair }: { fair: { party: PartyPower; scaling: FairScaling } | null }) {
  const scaling = fair?.scaling;

  return (
    <HudSection title="Баланс бою" className="mb-4">
      <HudCard className="space-y-3" data-testid="balance-summary">
        {!fair || !scaling || scaling.verdict === "empty" ? (
          <p className="text-sm text-[var(--hud-muted)]">Додайте героїв у союзники та юнітів у вороги, щоб побачити баланс.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="Сила героїв">
                DPR {round1(fair.party.dpr)} · HP {Math.round(fair.party.hp)}
              </Stat>
              <Stat label="Сила ворогів">
                <span data-testid="enemy-power">
                  DPR {round1(scaling.base.dpr)} → {round1(scaling.reached.dpr)} · HP {Math.round(scaling.base.hp)} → {Math.round(scaling.reached.hp)}
                </span>
              </Stat>
              {scaling.fixed.hp > 0 && (
                <Stat label="NPC-вороги (без масштабу)">
                  <span data-testid="fixed-enemy-power">
                    DPR {round1(scaling.fixed.dpr)} · HP {Math.round(scaling.fixed.hp)}
                  </span>
                </Stat>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded border border-border bg-card px-2 py-0.5">{mult(scaling.hpScale)} HP</span>
              <span className="rounded border border-border bg-card px-2 py-0.5">{mult(scaling.dmgScale)} шкода</span>
              {scaling.verdict === "even" ? (
                <span className="rounded border border-[#6f8f4e] bg-[#1d2615] px-2 py-0.5 text-[#b7d68f]" data-testid="balance-verdict">
                  рівний бій ✓
                </span>
              ) : (
                <span className="rounded border border-destructive/70 bg-secondary px-2 py-0.5 text-destructive" data-testid="balance-verdict">
                  {scaling.hint ? describeHint(scaling.hint) : scaling.verdict === "weak" ? "Слабко" : "Забагато"}
                </span>
              )}
            </div>
          </>
        )}
      </HudCard>
    </HudSection>
  );
}
