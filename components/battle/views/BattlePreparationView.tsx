"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { BattleScene } from "@/types/api";

interface BattlePreparationViewProps {
  battle: BattleScene;
  alliesCount: number;
  enemiesCount: number;
  isDM: boolean;
  onStartBattle: () => void;
  isStarting: boolean;
}

export function BattlePreparationView({
  battle: _battle,
  alliesCount,
  enemiesCount,
  isDM,
  onStartBattle,
  isStarting,
}: BattlePreparationViewProps) {
  void _battle;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-12 backdrop-blur-md animate-in fade-in duration-1000 relative">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="max-w-2xl w-full space-y-8 relative z-10"
      >
        <div className="space-y-4">
          <span className="hud-sc inline-flex h-8 items-center border-y border-[var(--gold)]/60 bg-[var(--gold)]/[.08] px-5 text-sm tracking-[.2em] text-[var(--gold)]">
            Підготовка до битви
          </span>
          <h2 className="hud-sc text-4xl font-extrabold tracking-[.12em] text-[var(--ink)] drop-shadow-2xl sm:text-7xl">
            АРЕНА ГОТОВА
          </h2>
          <p className="hud-book mx-auto max-w-lg text-lg italic leading-relaxed text-[#b8ab95] sm:text-2xl">
            Кожен воїн на своїй позиції. Час вирішити долю цієї сутички.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {[
            {
              label: "Союзники",
              value: alliesCount,
              color: "text-[#8fb0d0]",
            },
            {
              label: "Вороги",
              value: enemiesCount,
              color: "text-[#d0705c]",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center gap-1 border border-[#4a3c2c] bg-[rgba(17,14,11,.82)] p-4 sm:p-6"
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
              disabled={isStarting}
            >
              {isStarting ? "ЗБІР ВІЙСЬКА..." : "ДО БОЮ!"}
            </button>
          ) : (
            <div className="mx-auto inline-block animate-[hud-pulse_2.4s_infinite] border-y border-[#4a3c2c] bg-black/55 px-6 py-4 text-lg italic text-[#d6cbb7] sm:px-8 sm:text-xl">
              🗡️ Очікуйте наказу DM...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
