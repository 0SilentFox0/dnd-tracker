"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface BattlePreparationViewProps {
  alliesCount: number;
  enemiesCount: number;
  isDM: boolean;
  onStartBattle: () => void;
  isStarting: boolean;
  canStart?: boolean;
}

export function BattlePreparationView({
  alliesCount,
  enemiesCount,
  isDM,
  onStartBattle,
  isStarting,
  canStart = true,
}: BattlePreparationViewProps) {
  const t = useTranslations("battle.prep");

  const ts = useTranslations("battle.sides");

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 animate-in fade-in duration-1000 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      <div className="max-w-2xl w-full space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="space-y-4">
          <span className="hud-sc inline-flex h-8 items-center border-y border-[var(--gold)]/60 bg-[var(--gold)]/[.08] px-5 text-sm tracking-[.2em] text-[var(--gold)]">
            {t("badge")}
          </span>
          <h2 className="hud-sc text-4xl font-extrabold tracking-[.12em] text-[var(--ink)] drop-shadow-2xl sm:text-7xl">
            {t("title")}
          </h2>
          <p className="hud-book mx-auto max-w-lg text-lg italic leading-relaxed text-[#b8ab95] sm:text-2xl">
            {t("tagline")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            {
              label: ts("allies"),
              value: alliesCount,
              color: "text-[#8fb0d0]",
            },
            {
              label: ts("enemies"),
              value: enemiesCount,
              color: "text-hud-danger",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-1 border border-hud-line bg-hud-panel p-4 sm:p-6"
            >
              <span className="hud-sc text-[13px] tracking-[.1em] text-[var(--hud-muted)]">
                {stat.label}
              </span>
              <span
                className={cn(
                  "hud-sc text-3xl font-extrabold tabular-nums sm:text-4xl",
                  stat.color,
                )}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-4 sm:pt-8">
          {isDM ? (
            <button
              type="button"
              className="metal-gold metal-fill hud-sc h-16 w-full text-xl font-extrabold tracking-[.2em] shadow-[0_0_40px_rgba(230,194,90,.35)] transition-transform active:scale-95 disabled:opacity-70 sm:w-80 sm:text-2xl"
              onClick={onStartBattle}
              disabled={isStarting || !canStart}
            >
              {isStarting ? t("starting") : t("start")}
            </button>
          ) : (
            <div className="mx-auto inline-block animate-[hud-pulse_2.4s_infinite] border-y border-hud-line bg-black/55 px-6 py-4 text-lg italic text-[#d6cbb7] sm:px-8 sm:text-xl">
              {t("waiting")}
            </div>
          )}
          {isDM && !canStart && <p className="mt-3 text-sm italic text-[var(--hud-muted)]">{t("needOne")}</p>}
        </div>
      </div>
    </div>
  );
}
